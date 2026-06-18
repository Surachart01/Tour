import prisma from '../config/db.js';

// ==================== HELPERS ====================
function generateQuotationNumber() {
  const now = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const datePart = `${now.getFullYear()}${months[now.getMonth()]}${String(now.getDate()).padStart(2, '0')}`;
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `Q${datePart}${suffix}`;
}

function calculateQuotationCosts(data) {
  let totalCost = 0;
  let discount = data.discount_amount !== undefined ? parseFloat(data.discount_amount) : (data.discount !== undefined ? parseFloat(data.discount) : 0);

  const flights = data.flight_items || data.flights || [];
  const hotels = data.hotel_items || data.hotels || [];
  const transfers = data.transfer_items || data.transfers || [];
  const excursions = data.excursion_items || data.excursions || [];
  const tours = data.tour_items || data.tours || [];
  const others = data.other_items || data.others || [];

  for (const f of flights) totalCost += parseFloat(f.price || 0);
  for (const h of hotels) totalCost += parseFloat(h.total_price || h.price || 0);
  for (const t of transfers) totalCost += parseFloat(t.price || 0);
  for (const e of excursions) totalCost += parseFloat(e.price || 0);
  for (const tr of tours) totalCost += parseFloat(tr.price || 0);
  for (const o of others) totalCost += parseFloat(o.price || 0);

  const includeAssistance = data.include_assistance_fee !== undefined ? (data.include_assistance_fee === true || data.include_assistance_fee === 'true') : true;
  const assistanceFee = includeAssistance ? parseFloat(data.assistance_fee_amount !== undefined ? data.assistance_fee_amount : 1000) : 0;

  totalCost += assistanceFee;
  const finalCost = Math.max(0, totalCost - discount);

  return {
    total_amount: totalCost,
    discount_amount: discount,
    final_amount: finalCost,
    include_assistance_fee: includeAssistance,
    assistance_fee_amount: assistanceFee
  };
}

async function validateHotelAvailability(tx, hotelItems) {
  if (!hotelItems || hotelItems.length === 0) return;

  for (const item of hotelItems) {
    const roomTypeItems = item.room_type_items || item.room_types || [];
    if (roomTypeItems.length > 0) {
      const hotelDisplayName = item.hotel_name || `Hotel ID ${item.hotel_id}`;
      for (const rt of roomTypeItems) {
        const roomTypeName = rt.room_type;
        const fromDate = new Date(item.from_date);
        const toDate = new Date(item.to_date);

        // Find the room type record to get its ID
        const roomTypeRecord = await tx.room_types.findFirst({
          where: {
            hotel_id: parseInt(item.hotel_id),
            name: roomTypeName
          }
        });

        if (!roomTypeRecord) {
          throw new Error(`room type '${roomTypeName}' not found for ${hotelDisplayName}`);
        }

        // Check if there is an active stop sale overlapping with stay dates:
        // ss.start_date < toDate AND ss.end_date >= fromDate AND ss.stopped = true
        const activeStopSale = await tx.stop_sales.findFirst({
          where: {
            room_type_id: roomTypeRecord.id,
            stopped: true,
            start_date: { lt: toDate },
            end_date: { gte: fromDate }
          }
        });

        if (activeStopSale) {
          const formattedFrom = fromDate.toISOString().slice(0, 10);
          const formattedTo = toDate.toISOString().slice(0, 10);
          throw new Error(`quotation creation failed: ${hotelDisplayName} with room type '${roomTypeName}' is not available for the requested dates (${formattedFrom} to ${formattedTo}). This hotel/room type is currently on stop sale. Please select a different hotel or adjust your travel dates`);
        }
      }
    }
  }
}

