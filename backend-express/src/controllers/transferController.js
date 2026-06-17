import prisma from '../config/db.js';

export async function createTransfer(req, res, next) {
  try {
    const data = req.body;
    const transfer = await prisma.transfers.create({
      data: {
        transfer_type: data.transfer_type, city: data.city,
        description: data.description || null,
        departure: data.departure, arrival: data.arrival,
        supplier_name: data.supplier_name || null,
        user_id: data.user_id ? parseInt(data.user_id) : null,
        country: data.country || "Thailand",
        sic_price_adult: data.sic_price_adult !== undefined ? data.sic_price_adult : 0.00,
        sic_price_child: data.sic_price_child !== undefined ? data.sic_price_child : 0.00,
        supplier_id: data.supplier_id ? parseInt(data.supplier_id) : null,
        display_order: data.display_order !== undefined ? parseInt(data.display_order) : 0,
        transfer_pricing: data.pricing ? {
          create: data.pricing.map(p => ({
            start_date: new Date(p.start_date), end_date: new Date(p.end_date),
            pax: p.pax, price: p.price, cost: p.cost, currency_id: p.currency_id
          }))
        } : undefined
      },
      include: { transfer_pricing: true }
    });
    return res.status(201).json(transfer);
  } catch (err) { next(err); }
}

export async function getTransferByID(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid transfer ID');
    const transfer = await prisma.transfers.findUnique({
      where: { id },
      include: { transfer_pricing: { include: { currencies: true } } }
    });
    if (!transfer) return res.status(404).send('Transfer not found');
    return res.json(transfer);
  } catch (err) { next(err); }
}

export async function getTransfers(req, res, next) {
  try {
    const transfers = await prisma.transfers.findMany({
      include: { transfer_pricing: { include: { currencies: true } } },
      orderBy: [{ display_order: 'asc' }, { departure: 'asc' }]
    });
    return res.json(transfers);
  } catch (err) { next(err); }
}

export async function getTransferByCity(req, res, next) {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).send('City parameter is required');
    const transfers = await prisma.transfers.findMany({
      where: { city },
      include: { transfer_pricing: { include: { currencies: true } } }
    });
    return res.json(transfers);
  } catch (err) { next(err); }
}

export async function listAvailableTransfersByCity(req, res, next) {
  try {
    const { city, from_date, to_date, keyword } = req.query;
    let where = {};
    if (city) where.city = city;
    if (keyword) {
      where.OR = [
        { departure: { contains: keyword, mode: 'insensitive' } },
        { arrival: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } }
      ];
    }
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
    return res.json(transfers);
  } catch (err) { next(err); }
}

export async function updateTransfer(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid transfer ID');
    const data = req.body;
    await prisma.$transaction(async (tx) => {
      await tx.transfer_pricing.deleteMany({ where: { transfer_id: id } });
      await tx.transfers.update({
        where: { id },
        data: {
          transfer_type: data.transfer_type, city: data.city,
          description: data.description, departure: data.departure, arrival: data.arrival,
          supplier_name: data.supplier_name !== undefined ? data.supplier_name : undefined,
          user_id: data.user_id !== undefined ? (data.user_id ? parseInt(data.user_id) : null) : undefined,
          country: data.country !== undefined ? data.country : undefined,
          sic_price_adult: data.sic_price_adult !== undefined ? data.sic_price_adult : undefined,
          sic_price_child: data.sic_price_child !== undefined ? data.sic_price_child : undefined,
          supplier_id: data.supplier_id !== undefined ? (data.supplier_id ? parseInt(data.supplier_id) : null) : undefined,
          display_order: data.display_order !== undefined ? parseInt(data.display_order) : undefined,
          transfer_pricing: data.pricing ? {
            create: data.pricing.map(p => ({
              start_date: new Date(p.start_date), end_date: new Date(p.end_date),
              pax: p.pax, price: p.price, cost: p.cost, currency_id: p.currency_id
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
    return res.json({ final_cost: 0, discount: 0 });
  } catch (err) { next(err); }
}
