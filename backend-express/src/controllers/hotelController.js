import prisma from '../config/db.js';
import { calculateHotelCostLogic } from '../utils/pricing.js';

export function formatHotelResponse(hotel) {
  if (!hotel) return null;
  const fees = hotel.hotel_fees && hotel.hotel_fees[0] ? hotel.hotel_fees[0] : {};
  
  const contacts = (hotel.hotel_contacts || []).map(c => ({
    key: c.id,
    id: c.id,
    name: c.contact_name,
    contact_name: c.contact_name,
    email: c.email,
    tel: c.telephone,
    telephone: c.telephone,
    fax: c.fax
  }));

  const roomTypes = (hotel.room_types || []).map(rt => ({
    key: rt.id,
    id: rt.id,
    name: rt.name,
    roomType: rt.name,
    fromDate: rt.start_date ? rt.start_date.toISOString().split('T')[0] : '',
    toDate: rt.end_date ? rt.end_date.toISOString().split('T')[0] : '',
    start_date: rt.start_date,
    end_date: rt.end_date,
    price: rt.single_price ? parseFloat(rt.single_price) : 0,
    extraBed: rt.extra_bed_adult ? parseFloat(rt.extra_bed_adult) : 0,
    foodCostAdult: rt.food_adult_abf ? parseFloat(rt.food_adult_abf) : 0,
    foodCostChild: rt.food_child_abf ? parseFloat(rt.food_child_abf) : 0,
    single_price: rt.single_price ? parseFloat(rt.single_price) : 0,
    double_price: rt.double_price ? parseFloat(rt.double_price) : 0,
    extra_bed_adult: rt.extra_bed_adult ? parseFloat(rt.extra_bed_adult) : 0,
    extra_bed_child: rt.extra_bed_child ? parseFloat(rt.extra_bed_child) : 0,
    extra_bed_shared: rt.extra_bed_shared ? parseFloat(rt.extra_bed_shared) : 0,
    food_adult_abf: rt.food_adult_abf ? parseFloat(rt.food_adult_abf) : 0,
    food_adult_lunch: rt.food_adult_lunch ? parseFloat(rt.food_adult_lunch) : 0,
    food_adult_dinner: rt.food_adult_dinner ? parseFloat(rt.food_adult_dinner) : 0,
    food_child_abf: rt.food_child_abf ? parseFloat(rt.food_child_abf) : 0,
    food_child_lunch: rt.food_child_lunch ? parseFloat(rt.food_child_lunch) : 0,
    food_child_dinner: rt.food_child_dinner ? parseFloat(rt.food_child_dinner) : 0,
    allotment: rt.allotment || 0,
    currency_id: rt.currency_id
  }));

  const promotions = (hotel.hotel_promotions || []).map(p => ({
    key: p.id,
    id: p.id,
    code: p.promotion_code,
    promotion_code: p.promotion_code,
    name: p.name,
    bookingFrom: p.booking_date_from ? p.booking_date_from.toISOString().split('T')[0] : null,
    bookingTo: p.booking_date_to ? p.booking_date_to.toISOString().split('T')[0] : null,
    travelFrom: p.travel_date_from ? p.travel_date_from.toISOString().split('T')[0] : null,
    travelTo: p.travel_date_to ? p.travel_date_to.toISOString().split('T')[0] : null,
    booking_date_from: p.booking_date_from,
    booking_date_to: p.booking_date_to,
    travel_date_from: p.travel_date_from,
    travel_date_to: p.travel_date_to,
    earlyBird: p.early_bird_days || 0,
    early_bird_days: p.early_bird_days || 0,
    minNights: p.minimum_nights || 0,
    minimum_nights: p.minimum_nights || 0,
    freeMeals: p.free_meals_abf > 0,
    free_meals_abf: p.free_meals_abf || 0,
    discount: p.discount_amount ? parseFloat(p.discount_amount) : 0,
    discount_amount: p.discount_amount ? parseFloat(p.discount_amount) : 0,
    enabled: p.enabled ?? true
  }));

  const feesObj = {
    id: fees.id,
    early_checkin_fee: fees.early_checkin_fee ? parseFloat(fees.early_checkin_fee) : 0,
    late_checkout_fee: fees.late_checkout_fee ? parseFloat(fees.late_checkout_fee) : 0,
    christmas_dinner_fee: fees.christmas_dinner_fee ? parseFloat(fees.christmas_dinner_fee) : 0,
    new_year_dinner_fee: fees.new_year_dinner_fee ? parseFloat(fees.new_year_dinner_fee) : 0,
    late_checkout_21_fee: fees.late_checkout_21_fee ? parseFloat(fees.late_checkout_21_fee) : 0,
    currency_id: fees.currency_id
  };

  return {
    id: hotel.id,
    name: hotel.name,
    city: hotel.city,
    country: hotel.country,
    address: hotel.address,
    notes: hotel.notes,
    display_order: hotel.display_order,
    order: (hotel.display_order === 0 || hotel.display_order === null || hotel.display_order === undefined) ? 100000 : hotel.display_order,
    user_id: hotel.user_id,
    earlyCheckinAdd: fees.early_checkin_fee ? parseFloat(fees.early_checkin_fee) : 0,
    lateCheckoutAdd: fees.late_checkout_fee ? parseFloat(fees.late_checkout_fee) : 0,
    christmasDinner: fees.christmas_dinner_fee || '',
    newYearDinner: fees.new_year_dinner_fee || '',
    contacts,
    roomTypes,
    room_types: roomTypes,
    promotions,
    fees: feesObj
  };
}

