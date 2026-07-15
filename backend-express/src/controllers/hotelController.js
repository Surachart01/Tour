import prisma from '../config/db.js';
import { calculateHotelCostLogic, calculateMarkupRoomType } from '../utils/pricing.js';

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanForPrisma(value) {
  if (Array.isArray(value)) {
    return value.map(cleanForPrisma);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, cleanForPrisma(entryValue)])
    );
  }
  return value;
}

function normalizeHotelContacts(rawContacts) {
  const seenEmails = new Set();
  return asArray(rawContacts)
    .map(c => ({
      contact_name: (c.name ?? c.contact_name ?? '').toString().trim() || null,
      email: (c.email ?? '').toString().trim() || null,
      telephone: (c.tel ?? c.telephone ?? '').toString().trim() || null,
      fax: (c.fax ?? '').toString().trim() || null
    }))
    .filter(c => c.contact_name || c.email || c.telephone || c.fax)
    .filter(c => {
      if (!c.email) return true;
      const key = c.email.toLowerCase();
      if (seenEmails.has(key)) return false;
      seenEmails.add(key);
      return true;
    });
}

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function textOrNull(value) {
  if (isBlank(value)) return null;
  const text = String(value).trim();
  return text || null;
}

function textOrDefault(value, fallback = '') {
  const text = textOrNull(value);
  return text || fallback;
}

function requiredText(value, label) {
  const text = textOrNull(value);
  if (!text) throw validationError(`${label} is required.`);
  return text;
}

function toNumber(value, fallback = 0) {
  if (isBlank(value)) return fallback;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value) {
  if (isBlank(value)) return null;
  return toNumber(value, 0);
}

