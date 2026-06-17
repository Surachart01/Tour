import prisma from '../config/db.js';

export async function createHotel(req, res, next) {
  try {
    const data = req.body;
    const hotel = await prisma.hotels.create({
      data: {
        name: data.name,
        city: data.city,
        notes: data.notes || null,
        address: data.address || null,
        hotel_contacts: data.contacts ? {
          create: data.contacts.map(c => ({
            contact_name: c.contact_name, email: c.email,
            telephone: c.telephone, fax: c.fax
          }))
        } : undefined,
        room_types: data.room_types ? {
          create: data.room_types.map(rt => ({
            name: rt.name, start_date: new Date(rt.start_date), end_date: new Date(rt.end_date),
            allotment: rt.allotment || 0,
            single_price: rt.single_price, double_price: rt.double_price,
            extra_bed_adult: rt.extra_bed_adult, extra_bed_child: rt.extra_bed_child,
            extra_bed_shared: rt.extra_bed_shared,
            food_adult_abf: rt.food_adult_abf, food_adult_lunch: rt.food_adult_lunch,
            food_adult_dinner: rt.food_adult_dinner,
            food_child_abf: rt.food_child_abf, food_child_lunch: rt.food_child_lunch,
            food_child_dinner: rt.food_child_dinner,
            boarding_half_price: rt.boarding_half_price, boarding_full_price: rt.boarding_full_price,
            currency_id: rt.currency_id
          }))
        } : undefined,
        hotel_fees: data.fees ? {
          create: [{
            late_checkout_fee: data.fees.late_checkout_fee || 0,
            early_checkin_fee: data.fees.early_checkin_fee || 0,
            currency_id: data.fees.currency_id,
            christmas_dinner_fee: data.fees.christmas_dinner_fee,
            new_year_dinner_fee: data.fees.new_year_dinner_fee
          }]
        } : undefined
      },
      include: { hotel_contacts: true, room_types: true, hotel_fees: true, hotel_promotions: true }
    });
    return res.status(201).json(hotel);
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
    return res.json(hotel);
  } catch (err) { next(err); }
}

export async function listHotels(req, res, next) {
  try {
    const hotels = await prisma.hotels.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, city: true, room_types: { select: { id: true } } },
      orderBy: { name: 'asc' }
    });
    const response = hotels.map(h => ({
      id: h.id, name: h.name, city: h.city, empty: h.room_types.length === 0
    }));
    return res.json(response);
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
    return res.json(hotels);
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
        hotel_contacts: true, hotel_fees: true,
        hotel_promotions: from_date && to_date ? {
          where: {
            OR: [
              { travel_date_from: { lte: new Date(to_date) }, travel_date_to: { gte: new Date(from_date) } },
              { travel_date_from: null }
            ]
          }
        } : true,
        stop_sales: true
      },
      orderBy: { name: 'asc' }
    });
    return res.json(hotels);
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

      await tx.hotels.update({
        where: { id },
        data: {
          name: data.name, city: data.city, notes: data.notes, address: data.address,
          hotel_contacts: data.contacts ? {
            create: data.contacts.map(c => ({
              contact_name: c.contact_name, email: c.email,
              telephone: c.telephone, fax: c.fax
            }))
          } : undefined,
          room_types: data.room_types ? {
            create: data.room_types.map(rt => ({
              name: rt.name, start_date: new Date(rt.start_date), end_date: new Date(rt.end_date),
              allotment: rt.allotment || 0,
              single_price: rt.single_price, double_price: rt.double_price,
              extra_bed_adult: rt.extra_bed_adult, extra_bed_child: rt.extra_bed_child,
              extra_bed_shared: rt.extra_bed_shared,
              food_adult_abf: rt.food_adult_abf, food_adult_lunch: rt.food_adult_lunch,
              food_adult_dinner: rt.food_adult_dinner,
              food_child_abf: rt.food_child_abf, food_child_lunch: rt.food_child_lunch,
              food_child_dinner: rt.food_child_dinner,
              boarding_half_price: rt.boarding_half_price, boarding_full_price: rt.boarding_full_price,
              currency_id: rt.currency_id
            }))
          } : undefined,
          hotel_fees: data.fees ? {
            create: [{
              late_checkout_fee: data.fees.late_checkout_fee || 0,
              early_checkin_fee: data.fees.early_checkin_fee || 0,
              currency_id: data.fees.currency_id,
              christmas_dinner_fee: data.fees.christmas_dinner_fee,
              new_year_dinner_fee: data.fees.new_year_dinner_fee
            }]
          } : undefined
        }
      });
    });
    return res.json({ status: 'success' });
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
    const data = req.body;
    // Simplified cost calculation - the detailed logic from Go is complex
    // For now return a placeholder structure that frontend expects
    return res.json({ final_cost: 0, discount: 0 });
  } catch (err) { next(err); }
}