async function calculateCancellationDeadlineFromSuppliers(tx, tripStartDate, transferItems, excursionItems, tourItems) {
  let mostRestrictive = null;

  // Gather unique supplier IDs from all item lists
  const supplierIds = [];
  
  if (transferItems) {
    for (const item of transferItems) {
      if (item.supplier_id) supplierIds.push(parseInt(item.supplier_id));
    }
  }
  if (excursionItems) {
    for (const item of excursionItems) {
      if (item.supplier_id) supplierIds.push(parseInt(item.supplier_id));
    }
  }
  if (tourItems) {
    for (const item of tourItems) {
      if (item.supplier_id) supplierIds.push(parseInt(item.supplier_id));
    }
  }

  const uniqueSupplierIds = [...new Set(supplierIds)].filter(id => !isNaN(id));

  if (uniqueSupplierIds.length > 0) {
    const suppliers = await tx.suppliers.findMany({
      where: { id: { in: uniqueSupplierIds } },
      select: { cancellation_allowed_before_days: true }
    });

    for (const supplier of suppliers) {
      const days = supplier.cancellation_allowed_before_days !== null && supplier.cancellation_allowed_before_days !== undefined
        ? parseInt(supplier.cancellation_allowed_before_days)
        : 1; // default to 1 day if not specified

      let deadline;
      if (days === -1) {
        // No cancellation allowed - return a date in the past (1 year ago)
        deadline = new Date(tripStartDate.getTime());
        deadline.setFullYear(deadline.getFullYear() - 1);
      } else if (days === 0) {
        deadline = new Date(tripStartDate.getTime());
      } else {
        deadline = new Date(tripStartDate.getTime() - days * 24 * 60 * 60 * 1000);
      }

      if (!mostRestrictive || deadline > mostRestrictive) {
        mostRestrictive = deadline;
      }
    }
  }

  if (!mostRestrictive) {
    // If no suppliers found or all allow cancellation, use default (1 month before)
    mostRestrictive = new Date(tripStartDate.getTime());
    mostRestrictive.setMonth(mostRestrictive.getMonth() - 1);
  }

  return mostRestrictive;
}

