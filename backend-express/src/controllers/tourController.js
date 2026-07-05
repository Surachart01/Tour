import prisma from '../config/db.js';
import { calculateTourCostLogic, calculateMarkedUpPrice } from '../utils/pricing.js';

export function formatTourResponse(tour, markupGroup = '', markups = [], documents = []) {
  if (!tour) return null;
  const tour_pricings = (tour.tour_pricing || []).map(p => {
    let singlePrice = p.single_room_price ? parseFloat(p.single_room_price) : 0;
    let doublePrice = p.double_room_price ? parseFloat(p.double_room_price) : 0;
    let triplePrice = p.triple_room_price ? parseFloat(p.triple_room_price) : 0;

    if (markupGroup && markups && markups.length > 0) {
      singlePrice = calculateMarkedUpPrice(singlePrice, markupGroup, 'tour', markups);
      doublePrice = calculateMarkedUpPrice(doublePrice, markupGroup, 'tour', markups);
      triplePrice = calculateMarkedUpPrice(triplePrice, markupGroup, 'tour', markups);
    }

    return {
      id: p.id,
      tour_id: p.tour_id,
      start_date: p.start_date ? (p.start_date instanceof Date ? p.start_date.toISOString().split('T')[0] : String(p.start_date)) : '',
      end_date: p.end_date ? (p.end_date instanceof Date ? p.end_date.toISOString().split('T')[0] : String(p.end_date)) : '',
      pax: p.pax,
      single_price: singlePrice,
      double_price: doublePrice,
      triple_price: triplePrice,
      currency_id: p.currency_id
    };
  });

  let available_days = [];
  if (tour.valid_days) {
    if (tour.valid_days.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(tour.valid_days);
        const daysMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
        Object.keys(parsed).forEach(dayName => {
          const lowerName = dayName.toLowerCase();
          if (parsed[dayName] === true && daysMap[lowerName] !== undefined) {
            available_days.push({ day_of_week: daysMap[lowerName] });
          }
        });
      } catch (e) {
        console.error("Error parsing valid_days JSON:", e);
      }
    } else {
      available_days = tour.valid_days.split(',').map(x => x.trim()).filter(x => x).map(x => ({
        day_of_week: parseInt(x)
      })).filter(x => !isNaN(x.day_of_week));
    }
  }

  const tour_days = (tour.tour_days || []).map(day => {
    return {
      id: day.id,
      tour_id: day.tour_id,
      day: day.day,
      itinerary: day.itinerary,
      details: (day.tour_details || []).map(detail => {
        return {
          id: detail.id,
          tour_day_id: detail.tour_day_id,
          from_time: detail.from_time || '',
          to_time: detail.to_time || '',
          city: detail.city || '',
          type_of_tour: detail.type_of_tour || '',
          hotel_id: detail.hotel_id,
          hotel_name: detail.hotel_name || '',
          room_type_id: detail.room_type_id,
          room_type: detail.room_type || '',
          excursion_id: detail.excursion_id,
          excursion_name: detail.excursion_name || '',
          transfer_id: detail.transfer_id,
          transfer_name: detail.transfer_name || ''
        };
      })
    };
  });

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
    available_days,
    tour_days,
    documents
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
    const tour_days = data.tour_days || [];

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
            single_room_price: parseFloat(p.single_price ?? p.single_room_price ?? 0),
            double_room_price: parseFloat(p.double_price ?? p.double_room_price ?? 0),
            triple_room_price: parseFloat(p.triple_price ?? p.triple_room_price ?? 0),
            currency_id: p.currency_id || null
          }))
        } : undefined,
        tour_days: tour_days.length > 0 ? {
          create: tour_days.map(d => ({
            day: parseInt(d.day),
            itinerary: d.itinerary || '',
            tour_details: d.details && d.details.length > 0 ? {
              create: d.details.map(detail => ({
                from_time: detail.from_time || '',
                to_time: detail.to_time || '',
                city: detail.city || '',
                type_of_tour: detail.type_of_tour || '',
                hotel_id: detail.hotel_id ? parseInt(detail.hotel_id) : null,
                hotel_name: detail.hotel_name || '',
                room_type_id: detail.room_type_id ? parseInt(detail.room_type_id) : null,
                room_type: detail.room_type || '',
                excursion_id: detail.excursion_id ? parseInt(detail.excursion_id) : null,
                excursion_name: detail.excursion_name || '',
                transfer_id: detail.transfer_id ? parseInt(detail.transfer_id) : null,
                transfer_name: detail.transfer_name || ''
              }))
            } : undefined
          }))
        } : undefined
      },
      include: {
        tour_pricing: true,
        tour_days: {
          include: {
            tour_details: true
          }
        }
      }
    });
    return res.status(201).json(formatTourResponse(tour));
  } catch (err) { next(err); }
}

export async function getTourByID(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid tour ID');

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const tour = await prisma.tours.findUnique({
      where: { id },
      include: {
        tour_pricing: { include: { currencies: true } },
        tour_days: {
          include: {
            tour_details: true
          }
        }
      }
    });
    if (!tour) return res.status(404).send('Tour not found');
    const docs = await prisma.service_documents.findMany({
      where: { service_type: 'tour', service_id: tour.id }
    });
    return res.json(formatTourResponse(tour, markupGroup, markups, docs));
  } catch (err) { next(err); }
}

