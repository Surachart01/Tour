import prisma from '../config/db.js';

export async function createExcursion(req, res, next) {
  try {
    const data = req.body;
    const excursion = await prisma.excursions.create({
      data: {
        name: data.name, city: data.city, code: data.code || null,
        is_sic_excursion: data.is_sic_excursion || false,
        description: data.description || null,
        sic_price_adult: data.sic_price_adult, sic_price_child: data.sic_price_child,
        walkin_price: data.walkin_price, currency_id: data.currency_id,
        excursion_pricing: data.pricing ? {
          create: data.pricing.map(p => ({
            start_date: new Date(p.start_date), end_date: new Date(p.end_date),
            pax: p.pax, price: p.price, cost: p.cost, currency_id: p.currency_id
          }))
        } : undefined
      },
      include: { excursion_pricing: true }
    });
    return res.status(201).json(excursion);
  } catch (err) { next(err); }
}

export async function getExcursionByID(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid excursion ID');
    const excursion = await prisma.excursions.findUnique({
      where: { id },
      include: { excursion_pricing: { include: { currencies: true } }, currencies: true }
    });
    if (!excursion) return res.status(404).send('Excursion not found');
    return res.json(excursion);
  } catch (err) { next(err); }
}

export async function getExcursions(req, res, next) {
  try {
    const excursions = await prisma.excursions.findMany({
      include: { excursion_pricing: { include: { currencies: true } }, currencies: true },
      orderBy: { name: 'asc' }
    });
    return res.json(excursions);
  } catch (err) { next(err); }
}

export async function listExcursionsByLocation(req, res, next) {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).send('City parameter is required');
    const excursions = await prisma.excursions.findMany({
      where: { city },
      include: { excursion_pricing: { include: { currencies: true } }, currencies: true }
    });
    return res.json(excursions);
  } catch (err) { next(err); }
}

export async function listAvailableExcursionsByCity(req, res, next) {
  try {
    const { city, from_date, to_date, keyword } = req.query;
    let where = {};
    if (city) where.city = city;
    if (keyword) { where.name = { contains: keyword, mode: 'insensitive' }; }
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
    return res.json(excursions);
  } catch (err) { next(err); }
}

export async function updateExcursion(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid excursion ID');
    const data = req.body;
    await prisma.$transaction(async (tx) => {
      await tx.excursion_pricing.deleteMany({ where: { excursion_id: id } });
      await tx.excursions.update({
        where: { id },
        data: {
          name: data.name, city: data.city, code: data.code,
          is_sic_excursion: data.is_sic_excursion, description: data.description,
          sic_price_adult: data.sic_price_adult, sic_price_child: data.sic_price_child,
          walkin_price: data.walkin_price, currency_id: data.currency_id,
          excursion_pricing: data.pricing ? {
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
    return res.json({ final_cost: 0, discount: 0 });
  } catch (err) { next(err); }
}