export async function createHotel(req, res, next) {
  try {
    const data = req.body;
    const hotel = await prisma.hotels.create({
      data: {
        name: data.name,
        city: data.city,
        notes: data.notes || null,
        address: data.address || null,
        country: data.country || "Thailand",
        display_order: data.display_order !== undefined ? parseInt(data.display_order) : 0,
        user_id: data.user_id ? parseInt(data.user_id) : null,
        hotel_contacts: (data.contacts || data.hotel_contacts) ? {
          create: (data.contacts || data.hotel_contacts).map(c => ({
            contact_name: c.name || c.contact_name,
            email: c.email,
            telephone: c.tel || c.telephone,
            fax: c.fax
          }))
        } : undefined,
        room_types: (data.roomTypes || data.room_types) ? {
          create: (data.roomTypes || data.room_types).map(rt => ({
            name: rt.roomType || rt.name,
            start_date: new Date(rt.fromDate || rt.start_date),
            end_date: new Date(rt.toDate || rt.end_date),
            allotment: rt.allotment !== undefined ? parseInt(rt.allotment) : 0,
            single_price: rt.price !== undefined ? parseFloat(rt.price) : (rt.single_price ? parseFloat(rt.single_price) : 0),
            double_price: rt.price !== undefined ? parseFloat(rt.price) : (rt.double_price ? parseFloat(rt.double_price) : 0),
            extra_bed_adult: rt.extraBed !== undefined ? parseFloat(rt.extraBed) : (rt.extra_bed_adult ? parseFloat(rt.extra_bed_adult) : 0),
            extra_bed_child: rt.extraBed !== undefined ? parseFloat(rt.extraBed) : (rt.extra_bed_child ? parseFloat(rt.extra_bed_child) : 0),
            extra_bed_shared: rt.extraBed !== undefined ? parseFloat(rt.extraBed) : (rt.extra_bed_shared ? parseFloat(rt.extra_bed_shared) : 0),
            food_adult_abf: rt.foodCostAdult !== undefined ? parseFloat(rt.foodCostAdult) : (rt.food_adult_abf ? parseFloat(rt.food_adult_abf) : 0),
            food_child_abf: rt.foodCostChild !== undefined ? parseFloat(rt.foodCostChild) : (rt.food_child_abf ? parseFloat(rt.food_child_abf) : 0),
            food_adult_lunch: rt.foodAdultLunch !== undefined ? parseFloat(rt.foodAdultLunch) : (rt.food_adult_lunch ? parseFloat(rt.food_adult_lunch) : 0),
            food_adult_dinner: rt.foodAdultDinner !== undefined ? parseFloat(rt.foodAdultDinner) : (rt.food_adult_dinner ? parseFloat(rt.food_adult_dinner) : 0),
            food_child_lunch: rt.foodChildLunch !== undefined ? parseFloat(rt.foodChildLunch) : (rt.food_child_lunch ? parseFloat(rt.food_child_lunch) : 0),
            food_child_dinner: rt.foodChildDinner !== undefined ? parseFloat(rt.foodChildDinner) : (rt.food_child_dinner ? parseFloat(rt.food_child_dinner) : 0),
            boarding_half_price: rt.boarding_half_price,
            boarding_full_price: rt.boarding_full_price,
            currency_id: rt.currency_id !== undefined ? parseInt(rt.currency_id) : null
          }))
        } : undefined,
        hotel_fees: (data.earlyCheckinAdd !== undefined || data.lateCheckoutAdd !== undefined || data.fees) ? {
          create: [{
            late_checkout_fee: data.lateCheckoutAdd !== undefined ? parseFloat(data.lateCheckoutAdd) : (data.fees?.late_checkout_fee || 0),
            early_checkin_fee: data.earlyCheckinAdd !== undefined ? parseFloat(data.earlyCheckinAdd) : (data.fees?.early_checkin_fee || 0),
            late_checkout_21_fee: data.fees?.late_checkout_21_fee || 0,
            currency_id: data.fees?.currency_id,
            christmas_dinner_fee: data.christmasDinner !== undefined ? data.christmasDinner : (data.fees?.christmas_dinner_fee || ""),
            new_year_dinner_fee: data.newYearDinner !== undefined ? data.newYearDinner : (data.fees?.new_year_dinner_fee || "")
          }]
        } : undefined,
        hotel_promotions: (data.promotions || data.hotel_promotions) ? {
          create: (data.promotions || data.hotel_promotions).map(p => ({
            name: p.name,
            promotion_code: p.code || p.promotion_code || '',
            booking_date_from: p.bookingFrom ? new Date(p.bookingFrom) : (p.booking_date_from ? new Date(p.booking_date_from) : null),
            booking_date_to: p.bookingTo ? new Date(p.bookingTo) : (p.booking_date_to ? new Date(p.booking_date_to) : null),
            travel_date_from: p.travelFrom ? new Date(p.travelFrom) : (p.travel_date_from ? new Date(p.travel_date_from) : null),
            travel_date_to: p.travelTo ? new Date(p.travelTo) : (p.travel_date_to ? new Date(p.travel_date_to) : null),
            is_early_bird: p.earlyBird !== undefined ? (parseInt(p.earlyBird) > 0) : (p.is_early_bird || false),
            early_bird_days: p.earlyBird !== undefined ? parseInt(p.earlyBird) : (p.early_bird_days || null),
            minimum_nights: p.minNights !== undefined ? parseInt(p.minNights) : (p.minimum_nights || null),
            enabled: p.enabled !== undefined ? Boolean(p.enabled) : true,
            discount_amount: p.discount !== undefined ? parseFloat(p.discount) : (p.discount_amount ? parseFloat(p.discount_amount) : 0),
            discount_type: p.discount_type || '%',
            free_meals_abf: p.freeMeals !== undefined ? (p.freeMeals ? 1 : 0) : (p.free_meals_abf || 0)
          }))
        } : undefined
      },
      include: { hotel_contacts: true, room_types: true, hotel_fees: true, hotel_promotions: true }
    });
    return res.status(201).json(formatHotelResponse(hotel));
  } catch (err) { next(err); }
}

