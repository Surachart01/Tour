import prisma from '../config/db.js';
import { calculateExcursionCostLogic, calculateMarkedUpPrice } from '../utils/pricing.js';

export function formatExcursionResponse(excursion, markupGroup = '', markups = []) {
  if (!excursion) return null;
  const prices = (excursion.excursion_pricing || []).map(p => {
    let priceVal = p.price ? parseFloat(p.price) : 0;
    if (markupGroup && markups && markups.length > 0) {
      priceVal = calculateMarkedUpPrice(priceVal, markupGroup, 'excursion', markups);
    }
    return {
      id: p.id,
      excursion_id: p.excursion_id,
      start_date: p.start_date ? (p.start_date instanceof Date ? p.start_date.toISOString().split('T')[0] : String(p.start_date)) : '',
      end_date: p.end_date ? (p.end_date instanceof Date ? p.end_date.toISOString().split('T')[0] : String(p.end_date)) : '',
      pax: p.pax,
      price: priceVal,
      cost: p.cost ? parseFloat(p.cost) : 0,
      currency_id: p.currency_id
    };
  });

  const available_days = (excursion.valid_days || '').split(',').filter(x => x).map(x => ({
    day_of_week: parseInt(x)
  }));

  let sicPriceAdult = excursion.sic_price_adult ? parseFloat(excursion.sic_price_adult) : 0;
  let sicPriceChild = excursion.sic_price_child ? parseFloat(excursion.sic_price_child) : 0;
  let walkinPrice = excursion.walkin_price ? parseFloat(excursion.walkin_price) : 0;

  if (markupGroup && markups && markups.length > 0) {
    sicPriceAdult = calculateMarkedUpPrice(sicPriceAdult, markupGroup, 'excursion', markups);
    sicPriceChild = calculateMarkedUpPrice(sicPriceChild, markupGroup, 'excursion', markups);
    walkinPrice = calculateMarkedUpPrice(walkinPrice, markupGroup, 'excursion', markups);
  }

  return {
    id: excursion.id,
    name: excursion.name,
    city: excursion.city,
    code: excursion.code,
    is_sic_excursion: excursion.is_sic_excursion,
    description: excursion.description,
    sic_price_adult: sicPriceAdult,
    sic_price_child: sicPriceChild,
    walkin_price: walkinPrice,
    currency_id: excursion.currency_id,
    supplier_name: excursion.supplier_name,
    supplier_id: excursion.supplier_id,
    valid_days: excursion.valid_days,
    user_id: excursion.user_id,
    country: excursion.country,
    display_order: excursion.display_order,
    order: (excursion.display_order === 0 || excursion.display_order === null || excursion.display_order === undefined) ? 100000 : excursion.display_order,
    prices,
    available_days
  };
}

export async function createExcursion(req, res, next) {
  try {
    const data = req.body;
    const pricingData = data.pricing || data.prices || [];
    const valid_days = Array.isArray(data.available_days)
      ? data.available_days.map(d => d.day_of_week).sort().join(',')
      : (data.valid_days || null);

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

    const sicPriceAdult = data.sic_price_adult !== undefined && data.sic_price_adult !== null ? (isNaN(parseFloat(data.sic_price_adult)) ? null : parseFloat(data.sic_price_adult)) : null;
    const sicPriceChild = data.sic_price_child !== undefined && data.sic_price_child !== null ? (isNaN(parseFloat(data.sic_price_child)) ? null : parseFloat(data.sic_price_child)) : null;
    const walkinPrice = data.walkin_price !== undefined && data.walkin_price !== null ? (isNaN(parseFloat(data.walkin_price)) ? null : parseFloat(data.walkin_price)) : null;

    const excursion = await prisma.excursions.create({
      data: {
        name: data.name, city: data.city, code: data.code || null,
        is_sic_excursion: data.is_sic_excursion || false,
        description: data.description || null,
        sic_price_adult: sicPriceAdult, sic_price_child: sicPriceChild,
        walkin_price: walkinPrice, currency_id: data.currency_id,
        supplier_name: supplierName,
        supplier_id: data.supplier_id ? parseInt(data.supplier_id) : null,
        valid_days: valid_days,
        user_id: data.user_id ? parseInt(data.user_id) : null,
        country: data.country || "Thailand",
        display_order: data.display_order !== undefined ? parseInt(data.display_order) : 0,
        excursion_pricing: uniquePricingData.length > 0 ? {
          create: uniquePricingData.map(p => ({
            start_date: new Date(p.start_date), end_date: new Date(p.end_date),
            pax: p.pax, price: p.price, cost: p.cost || 0, currency_id: p.currency_id || null
          }))
        } : undefined
      },
      include: { excursion_pricing: true }
    });
    return res.status(201).json(formatExcursionResponse(excursion));
  } catch (err) { next(err); }
}

export async function getExcursionByID(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid excursion ID');

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const excursion = await prisma.excursions.findUnique({
      where: { id },
      include: { excursion_pricing: { include: { currencies: true } }, currencies: true }
    });
    if (!excursion) return res.status(404).send('Excursion not found');
    return res.json(formatExcursionResponse(excursion, markupGroup, markups));
  } catch (err) { next(err); }
}

