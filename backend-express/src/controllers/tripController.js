import prisma from '../config/db.js';

// ==================== QUOTATIONS ====================
export async function createQuotation(req, res, next) {
  try {
    const data = req.body;
    const claims = req.user;
    const trip = await prisma.trips.create({
      data: {
        agent_id: data.agent_id || claims.agent_id,
        client_name: data.client_name, client_phone: data.client_phone,
        number_of_adults: data.number_of_adults, number_of_kids: data.number_of_kids || 0,
        booking_reference: data.booking_reference || null,
        file_reference: data.file_reference || null,
        remarks: data.remarks || null,
        total_amount: data.total_amount || 0, discount_amount: data.discount_amount || 0,
        final_amount: data.final_amount || 0, approved: false, declined: false,
        trip_start_date: data.trip_start_date ? new Date(data.trip_start_date) : null,
        client_email: data.client_email || null,
        user_id: data.user_id ? parseInt(data.user_id) : (claims ? claims.user_id : null),
        is_booking: data.is_booking || false,
        amount_paid: data.amount_paid !== undefined ? data.amount_paid : 0.00,
        penalty_cost: data.penalty_cost !== undefined ? data.penalty_cost : 0.00,
        status: data.status || "Pending"
      }
    });
    return res.status(201).json(trip);
  } catch (err) { next(err); }
}

export async function listQuotations(req, res, next) {
  try {
    const trips = await prisma.trips.findMany({
      where: { approved: false, declined: false },
      include: { agents: true },
      orderBy: { created_at: 'desc' }
    });
    return res.json(trips);
  } catch (err) { next(err); }
}

export async function listQuotationsByDateRange(req, res, next) {
  try {
    const { from_date, to_date } = req.query;
    const where = { approved: false, declined: false };
    if (from_date && to_date) {
      where.created_at = { gte: new Date(from_date), lte: new Date(to_date) };
    }
    const trips = await prisma.trips.findMany({ where, include: { agents: true }, orderBy: { created_at: 'desc' } });
    return res.json(trips);
  } catch (err) { next(err); }
}

export async function getQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');
    const trip = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true, hotel_trip_items: { include: { hotels: true, hotel_room_type_items: true } },
        excursion_trip_items: { include: { excursions: true, suppliers: true } },
        tour_trip_items: { include: { tours: true, suppliers: true } },
        transfer_trip_items: { include: { transfers: true, suppliers: true } },
        flight_trip_items: true, other_trip_items: { include: { others: true } },
        invoices: { include: { invoice_items: true } }
      }
    });
    if (!trip) return res.status(404).send('Quotation not found');
    return res.json(trip);
  } catch (err) { next(err); }
}