export async function getHotel(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid hotel ID');
    const hotel = await prisma.hotels.findUnique({
      where: { id },
      include: { hotel_contacts: true, room_types: true, hotel_fees: true, hotel_promotions: true, stop_sales: true }
    });
    if (!hotel) return res.status(404).send('Hotel not found');
    return res.json(formatHotelResponse(hotel));
  } catch (err) { next(err); }
}

export async function listHotels(req, res, next) {
  try {
    const hotels = await prisma.hotels.findMany({
      where: { deleted_at: null },
      include: {
        hotel_contacts: true,
        room_types: true,
        hotel_fees: true,
        hotel_promotions: true
      }
    });
    const formatted = hotels.map(formatHotelResponse);
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function listHotelsByCity(req, res, next) {
  try {
    const city = req.query.city;
    if (!city) return res.status(400).send('City parameter is required');
    const hotels = await prisma.hotels.findMany({
      where: { city, deleted_at: null },
      include: { room_types: true, hotel_contacts: true, hotel_fees: true, hotel_promotions: true }
    });
    const formatted = hotels.map(formatHotelResponse);
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function listAvailableHotelsByCity(req, res, next) {
  try {
    const { city, from_date, to_date, keyword } = req.query;
    if (!city) return res.status(400).send('City parameter is required');

    let where = { city, deleted_at: null };
    if (keyword) {
      where.name = { contains: keyword, mode: 'insensitive' };
    }

    const hotels = await prisma.hotels.findMany({
      where,
      include: {
        room_types: from_date && to_date ? {
          where: {
            start_date: { lte: new Date(to_date) },
            end_date: { gte: new Date(from_date) }
          }
        } : true,
        hotel_contacts: true,
        hotel_fees: true,
        hotel_promotions: from_date && to_date ? {
          where: {
            OR: [
              { travel_date_from: { lte: new Date(to_date) }, travel_date_to: { gte: new Date(from_date) } },
              { travel_date_from: null }
            ]
          }
        } : true,
        stop_sales: true
      }
    });
    const formatted = hotels.map(formatHotelResponse);
    formatted.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    return res.json(formatted);
  } catch (err) { next(err); }
}

export async function updateHotel(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid hotel ID');
    const data = req.body;

    // Delete existing related data and recreate
    await prisma.$transaction(async (tx) => {
      await tx.hotel_contacts.deleteMany({ where: { hotel_id: id } });
      await tx.room_types.deleteMany({ where: { hotel_id: id } });
      await tx.hotel_fees.deleteMany({ where: { hotel_id: id } });
      await tx.hotel_promotions.deleteMany({ where: { hotel_id: id } });

      await tx.hotels.update({
        where: { id },
        data: {
          name: data.name,
          city: data.city,
          notes: data.notes,
          address: data.address,
          country: data.country !== undefined ? data.country : undefined,
          display_order: data.display_order !== undefined ? parseInt(data.display_order) : undefined,
          user_id: data.user_id !== undefined ? (data.user_id ? parseInt(data.user_id) : null) : undefined,
          hotel_contacts: (data.contacts || data.hotel_contacts) ? {
            create: (data.contacts || data.hotel_contacts).map(c => ({
              contact_name: c.name || c.contact_name,
              email: c.email,
              telephone: c.tel || c.telephone,
              fax: c.fax
            }))
          } : undefined,
          room_types: (data.roomTypes || data.room_types) ? {
            create: (data.roomTypes || data.room_types).map(rt => ({
              name: rt.roomType || rt.name,
              start_date: new Date(rt.fromDate || rt.start_date),
              end_date: new Date(rt.toDate || rt.end_date),
              allotment: rt.allotment !== undefined ? parseInt(rt.allotment) : 0,
              single_price: rt.price !== undefined ? parseFloat(rt.price) : (rt.single_price ? parseFloat(rt.single_price) : 0),
              double_price: rt.price !== undefined ? parseFloat(rt.price) : (rt.double_price ? parseFloat(rt.double_price) : 0),
              extra_bed_adult: rt.extraBed !== undefined ? parseFloat(rt.extraBed) : (rt.extra_bed_adult ? parseFloat(rt.extra_bed_adult) : 0),
              extra_bed_child: rt.extraBed !== undefined ? parseFloat(rt.extraBed) : (rt.extra_bed_child ? parseFloat(rt.extra_bed_child) : 0),
              extra_bed_shared: rt.extraBed !== undefined ? parseFloat(rt.extraBed) : (rt.extra_bed_shared ? parseFloat(rt.extra_bed_shared) : 0),
              food_adult_abf: rt.foodCostAdult !== undefined ? parseFloat(rt.foodCostAdult) : (rt.food_adult_abf ? parseFloat(rt.food_adult_abf) : 0),
              food_child_abf: rt.foodCostChild !== undefined ? parseFloat(rt.foodCostChild) : (rt.food_child_abf ? parseFloat(rt.food_child_abf) : 0),
              food_adult_lunch: rt.foodAdultLunch !== undefined ? parseFloat(rt.foodAdultLunch) : (rt.food_adult_lunch ? parseFloat(rt.food_adult_lunch) : 0),
              food_adult_dinner: rt.foodAdultDinner !== undefined ? parseFloat(rt.foodAdultDinner) : (rt.food_adult_dinner ? parseFloat(rt.food_adult_dinner) : 0),
              food_child_lunch: rt.foodChildLunch !== undefined ? parseFloat(rt.foodChildLunch) : (rt.food_child_lunch ? parseFloat(rt.food_child_lunch) : 0),
              food_child_dinner: rt.foodChildDinner !== undefined ? parseFloat(rt.foodChildDinner) : (rt.food_child_dinner ? parseFloat(rt.food_child_dinner) : 0),
              boarding_half_price: rt.boarding_half_price,
              boarding_full_price: rt.boarding_full_price,
              currency_id: rt.currency_id !== undefined ? parseInt(rt.currency_id) : null
            }))
          } : undefined,
          hotel_fees: (data.earlyCheckinAdd !== undefined || data.lateCheckoutAdd !== undefined || data.fees) ? {
            create: [{
              late_checkout_fee: data.lateCheckoutAdd !== undefined ? parseFloat(data.lateCheckoutAdd) : (data.fees?.late_checkout_fee || 0),
              early_checkin_fee: data.earlyCheckinAdd !== undefined ? parseFloat(data.earlyCheckinAdd) : (data.fees?.early_checkin_fee || 0),
              late_checkout_21_fee: data.fees?.late_checkout_21_fee || 0,
              currency_id: data.fees?.currency_id,
              christmas_dinner_fee: data.christmasDinner !== undefined ? data.christmasDinner : (data.fees?.christmas_dinner_fee || ""),
              new_year_dinner_fee: data.newYearDinner !== undefined ? data.newYearDinner : (data.fees?.new_year_dinner_fee || "")
            }]
          } : undefined,
          hotel_promotions: (data.promotions || data.hotel_promotions) ? {
            create: (data.promotions || data.hotel_promotions).map(p => ({
              name: p.name,
              promotion_code: p.code || p.promotion_code || '',
              booking_date_from: p.bookingFrom ? new Date(p.bookingFrom) : (p.booking_date_from ? new Date(p.booking_date_from) : null),
              booking_date_to: p.bookingTo ? new Date(p.bookingTo) : (p.booking_date_to ? new Date(p.booking_date_to) : null),
              travel_date_from: p.travelFrom ? new Date(p.travelFrom) : (p.travel_date_from ? new Date(p.travel_date_from) : null),
              travel_date_to: p.travelTo ? new Date(p.travelTo) : (p.travel_date_to ? new Date(p.travel_date_to) : null),
              is_early_bird: p.earlyBird !== undefined ? (parseInt(p.earlyBird) > 0) : (p.is_early_bird || false),
              early_bird_days: p.earlyBird !== undefined ? parseInt(p.earlyBird) : (p.early_bird_days || null),
              minimum_nights: p.minNights !== undefined ? parseInt(p.minNights) : (p.minimum_nights || null),
              enabled: p.enabled !== undefined ? Boolean(p.enabled) : true,
              discount_amount: p.discount !== undefined ? parseFloat(p.discount) : (p.discount_amount ? parseFloat(p.discount_amount) : 0),
              discount_type: p.discount_type || '%',
              free_meals_abf: p.freeMeals !== undefined ? (p.freeMeals ? 1 : 0) : (p.free_meals_abf || 0)
            }))
          } : undefined
        }
      });
    });

    const updatedHotel = await prisma.hotels.findUnique({
      where: { id },
      include: { hotel_contacts: true, room_types: true, hotel_fees: true, hotel_promotions: true, stop_sales: true }
    });

    return res.json(formatHotelResponse(updatedHotel));
  } catch (err) { next(err); }
}

export async function deleteHotel(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid hotel ID');
    await prisma.hotels.delete({ where: { id } });
    return res.status(200).send('Hotel deleted successfully');
  } catch (err) { next(err); }
}

export async function listCities(req, res, next) {
  try {
    const cities = await prisma.currencies.findMany({ orderBy: { city: 'asc' } });
    return res.json({ cities, total: cities.length });
  } catch (err) { next(err); }
}

export async function calculateHotelCost(req, res, next) {
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

    const hotel = await prisma.hotels.findUnique({
      where: { id: parseInt(request.hotel_id) }
    });

    if (!hotel) {
      return res.status(404).send('Hotel not found');
    }

    // Fetch matching room types for the requested names
    const roomTypeNames = (request.room_types || []).map(rt => rt.room_type);
    const matchingRoomTypes = await prisma.room_types.findMany({
      where: {
        hotel_id: parseInt(request.hotel_id),
        name: { in: roomTypeNames }
      }
    });

    // Fetch hotel fees
    const feesRecord = await prisma.hotel_fees.findFirst({
      where: { hotel_id: parseInt(request.hotel_id) }
    });

    // Fetch promotion if coupon code provided
    let promotion = null;
    if (request.coupon_code) {
      promotion = await prisma.hotel_promotions.findFirst({
        where: {
          hotel_id: parseInt(request.hotel_id),
          promotion_code: request.coupon_code
        }
      });
    }

    const result = calculateHotelCostLogic(hotel, request, markupGroup, markups, matchingRoomTypes, feesRecord, promotion);
    return res.json(result);
  } catch (err) {
    if (err.message && (err.message.includes('not found') || err.message.includes('not available') || err.message.includes('need to') || err.message.includes('cannot be') || err.message.includes('not supported') || err.message.includes('not enough') || err.message.includes('applicable'))) {
      return res.status(400).send(err.message);
    }
    next(err);
  }
}