function toInt(value, fallback = 0) {
  if (isBlank(value)) return fallback;
  const parsed = parseInt(String(value).replace(/,/g, '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableInt(value) {
  if (isBlank(value)) return null;
  return toInt(value, 0);
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['true', 'yes', '1', 'enabled'].includes(String(value).trim().toLowerCase());
}

function toDateOrNull(value) {
  if (isBlank(value)) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasMeaningfulValue(value) {
  if (isBlank(value)) return false;
  if (typeof value === 'number') return value !== 0;
  const text = String(value).replace(/,/g, '').trim();
  return text !== '' && text !== '-' && text !== '0';
}

function hasRoomTypeContent(rt) {
  if (!rt || typeof rt !== 'object') return false;
  return [
    rt.roomType, rt.name, rt.fromDate, rt.start_date, rt.toDate, rt.end_date,
    rt.price, rt.single_price, rt.double_price, rt.extraBed, rt.extra_bed_adult,
    rt.extra_bed_child, rt.extra_bed_shared, rt.foodCostAdult, rt.foodCostChild,
    rt.foodAdultLunch, rt.foodAdultDinner, rt.foodChildLunch, rt.foodChildDinner,
    rt.foodAdultAllinclusive, rt.foodChildAllinclusive, rt.allotment, rt.currency_id
  ].some(hasMeaningfulValue);
}

function normalizeRoomTypes(rawRoomTypes) {
  return asArray(rawRoomTypes)
    .map(rt => {
      if (!rt || typeof rt !== 'object') return null;
      const name = (rt.roomType ?? rt.name ?? '').toString().trim();
      const startDate = toDateOrNull(rt.fromDate ?? rt.start_date);
      const endDate = toDateOrNull(rt.toDate ?? rt.end_date);

      if (!hasRoomTypeContent(rt)) return null;
      if (!name || !startDate || !endDate) {
        throw validationError('Please check room type rows. Each row needs a room name, from date, and to date.');
      }

      return {
        name,
        start_date: startDate,
        end_date: endDate,
        allotment: toInt(rt.allotment),
        single_price: rt.price !== undefined ? toNumber(rt.price) : toNumber(rt.single_price),
        double_price: rt.price !== undefined ? toNumber(rt.price) : toNumber(rt.double_price),
        extra_bed_adult: rt.extraBed !== undefined ? toNumber(rt.extraBed) : toNumber(rt.extra_bed_adult),
        extra_bed_child: rt.extraBed !== undefined ? toNumber(rt.extraBed) : toNumber(rt.extra_bed_child),
        extra_bed_shared: rt.extraBed !== undefined ? toNumber(rt.extraBed) : toNumber(rt.extra_bed_shared),
        food_adult_abf: rt.foodCostAdult !== undefined ? toNumber(rt.foodCostAdult) : toNumber(rt.food_adult_abf),
        food_child_abf: rt.foodCostChild !== undefined ? toNumber(rt.foodCostChild) : toNumber(rt.food_child_abf),
        food_adult_lunch: rt.foodAdultLunch !== undefined ? toNumber(rt.foodAdultLunch) : toNumber(rt.food_adult_lunch),
        food_adult_dinner: rt.foodAdultDinner !== undefined ? toNumber(rt.foodAdultDinner) : toNumber(rt.food_adult_dinner),
        food_child_lunch: rt.foodChildLunch !== undefined ? toNumber(rt.foodChildLunch) : toNumber(rt.food_child_lunch),
        food_child_dinner: rt.foodChildDinner !== undefined ? toNumber(rt.foodChildDinner) : toNumber(rt.food_child_dinner),
        boarding_full_price: rt.foodAdultAllinclusive !== undefined
          ? toNumber(rt.foodAdultAllinclusive)
          : (rt.food_adult_all_inclusive !== undefined ? toNumber(rt.food_adult_all_inclusive) : toNumber(rt.boarding_full_price)),
        boarding_half_price: rt.foodChildAllinclusive !== undefined
          ? toNumber(rt.foodChildAllinclusive)
          : (rt.food_child_all_inclusive !== undefined ? toNumber(rt.food_child_all_inclusive) : toNumber(rt.boarding_half_price)),
        currency_id: toNullableInt(rt.currency_id)
      };
    })
    .filter(Boolean);
}

function normalizeHotelFees(data) {
  const fees = data.fees || {};
  return {
    late_checkout_fee: data.lateCheckoutAdd !== undefined ? toInt(data.lateCheckoutAdd) : toInt(fees.late_checkout_fee),
    early_checkin_fee: data.earlyCheckinAdd !== undefined ? toInt(data.earlyCheckinAdd) : toInt(fees.early_checkin_fee),
    late_checkout_21_fee: data.lateCheckout21Add !== undefined ? toInt(data.lateCheckout21Add) : toInt(fees.late_checkout_21_fee),
    currency_id: toNullableInt(fees.currency_id),
    christmas_dinner_fee: data.christmasDinner !== undefined ? toNullableNumber(data.christmasDinner) : toNullableNumber(fees.christmas_dinner_fee),
    new_year_dinner_fee: data.newYearDinner !== undefined ? toNullableNumber(data.newYearDinner) : toNullableNumber(fees.new_year_dinner_fee)
  };
}

function normalizeHotelPromotions(rawPromotions) {
  return asArray(rawPromotions)
    .filter(p => p && typeof p === 'object')
    .filter(p => [
      p.name, p.code, p.promotion_code, p.bookingFrom, p.booking_date_from,
      p.bookingTo, p.booking_date_to, p.travelFrom, p.travel_date_from,
      p.travelTo, p.travel_date_to, p.earlyBird, p.early_bird_days,
      p.minNights, p.minimum_nights, p.discount, p.discount_amount,
      p.freeMeals, p.free_meals_abf, p.free_meals_lunch, p.free_meals_dinner,
      p.description
    ].some(hasMeaningfulValue))
    .map(p => {
      const name = (p.name ?? '').toString().trim();
      const discountAmount = p.discount !== undefined ? toNumber(p.discount) : toNumber(p.discount_amount);
      return {
        name: name || (p.code || p.promotion_code || 'Promotion').toString().trim(),
        promotion_code: (p.code || p.promotion_code || '').toString().trim(),
        booking_date_from: toDateOrNull(p.bookingFrom ?? p.booking_date_from),
        booking_date_to: toDateOrNull(p.bookingTo ?? p.booking_date_to),
        travel_date_from: toDateOrNull(p.travelFrom ?? p.travel_date_from),
        travel_date_to: toDateOrNull(p.travelTo ?? p.travel_date_to),
        is_early_bird: p.earlyBird !== undefined ? toInt(p.earlyBird) > 0 : toBoolean(p.is_early_bird),
        early_bird_days: p.earlyBird !== undefined ? toNullableInt(p.earlyBird) : toNullableInt(p.early_bird_days),
        minimum_nights: p.minNights !== undefined ? toNullableInt(p.minNights) : toNullableInt(p.minimum_nights),
        enabled: toBoolean(p.enabled, true),
        discount_amount: discountAmount,
        discount_type: p.discount_type || '%',
        free_meals_abf: p.freeMeals !== undefined ? (toBoolean(p.freeMeals) ? 1 : 0) : toInt(p.free_meals_abf),
        free_meals_lunch: toInt(p.free_meals_lunch),
        free_meals_dinner: toInt(p.free_meals_dinner),
        valid_for_extra_beds: toBoolean(p.valid_for_extra_beds),
        description: textOrNull(p.description)
      };
    })
    .filter(p => p.name || p.promotion_code || p.discount_amount);
}

function promotionSortValue(value) {
  const date = toDateOrNull(value);
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function comparePromotions(a, b) {
  return promotionSortValue(a.booking_date_from) - promotionSortValue(b.booking_date_from)
    || promotionSortValue(a.booking_date_to) - promotionSortValue(b.booking_date_to)
    || String(a.promotion_code || '').localeCompare(String(b.promotion_code || ''), undefined, { numeric: true, sensitivity: 'base' })
    || String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
}

export function formatHotelResponse(hotel, markupGroup = '', markups = []) {
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

  const roomTypes = (hotel.room_types || []).map(rt => {
    let finalRt = rt;
    if (markupGroup && markups && markups.length > 0) {
      finalRt = calculateMarkupRoomType(rt, markupGroup, markups);
    }

    return {
      key: finalRt.id,
      id: finalRt.id,
      name: finalRt.name,
      roomType: finalRt.name,
      fromDate: finalRt.start_date ? finalRt.start_date.toISOString().split('T')[0] : '',
      toDate: finalRt.end_date ? finalRt.end_date.toISOString().split('T')[0] : '',
      start_date: finalRt.start_date,
      end_date: finalRt.end_date,
      updated_at: finalRt.updated_at,
      updatedAt: finalRt.updated_at,
      price: finalRt.single_price ? parseFloat(finalRt.single_price) : 0,
      extraBed: finalRt.extra_bed_adult ? parseFloat(finalRt.extra_bed_adult) : 0,
      foodCostAdult: finalRt.food_adult_abf ? parseFloat(finalRt.food_adult_abf) : 0,
      foodCostChild: finalRt.food_child_abf ? parseFloat(finalRt.food_child_abf) : 0,
      single_price: finalRt.single_price ? parseFloat(finalRt.single_price) : 0,
      double_price: finalRt.double_price ? parseFloat(finalRt.double_price) : 0,
      extra_bed_adult: finalRt.extra_bed_adult ? parseFloat(finalRt.extra_bed_adult) : 0,
      extra_bed_child: finalRt.extra_bed_child ? parseFloat(finalRt.extra_bed_child) : 0,
      extra_bed_shared: finalRt.extra_bed_shared ? parseFloat(finalRt.extra_bed_shared) : 0,
      food_adult_abf: finalRt.food_adult_abf ? parseFloat(finalRt.food_adult_abf) : 0,
      food_adult_lunch: finalRt.food_adult_lunch ? parseFloat(finalRt.food_adult_lunch) : 0,
      food_adult_dinner: finalRt.food_adult_dinner ? parseFloat(finalRt.food_adult_dinner) : 0,
      food_child_abf: finalRt.food_child_abf ? parseFloat(finalRt.food_child_abf) : 0,
      food_child_lunch: finalRt.food_child_lunch ? parseFloat(finalRt.food_child_lunch) : 0,
      food_child_dinner: finalRt.food_child_dinner ? parseFloat(finalRt.food_child_dinner) : 0,
      food_adult_all_inclusive: finalRt.food_adult_all_inclusive !== undefined
        ? parseFloat(finalRt.food_adult_all_inclusive || 0)
        : parseFloat(finalRt.boarding_full_price || 0),
      food_child_all_inclusive: finalRt.food_child_all_inclusive !== undefined
        ? parseFloat(finalRt.food_child_all_inclusive || 0)
        : parseFloat(finalRt.boarding_half_price || 0),
      allotment: finalRt.allotment || 0,
      currency_id: finalRt.currency_id
    };
  });

  const promotions = [...(hotel.hotel_promotions || [])].sort(comparePromotions).map(p => ({
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
    free_meals_lunch: p.free_meals_lunch || 0,
    free_meals_dinner: p.free_meals_dinner || 0,
    discount: p.discount_amount ? parseFloat(p.discount_amount) : 0,
    discount_amount: p.discount_amount ? parseFloat(p.discount_amount) : 0,
    discount_type: p.discount_type || '%',
    valid_for_extra_beds: p.valid_for_extra_beds || false,
    description: p.description || '',
    enabled: p.enabled ?? true
  }));

  const feesObj = {
    id: fees.id,
    early_checkin_fee: fees.early_checkin_fee ? parseFloat(fees.early_checkin_fee) : 0,
    late_checkout_fee: fees.late_checkout_fee ? parseFloat(fees.late_checkout_fee) : 0,
    late_checkout_21_fee: fees.late_checkout_21_fee ? parseFloat(fees.late_checkout_21_fee) : 0,
    christmas_dinner_fee: fees.christmas_dinner_fee ? parseFloat(fees.christmas_dinner_fee) : 0,
    new_year_dinner_fee: fees.new_year_dinner_fee ? parseFloat(fees.new_year_dinner_fee) : 0,
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
    updated_at: hotel.updated_at,
    updatedAt: hotel.updated_at,
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
    const name = requiredText(data.name, 'Hotel Name');
    const city = requiredText(data.city, 'City');
    const contacts = normalizeHotelContacts(data.contacts ?? data.hotel_contacts);
    const rawRoomTypes = asArray(data.roomTypes ?? data.room_types);
    const roomTypes = normalizeRoomTypes(rawRoomTypes);
    const promotions = normalizeHotelPromotions(data.promotions ?? data.hotel_promotions);
    const hotel = await prisma.hotels.create({
      data: cleanForPrisma({
        name,
        city,
        notes: textOrNull(data.notes),
        address: textOrNull(data.address),
        country: textOrDefault(data.country, 'Thailand'),
        display_order: toInt(data.display_order),
        user_id: toNullableInt(data.user_id),
        hotel_contacts: contacts.length ? { create: contacts } : undefined,
        room_types: roomTypes.length ? { create: roomTypes } : undefined,
        hotel_fees: { create: [normalizeHotelFees(data)] },
        hotel_promotions: promotions.length ? { create: promotions } : undefined
      }),
      include: { hotel_contacts: true, room_types: true, hotel_fees: true, hotel_promotions: true }
    });
    return res.status(201).json(formatHotelResponse(hotel));
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).send(err.message);
    next(err);
  }
}

export async function getHotel(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid hotel ID');

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const hotel = await prisma.hotels.findUnique({
      where: { id },
      include: { hotel_contacts: true, room_types: true, hotel_fees: true, hotel_promotions: true, stop_sales: true }
    });
    if (!hotel) return res.status(404).send('Hotel not found');
    return res.json(formatHotelResponse(hotel, markupGroup, markups));
  } catch (err) { next(err); }
}

export async function listHotels(req, res, next) {
  try {
    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const hotels = await prisma.hotels.findMany({
      where: { deleted_at: null },
      include: {
        hotel_contacts: true,
        room_types: true,
        hotel_fees: true,
        hotel_promotions: true
      }
    });
    const formatted = hotels.map(h => formatHotelResponse(h, markupGroup, markups));
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

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    const hotels = await prisma.hotels.findMany({
      where: { city, deleted_at: null },
      include: { room_types: true, hotel_contacts: true, hotel_fees: true, hotel_promotions: true }
    });
    const formatted = hotels.map(h => formatHotelResponse(h, markupGroup, markups));
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

    let markupGroup = '';
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      markupGroup = claims.markup_group || '';
    }
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

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
    const formatted = hotels.map(h => formatHotelResponse(h, markupGroup, markups));
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
    const name = requiredText(data.name, 'Hotel Name');
    const city = requiredText(data.city, 'City');
    const contacts = normalizeHotelContacts(data.contacts ?? data.hotel_contacts);
    const rawRoomTypes = asArray(data.roomTypes ?? data.room_types);
    const roomTypes = normalizeRoomTypes(rawRoomTypes);
    const promotions = normalizeHotelPromotions(data.promotions ?? data.hotel_promotions);

    // Delete existing related data and recreate
    await prisma.$transaction(async (tx) => {
      await tx.hotel_contacts.deleteMany({ where: { hotel_id: id } });
      await tx.room_types.deleteMany({ where: { hotel_id: id } });
      await tx.hotel_fees.deleteMany({ where: { hotel_id: id } });
      await tx.hotel_promotions.deleteMany({ where: { hotel_id: id } });

      await tx.hotels.update({
        where: { id },
        data: cleanForPrisma({
          name,
          city,
          notes: textOrNull(data.notes),
          address: textOrNull(data.address),
          country: textOrDefault(data.country, 'Thailand'),
          display_order: toInt(data.display_order),
          user_id: data.user_id !== undefined ? toNullableInt(data.user_id) : undefined,
          hotel_contacts: contacts.length ? { create: contacts } : undefined,
          room_types: roomTypes.length ? { create: roomTypes } : undefined,
          hotel_fees: { create: [normalizeHotelFees(data)] },
          hotel_promotions: promotions.length ? { create: promotions } : undefined
        })
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    const updatedHotel = await prisma.hotels.findUnique({
      where: { id },
      include: { hotel_contacts: true, room_types: true, hotel_fees: true, hotel_promotions: true, stop_sales: true }
    });

    return res.json(formatHotelResponse(updatedHotel));
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).send(err.message);
    next(err);
  }
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

    const hotel = await prisma.hotels.findUnique({
      where: { id: parseInt(request.hotel_id) }
    });

    if (!hotel) {
      return res.status(404).send('Hotel not found');
    }

    // Fetch matching room types for the requested hotel
    const matchingRoomTypes = await prisma.room_types.findMany({
      where: {
        hotel_id: parseInt(request.hotel_id)
      }
    });

    // Fetch hotel fees
    const feesRecord = await prisma.hotel_fees.findFirst({
      where: { hotel_id: parseInt(request.hotel_id) }
    });

    // Fetch promotion if coupon code provided
    let promotion = null;
    if (request.coupon_code) {
      promotion = await prisma.hotel_promotions.findMany({
        where: {
          hotel_id: parseInt(request.hotel_id),
          promotion_code: request.coupon_code
        },
        orderBy: [
          { booking_date_from: 'asc' },
          { booking_date_to: 'asc' },
          { id: 'asc' }
        ]
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