export async function getExcursions(req, res, next) {
  try {
    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const excursions = await prisma.excursions.findMany({
      include: { excursion_pricing: { include: { currencies: true } }, currencies: true }
    });
    const formatted = excursions.map(e => formatExcursionResponse(e, markupGroup, markups));
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function listExcursionsByLocation(req, res, next) {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).send('City parameter is required');

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const excursions = await prisma.excursions.findMany({
      where: { city },
      include: { excursion_pricing: { include: { currencies: true } }, currencies: true }
    });
    const formatted = excursions.map(e => formatExcursionResponse(e, markupGroup, markups));
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function listAvailableExcursionsByCity(req, res, next) {
  try {
    const { city, from_date, to_date, keyword } = req.query;
    let where = {};
    if (city) where.city = city;
    if (keyword) { where.name = { contains: keyword, mode: 'insensitive' }; }

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const excursions = await prisma.excursions.findMany({
      where,
      include: {
        excursion_pricing: from_date && to_date ? {
          where: {
            start_date: { lte: new Date(to_date) },
            end_date: { gte: new Date(from_date) }
          },
          include: { currencies: true }
        } : { include: { currencies: true } },
        currencies: true
      }
    });

    let formatted = excursions.map(e => formatExcursionResponse(e, markupGroup, markups));

    // Filter by day-of-week when from_date is provided
    // valid_days is stored as comma-separated day numbers, e.g. "0,1,2,6" (0=Sun, 6=Sat)
    // Excursions with no valid_days set are available every day (backward compatibility)
    if (from_date) {
      const targetDow = new Date(from_date).getDay(); // 0=Sun ... 6=Sat
      const daysOfWeekShort = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const daysOfWeekFull = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      formatted = formatted.filter(exc => {
        if (!exc.valid_days || exc.valid_days.trim() === '') return true;
        const allowedList = exc.valid_days.split(',').map(d => d.trim().toLowerCase());
        if (allowedList.length === 0) return true;

        const matchesDigit = allowedList.includes(String(targetDow));
        const matchesShort = allowedList.includes(daysOfWeekShort[targetDow]);
        const matchesFull = allowedList.includes(daysOfWeekFull[targetDow]);

        return matchesDigit || matchesShort || matchesFull;
      });
    }

    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function updateExcursion(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid excursion ID');
    const data = req.body;
    const pricingData = data.pricing || data.prices || [];
    const valid_days = Array.isArray(data.available_days)
      ? data.available_days.map(d => d.day_of_week).sort().join(',')
      : (data.valid_days !== undefined ? data.valid_days : undefined);

    const sicPriceAdult = data.sic_price_adult !== undefined && data.sic_price_adult !== null ? (isNaN(parseFloat(data.sic_price_adult)) ? null : parseFloat(data.sic_price_adult)) : undefined;
    const sicPriceChild = data.sic_price_child !== undefined && data.sic_price_child !== null ? (isNaN(parseFloat(data.sic_price_child)) ? null : parseFloat(data.sic_price_child)) : undefined;
    const walkinPrice = data.walkin_price !== undefined && data.walkin_price !== null ? (isNaN(parseFloat(data.walkin_price)) ? null : parseFloat(data.walkin_price)) : undefined;

    // Auto-lookup supplier name from supplier_id if not provided
    let supplierName = data.supplier_name;
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
      await tx.excursion_pricing.deleteMany({ where: { excursion_id: id } });
      await tx.excursions.update({
        where: { id },
        data: {
          name: data.name, city: data.city, code: data.code,
          is_sic_excursion: data.is_sic_excursion, description: data.description,
          sic_price_adult: sicPriceAdult, sic_price_child: sicPriceChild,
          walkin_price: walkinPrice, currency_id: data.currency_id,
          supplier_name: supplierName !== undefined ? supplierName : undefined,
          supplier_id: data.supplier_id !== undefined ? (data.supplier_id ? parseInt(data.supplier_id) : null) : undefined,
          valid_days: valid_days !== undefined ? valid_days : undefined,
          user_id: data.user_id !== undefined ? (data.user_id ? parseInt(data.user_id) : null) : undefined,
          country: data.country !== undefined ? data.country : undefined,
          display_order: data.display_order !== undefined ? parseInt(data.display_order) : undefined,
          excursion_pricing: uniquePricingData.length > 0 ? {
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

export async function deleteExcursion(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid excursion ID');
    await prisma.excursions.delete({ where: { id } });
    return res.status(200).send('Excursion deleted successfully');
  } catch (err) { next(err); }
}

export async function calculateExcursionCost(req, res, next) {
  try {
    const request = req.body;
    const claims = req.user;

    let markupGroup = 'TO Bronze'; // Default fallback
    if (claims) {
      if (claims.role !== 'admin' && claims.role !== 'superadmin') {
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

    const excursion = await prisma.excursions.findUnique({
      where: { id: parseInt(request.excursion_id) },
      include: { excursion_pricing: true }
    });

    if (!excursion) {
      return res.status(404).send('Excursion not found');
    }

    const final_cost = calculateExcursionCostLogic(excursion, request, markupGroup, markups);
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