export async function updateQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');
    const data = req.body;

    await prisma.$transaction(async (tx) => {
      // Delete existing trip items
      await tx.hotel_trip_items.deleteMany({ where: { trip_item_id: id } });
      await tx.excursion_trip_items.deleteMany({ where: { trip_item_id: id } });
      await tx.tour_trip_items.deleteMany({ where: { trip_item_id: id } });
      await tx.transfer_trip_items.deleteMany({ where: { trip_item_id: id } });
      await tx.flight_trip_items.deleteMany({ where: { trip_item_id: id } });
      await tx.other_trip_items.deleteMany({ where: { trip_item_id: id } });

      // Update trip base data
      await tx.trips.update({
        where: { id },
        data: {
          client_name: data.client_name, client_phone: data.client_phone,
          number_of_adults: data.number_of_adults, number_of_kids: data.number_of_kids,
          booking_reference: data.booking_reference, file_reference: data.file_reference,
          remarks: data.remarks, agent_id: data.agent_id,
          total_amount: data.total_amount, discount_amount: data.discount_amount,
          final_amount: data.final_amount,
          trip_start_date: data.trip_start_date ? new Date(data.trip_start_date) : null,
          client_email: data.client_email !== undefined ? data.client_email : undefined,
          user_id: data.user_id !== undefined ? (data.user_id ? parseInt(data.user_id) : null) : undefined,
          is_booking: data.is_booking !== undefined ? data.is_booking : undefined,
          amount_paid: data.amount_paid !== undefined ? data.amount_paid : undefined,
          penalty_cost: data.penalty_cost !== undefined ? data.penalty_cost : undefined,
          status: data.status !== undefined ? data.status : undefined
        }
      });

      // Recreate trip items
      if (data.hotel_items?.length) {
        for (const item of data.hotel_items) {
          await tx.hotel_trip_items.create({
            data: {
              trip_item_id: id, hotel_id: item.hotel_id, from_date: new Date(item.from_date),
              to_date: new Date(item.to_date), city: item.city, hotel_name: item.hotel_name,
              nights: item.nights, single_price: item.single_price, double_price: item.double_price,
              extra_bed_price: item.extra_bed_price, room_type: item.room_type,
              abf_price: item.abf_price, lunch_price: item.lunch_price, dinner_price: item.dinner_price,
              promotions: item.promotions, tour_package: item.tour_package,
              notes: item.notes, approved: item.approved || false, declined: item.declined || false,
              promotion: item.promotion || null,
              meals: item.meals || null,
              room_types_json: item.room_types_json || null,
              early_check_in: item.early_check_in || false,
              late_check_out: item.late_check_out || false,
              flight_in: item.flight_in || null,
              flight_out: item.flight_out || null,
              flight_info: item.flight_info || null,
              discount: item.discount !== undefined ? item.discount : 0,
              booking_status: item.booking_status || null,
              booking_remark: item.booking_remark || null,
              promotion_id: item.promotion_id ? parseInt(item.promotion_id) : null,
              total_price: item.total_price !== undefined ? item.total_price : 0,
              display_order: item.display_order !== undefined ? parseInt(item.display_order) : 0,
              extra_adult_bed_count: item.extra_adult_bed_count || 0,
              extra_child_bed_count: item.extra_child_bed_count || 0,
              rsvn_in: item.rsvn_in ? new Date(item.rsvn_in) : null,
              rsvn_out: item.rsvn_out ? new Date(item.rsvn_out) : null,
              payment_date: item.payment_date ? new Date(item.payment_date) : null,
              hotel_room_type_items: item.room_type_items ? {
                create: item.room_type_items.map(rt => ({
                  room_type_id: rt.room_type_id, room_type: rt.room_type,
                  adults: rt.adults || 0, children: rt.children || 0,
                  complimentary_abf: rt.complimentary_abf || false,
                  extra_adult_bed: rt.extra_adult_bed || false,
                  extra_child_bed: rt.extra_child_bed || false,
                  sharing_bed: rt.sharing_bed || false
                }))
              } : undefined
            }
          });
        }
      }
      if (data.excursion_items?.length) {
        for (const item of data.excursion_items) {
          await tx.excursion_trip_items.create({
            data: {
              trip_item_id: id, excursion_id: item.excursion_id, supplier_id: item.supplier_id,
              city: item.city, toe: item.toe, from_date: new Date(item.from_date),
              to_date: new Date(item.to_date), hotel: item.hotel,
              guide_name: item.guide_name, guide_contact: item.guide_contact,
              price: item.price, currency_id: item.currency_id, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false,
              pickup_time: item.pickup_time || null
            }
          });
        }
      }
      if (data.tour_items?.length) {
        for (const item of data.tour_items) {
          await tx.tour_trip_items.create({
            data: {
              trip_item_id: id, tour_id: item.tour_id, supplier_id: item.supplier_id,
              tot: item.tot, from_location: item.from_location, to_location: item.to_location,
              number_of_adults: item.number_of_adults, number_of_kids: item.number_of_kids || 0,
              from_date: new Date(item.from_date), to_date: new Date(item.to_date),
              flight_in: item.flight_in ? new Date(item.flight_in) : null,
              flight_number: item.flight_number, flight_out: item.flight_out ? new Date(item.flight_out) : null,
              guide_name: item.guide_name, guide_contact: item.guide_contact,
              payment_car: item.payment_car, payment_service: item.payment_service,
              price: item.price, currency_id: item.currency_id, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false
            }
          });
        }
      }
      if (data.transfer_items?.length) {
        for (const item of data.transfer_items) {
          await tx.transfer_trip_items.create({
            data: {
              trip_item_id: id, transfer_id: item.transfer_id,
              from_location: item.from_location, to_location: item.to_location,
              from_date: new Date(item.from_date), to_date: new Date(item.to_date),
              flight_number: item.flight_number, tot: item.tot,
              supplier_id: item.supplier_id, guide_name: item.guide_name,
              guide_contact: item.guide_contact, price: item.price,
              currency_id: item.currency_id, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false
            }
          });
        }
      }
      if (data.flight_items?.length) {
        for (const item of data.flight_items) {
          await tx.flight_trip_items.create({
            data: {
              trip_item_id: id, from_date: new Date(item.from_date), to_date: new Date(item.to_date),
              flight_number: item.flight_number, in_or_out: item.in_or_out,
              route: item.route, issued_by: item.issued_by, price: item.price,
              currency_id: item.currency_id, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false,
              edt: item.edt || null,
              eat: item.eat || null,
              flight_airline: item.flight_airline || null
            }
          });
        }
      }
      if (data.other_items?.length) {
        for (const item of data.other_items) {
          await tx.other_trip_items.create({
            data: {
              trip_item_id: id, other_id: item.other_id,
              from_date: new Date(item.from_date), to_date: new Date(item.to_date)
            }
          });
        }
      }
    });

    const updated = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true, hotel_trip_items: { include: { hotels: true, hotel_room_type_items: true } },
        excursion_trip_items: { include: { excursions: true, suppliers: true } },
        tour_trip_items: { include: { tours: true, suppliers: true } },
        transfer_trip_items: { include: { transfers: true, suppliers: true } },
        flight_trip_items: true, other_trip_items: { include: { others: true } }
      }
    });
    return res.json(updated);
  } catch (err) { next(err); }
}

