import prisma from '../config/db.js';
import { calculateTransferCostLogic, calculateMarkedUpPrice } from '../utils/pricing.js';

export function formatTransferResponse(transfer, markupGroup = '', markups = []) {
  if (!transfer) return null;
  const prices = (transfer.transfer_pricing || []).map(p => {
    let priceVal = p.price ? parseFloat(p.price) : 0;
    if (markupGroup && markups && markups.length > 0) {
      priceVal = calculateMarkedUpPrice(priceVal, markupGroup, 'transfer', markups);
    }
    return {
      id: p.id,
      transfer_id: p.transfer_id,
      start_date: p.start_date ? (p.start_date instanceof Date ? p.start_date.toISOString().split('T')[0] : String(p.start_date)) : '',
      end_date: p.end_date ? (p.end_date instanceof Date ? p.end_date.toISOString().split('T')[0] : String(p.end_date)) : '',
      pax: p.pax,
      price: priceVal,
      cost: p.cost ? parseFloat(p.cost) : 0,
      currency_id: p.currency_id
    };
  });

  let sicPriceAdult = transfer.sic_price_adult ? parseFloat(transfer.sic_price_adult) : 0;
  let sicPriceChild = transfer.sic_price_child ? parseFloat(transfer.sic_price_child) : 0;

  if (markupGroup && markups && markups.length > 0) {
    sicPriceAdult = calculateMarkedUpPrice(sicPriceAdult, markupGroup, 'transfer', markups);
    sicPriceChild = calculateMarkedUpPrice(sicPriceChild, markupGroup, 'transfer', markups);
  }

  return {
    id: transfer.id,
    transfer_type: transfer.transfer_type,
    city: transfer.city,
    description: transfer.description,
    departure: transfer.departure,
    arrival: transfer.arrival,
    supplier_name: transfer.supplier_name,
    user_id: transfer.user_id,
    country: transfer.country,
    sic_price_adult: sicPriceAdult,
    sic_price_child: sicPriceChild,
    supplier_id: transfer.supplier_id,
    display_order: transfer.display_order,
    order: (transfer.display_order === 0 || transfer.display_order === null || transfer.display_order === undefined) ? 100000 : transfer.display_order,
    prices
  };
}

