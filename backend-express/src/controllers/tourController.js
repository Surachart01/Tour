import prisma from '../config/db.js';
import { calculateTourCostLogic } from '../utils/pricing.js';

export function formatTourResponse(tour) {
  if (!tour) return null;
  const tour_pricings = (tour.tour_pricing || []).map(p => ({
    id: p.id,
    tour_id: p.tour_id,
    start_date: p.start_date ? (p.start_date instanceof Date ? p.start_date.toISOString().split('T')[0] : String(p.start_date)) : '',
    end_date: p.end_date ? (p.end_date instanceof Date ? p.end_date.toISOString().split('T')[0] : String(p.end_date)) : '',
    pax: p.pax,
    single_price: p.single_room_price ? parseFloat(p.single_room_price) : 0,
    double_price: p.double_room_price ? parseFloat(p.double_room_price) : 0,
    triple_price: p.triple_room_price ? parseFloat(p.triple_room_price) : 0,
    currency_id: p.currency_id
  }));

  const available_days = (tour.valid_days || '').split(',').filter(x => x).map(x => ({
    day_of_week: parseInt(x)
  }));

  return {
    id: tour.id,
    name: tour.name,
    code: tour.code,
    category: tour.category,
    description: tour.description,
    duration: tour.duration,
    route: tour.route,
    departures: tour.departures,
    city: tour.city,
    country: tour.country,
    valid_days: tour.valid_days,
    display_order: tour.display_order,
    order: (tour.display_order === 0 || tour.display_order === null || tour.display_order === undefined) ? 100000 : tour.display_order,
    tour_pricings,
    available_days
  };
}

export async function createTour(req, res, next) {
  try {
    const data = req.body;

    // Convert available_days array [{day_of_week: 1}, ...] → "1,2,3" string
    const valid_days = Array.isArray(data.available_days)
      ? data.available_days.map(d => d.day_of_week).sort().join(',')
      : (data.valid_days || null);

    // Accept both 'tour_pricings' (frontend) and 'pricing' (legacy)
    const pricings = data.tour_pricings || data.pricing || [];

    const tour = await prisma.tours.create({
      data: {
        name: data.name,
        code: data.code || null,
        category: data.category,
        description: data.description || null,
        duration: data.duration,
        route: data.route || null,
        departures: data.tot || data.departures || 'PVT',
        city: data.city || null,
        country: data.country || null,
        valid_days,
        display_order: data.display_order || 0,
        tour_pricing: pricings.length > 0 ? {
          create: pricings.map(p => ({
            start_date: new Date(p.start_date),
            end_date: new Date(p.end_date),
            pax: parseInt(p.pax) || 1,
            single_room_price: parseFloat(p.single_price ?? p.single_room_price ?? 0),
            double_room_price: parseFloat(p.double_price ?? p.double_room_price ?? 0),
            triple_room_price: parseFloat(p.triple_price ?? p.triple_room_price ?? 0),
            currency_id: p.currency_id || null
          }))
        } : undefined
      },
      include: { tour_pricing: true }
    });
    return res.status(201).json(formatTourResponse(tour));
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
    return res.json(formatTourResponse(tour));
  } catch (err) { next(err); }
}

export async function getAllTours(req, res, next) {
  try {
    const tours = await prisma.tours.findMany({
      include: { tour_pricing: { include: { currencies: true } } }
    });
    const formatted = tours.map(formatTourResponse);
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function listToursByCity(req, res, next) {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).send('City parameter is required');
    const tours = await prisma.tours.findMany({
      include: { tour_pricing: { include: { currencies: true } } }
    });
    const formatted = tours.map(formatTourResponse);
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function listAvailableToursByCity(req, res, next) {
  try {
    const { city, from_date, to_date, keyword } = req.query;
    let where = {};

    // Filter by city if provided
    if (city) { where.city = { equals: city, mode: 'insensitive' }; }
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
      }
    });

    // Filter by day of week if from_date provided
    let filtered = tours;
    if (from_date) {
      const requestedDayOfWeek = new Date(from_date).getDay(); // 0=Sun, 1=Mon, ...
      filtered = tours.filter(tour => {
        // If valid_days not set, tour is available every day
        if (!tour.valid_days) return true;
        const validDays = tour.valid_days.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
        if (validDays.length === 0) return true;
        return validDays.includes(requestedDayOfWeek);
      });
    }

    // Exclude tours that have no pricing for the requested date range (when date filter is applied)
    if (from_date && to_date) {
      filtered = filtered.filter(tour => tour.tour_pricing.length > 0);
    }

    const formatted = filtered.map(formatTourResponse);
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}


export async function updateTour(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid tour ID');
    const data = req.body;

    // Convert available_days array → valid_days string if provided
    const valid_days = Array.isArray(data.available_days)
      ? data.available_days.map(d => d.day_of_week).sort().join(',')
      : (data.valid_days !== undefined ? data.valid_days : undefined);

    // Accept both 'tour_pricings' (frontend) and 'pricing' (legacy)
    const pricings = data.tour_pricings || data.pricing || [];

    await prisma.$transaction(async (tx) => {
      await tx.tour_pricing.deleteMany({ where: { tour_id: id } });
      await tx.tours.update({
        where: { id },
        data: {
          name: data.name,
          code: data.code,
          category: data.category,
          description: data.description,
          duration: data.duration,
          route: data.route,
          departures: data.tot || data.departures,
          city: data.city,
          country: data.country,
          valid_days: valid_days !== undefined ? valid_days : undefined,
          display_order: data.display_order,
          tour_pricing: pricings.length > 0 ? {
            create: pricings.map(p => ({
              start_date: new Date(p.start_date),
              end_date: new Date(p.end_date),
              pax: parseInt(p.pax) || 1,
              single_room_price: parseFloat(p.single_price ?? p.single_room_price ?? 0),
              double_room_price: parseFloat(p.double_price ?? p.double_room_price ?? 0),
              triple_room_price: parseFloat(p.triple_price ?? p.triple_room_price ?? 0),
              currency_id: p.currency_id || null
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

    const tour = await prisma.tours.findUnique({
      where: { id: parseInt(request.tour_id) },
      include: { tour_pricing: true }
    });

    if (!tour) {
      return res.status(404).send('Tour not found');
    }

    const final_cost = calculateTourCostLogic(tour, request, markupGroup, markups);
    return res.json({ final_cost, discount: 0 });
  } catch (err) {
    if (err.message && (err.message.includes('not found') || err.message.includes('not available') || err.message.includes('mismatch') || err.message.includes('invalid'))) {
      return res.status(400).send(err.message);
    }
    next(err);
  }
}
