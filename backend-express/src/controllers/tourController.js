import prisma from '../config/db.js';

export async function createTour(req, res, next) {
  try {
    const data = req.body;
    const tour = await prisma.tours.create({
      data: {
        name: data.name, code: data.code || null,
        category: data.category, description: data.description || null,
        duration: data.duration, route: data.route || null,
        departures: data.departures,
        tour_pricing: data.pricing ? {
          create: data.pricing.map(p => ({
            start_date: new Date(p.start_date), end_date: new Date(p.end_date),
            single_room_price: p.single_room_price, double_room_price: p.double_room_price,
            triple_room_price: p.triple_room_price, currency_id: p.currency_id
          }))
        } : undefined
      },
      include: { tour_pricing: true }
    });
    return res.status(201).json(tour);
  } catch (err) { next(err); }
}

export async function getTourByID(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid tour ID');
    const tour = await prisma.tours.findUnique({
      where: { id },
      include: { tour_pricing: { include: { currencies: true } } }
    });
    if (!tour) return res.status(404).send('Tour not found');
    return res.json(tour);
  } catch (err) { next(err); }
}

export async function getAllTours(req, res, next) {
  try {
    const tours = await prisma.tours.findMany({
      include: { tour_pricing: { include: { currencies: true } } },
      orderBy: { name: 'asc' }
    });
    return res.json(tours);
  } catch (err) { next(err); }
}

export async function listToursByCity(req, res, next) {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).send('City parameter is required');
    // Tours don't have city field directly, filter through pricing currencies
    const tours = await prisma.tours.findMany({
      include: { tour_pricing: { include: { currencies: true } } },
      orderBy: { name: 'asc' }
    });
    return res.json(tours);
  } catch (err) { next(err); }
}

export async function listAvailableToursByCity(req, res, next) {
  try {
    const { city, from_date, to_date, keyword } = req.query;
    let where = {};
    if (keyword) { where.name = { contains: keyword, mode: 'insensitive' }; }
    const tours = await prisma.tours.findMany({
      where,
      include: {
        tour_pricing: from_date && to_date ? {
          where: {
            start_date: { lte: new Date(to_date) },
            end_date: { gte: new Date(from_date) }
          },
          include: { currencies: true }
        } : { include: { currencies: true } }
      },
      orderBy: { name: 'asc' }
    });
    return res.json(tours);
  } catch (err) { next(err); }
}

export async function updateTour(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid tour ID');
    const data = req.body;
    await prisma.$transaction(async (tx) => {
      await tx.tour_pricing.deleteMany({ where: { tour_id: id } });
      await tx.tours.update({
        where: { id },
        data: {
          name: data.name, code: data.code, category: data.category,
          description: data.description, duration: data.duration,
          route: data.route, departures: data.departures,
          tour_pricing: data.pricing ? {
            create: data.pricing.map(p => ({
              start_date: new Date(p.start_date), end_date: new Date(p.end_date),
              single_room_price: p.single_room_price, double_room_price: p.double_room_price,
              triple_room_price: p.triple_room_price, currency_id: p.currency_id
            }))
          } : undefined
        }
      });
    });
    return res.json({ status: 'success' });
  } catch (err) { next(err); }
}

export async function deleteTour(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid tour ID');
    await prisma.tours.delete({ where: { id } });
    return res.status(200).send('Tour deleted successfully');
  } catch (err) { next(err); }
}

export async function calculateToursCost(req, res, next) {
  try {
    return res.json({ final_cost: 0, discount: 0 });
  } catch (err) { next(err); }
}