export async function getAllTours(req, res, next) {
  try {
    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const tours = await prisma.tours.findMany({
      include: {
        tour_pricing: { include: { currencies: true } },
        tour_days: {
          include: {
            tour_details: true
          }
        }
      }
    });
    const docs = await prisma.service_documents.findMany({
      where: { service_type: 'tour' }
    });
    const formatted = tours.map(t => formatTourResponse(t, markupGroup, markups, docs.filter(d => d.service_id === t.id)));
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

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const tours = await prisma.tours.findMany({
      include: {
        tour_pricing: { include: { currencies: true } },
        tour_days: {
          include: {
            tour_details: true
          }
        }
      }
    });
    const docs = await prisma.service_documents.findMany({
      where: { service_type: 'tour' }
    });
    const formatted = tours.map(t => formatTourResponse(t, markupGroup, markups, docs.filter(d => d.service_id === t.id)));
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

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const tours = await prisma.tours.findMany({
      where,
      include: {
        tour_pricing: from_date && to_date ? {
          where: {
            start_date: { lte: new Date(to_date) },
            end_date: { gte: new Date(from_date) }
          },
          include: { currencies: true }
        } : { include: { currencies: true } },
        tour_days: {
          include: {
            tour_details: true
          }
        }
      }
    });

    // Filter by day of week if from_date provided
    let filtered = tours;
    if (from_date) {
      const requestedDayOfWeek = new Date(from_date).getDay(); // 0=Sun, 1=Mon, ...
      filtered = tours.filter(tour => {
        // If valid_days not set, tour is available every day
        if (!tour.valid_days) return true;

        // Handle both format "1,2,3" and JSON "{"mon":false,...}"
        try {
          if (tour.valid_days.trim().startsWith('{')) {
            const parsed = JSON.parse(tour.valid_days);
            const daysMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
            // Find key in parsed case-insensitively
            const parsedKeys = Object.keys(parsed);
            const daysMapKeys = Object.keys(daysMap);
            const dayName = daysMapKeys.find(k => daysMap[k] === requestedDayOfWeek);
            if (dayName) {
              const matchedKey = parsedKeys.find(k => k.toLowerCase() === dayName);
              if (matchedKey) return parsed[matchedKey] === true;
            }
            return false;
          }
        } catch (e) {
          console.error("Error parsing valid_days JSON:", e);
        }

        const validDays = tour.valid_days.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
        if (validDays.length === 0) return true;
        return validDays.includes(requestedDayOfWeek);
      });
    }

    // Exclude tours that have no pricing for the requested date range (when date filter is applied)
    if (from_date && to_date) {
      filtered = filtered.filter(tour => tour.tour_pricing.length > 0);
    }

    const docs = await prisma.service_documents.findMany({
      where: { service_type: 'tour' }
    });
    const formatted = filtered.map(t => formatTourResponse(t, markupGroup, markups, docs.filter(d => d.service_id === t.id)));
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
    const tour_days = data.tour_days || [];

    await prisma.$transaction(async (tx) => {
      await tx.tour_pricing.deleteMany({ where: { tour_id: id } });
      await tx.tour_details.deleteMany({
        where: {
          tour_days: {
            tour_id: id
          }
        }
      });
      await tx.tour_days.deleteMany({ where: { tour_id: id } });

      // Build update data object — only include fields that are defined to avoid Prisma undefined error
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.duration !== undefined) updateData.duration = data.duration;
      if (data.route !== undefined) updateData.route = data.route;
      if (data.tot !== undefined || data.departures !== undefined) updateData.departures = data.tot ?? data.departures;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.country !== undefined) updateData.country = data.country;
      if (valid_days !== undefined) updateData.valid_days = valid_days;
      if (data.display_order !== undefined) updateData.display_order = data.display_order;
      if (pricings.length > 0) {
        updateData.tour_pricing = {
          create: pricings.map(p => ({
            start_date: new Date(p.start_date),
            end_date: new Date(p.end_date),
            single_room_price: parseFloat(p.single_price ?? p.single_room_price ?? 0),
            double_room_price: parseFloat(p.double_price ?? p.double_room_price ?? 0),
            triple_room_price: parseFloat(p.triple_price ?? p.triple_room_price ?? 0),
            currency_id: p.currency_id || null
          }))
        };
      }
      if (tour_days.length > 0) {
        updateData.tour_days = {
          create: tour_days.map(d => ({
            day: parseInt(d.day),
            itinerary: d.itinerary || '',
            tour_details: d.details && d.details.length > 0 ? {
              create: d.details.map(detail => ({
                from_time: detail.from_time || '',
                to_time: detail.to_time || '',
                city: detail.city || '',
                type_of_tour: detail.type_of_tour || '',
                hotel_id: detail.hotel_id ? parseInt(detail.hotel_id) : null,
                hotel_name: detail.hotel_name || '',
                room_type_id: detail.room_type_id ? parseInt(detail.room_type_id) : null,
                room_type: detail.room_type || '',
                excursion_id: detail.excursion_id ? parseInt(detail.excursion_id) : null,
                excursion_name: detail.excursion_name || '',
                transfer_id: detail.transfer_id ? parseInt(detail.transfer_id) : null,
                transfer_name: detail.transfer_name || ''
              }))
            } : undefined
          }))
        };
      }

      await tx.tours.update({
        where: { id },
        data: updateData
      });
    }, {
      maxWait: 15000,
      timeout: 30000
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
    if (err.message && (err.message.includes('not found') || err.message.includes('not available') || err.message.includes('no ') || err.message.includes('mismatch') || err.message.includes('invalid'))) {
      return res.status(400).json({ code: 400, message: err.message });
    }
    next(err);
  }
}