export async function finalizeQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');
    const trip = await prisma.trips.update({
      where: { id },
      data: { approved: true, declined: false }
    });
    return res.json(trip);
  } catch (err) { next(err); }
}

export async function cancelQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');
    const trip = await prisma.trips.update({
      where: { id },
      data: { declined: true, approved: false }
    });
    return res.json(trip);
  } catch (err) { next(err); }
}

export async function deleteQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');
    await prisma.trips.delete({ where: { id } });
    return res.status(200).send('Quotation deleted');
  } catch (err) { next(err); }
}

// ==================== BOOKINGS ====================
export async function listBookings(req, res, next) {
  try {
    const bookings = await prisma.trips.findMany({
      where: { approved: true },
      include: { agents: true },
      orderBy: { created_at: 'desc' }
    });
    return res.json(bookings);
  } catch (err) { next(err); }
}

export async function listBookingsByDateRange(req, res, next) {
  try {
    const { from_date, to_date } = req.query;
    const where = { approved: true };
    if (from_date && to_date) {
      where.created_at = { gte: new Date(from_date), lte: new Date(to_date) };
    }
    const bookings = await prisma.trips.findMany({ where, include: { agents: true }, orderBy: { created_at: 'desc' } });
    return res.json(bookings);
  } catch (err) { next(err); }
}

export async function getBooking(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');
    const trip = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true, hotel_trip_items: { include: { hotels: true, hotel_room_type_items: true, hotel_promotions: true } },
        excursion_trip_items: { include: { excursions: true, suppliers: true } },
        tour_trip_items: { include: { tours: true, suppliers: true } },
        transfer_trip_items: { include: { transfers: true, suppliers: true } },
        flight_trip_items: true, other_trip_items: { include: { others: true } },
        invoices: { include: { invoice_items: true } }
      }
    });
    if (!trip) return res.status(404).send('Booking not found');
    return res.json(trip);
  } catch (err) { next(err); }
}