// ==================== QUOTATIONS ====================
export async function createQuotation(req, res, next) {
  try {
    const data = req.body;
    const claims = req.user;

    const hotelItems = data.hotel_items || data.hotels || [];
    const excursionItems = data.excursion_items || data.excursions || [];
    const tourItems = data.tour_items || data.tours || [];
    const transferItems = data.transfer_items || data.transfers || [];
    const flightItems = data.flight_items || data.flights || [];
    const otherItems = data.other_items || data.others || [];

    const calculated = calculateQuotationCosts(data);
    const total_amount = data.total_amount !== undefined ? parseFloat(data.total_amount) : (data.total_cost !== undefined ? parseFloat(data.total_cost) : calculated.total_amount);
    const discount_amount = data.discount_amount !== undefined ? parseFloat(data.discount_amount) : (data.discount !== undefined ? parseFloat(data.discount) : calculated.discount_amount);
    const final_amount = data.final_amount !== undefined ? parseFloat(data.final_amount) : (data.final_cost !== undefined ? parseFloat(data.final_cost) : calculated.final_amount);

    const trip_start_date = data.trip_start_date ? new Date(data.trip_start_date) : null;
    let payment_deadline = data.payment_deadline ? new Date(data.payment_deadline) : null;
    let cancellation_deadline = data.cancellation_deadline ? new Date(data.cancellation_deadline) : null;

    if (trip_start_date) {
      if (!payment_deadline) {
        payment_deadline = new Date(trip_start_date.getTime() - 24 * 60 * 60 * 1000);
      }
      if (!cancellation_deadline) {
        cancellation_deadline = await calculateCancellationDeadlineFromSuppliers(
          prisma,
          trip_start_date,
          transferItems,
          excursionItems,
          tourItems
        );
      }
    }

    const refNumber = data.booking_reference || generateQuotationNumber();

    const createdTrip = await prisma.$transaction(async (tx) => {
      await validateHotelAvailability(tx, hotelItems);

      const trip = await tx.trips.create({
        data: {
          agent_id: data.agent_id ? parseInt(data.agent_id) : (claims ? claims.agent_id : null),
          client_name: data.client_name,
          client_phone: data.client_phone,
          client_email: data.client_email || null,
          number_of_adults: parseInt(data.number_of_adults) || 1,
          number_of_kids: parseInt(data.number_of_kids) || 0,
          booking_reference: refNumber,
          file_reference: data.file_reference || null,
          remarks: data.remarks || null,
          total_amount,
          discount_amount,
          final_amount,
          approved: false,
          declined: false,
          trip_start_date,
          user_id: data.user_id ? parseInt(data.user_id) : (claims ? claims.user_id : null),
          is_booking: data.is_booking || false,
          amount_paid: data.amount_paid !== undefined ? parseFloat(data.amount_paid) : 0.00,
          penalty_cost: data.penalty_cost !== undefined ? parseFloat(data.penalty_cost) : 0.00,
          status: data.status || "Pending",
          include_assistance_fee: calculated.include_assistance_fee,
          assistance_fee_amount: calculated.assistance_fee_amount,
          include_description_in_itinerary: data.include_description_in_itinerary || false,
          payment_deadline,
          cancellation_deadline,
          affiliate_coupon_code: data.coupon_code || data.affiliate_coupon_code || null,
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          utm_content: data.utm_content || null,
          utm_term: data.utm_term || null,
          referral_source: data.referral_source || null
        }
      });

      const id = trip.id;

      if (hotelItems.length) {
        for (const item of hotelItems) {
          const rtItems = item.room_type_items || item.room_types || [];
          await tx.hotel_trip_items.create({
            data: {
              trip_item_id: id, hotel_id: parseInt(item.hotel_id), from_date: new Date(item.from_date),
              to_date: new Date(item.to_date), city: item.city, hotel_name: item.hotel_name,
              nights: parseInt(item.nights) || 1, single_price: parseFloat(item.single_price) || 0, double_price: parseFloat(item.double_price) || 0,
              extra_bed_price: parseFloat(item.extra_bed_price) || 0, room_type: item.room_type,
              abf_price: parseFloat(item.abf_price) || 0, lunch_price: parseFloat(item.lunch_price) || 0, dinner_price: parseFloat(item.dinner_price) || 0,
              promotions: item.promotions ? parseInt(item.promotions) : null, tour_package: item.tour_package,
              notes: item.notes, approved: item.approved || false, declined: item.declined || false,
              promotion: item.promotion || null,
              meals: item.meals || null,
              room_types_json: item.room_types_json || null,
              early_check_in: item.early_check_in || false,
              late_check_out: item.late_check_out || false,
              flight_in: item.flight_in || null,
              flight_out: item.flight_out || null,
              flight_info: item.flight_info || null,
              discount: item.discount !== undefined ? parseFloat(item.discount) : 0,
              booking_status: item.booking_status || null,
              booking_remark: item.booking_remark || null,
              promotion_id: item.promotion_id ? parseInt(item.promotion_id) : null,
              total_price: item.total_price !== undefined ? parseFloat(item.total_price) : 0,
              display_order: item.display_order !== undefined ? parseInt(item.display_order) : 0,
              extra_adult_bed_count: item.extra_adult_bed_count || 0,
              extra_child_bed_count: item.extra_child_bed_count || 0,
              rsvn_in: item.rsvn_in ? new Date(item.rsvn_in) : null,
              rsvn_out: item.rsvn_out ? new Date(item.rsvn_out) : null,
              payment_date: item.payment_date ? new Date(item.payment_date) : null,
              hotel_room_type_items: rtItems.length > 0 ? {
                create: rtItems.map(rt => ({
                  room_type_id: parseInt(rt.room_type_id), room_type: rt.room_type,
                  adults: parseInt(rt.adults) || 0, children: parseInt(rt.children) || 0,
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

      if (excursionItems.length) {
        for (const item of excursionItems) {
          await tx.excursion_trip_items.create({
            data: {
              trip_item_id: id, excursion_id: parseInt(item.excursion_id), supplier_id: item.supplier_id ? parseInt(item.supplier_id) : null,
              city: item.city, toe: item.toe, from_date: new Date(item.from_date),
              to_date: new Date(item.to_date), hotel: item.hotel,
              guide_name: item.guide_name, guide_contact: item.guide_contact,
              price: parseFloat(item.price) || 0, currency_id: item.currency_id ? parseInt(item.currency_id) : null, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false,
              pickup_time: item.pickup_time || null
            }
          });
        }
      }

      if (tourItems.length) {
        for (const item of tourItems) {
          await tx.tour_trip_items.create({
            data: {
              trip_item_id: id, tour_id: parseInt(item.tour_id), supplier_id: item.supplier_id ? parseInt(item.supplier_id) : null,
              tot: item.tot, from_location: item.from_location, to_location: item.to_location,
              number_of_adults: parseInt(item.number_of_adults) || 0, number_of_kids: parseInt(item.number_of_kids) || 0,
              from_date: new Date(item.from_date), to_date: new Date(item.to_date),
              flight_in: item.flight_in ? new Date(item.flight_in) : null,
              flight_number: item.flight_number, flight_out: item.flight_out ? new Date(item.flight_out) : null,
              guide_name: item.guide_name, guide_contact: item.guide_contact,
              payment_car: item.payment_car, payment_service: item.payment_service,
              price: parseFloat(item.price) || 0, currency_id: item.currency_id ? parseInt(item.currency_id) : null, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false
            }
          });
        }
      }

      if (transferItems.length) {
        for (const item of transferItems) {
          await tx.transfer_trip_items.create({
            data: {
              trip_item_id: id, transfer_id: parseInt(item.transfer_id),
              from_location: item.from_location, to_location: item.to_location,
              from_date: new Date(item.from_date), to_date: new Date(item.to_date),
              flight_number: item.flight_number, tot: item.tot,
              supplier_id: item.supplier_id ? parseInt(item.supplier_id) : null, guide_name: item.guide_name,
              guide_contact: item.guide_contact, price: parseFloat(item.price) || 0,
              currency_id: item.currency_id ? parseInt(item.currency_id) : null, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false
            }
          });
        }
      }

      if (flightItems.length) {
        for (const item of flightItems) {
          await tx.flight_trip_items.create({
            data: {
              trip_item_id: id, from_date: new Date(item.from_date), to_date: new Date(item.to_date),
              flight_number: item.flight_number, in_or_out: item.in_or_out,
              route: item.route, issued_by: item.issued_by, price: parseFloat(item.price) || 0,
              currency_id: item.currency_id ? parseInt(item.currency_id) : null, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false,
              edt: item.edt || null,
              eat: item.eat || null,
              flight_airline: item.flight_airline || null
            }
          });
        }
      }

      if (otherItems.length) {
        for (const item of otherItems) {
          await tx.other_trip_items.create({
            data: {
              trip_item_id: id, other_id: parseInt(item.other_id),
              from_date: new Date(item.from_date), to_date: new Date(item.to_date)
            }
          });
        }
      }

      return trip;
    });

    const trip = await prisma.trips.findUnique({
      where: { id: createdTrip.id },
      include: {
        agents: true,
        hotel_trip_items: {
          orderBy: [
            { display_order: 'asc' },
            { from_date: 'asc' }
          ],
          include: { hotels: true, hotel_room_type_items: true }
        },
        excursion_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { excursions: true, suppliers: true }
        },
        tour_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { tours: true, suppliers: true }
        },
        transfer_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { transfers: true, suppliers: true }
        },
        flight_trip_items: {
          orderBy: { from_date: 'asc' }
        },
        other_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { others: true }
        },
        invoices: { include: { invoice_items: true } }
      }
    });

    return res.status(201).json({
      ...trip,
      message: "Quotation created successfully",
      QuotationReference: trip.booking_reference,
      TripID: String(trip.id)
    });
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
        agents: true,
        hotel_trip_items: {
          orderBy: [
            { display_order: 'asc' },
            { from_date: 'asc' }
          ],
          include: { hotels: true, hotel_room_type_items: true }
        },
        excursion_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { excursions: true, suppliers: true }
        },
        tour_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { tours: true, suppliers: true }
        },
        transfer_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { transfers: true, suppliers: true }
        },
        flight_trip_items: {
          orderBy: { from_date: 'asc' }
        },
        other_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { others: true }
        },
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

    const hotelItems = data.hotel_items || data.hotels || [];
    const excursionItems = data.excursion_items || data.excursions || [];
    const tourItems = data.tour_items || data.tours || [];
    const transferItems = data.transfer_items || data.transfers || [];
    const flightItems = data.flight_items || data.flights || [];
    const otherItems = data.other_items || data.others || [];

    const calculated = calculateQuotationCosts(data);
    const total_amount = data.total_amount !== undefined ? parseFloat(data.total_amount) : (data.total_cost !== undefined ? parseFloat(data.total_cost) : calculated.total_amount);
    const discount_amount = data.discount_amount !== undefined ? parseFloat(data.discount_amount) : (data.discount !== undefined ? parseFloat(data.discount) : calculated.discount_amount);
    const final_amount = data.final_amount !== undefined ? parseFloat(data.final_amount) : (data.final_cost !== undefined ? parseFloat(data.final_cost) : calculated.final_amount);

    const trip_start_date = data.trip_start_date !== undefined ? (data.trip_start_date ? new Date(data.trip_start_date) : null) : undefined;
    
    let payment_deadline = undefined;
    let cancellation_deadline = undefined;

    if (data.payment_deadline !== undefined) {
      payment_deadline = data.payment_deadline ? new Date(data.payment_deadline) : null;
    }
    if (data.cancellation_deadline !== undefined) {
      cancellation_deadline = data.cancellation_deadline ? new Date(data.cancellation_deadline) : null;
    }

    await prisma.$transaction(async (tx) => {
      // Validate hotel availability
      await validateHotelAvailability(tx, hotelItems);

      let final_trip_start_date = trip_start_date;
      if (final_trip_start_date === undefined) {
        const currentTrip = await tx.trips.findUnique({
          where: { id },
          select: { trip_start_date: true, payment_deadline: true, cancellation_deadline: true }
        });
        if (currentTrip) {
          final_trip_start_date = currentTrip.trip_start_date;
          if (payment_deadline === undefined) {
            payment_deadline = currentTrip.payment_deadline;
          }
          if (cancellation_deadline === undefined) {
            cancellation_deadline = currentTrip.cancellation_deadline;
          }
        }
      }

      if (final_trip_start_date) {
        if (!payment_deadline) {
          payment_deadline = new Date(final_trip_start_date.getTime() - 24 * 60 * 60 * 1000);
        }
        if (!cancellation_deadline) {
          cancellation_deadline = await calculateCancellationDeadlineFromSuppliers(
            tx,
            final_trip_start_date,
            transferItems,
            excursionItems,
            tourItems
          );
        }
      }

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
          number_of_adults: parseInt(data.number_of_adults) || 1,
          number_of_kids: parseInt(data.number_of_kids) || 0,
          booking_reference: data.booking_reference, file_reference: data.file_reference,
          remarks: data.remarks, agent_id: data.agent_id ? parseInt(data.agent_id) : undefined,
          total_amount, discount_amount, final_amount,
          trip_start_date,
          client_email: data.client_email !== undefined ? data.client_email : undefined,
          user_id: data.user_id !== undefined ? (data.user_id ? parseInt(data.user_id) : null) : undefined,
          is_booking: data.is_booking !== undefined ? data.is_booking : undefined,
          amount_paid: data.amount_paid !== undefined ? parseFloat(data.amount_paid) : undefined,
          penalty_cost: data.penalty_cost !== undefined ? parseFloat(data.penalty_cost) : undefined,
          status: data.status !== undefined ? data.status : undefined,
          include_assistance_fee: calculated.include_assistance_fee,
          assistance_fee_amount: calculated.assistance_fee_amount,
          include_description_in_itinerary: data.include_description_in_itinerary !== undefined ? data.include_description_in_itinerary : undefined,
          payment_deadline,
          cancellation_deadline,
          affiliate_coupon_code: data.coupon_code || data.affiliate_coupon_code || undefined,
          utm_source: data.utm_source || undefined,
          utm_medium: data.utm_medium || undefined,
          utm_campaign: data.utm_campaign || undefined,
          utm_content: data.utm_content || undefined,
          utm_term: data.utm_term || undefined,
          referral_source: data.referral_source || undefined
        }
      });

      // Recreate trip items
      if (hotelItems.length) {
        for (const item of hotelItems) {
          const rtItems = item.room_type_items || item.room_types || [];
          await tx.hotel_trip_items.create({
            data: {
              trip_item_id: id, hotel_id: parseInt(item.hotel_id), from_date: new Date(item.from_date),
              to_date: new Date(item.to_date), city: item.city, hotel_name: item.hotel_name,
              nights: parseInt(item.nights) || 1, single_price: parseFloat(item.single_price) || 0, double_price: parseFloat(item.double_price) || 0,
              extra_bed_price: parseFloat(item.extra_bed_price) || 0, room_type: item.room_type,
              abf_price: parseFloat(item.abf_price) || 0, lunch_price: parseFloat(item.lunch_price) || 0, dinner_price: parseFloat(item.dinner_price) || 0,
              promotions: item.promotions ? parseInt(item.promotions) : null, tour_package: item.tour_package,
              notes: item.notes, approved: item.approved || false, declined: item.declined || false,
              promotion: item.promotion || null,
              meals: item.meals || null,
              room_types_json: item.room_types_json || null,
              early_check_in: item.early_check_in || false,
              late_check_out: item.late_check_out || false,
              flight_in: item.flight_in || null,
              flight_out: item.flight_out || null,
              flight_info: item.flight_info || null,
              discount: item.discount !== undefined ? parseFloat(item.discount) : 0,
              booking_status: item.booking_status || null,
              booking_remark: item.booking_remark || null,
              promotion_id: item.promotion_id ? parseInt(item.promotion_id) : null,
              total_price: item.total_price !== undefined ? parseFloat(item.total_price) : 0,
              display_order: item.display_order !== undefined ? parseInt(item.display_order) : 0,
              extra_adult_bed_count: item.extra_adult_bed_count || 0,
              extra_child_bed_count: item.extra_child_bed_count || 0,
              rsvn_in: item.rsvn_in ? new Date(item.rsvn_in) : null,
              rsvn_out: item.rsvn_out ? new Date(item.rsvn_out) : null,
              payment_date: item.payment_date ? new Date(item.payment_date) : null,
              hotel_room_type_items: rtItems.length > 0 ? {
                create: rtItems.map(rt => ({
                  room_type_id: parseInt(rt.room_type_id), room_type: rt.room_type,
                  adults: parseInt(rt.adults) || 0, children: parseInt(rt.children) || 0,
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
      if (excursionItems.length) {
        for (const item of excursionItems) {
          await tx.excursion_trip_items.create({
            data: {
              trip_item_id: id, excursion_id: parseInt(item.excursion_id), supplier_id: item.supplier_id ? parseInt(item.supplier_id) : null,
              city: item.city, toe: item.toe, from_date: new Date(item.from_date),
              to_date: new Date(item.to_date), hotel: item.hotel,
              guide_name: item.guide_name, guide_contact: item.guide_contact,
              price: parseFloat(item.price) || 0, currency_id: item.currency_id ? parseInt(item.currency_id) : null, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false,
              pickup_time: item.pickup_time || null
            }
          });
        }
      }
      if (tourItems.length) {
        for (const item of tourItems) {
          await tx.tour_trip_items.create({
            data: {
              trip_item_id: id, tour_id: parseInt(item.tour_id), supplier_id: item.supplier_id ? parseInt(item.supplier_id) : null,
              tot: item.tot, from_location: item.from_location, to_location: item.to_location,
              number_of_adults: parseInt(item.number_of_adults) || 0, number_of_kids: parseInt(item.number_of_kids) || 0,
              from_date: new Date(item.from_date), to_date: new Date(item.to_date),
              flight_in: item.flight_in ? new Date(item.flight_in) : null,
              flight_number: item.flight_number, flight_out: item.flight_out ? new Date(item.flight_out) : null,
              guide_name: item.guide_name, guide_contact: item.guide_contact,
              payment_car: item.payment_car, payment_service: item.payment_service,
              price: parseFloat(item.price) || 0, currency_id: item.currency_id ? parseInt(item.currency_id) : null, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false
            }
          });
        }
      }
      if (transferItems.length) {
        for (const item of transferItems) {
          await tx.transfer_trip_items.create({
            data: {
              trip_item_id: id, transfer_id: parseInt(item.transfer_id),
              from_location: item.from_location, to_location: item.to_location,
              from_date: new Date(item.from_date), to_date: new Date(item.to_date),
              flight_number: item.flight_number, tot: item.tot,
              supplier_id: item.supplier_id ? parseInt(item.supplier_id) : null, guide_name: item.guide_name,
              guide_contact: item.guide_contact, price: parseFloat(item.price) || 0,
              currency_id: item.currency_id ? parseInt(item.currency_id) : null, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false
            }
          });
        }
      }
      if (flightItems.length) {
        for (const item of flightItems) {
          await tx.flight_trip_items.create({
            data: {
              trip_item_id: id, from_date: new Date(item.from_date), to_date: new Date(item.to_date),
              flight_number: item.flight_number, in_or_out: item.in_or_out,
              route: item.route, issued_by: item.issued_by, price: parseFloat(item.price) || 0,
              currency_id: item.currency_id ? parseInt(item.currency_id) : null, remarks: item.remarks,
              approved: item.approved || false, declined: item.declined || false,
              edt: item.edt || null,
              eat: item.eat || null,
              flight_airline: item.flight_airline || null
            }
          });
        }
      }
      if (otherItems.length) {
        for (const item of otherItems) {
          await tx.other_trip_items.create({
            data: {
              trip_item_id: id, other_id: parseInt(item.other_id),
              from_date: new Date(item.from_date), to_date: new Date(item.to_date)
            }
          });
        }
      }
    });

    const updated = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true,
        hotel_trip_items: {
          orderBy: [
            { display_order: 'asc' },
            { from_date: 'asc' }
          ],
          include: { hotels: true, hotel_room_type_items: true }
        },
        excursion_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { excursions: true, suppliers: true }
        },
        tour_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { tours: true, suppliers: true }
        },
        transfer_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { transfers: true, suppliers: true }
        },
        flight_trip_items: {
          orderBy: { from_date: 'asc' }
        },
        other_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { others: true }
        }
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
        agents: true,
        hotel_trip_items: {
          orderBy: [
            { display_order: 'asc' },
            { from_date: 'asc' }
          ],
          include: { hotels: true, hotel_room_type_items: true, hotel_promotions: true }
        },
        excursion_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { excursions: true, suppliers: true }
        },
        tour_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { tours: true, suppliers: true }
        },
        transfer_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { transfers: true, suppliers: true }
        },
        flight_trip_items: {
          orderBy: { from_date: 'asc' }
        },
        other_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { others: true }
        },
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
        hotel_trip_items: {
          orderBy: [
            { display_order: 'asc' },
            { from_date: 'asc' }
          ],
          include: { hotels: true }
        },
        excursion_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { excursions: true }
        },
        tour_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { tours: true }
        },
        transfer_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { transfers: true }
        },
        flight_trip_items: {
          orderBy: { from_date: 'asc' }
        }
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