export async function createTransfer(req, res, next) {
  try {
    const data = req.body;

    // Accept both `prices` (frontend) and `pricing` (legacy)
    const pricingData = data.prices || data.pricing || [];

    // Auto-lookup supplier name from supplier_id if not provided
    let supplierName = data.supplier_name || null;
    if (!supplierName && data.supplier_id) {
      const supplier = await prisma.suppliers.findUnique({
        where: { id: parseInt(data.supplier_id) },
        select: { name: true }
      });
      supplierName = supplier?.name || null;
    }

    // Filter duplicates in pricingData before saving
    const seen = new Set();
    const uniquePricingData = [];
    for (const p of pricingData) {
      if (!p.start_date || !p.end_date) continue;
      const startStr = String(p.start_date).split('T')[0].trim();
      const endStr = String(p.end_date).split('T')[0].trim();
      const paxVal = parseInt(p.pax, 10);
      const priceVal = parseFloat(p.price || 0);
      const costVal = parseFloat(p.cost || 0);

      const key = `${startStr}_${endStr}_${paxVal}_${priceVal}_${costVal}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePricingData.push(p);
      }
    }

    const transfer = await prisma.transfers.create({
      data: {
        transfer_type: data.transfer_type, city: data.city,
        description: data.description || null,
        departure: data.departure, arrival: data.arrival,
        supplier_name: supplierName,
        user_id: data.user_id ? parseInt(data.user_id) : null,
        country: data.country || "Thailand",
        sic_price_adult: data.sic_price_adult !== undefined ? data.sic_price_adult : 0.00,
        sic_price_child: data.sic_price_child !== undefined ? data.sic_price_child : 0.00,
        supplier_id: data.supplier_id ? parseInt(data.supplier_id) : null,
        display_order: data.display_order !== undefined ? parseInt(data.display_order) :
                       (data.order !== undefined ? parseInt(data.order) : 0),
        transfer_pricing: uniquePricingData.length > 0 ? {
          create: uniquePricingData.map(p => ({
            start_date: new Date(p.start_date), end_date: new Date(p.end_date),
            pax: p.pax, price: p.price, cost: p.cost || 0, currency_id: p.currency_id || null
          }))
        } : undefined
      },
      include: { transfer_pricing: true }
    });
    return res.status(201).json(formatTransferResponse(transfer));
  } catch (err) { next(err); }
}

export async function getTransferByID(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid transfer ID');

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const transfer = await prisma.transfers.findUnique({
      where: { id },
      include: { transfer_pricing: { include: { currencies: true } } }
    });
    if (!transfer) return res.status(404).send('Transfer not found');
    return res.json(formatTransferResponse(transfer, markupGroup, markups));
  } catch (err) { next(err); }
}

export async function getTransfers(req, res, next) {
  try {
    const { transfer_type } = req.query;
    let where = {};
    if (transfer_type) {
      where.transfer_type = transfer_type;
    }

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const transfers = await prisma.transfers.findMany({
      where,
      include: { transfer_pricing: { include: { currencies: true } } }
    });
    const formatted = transfers.map(t => formatTransferResponse(t, markupGroup, markups));
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.departure.localeCompare(b.departure);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function getTransferByCity(req, res, next) {
  try {
    const { city, transfer_type } = req.query;
    if (!city) return res.status(400).send('City parameter is required');
    let where = { city };
    if (transfer_type) {
      where.transfer_type = transfer_type;
    }

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const transfers = await prisma.transfers.findMany({
      where,
      include: { transfer_pricing: { include: { currencies: true } } }
    });
    const formatted = transfers.map(t => formatTransferResponse(t, markupGroup, markups));
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.departure.localeCompare(b.departure);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function listAvailableTransfersByCity(req, res, next) {
  try {
    const { city, from_date, to_date, keyword, transfer_type } = req.query;
    let where = {};
    if (city) where.city = city;
    if (transfer_type) where.transfer_type = transfer_type;
    if (keyword) {
      where.OR = [
        { departure: { contains: keyword, mode: 'insensitive' } },
        { arrival: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } }
      ];
    }

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const transfers = await prisma.transfers.findMany({
      where,
      include: {
        transfer_pricing: from_date && to_date ? {
          where: {
            start_date: { lte: new Date(to_date) },
            end_date: { gte: new Date(from_date) }
          },
          include: { currencies: true }
        } : { include: { currencies: true } }
      }
    });
    const formatted = transfers.map(t => formatTransferResponse(t, markupGroup, markups));
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.departure.localeCompare(b.departure);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function updateTransfer(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid transfer ID');
    const data = req.body;

    // Accept both `prices` (frontend) and `pricing` (legacy)
    const pricingData = data.prices || data.pricing || [];

    // Auto-lookup supplier name from supplier_id if not provided
    let supplierName = data.supplier_name !== undefined ? data.supplier_name : undefined;
    if (supplierName === undefined && data.supplier_id) {
      const supplier = await prisma.suppliers.findUnique({
        where: { id: parseInt(data.supplier_id) },
        select: { name: true }
      });
      supplierName = supplier?.name || null;
    }

    // Filter duplicates in pricingData before saving
    const seen = new Set();
    const uniquePricingData = [];
    for (const p of pricingData) {
      if (!p.start_date || !p.end_date) continue;
      const startStr = String(p.start_date).split('T')[0].trim();
      const endStr = String(p.end_date).split('T')[0].trim();
      const paxVal = parseInt(p.pax, 10);
      const priceVal = parseFloat(p.price || 0);
      const costVal = parseFloat(p.cost || 0);

      const key = `${startStr}_${endStr}_${paxVal}_${priceVal}_${costVal}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePricingData.push(p);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.transfer_pricing.deleteMany({ where: { transfer_id: id } });
      await tx.transfers.update({
        where: { id },
        data: {
          transfer_type: data.transfer_type, city: data.city,
          description: data.description, departure: data.departure, arrival: data.arrival,
          supplier_name: supplierName,
          user_id: data.user_id !== undefined ? (data.user_id ? parseInt(data.user_id) : null) : undefined,
          country: data.country !== undefined ? data.country : undefined,
          sic_price_adult: data.sic_price_adult !== undefined ? data.sic_price_adult : undefined,
          sic_price_child: data.sic_price_child !== undefined ? data.sic_price_child : undefined,
          supplier_id: data.supplier_id !== undefined ? (data.supplier_id ? parseInt(data.supplier_id) : null) : undefined,
          display_order: data.display_order !== undefined ? parseInt(data.display_order) :
                         (data.order !== undefined ? parseInt(data.order) : undefined),
          transfer_pricing: uniquePricingData.length > 0 ? {
            create: uniquePricingData.map(p => ({
              start_date: new Date(p.start_date), end_date: new Date(p.end_date),
              pax: p.pax, price: p.price, cost: p.cost || 0, currency_id: p.currency_id || null
            }))
          } : undefined
        }
      });
    });
    return res.json({ status: 'success' });
  } catch (err) { next(err); }
}

export async function deleteTransfer(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid transfer ID');
    await prisma.transfers.delete({ where: { id } });
    return res.status(200).send('Transfer deleted successfully');
  } catch (err) { next(err); }
}

export async function calculateTransfersCost(req, res, next) {
  try {
    const request = req.body;
    const claims = req.user;

    let markupGroup = 'TO Bronze'; // Default fallback
    if (claims) {
      if (claims.role !== 'admin') {
        markupGroup = claims.markup_group || '';
      }
    }

    if (request.agent_name) {
      const agent = await prisma.agent.findUnique({
        where: { name: request.agent_name }
      });
      if (agent) {
        markupGroup = agent.markupGroup || '';
      }
    }

    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const transfer = await prisma.transfers.findUnique({
      where: { id: parseInt(request.transfer_id) },
      include: { transfer_pricing: true }
    });

    if (!transfer) {
      return res.status(404).send('Transfer not found');
    }

    const final_cost = calculateTransferCostLogic(transfer, request, markupGroup, markups);
    return res.json({ final_cost, discount: 0 });
  } catch (err) {
    if (err.message && (
      err.message.includes('not found') ||
      err.message.includes('not available') ||
      err.message.includes('invalid') ||
      err.message.includes('pricing') ||
      err.message.includes('Pax')
    )) {
      return res.status(400).send(err.message);
    }
    next(err);
  }
}