export async function updateBooking(req, res, next) {
  return updateQuotation(req, res, next);
}

export async function approveItem(req, res, next) {
  try {
    const { itemType, itemID } = req.params;
    const id = parseInt(itemID);
    if (isNaN(id)) return res.status(400).send('Invalid item ID');
    const modelMap = {
      hotel: 'hotel_trip_items', excursion: 'excursion_trip_items',
      tour: 'tour_trip_items', transfer: 'transfer_trip_items',
      flight: 'flight_trip_items'
    };
    const model = modelMap[itemType];
    if (!model) return res.status(400).send('Invalid item type');
    await prisma[model].update({ where: { id }, data: { approved: true, declined: false } });
    return res.json({ status: 'approved' });
  } catch (err) { next(err); }
}

export async function declineItem(req, res, next) {
  try {
    const { itemType, itemID } = req.params;
    const id = parseInt(itemID);
    if (isNaN(id)) return res.status(400).send('Invalid item ID');
    const modelMap = {
      hotel: 'hotel_trip_items', excursion: 'excursion_trip_items',
      tour: 'tour_trip_items', transfer: 'transfer_trip_items',
      flight: 'flight_trip_items'
    };
    const model = modelMap[itemType];
    if (!model) return res.status(400).send('Invalid item type');
    await prisma[model].update({ where: { id }, data: { declined: true, approved: false } });
    return res.json({ status: 'declined' });
  } catch (err) { next(err); }
}

export async function getPaymentInfo(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');
    const trip = await prisma.trips.findUnique({
      where: { id },
      select: {
        id: true, client_name: true, total_amount: true, discount_amount: true,
        final_amount: true, booking_reference: true, agents: { select: { name: true } }
      }
    });
    if (!trip) return res.status(404).send('Booking not found');
    return res.json(trip);
  } catch (err) { next(err); }
}

export async function updatePaymentInfo(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');
    const data = req.body;
    const trip = await prisma.trips.update({
      where: { id },
      data: {
        total_amount: data.total_amount, discount_amount: data.discount_amount,
        final_amount: data.final_amount
      }
    });
    return res.json(trip);
  } catch (err) { next(err); }
}

export async function listPaymentInfoFromBookings(req, res, next) {
  try {
    const bookings = await prisma.trips.findMany({
      where: { approved: true },
      select: {
        id: true, client_name: true, booking_reference: true,
        total_amount: true, discount_amount: true, final_amount: true,
        agents: { select: { name: true } }, created_at: true
      },
      orderBy: { created_at: 'desc' }
    });
    return res.json(bookings);
  } catch (err) { next(err); }
}

export async function listPaymentInfoByDateRange(req, res, next) {
  try {
    const { from_date, to_date } = req.query;
    const where = { approved: true };
    if (from_date && to_date) {
      where.created_at = { gte: new Date(from_date), lte: new Date(to_date) };
    }
    const bookings = await prisma.trips.findMany({
      where,
      select: {
        id: true, client_name: true, booking_reference: true,
        total_amount: true, discount_amount: true, final_amount: true,
        agents: { select: { name: true } }, created_at: true
      },
      orderBy: { created_at: 'desc' }
    });
    return res.json(bookings);
  } catch (err) { next(err); }
}

// ==================== ITINERARY ====================
export async function listItinerary(req, res, next) {
  try {
    const itinerary = await prisma.trips.findMany({
      where: { approved: true },
      include: {
        agents: true,
        hotel_trip_items: { include: { hotels: true } },
        excursion_trip_items: { include: { excursions: true } },
        tour_trip_items: { include: { tours: true } },
        transfer_trip_items: { include: { transfers: true } },
        flight_trip_items: true
      },
      orderBy: { created_at: 'desc' }
    });
    return res.json(itinerary);
  } catch (err) { next(err); }
}

export async function updateInvoiceNumber(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');
    const { invoice_number } = req.body;
    const trip = await prisma.trips.update({
      where: { id },
      data: { booking_reference: invoice_number }
    });
    return res.json(trip);
  } catch (err) { next(err); }
}
