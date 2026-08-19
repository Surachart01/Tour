import prisma from '../config/db.js';
import { ensureBookingReferences } from '../utils/bookingReferences.js';
import {
  sendBookingGenerationRequest,
  sendFinalBookingConfirmation,
  sendBookingUnconfirmedEmail
} from '../utils/workflowEmail.js';

// ==================== HELPERS ====================
function parseRequiredDate(value, fallback) {
  return parseOptionalDate(value) || fallback || new Date();
}

export function parseOptionalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  const displayDateMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (displayDateMatch) {
    const [, day, month, year] = displayDateMatch;
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return d.getUTCFullYear() === Number(year) &&
      d.getUTCMonth() === Number(month) - 1 &&
      d.getUTCDate() === Number(day)
      ? d
      : null;
  }

  const d = new Date(text);
  return isNaN(d.getTime()) ? null : d;
}

function parseSafeInt(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function parseSafeFK(value) {
  if (value === null || value === undefined) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function paymentNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePaymentDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(`${text}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatPaymentInfo(trip) {
  const finalCost = Math.max(0, paymentNumber(trip.final_amount ?? trip.total_amount));
  const penaltyCost = Math.max(0, paymentNumber(trip.penalty_cost));
  const receivedAmount = Math.max(0, paymentNumber(trip.received_amount));
  const amountDue = finalCost + penaltyCost;
  return {
    ...trip,
    agent_id: trip.agent_id || trip.agents?.id || null,
    agent_name: trip.agents?.name || '-',
    agent_email: trip.agents?.email || '',
    agent_address: trip.agents?.address || '',
    agent_telephone: trip.agents?.telephone || '',
    file_number: trip.file_reference || trip.booking_reference || '',
    proforma_invoice_number: trip.invoice_number || '',
    start_date: trip.trip_start_date || trip.created_at || null,
    final_cost: finalCost,
    penalty_cost: penaltyCost,
    received_amount: receivedAmount,
    balance: Math.max(0, amountDue - receivedAmount),
    payment_reference: trip.payment_reference || ''
  };
}

export function resolveServiceApprovalState(savedById, item = {}) {
  const itemId = parseSafeInt(item.id || item.trip_item_id);
  const saved = (savedById && itemId) ? savedById.get(itemId) : null;
  if (saved) {
    return { approved: Boolean(saved.approved), declined: Boolean(saved.declined) };
  }
  return {
    approved: item.approved === true || item.approved === 'true' || item.approved === 1,
    declined: item.declined === true || item.declined === 'true' || item.declined === 1
  };
}

export function resolveBookingStatusAfterSave(existingStatus, allServicesConfirmed, _requestedStatus) {
  if (existingStatus === 'Confirmed' && !allServicesConfirmed) return 'InProgress';
  // Status is workflow state. It must only change through conversion,
  // service confirmation/decline, cancellation, or final booking confirmation.
  // A normal save must not accidentally move a quotation or booking backward.
  return undefined;
}

export function buildNewQuotationWorkflowState() {
  return {
    approved: false,
    declined: false,
    is_booking: false,
    status: 'Pending'
  };
}

export function isConvertibleQuotation(trip) {
  return Boolean(trip) && trip.status === 'Pending' && trip.is_booking !== true;
}

export function buildQuotationConversionWhere(id) {
  return {
    id,
    status: 'Pending',
    OR: [
      { is_booking: false },
      { is_booking: null }
    ]
  };
}

export function buildQuotationConversionData(updatedAt = new Date()) {
  return {
    approved: false,
    declined: false,
    is_booking: true,
    status: 'InProgress',
    updated_at: updatedAt
  };
}

export function safeTruncate(val, maxLen) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s) return null;
  return maxLen && s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function normalizeQuotationFlightFields(item = {}) {
  return {
    edt: item.edt || item.departure_time || null,
    eat: item.eat || item.arrival_time || null,
    flight_airline: item.flight_airline || item.flight_name || null
  };
}

export async function resolveAgentIdFromRequest(data = {}, claims = {}, client = prisma, existingTrip = null) {
  const role = String(claims?.role || '').trim().toLowerCase();
  const claimAgentId = parseSafeInt(claims?.agent_id);

  // 1. Non-admin Agent role: MUST own their created/edited trip
  if (role !== 'admin' && role !== 'superadmin' && claimAgentId) {
    return claimAgentId;
  }

  // 2. Explicit agent_id in request payload
  const explicitAgentId = parseSafeInt(data?.agent_id);
  if (explicitAgentId) return explicitAgentId;

  // 3. Lookup by explicit agent_name in request payload (if valid agent name provided)
  const agentName = (data?.agent_name || '').toString().trim();
  if (agentName && agentName !== 'Direct Client' && agentName !== 'Vera Thailandia Online') {
    const agent = await client.agent.findFirst({
      where: { name: { equals: agentName, mode: 'insensitive' } },
      select: { id: true }
    });
    if (agent?.id) return agent.id;
  }

  // 4. Preserve existing trip's agent_id if available
  const existingAgentId = parseSafeInt(existingTrip?.agent_id);
  if (existingAgentId) return existingAgentId;

  // 5. Lookup by explicit agent_name even if Vera Thailandia Online (fallback)
  if (agentName) {
    const agent = await client.agent.findFirst({
      where: { name: { equals: agentName, mode: 'insensitive' } },
      select: { id: true }
    });
    if (agent?.id) return agent.id;
  }

  // 6. Fallback to claimAgentId only for non-admins
  if (claimAgentId && role !== 'admin' && role !== 'superadmin') {
    return claimAgentId;
  }

  return existingTrip?.agent_id || null;
}

/** Ensure tot is always 'SIC' or 'PVT' (DB check constraint). Defaults to 'SIC'. */
function parseTot(value, fallback = 'SIC') {
  const v = (value || '').toString().trim().toUpperCase();
  return (v === 'SIC' || v === 'PVT') ? v : fallback;
}

function formatTripDate(value) {
  const d = parseOptionalDate(value);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function buildTourTransferText(item, direction = 'in') {
  const time = direction === 'out' ? item.departure_time : item.arrival_time;
  const transport = direction === 'out'
    ? (item.flight_out || item.transport_out || '')
    : (item.flight_number || item.mode_of_transport || item.flight_in || '');
  const parts = [];

  if (transport) parts.push(transport);
  if (time) parts.push(time);

  return parts.join(' | ');
}

function extractTourTransferTime(value) {
  if (!value) return '';
  const text = String(value);
  const labeledMatch = text.match(/\b(?:Pickup|Departure):\s*([^|]+)/i);
  if (labeledMatch) return labeledMatch[1].trim();
  const timeMatch = text.match(/\b\d{1,2}:\d{2}(?:\s*[AP]M)?\b/i);
  return timeMatch ? timeMatch[0].trim() : '';
}

function extractTourTransferTransport(value) {
  if (!value) return '';
  const parts = String(value)
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.find((part) => {
    if (/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(part)) return false;
    if (/^\d{1,2}:\d{2}(?:\s*[AP]M)?$/i.test(part)) return false;
    if (/^(?:Pickup|Departure):/i.test(part)) return false;
    if (/^\(.+\)$/.test(part)) return false;
    return true;
  }) || '';
}

function generateQuotationNumber() {
  const now = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const datePart = `${now.getFullYear()}${months[now.getMonth()]}${String(now.getDate()).padStart(2, '0')}`;
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `Q${datePart}${suffix}`;
}

export function calculateQuotationCosts(data) {
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

export function buildPartialQuotationCostInput(data, existing, suppliedItems) {
  return {
    ...data,
    hotel_items: suppliedItems.hotel ? (data.hotel_items || data.hotels || []) : (existing.hotel_trip_items || []),
    excursion_items: suppliedItems.excursion ? (data.excursion_items || data.excursions || []) : (existing.excursion_trip_items || []),
    tour_items: suppliedItems.tour ? (data.tour_items || data.tours || []) : (existing.tour_trip_items || []),
    transfer_items: suppliedItems.transfer ? (data.transfer_items || data.transfers || []) : (existing.transfer_trip_items || []),
    flight_items: suppliedItems.flight ? (data.flight_items || data.flights || []) : (existing.flight_trip_items || []),
    other_items: suppliedItems.other ? (data.other_items || data.others || []) : (existing.other_trip_items || []),
    include_assistance_fee: data.include_assistance_fee !== undefined
      ? data.include_assistance_fee
      : existing.include_assistance_fee,
    assistance_fee_amount: data.assistance_fee_amount !== undefined
      ? data.assistance_fee_amount
      : existing.assistance_fee_amount,
    discount_amount: data.discount_amount !== undefined
      ? data.discount_amount
      : (data.discount !== undefined ? data.discount : existing.discount_amount)
  };
}

async function validateHotelAvailability(tx, hotelItems) {
  if (!hotelItems || hotelItems.length === 0) return;

  for (const item of hotelItems) {
    const hotelIdParsed = parseSafeInt(item.hotel_id);
    if (!hotelIdParsed) continue;

    const roomTypeItems = item.room_type_items || item.room_types || [];
    if (roomTypeItems.length > 0) {
      const hotelDisplayName = item.hotel_name || `Hotel ID ${hotelIdParsed}`;
      for (const rt of roomTypeItems) {
        const roomTypeName = rt.room_type;
        const fromDate = new Date(item.from_date);
        const toDate = new Date(item.to_date);

        // Find the room type record to get its ID
        const roomTypeRecord = await tx.room_types.findFirst({
          where: {
            hotel_id: hotelIdParsed,
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

async function validateTourAvailability(tx, tourItems, tripFallbackDate) {
  if (!tourItems || tourItems.length === 0) return;

  for (const item of tourItems) {
    const tourIdParsed = parseSafeInt(item.tour_id);
    if (!tourIdParsed) continue;

    const fromDate = parseRequiredDate(item.from_date, tripFallbackDate);
    const toDate = parseRequiredDate(item.to_date, tripFallbackDate);
    const tourDisplayName = item.tour_name || `Tour ID ${tourIdParsed}`;

    // Check if there is an active tour stop sale overlapping with travel dates
    const activeStopSale = await tx.tour_stop_sales.findFirst({
      where: {
        tour_id: tourIdParsed,
        stopped: true,
        start_date: { lte: toDate },
        end_date: { gte: fromDate },
        deleted_at: null
      }
    });

    if (activeStopSale) {
      const formattedFrom = fromDate.toISOString().slice(0, 10);
      const formattedTo = toDate.toISOString().slice(0, 10);
      throw new Error(`quotation creation failed: Tour '${tourDisplayName}' is not available for the requested dates (${formattedFrom} to ${formattedTo}). This tour is currently on stop sale. Please select a different tour or adjust your travel dates`);
    }
  }
}

async function validateExcursionAvailability(tx, excursionItems, tripFallbackDate) {
  if (!excursionItems || excursionItems.length === 0) return;

  for (const item of excursionItems) {
    const excursionId = parseSafeInt(item.excursion_id);
    if (!excursionId) continue;
    const fromDate = parseRequiredDate(item.from_date, tripFallbackDate);
    const toDate = parseRequiredDate(item.to_date, fromDate);
    const name = item.excursion_name || item.name || `Excursion ID ${excursionId}`;
    const activeStopSale = await tx.excursion_stop_sales.findFirst({
      where: {
        excursion_id: excursionId,
        stopped: true,
        start_date: { lte: toDate },
        end_date: { gte: fromDate },
        deleted_at: null
      }
    });
    if (activeStopSale) {
      throw new Error(
        `quotation creation failed: Excursion '${name}' is not available for the requested dates ` +
        `(${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}). ` +
        'This excursion is currently on stop sale. Please select a different excursion or adjust your travel dates'
      );
    }
  }
}

async function validateSpecialPackageAvailability(tx, packageId, tripStartDate) {
  if (!packageId) return;

  const pkg = await tx.special_packages.findUnique({
    where: { id: packageId },
    select: { name: true, duration: true }
  });

  if (!pkg) return;

  const fromDate = new Date(tripStartDate);
  fromDate.setHours(0,0,0,0);
  
  const toDate = new Date(fromDate);
  toDate.setDate(fromDate.getDate() + Math.max((pkg.duration || 1) - 1, 0));
  toDate.setHours(0,0,0,0);

  // Check if there is an active stop sale overlapping with the trip stay dates
  const activeStopSale = await tx.special_package_stop_sales.findFirst({
    where: {
      special_package_id: packageId,
      stopped: true,
      start_date: { lte: toDate },
      end_date: { gte: fromDate },
      deleted_at: null
    }
  });

  if (activeStopSale) {
    const formattedFrom = fromDate.toISOString().slice(0, 10);
    const formattedTo = toDate.toISOString().slice(0, 10);
    throw new Error(`quotation creation failed: Special Package '${pkg.name}' is not available for the requested dates (${formattedFrom} to ${formattedTo}). This package is currently on stop sale. Please select a different package or adjust your travel dates`);
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

// ==================== RESPONSE MAPPER ====================
function mapTripResponse(trip) {
  if (!trip) return null;
  const toFloat = (v) => (v !== null && v !== undefined ? parseFloat(v) : 0);
  // Returns YYYY-MM-DD — works for both new Date() in trip.html and input[type=date] in edit_trip.html
  const fmtDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    ...trip,
    // top-level field aliases
    agent: trip.agents || null,
    agent_name: trip.agents ? trip.agents.name : null,
    user: trip.users || null,
    user_name: trip.users ? trip.users.username : null,
    quotation_reference: trip.booking_reference || '',
    client_booking: trip.booking_reference || '',
    total_cost: toFloat(trip.total_amount),
    discount: toFloat(trip.discount_amount),
    final_cost: toFloat(trip.final_amount),
    start_date: fmtDate(trip.trip_start_date),
    booking_date: fmtDate(trip.booking_date || trip.created_at),
    // child item aliases
    hotels: (trip.hotel_trip_items || []).map((h) => ({
      ...h,
      total_price: toFloat(h.total_price),
      price: toFloat(h.total_price),
      single_price: toFloat(h.single_price),
      double_price: toFloat(h.double_price),
      extra_bed_price: toFloat(h.extra_bed_price),
      abf_price: toFloat(h.abf_price),
      lunch_price: toFloat(h.lunch_price),
      dinner_price: toFloat(h.dinner_price),
      discount: toFloat(h.discount),
      total_cost: toFloat(h.total_price),
      final_cost: toFloat(h.total_price),
      from_date: fmtDate(h.from_date),
      to_date: fmtDate(h.to_date),
      room_types: h.hotel_room_type_items || [],
      // Each saved room-type item represents one booked room. Restore the
      // room counts required by the edit form for both current and old data.
      single_room_days: (h.hotel_room_type_items || []).filter(
        (room) => (parseInt(room.adults, 10) || 0) <= 1
      ).length,
      double_room_days: (h.hotel_room_type_items || []).filter(
        (room) => (parseInt(room.adults, 10) || 0) >= 2
      ).length,
      single_rooms: (h.hotel_room_type_items || []).filter(
        (room) => (parseInt(room.adults, 10) || 0) <= 1
      ).length,
      double_rooms: (h.hotel_room_type_items || []).filter(
        (room) => (parseInt(room.adults, 10) || 0) >= 2
      ).length,
    })),
    excursions: (trip.excursion_trip_items || []).map((e) => ({
      ...e,
      price: toFloat(e.price),
      total_cost: toFloat(e.price),
      final_cost: toFloat(e.price),
      date: fmtDate(e.from_date),
      from_date: fmtDate(e.from_date),
      excursion_name: e.excursion_name || e.excursions?.name || "",
    })),
    tours: (trip.tour_trip_items || []).map((t) => {
      const savedCity = String(t.from_location || "").trim();
      const cityLooksInvalid = !savedCity || ["SIC", "PVT", "PRIVATE"].includes(savedCity.toUpperCase());
      const savedRemarks = String(t.remarks || "").trim();
      const remarksLooksInvalid = /^edit\s*delete$/i.test(savedRemarks);
      const tripPax = (parseInt(trip.number_of_adults, 10) || 0) + (parseInt(trip.number_of_kids, 10) || 0);
      const itemPax = (parseInt(t.number_of_adults, 10) || 0) + (parseInt(t.number_of_kids, 10) || 0);
      const displayPax = itemPax > 0 && (!tripPax || itemPax <= tripPax) ? itemPax : tripPax;
      return {
        ...t,
        from_location: cityLooksInvalid ? (t.tours?.city || t.from_location || "") : t.from_location,
        route: t.tours?.route || "",
        remarks: remarksLooksInvalid ? "" : t.remarks,
        pax: displayPax,
        number_of_adults: displayPax,
        number_of_kids: 0,
        price: toFloat(t.price),
        total_cost: toFloat(t.price),
        final_cost: toFloat(t.price),
        from_date: fmtDate(t.from_date),
        to_date: fmtDate(t.to_date),
        flight_in: t.flight_number || extractTourTransferTransport(t.transfer_in) || '',
        flight_out: extractTourTransferTransport(t.transfer_out) || '',
        arrival_time: extractTourTransferTime(t.transfer_in),
        departure_time: extractTourTransferTime(t.transfer_out),
        mode_of_transport: t.flight_number || '',
        tour_name: t.tours?.name || "",
      };
    }),
    transfers: (trip.transfer_trip_items || []).map((t) => ({
      ...t,
      price: toFloat(t.price),
      total_cost: toFloat(t.price),
      final_cost: toFloat(t.price),
      date: fmtDate(t.from_date),
      from_date: fmtDate(t.from_date),
      city: t.city || t.transfers?.city || "",
      transfer_description: t.transfer_description || t.transfers?.description || "",
      pickup_time: t.pickup_time || "",
      flight_time: t.flight_time || "",
    })),
    flights: (trip.flight_trip_items || []).map((f) => ({
      ...f,
      price: toFloat(f.price),
      total_cost: toFloat(f.price),
      final_cost: toFloat(f.price),
      date: fmtDate(f.from_date),
      from_date: fmtDate(f.from_date),
    })),
    others: (trip.other_trip_items || []).map((o) => ({
      ...o,
      price: toFloat(o.price),
      cost: toFloat(o.price),
      total_cost: toFloat(o.price),
      final_cost: toFloat(o.price),
      total_price: toFloat(o.price),
      date: fmtDate(o.from_date),
      from_date: fmtDate(o.from_date),
    })),
  };
}

// ==================== QUOTATIONS ====================
export async function createQuotation(req, res, next) {
  try {
    const data = req.body;
    const claims = req.user;
    const resolvedAgentId = await resolveAgentIdFromRequest(data, claims);

    const trip_start_date = data.trip_start_date
      ? parseOptionalDate(data.trip_start_date)
      : (data.start_date ? parseOptionalDate(data.start_date) : null);
    const tripFallbackDate = trip_start_date && !isNaN(trip_start_date.getTime()) ? trip_start_date : new Date();

    let finalSpecialPackageId = null;
    if (data.special_package_id) {
      finalSpecialPackageId = parseSafeInt(data.special_package_id);
      const pkg = await prisma.special_packages.findUnique({
        where: { id: finalSpecialPackageId },
        include: { items: true }
      });
      if (pkg) {
        const baseDate = trip_start_date && !isNaN(trip_start_date.getTime()) ? trip_start_date : new Date();
        const pkgHotels = [];
        const pkgExcursions = [];
        const pkgTransfers = [];
        const pkgFlights = [];
        const pkgOthers = [];
        const pkgTours = [];

        pkg.items.forEach(item => {
          const dayOffset = (item.day_number || 1) - 1;
          const itemDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
          const dateStr = itemDate.toISOString().substring(0, 10);

          if (item.item_type === 'hotel') {
            const checkoutDate = new Date(itemDate.getTime() + (item.nights || 1) * 24 * 60 * 60 * 1000);
            pkgHotels.push({
              hotel_id: item.hotel_id,
              hotel_name: item.hotel_name,
              room_type: item.room_type,
              nights: item.nights || 1,
              city: item.city || "",
              from_date: dateStr,
              to_date: checkoutDate.toISOString().substring(0, 10),
              price: item.price ? parseFloat(item.price) : 0,
              total_price: item.price ? (parseFloat(item.price) * (item.nights || 1)) : 0,
              remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]",
              room_types_json: null
            });
          } else if (item.item_type === 'transfer') {
            pkgTransfers.push({
              transfer_id: item.transfer_id,
              transfer_type: item.transfer_type || "Private",
              from_location: item.from_location,
              to_location: item.to_location,
              pickup_time: item.pickup_time,
              from_date: dateStr,
              to_date: dateStr,
              city: item.city || "",
              price: item.price ? parseFloat(item.price) : 0,
              remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]",
              tot: "SIC"
            });
          } else if (item.item_type === 'excursion') {
            pkgExcursions.push({
              excursion_id: item.excursion_id,
              excursion_name: item.excursion_name,
              from_date: dateStr,
              to_date: dateStr,
              city: item.city || "",
              toe: "SIC",
              price: item.price ? parseFloat(item.price) : 0,
              remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]"
            });
          } else if (item.item_type === 'flight') {
            pkgFlights.push({
              flight_airline: item.flight_airline,
              flight_number: item.flight_number,
              route: item.flight_route,
              departure_time: item.departure_time,
              arrival_time: item.arrival_time,
              from_date: dateStr,
              to_date: dateStr,
              price: item.price ? parseFloat(item.price) : 0,
              remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]"
            });
          } else if (item.item_type === 'other') {
            pkgOthers.push({
              description: item.other_description || item.description,
              from_date: dateStr,
              to_date: dateStr,
              price: item.price ? parseFloat(item.price) : 0,
              remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]"
            });
          } else if (item.item_type === 'tour') {
            pkgTours.push({
              tour_id: item.tour_id || null,
              tour_name: item.tour_name,
              city: item.city || "",
              tot: "SIC",
              from_date: dateStr,
              to_date: dateStr,
              number_of_adults: 0,
              number_of_kids: 0,
              price: item.price ? parseFloat(item.price) : 0,
              remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]"
            });
          }
        });

        const hasItemsSent = (data.hotel_items && data.hotel_items.length > 0) ||
                             (data.hotels && data.hotels.length > 0) ||
                             (data.transfer_items && data.transfer_items.length > 0) ||
                             (data.transfers && data.transfers.length > 0) ||
                             (data.excursion_items && data.excursion_items.length > 0) ||
                             (data.excursions && data.excursions.length > 0) ||
                             (data.flight_items && data.flight_items.length > 0) ||
                             (data.flights && data.flights.length > 0) ||
                             (data.other_items && data.other_items.length > 0) ||
                             (data.others && data.others.length > 0) ||
                             (data.tour_items && data.tour_items.length > 0) ||
                             (data.tours && data.tours.length > 0);

        if (!hasItemsSent) {
          data.hotel_items = pkgHotels;
          data.excursion_items = pkgExcursions;
          data.transfer_items = pkgTransfers;
          data.flight_items = pkgFlights;
          data.other_items = pkgOthers;
          data.tour_items = pkgTours;
        }

        if (data.total_amount === undefined && data.total_cost === undefined) {
          const sglRooms = parseSafeInt(data.special_pkg_single_rooms) || 0;
          const dblRooms = parseSafeInt(data.special_pkg_double_rooms) || 0;
          const tplRooms = parseSafeInt(data.special_pkg_triple_rooms) || 0;

          if (sglRooms > 0 || dblRooms > 0 || tplRooms > 0) {
            const sglPrice = pkg.price_per_adult ? parseFloat(pkg.price_per_adult) : 0;
            const dblPrice = pkg.price_dbl ? parseFloat(pkg.price_dbl) : 0;
            const tplPrice = pkg.price_per_child ? parseFloat(pkg.price_per_child) : 0;
            data.total_amount = (sglPrice * sglRooms * 1) + (dblPrice * dblRooms * 2) + (tplPrice * tplRooms * 3);
          } else {
            const adults = data.number_of_adults !== undefined ? parseSafeInt(data.number_of_adults) : 1;
            const kids = parseSafeInt(data.number_of_kids) || 0;
            const pkgAdultPrice = pkg.price_per_adult ? parseFloat(pkg.price_per_adult) : 0;
            const pkgChildPrice = pkg.price_per_child ? parseFloat(pkg.price_per_child) : 0;
            data.total_amount = (pkgAdultPrice * adults) + (pkgChildPrice * kids);
          }
          data.final_amount = data.total_amount;
        }
      }
    }

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

    let payment_deadline = data.payment_deadline ? parseOptionalDate(data.payment_deadline) : null;
    let cancellation_deadline = data.cancellation_deadline ? parseOptionalDate(data.cancellation_deadline) : null;


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

    const refNumber = data.booking_reference || data.client_booking || generateQuotationNumber();

    const createdTrip = await prisma.$transaction(async (tx) => {
      await validateHotelAvailability(tx, hotelItems);
      await validateTourAvailability(tx, tourItems, trip_start_date);
      await validateExcursionAvailability(tx, excursionItems, trip_start_date);
      await validateSpecialPackageAvailability(tx, finalSpecialPackageId, trip_start_date);

      let resolvedUserId = parseSafeFK(data.user_id) || parseSafeFK(claims?.user_id);
      if (resolvedUserId) {
        const userExists = await tx.user.findUnique({ where: { id: resolvedUserId }, select: { id: true } });
        if (!userExists) resolvedUserId = null;
      }

      let finalAgentId = resolvedAgentId ? parseSafeFK(resolvedAgentId) : null;
      if (finalAgentId) {
        const agentExists = await tx.agent.findUnique({ where: { id: finalAgentId }, select: { id: true } });
        if (!agentExists) {
          const defaultAgent = await tx.agent.findFirst({ select: { id: true } });
          finalAgentId = defaultAgent ? defaultAgent.id : null;
        }
      } else {
        const defaultAgent = await tx.agent.findFirst({ select: { id: true } });
        finalAgentId = defaultAgent ? defaultAgent.id : null;
      }

      const trip = await tx.trips.create({
        data: {
          agent_id: finalAgentId,
          client_name: data.client_name,
          client_phone: data.client_phone,
          client_email: data.client_email || null,
          number_of_adults: data.number_of_adults !== undefined ? parseSafeInt(data.number_of_adults) : 1,
          number_of_kids: parseSafeInt(data.number_of_kids) || 0,
          booking_reference: refNumber,
          file_reference: data.file_reference || null,
          invoice_number: data.invoice_number || null,
          booking_date: parseOptionalDate(data.booking_date) || new Date(),
          remarks: data.remarks || null,
          total_amount,
          discount_amount,
          final_amount,
          ...buildNewQuotationWorkflowState(),
          trip_start_date,
          user_id: resolvedUserId,
          amount_paid: data.amount_paid !== undefined ? parseFloat(data.amount_paid) : 0.00,
          penalty_cost: data.penalty_cost !== undefined ? parseFloat(data.penalty_cost) : 0.00,
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
          referral_source: data.referral_source || null,
          special_package_id: finalSpecialPackageId,
          special_pkg_single_rooms: parseSafeInt(data.special_pkg_single_rooms) || 0,
          special_pkg_double_rooms: parseSafeInt(data.special_pkg_double_rooms) || 0,
          special_pkg_triple_rooms: parseSafeInt(data.special_pkg_triple_rooms) || 0
        }
      });

      const id = trip.id;
      const getApprovalState = (type, item) =>
        resolveServiceApprovalState(null, item);

      if (hotelItems.length) {
        for (const item of hotelItems) {
          const rtItems = item.room_type_items || item.room_types || [];
          const approvalState = getApprovalState('hotel', item);

          const rawHotelId = parseSafeFK(item.hotel_id);
          let validHotelId = null;
          if (rawHotelId) {
            const hotelExists = await tx.hotels.findUnique({ where: { id: rawHotelId }, select: { id: true } });
            if (hotelExists) validHotelId = rawHotelId;
          }

          const rawPromoId = parseSafeFK(item.promotions) || parseSafeFK(item.promotion_id);
          let validPromoId = null;
          if (rawPromoId) {
            const promoExists = await tx.hotel_promotions.findUnique({ where: { id: rawPromoId }, select: { id: true } });
            if (promoExists) validPromoId = rawPromoId;
          }

          await tx.hotel_trip_items.create({ data: {
              trip_item_id: id, hotel_id: validHotelId, from_date: parseRequiredDate(item.from_date, tripFallbackDate),
              to_date: parseRequiredDate(item.to_date, tripFallbackDate), city: safeTruncate(item.city, 100) || "", hotel_name: safeTruncate(item.hotel_name, 255) || "",
              nights: parseSafeInt(item.nights) || 1, single_price: parseFloat(item.single_price) || 0, double_price: parseFloat(item.double_price) || 0,
              extra_bed_price: parseFloat(item.extra_bed_price) || 0, room_type: safeTruncate(item.room_type || item.room_type_summary, 100),
              abf_price: parseFloat(item.abf_price) || 0, lunch_price: parseFloat(item.lunch_price) || 0, dinner_price: parseFloat(item.dinner_price) || 0,
              promotions: validPromoId, tour_package: safeTruncate(item.tour_package, 255),
              notes: item.notes, approved: approvalState.approved, declined: approvalState.declined,
              promotion: item.promotion || null,
              meals: item.meals || null,
              room_types_json: item.room_types_json || null,
              early_check_in: item.early_check_in || false,
              late_check_out: item.late_check_out || false,
              late_checkout_type: safeTruncate(item.late_checkout_type, 20),
              flight_in: item.flight_in || null,
              flight_out: item.flight_out || null,
              flight_info: item.flight_info || null,
              discount: item.discount !== undefined ? parseFloat(item.discount) : 0,
              booking_status: item.booking_status || null,
              booking_remark: item.booking_remark || null,
              promotion_id: validPromoId,
              total_price: item.total_price !== undefined ? parseFloat(item.total_price) : (item.final_cost !== undefined ? parseFloat(item.final_cost) : 0),
              display_order: parseSafeInt(item.display_order) || 0,
              extra_adult_bed_count: item.extra_adult_bed_count || 0,
              extra_child_bed_count: item.extra_child_bed_count || 0,
              rsvn_in: parseOptionalDate(item.rsvn_in),
              rsvn_out: parseOptionalDate(item.rsvn_out),
              payment_date: parseOptionalDate(item.payment_date),
              hotel_room_type_items: rtItems.length > 0 ? {
                create: rtItems.map(rt => ({
                  room_type_id: parseSafeFK(rt.room_type_id), room_type: safeTruncate(rt.room_type, 100),
                  adults: parseSafeInt(rt.adults) || 0, children: parseSafeInt(rt.children) || 0,
                  complimentary_abf: rt.complimentary_abf || false,
                  extra_adult_bed: rt.extra_adult_bed || false,
                  extra_child_bed: rt.extra_child_bed || false,
                  sharing_bed: rt.sharing_bed || false
                }))
              } : undefined
          } });
        }
      }

      if (excursionItems.length) {
        for (const item of excursionItems) {
          const excursionDate = parseRequiredDate(item.from_date || item.date, tripFallbackDate);
          const approvalState = getApprovalState('excursion', item);

          const rawExcId = parseSafeFK(item.excursion_id);
          let validExcId = null;
          if (rawExcId) {
            const excExists = await tx.excursions.findUnique({ where: { id: rawExcId }, select: { id: true } });
            if (excExists) validExcId = rawExcId;
          }

          const rawSuppId = parseSafeFK(item.supplier_id);
          let validSuppId = null;
          if (rawSuppId) {
            const suppExists = await tx.suppliers.findUnique({ where: { id: rawSuppId }, select: { id: true } });
            if (suppExists) validSuppId = rawSuppId;
          }

          const rawCurrId = parseSafeFK(item.currency_id);
          let validCurrId = null;
          if (rawCurrId) {
            const currExists = await tx.currencies.findUnique({ where: { id: rawCurrId }, select: { id: true } });
            if (currExists) validCurrId = rawCurrId;
          }

          await tx.excursion_trip_items.create({ data: {
              trip_item_id: id, excursion_id: validExcId, supplier_id: validSuppId,
              city: safeTruncate(item.city, 255), toe: safeTruncate(item.toe, 50), from_date: excursionDate,
              to_date: excursionDate, hotel: safeTruncate(item.hotel, 255),
              guide_name: safeTruncate(item.guide_name, 255), guide_contact: safeTruncate(item.guide_contact, 50),
              price: parseFloat(item.price) || 0, currency_id: validCurrId, remarks: item.remarks,
              approved: approvalState.approved, declined: approvalState.declined,
              pickup_time: safeTruncate(item.pickup_time, 50) || null
          } });
        }
      }

      if (tourItems.length) {
        for (const item of tourItems) {
          const approvalState = getApprovalState('tour', item);

          const rawTourId = parseSafeFK(item.tour_id);
          let validTourId = null;
          if (rawTourId) {
            const tourExists = await tx.tours.findUnique({ where: { id: rawTourId }, select: { id: true } });
            if (tourExists) validTourId = rawTourId;
          }

          const rawSuppId = parseSafeFK(item.supplier_id);
          let validSuppId = null;
          if (rawSuppId) {
            const suppExists = await tx.suppliers.findUnique({ where: { id: rawSuppId }, select: { id: true } });
            if (suppExists) validSuppId = rawSuppId;
          }

          const rawCurrId = parseSafeFK(item.currency_id);
          let validCurrId = null;
          if (rawCurrId) {
            const currExists = await tx.currencies.findUnique({ where: { id: rawCurrId }, select: { id: true } });
            if (currExists) validCurrId = rawCurrId;
          }

          await tx.tour_trip_items.create({ data: {
              trip_item_id: id, tour_id: validTourId, supplier_id: validSuppId,
              tot: safeTruncate(parseTot(item.tot), 50), from_location: safeTruncate(item.from_location, 255), to_location: safeTruncate(item.to_location, 255),
              number_of_adults: parseSafeInt(item.number_of_adults) || 0, number_of_kids: parseSafeInt(item.number_of_kids) || 0,
              from_date: parseRequiredDate(item.from_date, tripFallbackDate), to_date: parseRequiredDate(item.to_date, tripFallbackDate),
              flight_in: parseOptionalDate(item.flight_in),
              flight_number: safeTruncate(item.flight_number || item.flight_in, 50), flight_out: parseOptionalDate(item.flight_out),
              guide_name: safeTruncate(item.guide_name, 255), guide_contact: safeTruncate(item.guide_contact, 50),
              payment_car: item.payment_car, payment_service: item.payment_service,
              price: parseFloat(item.price) || 0, currency_id: validCurrId, remarks: item.remarks,
              approved: approvalState.approved, declined: approvalState.declined,
              transfer_in: item.transfer_in || buildTourTransferText(item, 'in') || null,
              transfer_out: item.transfer_out || buildTourTransferText(item, 'out') || null
          } });
        }
      }

      if (transferItems.length) {
        for (const item of transferItems) {
          const transferDate = parseRequiredDate(item.from_date || item.date, tripFallbackDate);
          const approvalState = getApprovalState('transfer', item);

          const rawTransId = parseSafeFK(item.transfer_id);
          let validTransId = null;
          if (rawTransId) {
            const transExists = await tx.transfers.findUnique({ where: { id: rawTransId }, select: { id: true } });
            if (transExists) validTransId = rawTransId;
          }

          const rawSuppId = parseSafeFK(item.supplier_id);
          let validSuppId = null;
          if (rawSuppId) {
            const suppExists = await tx.suppliers.findUnique({ where: { id: rawSuppId }, select: { id: true } });
            if (suppExists) validSuppId = rawSuppId;
          }

          const rawCurrId = parseSafeFK(item.currency_id);
          let validCurrId = null;
          if (rawCurrId) {
            const currExists = await tx.currencies.findUnique({ where: { id: rawCurrId }, select: { id: true } });
            if (currExists) validCurrId = rawCurrId;
          }

          await tx.transfer_trip_items.create({ data: {
              trip_item_id: id,
              transfer_id: validTransId,
              from_location: safeTruncate(item.from_location, 255), to_location: safeTruncate(item.to_location, 255),
              from_date: transferDate, to_date: transferDate,
              flight_number: safeTruncate(item.flight_number, 50), tot: safeTruncate(parseTot(item.tot), 10) || "SIC",
              supplier_id: validSuppId, guide_name: safeTruncate(item.guide_name, 255),
              guide_contact: safeTruncate(item.guide_contact, 20), price: parseFloat(item.price) || 0,
              currency_id: validCurrId, remarks: item.remarks,
              approved: approvalState.approved, declined: approvalState.declined,
              city: safeTruncate(item.city || item.transferCity, 255),
              transfer_description: safeTruncate(item.transfer_description || item.transferType, 255),
              pickup_time: safeTruncate(item.pickup_time || item.transferPickupTime, 255),
              flight_time: safeTruncate(item.flight_time || item.flightTime, 50),
              type_of_transfer: safeTruncate(item.type_of_transfer || item.transferRouteType, 50)
          } });
        }
      }

      if (flightItems.length) {
        for (const item of flightItems) {
          const flightDate = parseRequiredDate(item.from_date || item.flight_date || item.date, tripFallbackDate);
          const approvalState = getApprovalState('flight', item);

          const rawCurrId = parseSafeFK(item.currency_id);
          let validCurrId = null;
          if (rawCurrId) {
            const currExists = await tx.currencies.findUnique({ where: { id: rawCurrId }, select: { id: true } });
            if (currExists) validCurrId = rawCurrId;
          }

          const normalizedFlight = normalizeQuotationFlightFields(item);
          await tx.flight_trip_items.create({ data: {
              trip_item_id: id, from_date: flightDate, to_date: flightDate,
              flight_number: safeTruncate(item.flight_number, 50), in_or_out: safeTruncate(item.in_or_out, 10),
              route: safeTruncate(item.route, 100), issued_by: safeTruncate(item.issued_by, 100), price: parseFloat(item.price) || 0,
              currency_id: validCurrId, remarks: item.remarks,
              approved: approvalState.approved, declined: approvalState.declined,
              ...normalizedFlight,
              flight_airline: safeTruncate(normalizedFlight.flight_airline || item.flight_airline, 100)
          } });
        }
      }

      if (otherItems.length) {
        for (const item of otherItems) {
          const otherDate = parseRequiredDate(item.from_date || item.date, tripFallbackDate);
          await tx.other_trip_items.create({ data: {
              trip_item_id: id, other_id: parseSafeFK(item.other_id),
              from_date: otherDate, to_date: otherDate
          } });
        }
      }
      return trip;
    }, { timeout: 20000 });

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
        special_packages: true,
        other_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { others: true }
        },
        invoices: { include: { invoice_items: true } }
      }
    });

    const mapped = mapTripResponse(trip);
    return res.status(201).json({
      ...mapped,
      message: "Quotation created successfully",
      QuotationReference: trip.booking_reference,
      TripID: String(trip.id)
    });
  } catch (err) { next(err); }
}

export async function listQuotations(req, res, next) {
  try {
    const claims = req.user;
    const where = applyAgentTripScope({
      declined: false,
      status: { in: ['Pending', 'InProgress', 'Approved', 'Confirmed', 'Unconfirmed'] }
    }, claims);
    const trips = await prisma.trips.findMany({
      where,
      include: { agents: true, users: true },
      orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }]
    });
    return res.json(trips.map(mapTripResponse));
  } catch (err) { next(err); }
}

export async function listQuotationsByDateRange(req, res, next) {
  try {
    const { from_date, to_date } = req.query;
    const claims = req.user;
    const where = { declined: false, status: { in: ['Pending', 'InProgress', 'Approved', 'Confirmed', 'Unconfirmed'] } };
    if (from_date && to_date) {
      where.created_at = { gte: new Date(from_date), lte: new Date(to_date) };
    }
    applyAgentTripScope(where, claims);
    const trips = await prisma.trips.findMany({ where, include: { agents: true, users: true }, orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }] });
    return res.json(trips.map(mapTripResponse));
  } catch (err) { next(err); }
}

export async function getQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');
    const claims = req.user;
    const where = applyAgentTripScope({ id }, claims);
    const trip = await prisma.trips.findFirst({
      where,
      include: {
        agents: true,
        users: true,
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
    return res.json(mapTripResponse(trip));
  } catch (err) { next(err); }
}

export async function updateQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');
    const data = req.body;
    const claims = req.user;

    const existing = await prisma.trips.findUnique({
      where: { id },
      // A partial save must retain both the existing service rows and their
      // contribution to the quotation total.
      include: {
        hotel_trip_items: true,
        excursion_trip_items: true,
        tour_trip_items: true,
        transfer_trip_items: true,
        flight_trip_items: true,
        other_trip_items: true
      }
    });
    if (!existing) return res.status(404).send('Quotation not found');
    if (!agentOwnsTrip(existing, claims)) {
      return res.status(403).send('Forbidden: Access denied to this quotation');
    }
    if (!agentCanModifyQuotation(existing, claims)) {
      return res.status(409).json({
        message: 'Only pending quotations can be edited by an agent.'
      });
    }
    const resolvedAgentId = (data.agent_id !== undefined || data.agent_name)
      ? await resolveAgentIdFromRequest(data, claims, prisma, existing)
      : existing.agent_id;

    const trip_start_date = data.trip_start_date !== undefined
      ? parseOptionalDate(data.trip_start_date)
      : (data.start_date !== undefined ? parseOptionalDate(data.start_date) : undefined);
    
    let finalSpecialPackageId = undefined;
    if (data.special_package_id !== undefined) {
      if (data.special_package_id === null) {
        finalSpecialPackageId = null;
      } else {
        finalSpecialPackageId = parseSafeInt(data.special_package_id);
        const pkg = await prisma.special_packages.findUnique({
          where: { id: finalSpecialPackageId },
          include: { items: true }
        });
        if (pkg) {
          const baseDate = trip_start_date ? trip_start_date : (existing.trip_start_date ? new Date(existing.trip_start_date) : new Date());
          const dateStrBase = baseDate.toISOString().substring(0, 10);
          const pkgHotels = [];
          const pkgExcursions = [];
          const pkgTransfers = [];
          const pkgFlights = [];
          const pkgOthers = [];
          const pkgTours = [];

          pkg.items.forEach(item => {
            const dayOffset = (item.day_number || 1) - 1;
            const itemDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
            const dateStr = itemDate.toISOString().substring(0, 10);

            if (item.item_type === 'hotel') {
              const checkoutDate = new Date(itemDate.getTime() + (item.nights || 1) * 24 * 60 * 60 * 1000);
              pkgHotels.push({
                hotel_id: item.hotel_id,
                hotel_name: item.hotel_name,
                room_type: item.room_type,
                nights: item.nights || 1,
                city: item.city || "",
                from_date: dateStr,
                to_date: checkoutDate.toISOString().substring(0, 10),
                price: item.price ? parseFloat(item.price) : 0,
                total_price: item.price ? (parseFloat(item.price) * (item.nights || 1)) : 0,
                remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]",
                room_types_json: null
              });
            } else if (item.item_type === 'transfer') {
              pkgTransfers.push({
                transfer_id: item.transfer_id,
                transfer_type: item.transfer_type || "Private",
                from_location: item.from_location,
                to_location: item.to_location,
                pickup_time: item.pickup_time,
                from_date: dateStr,
                to_date: dateStr,
                city: item.city || "",
                price: item.price ? parseFloat(item.price) : 0,
                remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]",
                tot: "SIC"
              });
            } else if (item.item_type === 'excursion') {
              pkgExcursions.push({
                excursion_id: item.excursion_id,
                excursion_name: item.excursion_name,
                from_date: dateStr,
                to_date: dateStr,
                city: item.city || "",
                toe: "SIC",
                price: item.price ? parseFloat(item.price) : 0,
                remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]"
              });
            } else if (item.item_type === 'flight') {
              pkgFlights.push({
                flight_airline: item.flight_airline,
                flight_number: item.flight_number,
                route: item.flight_route,
                departure_time: item.departure_time,
                arrival_time: item.arrival_time,
                from_date: dateStr,
                to_date: dateStr,
                price: item.price ? parseFloat(item.price) : 0,
                remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]"
              });
            } else if (item.item_type === 'other') {
              pkgOthers.push({
                description: item.other_description || item.description,
                from_date: dateStr,
                to_date: dateStr,
                price: item.price ? parseFloat(item.price) : 0,
                remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]"
              });
            } else if (item.item_type === 'tour') {
              pkgTours.push({
                tour_id: item.tour_id || null,
                tour_name: item.tour_name,
                city: item.city || "",
                tot: "SIC",
                from_date: dateStr,
                to_date: dateStr,
                number_of_adults: 0,
                number_of_kids: 0,
                price: item.price ? parseFloat(item.price) : 0,
                remarks: item.remarks ? `${item.remarks} [Special Package]` : "[Special Package]"
              });
            }
          });

          const hasItemsSent = (data.hotel_items && data.hotel_items.length > 0) ||
                               (data.hotels && data.hotels.length > 0) ||
                               (data.transfer_items && data.transfer_items.length > 0) ||
                               (data.transfers && data.transfers.length > 0) ||
                               (data.excursion_items && data.excursion_items.length > 0) ||
                               (data.excursions && data.excursions.length > 0) ||
                               (data.flight_items && data.flight_items.length > 0) ||
                               (data.flights && data.flights.length > 0) ||
                               (data.other_items && data.other_items.length > 0) ||
                               (data.others && data.others.length > 0) ||
                               (data.tour_items && data.tour_items.length > 0) ||
                               (data.tours && data.tours.length > 0);

          if (!hasItemsSent) {
            data.hotel_items = pkgHotels;
            data.excursion_items = pkgExcursions;
            data.transfer_items = pkgTransfers;
            data.flight_items = pkgFlights;
            data.other_items = pkgOthers;
            data.tour_items = pkgTours;
          }

          if (data.total_amount === undefined && data.total_cost === undefined) {
            const sglRooms = data.special_pkg_single_rooms !== undefined ? (parseSafeInt(data.special_pkg_single_rooms) || 0) : (parseSafeInt(existing.special_pkg_single_rooms) || 0);
            const dblRooms = data.special_pkg_double_rooms !== undefined ? (parseSafeInt(data.special_pkg_double_rooms) || 0) : (parseSafeInt(existing.special_pkg_double_rooms) || 0);
            const tplRooms = data.special_pkg_triple_rooms !== undefined ? (parseSafeInt(data.special_pkg_triple_rooms) || 0) : (parseSafeInt(existing.special_pkg_triple_rooms) || 0);

            if (sglRooms > 0 || dblRooms > 0 || tplRooms > 0) {
              const sglPrice = pkg.price_per_adult ? parseFloat(pkg.price_per_adult) : 0;
              const dblPrice = pkg.price_dbl ? parseFloat(pkg.price_dbl) : 0;
              const tplPrice = pkg.price_per_child ? parseFloat(pkg.price_per_child) : 0;
              data.total_amount = (sglPrice * sglRooms * 1) + (dblPrice * dblRooms * 2) + (tplPrice * tplRooms * 3);
            } else {
              const adults = data.number_of_adults !== undefined
                ? parseSafeInt(data.number_of_adults)
                : (existing.number_of_adults ?? 1);
              const kids = parseSafeInt(data.number_of_kids) || parseSafeInt(existing.number_of_kids) || 0;
              const pkgAdultPrice = pkg.price_per_adult ? parseFloat(pkg.price_per_adult) : 0;
              const pkgChildPrice = pkg.price_per_child ? parseFloat(pkg.price_per_child) : 0;
              data.total_amount = (pkgAdultPrice * adults) + (pkgChildPrice * kids);
            }
            data.final_amount = data.total_amount;
          }
        }
      }
    }

    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(data, key);
    const suppliedItems = {
      hotel: hasOwn('hotel_items') || hasOwn('hotels'),
      excursion: hasOwn('excursion_items') || hasOwn('excursions'),
      tour: hasOwn('tour_items') || hasOwn('tours'),
      transfer: hasOwn('transfer_items') || hasOwn('transfers'),
      flight: hasOwn('flight_items') || hasOwn('flights'),
      other: hasOwn('other_items') || hasOwn('others')
    };
    const hotelItems = data.hotel_items || data.hotels || [];
    const excursionItems = data.excursion_items || data.excursions || [];
    const tourItems = data.tour_items || data.tours || [];
    const transferItems = data.transfer_items || data.transfers || [];
    const flightItems = data.flight_items || data.flights || [];
    const otherItems = data.other_items || data.others || [];

    const calculated = calculateQuotationCosts(buildPartialQuotationCostInput(data, existing, suppliedItems));
    const anyServicesSupplied = Object.values(suppliedItems).some(Boolean);
    const total_amount = data.total_amount !== undefined
      ? parseFloat(data.total_amount)
      : (data.total_cost !== undefined
          ? parseFloat(data.total_cost)
          : (anyServicesSupplied ? calculated.total_amount : existing.total_amount));
    const discount_amount = data.discount_amount !== undefined
      ? parseFloat(data.discount_amount)
      : (data.discount !== undefined
          ? parseFloat(data.discount)
          : (anyServicesSupplied ? calculated.discount_amount : existing.discount_amount));
    const final_amount = data.final_amount !== undefined
      ? parseFloat(data.final_amount)
      : (data.final_cost !== undefined
          ? parseFloat(data.final_cost)
          : (anyServicesSupplied ? calculated.final_amount : existing.final_amount));

    let payment_deadline = existing.payment_deadline;
    let cancellation_deadline = existing.cancellation_deadline;

    if (data.payment_deadline !== undefined) {
      payment_deadline = parseOptionalDate(data.payment_deadline);
    }
    if (data.cancellation_deadline !== undefined) {
      cancellation_deadline = parseOptionalDate(data.cancellation_deadline);
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
          if (payment_deadline === undefined) payment_deadline = currentTrip.payment_deadline;
          if (cancellation_deadline === undefined) cancellation_deadline = currentTrip.cancellation_deadline;
        }
      }

      const tripFallbackDate = final_trip_start_date && !isNaN(new Date(final_trip_start_date).getTime()) ? new Date(final_trip_start_date) : new Date();

      await validateTourAvailability(tx, tourItems, tripFallbackDate);
      await validateExcursionAvailability(tx, excursionItems, tripFallbackDate);
      const packageIdToValidate = finalSpecialPackageId !== undefined ? finalSpecialPackageId : existing.special_package_id;
      await validateSpecialPackageAvailability(tx, packageIdToValidate, tripFallbackDate);

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

      // Approval is workflow state. Preserve it for existing services when a
      // booking is edited; only the dedicated approve/decline actions change it.
      const [savedHotels, savedExcursions, savedTours, savedTransfers, savedFlights, savedOthers] = await Promise.all([
        tx.hotel_trip_items.findMany({
          where: { trip_item_id: id },
          select: { id: true, approved: true, declined: true, email_sent: true }
        }),
        tx.excursion_trip_items.findMany({
          where: { trip_item_id: id },
          select: { id: true, approved: true, declined: true, email_sent: true }
        }),
        tx.tour_trip_items.findMany({
          where: { trip_item_id: id },
          select: { id: true, approved: true, declined: true, email_sent: true }
        }),
        tx.transfer_trip_items.findMany({
          where: { trip_item_id: id },
          select: { id: true, approved: true, declined: true, email_sent: true }
        }),
        tx.flight_trip_items.findMany({
          where: { trip_item_id: id },
          select: { id: true, approved: true, declined: true }
        }),
        tx.other_trip_items.findMany({
          where: { trip_item_id: id },
          select: { id: true }
        })
      ]);
      const approvalMaps = {
        hotel: new Map(savedHotels.map((item) => [item.id, item])),
        excursion: new Map(savedExcursions.map((item) => [item.id, item])),
        tour: new Map(savedTours.map((item) => [item.id, item])),
        transfer: new Map(savedTransfers.map((item) => [item.id, item])),
        flight: new Map(savedFlights.map((item) => [item.id, item])),
        other: new Map(savedOthers.map((item) => [item.id, item]))
      };
      const getApprovalState = (type, item) =>
        resolveServiceApprovalState(approvalMaps[type], item);
      const finalApprovalStates = (type, incomingItems, savedItems) =>
        suppliedItems[type]
          ? incomingItems.map((item) => getApprovalState(type, item))
          : savedItems.map((item) => ({ approved: Boolean(item.approved), declined: Boolean(item.declined) }));
      const confirmableStates = [
        ...finalApprovalStates('hotel', hotelItems, savedHotels),
        ...finalApprovalStates('excursion', excursionItems, savedExcursions),
        ...finalApprovalStates('transfer', transferItems, savedTransfers)
      ];
      const allServicesConfirmed = confirmableStates.length > 0 &&
        confirmableStates.every((item) => item.approved);
      const statusAfterSave = resolveBookingStatusAfterSave(
        existing.status,
        allServicesConfirmed,
        data.status
      );

      const itemIdAliases = {
        hotel: ['id', 'trip_hotel_id', 'hotel_trip_item_id'],
        excursion: ['id', 'trip_excursion_id', 'excursion_trip_item_id'],
        tour: ['id', 'trip_tour_id', 'tour_trip_item_id'],
        transfer: ['id', 'trip_transfer_id', 'transfer_trip_item_id'],
        flight: ['id', 'trip_flight_id', 'flight_trip_item_id'],
        other: ['id', 'trip_other_id', 'other_trip_item_id']
      };
      const getIncomingItemId = (type, item = {}) => {
        for (const key of itemIdAliases[type]) {
          const parsed = parseSafeInt(item[key]);
          if (parsed) return parsed;
        }
        return null;
      };
      const keptIds = {
        hotel: new Set(), excursion: new Set(), tour: new Set(),
        transfer: new Set(), flight: new Set(), other: new Set()
      };
      const saveTripItem = async (type, item, createData) => {
        const delegate = tx[`${type}_trip_items`];
        const incomingId = getIncomingItemId(type, item);
        if (incomingId && approvalMaps[type].has(incomingId)) {
          keptIds[type].add(incomingId);
          const updateData = { ...createData };
          delete updateData.trip_item_id;
          delete updateData.approved;
          delete updateData.declined;
          delete updateData.email_sent;
          if (type === 'hotel') {
            const roomTypesSupplied = Object.prototype.hasOwnProperty.call(item, 'room_type_items') ||
              Object.prototype.hasOwnProperty.call(item, 'room_types');
            if (roomTypesSupplied) {
              await tx.hotel_room_type_items.deleteMany({ where: { hotel_trip_item_id: incomingId } });
              if (!updateData.hotel_room_type_items) {
                delete updateData.hotel_room_type_items;
              }
            } else {
              delete updateData.hotel_room_type_items;
            }
          }
          return delegate.update({ where: { id: incomingId }, data: updateData });
        }
        const created = await delegate.create({ data: createData });
        keptIds[type].add(created.id);
        return created;
      };
      const deleteRemovedTripItems = async (type) => {
        if (!suppliedItems[type]) return;
        const delegate = tx[`${type}_trip_items`];
        const ids = [...keptIds[type]];
        await delegate.deleteMany({
          where: {
            trip_item_id: id,
            ...(ids.length ? { id: { notIn: ids } } : {})
          }
        });
      };

      let resolvedUserId = data.user_id !== undefined ? parseSafeFK(data.user_id) : parseSafeFK(existing.user_id);
      if (resolvedUserId) {
        const userExists = await tx.user.findUnique({ where: { id: resolvedUserId }, select: { id: true } });
        if (!userExists) resolvedUserId = null;
      }

      let finalAgentId = resolvedAgentId ? parseSafeFK(resolvedAgentId) : null;
      if (finalAgentId) {
        const agentExists = await tx.agent.findUnique({ where: { id: finalAgentId }, select: { id: true } });
        if (!agentExists) {
          finalAgentId = existing.agent_id || null;
        }
      }

      // Update trip base data
      await tx.trips.update({
        where: { id },
        data: {
          client_name: data.client_name, client_phone: data.client_phone,
          number_of_adults: data.number_of_adults !== undefined ? parseSafeInt(data.number_of_adults) : undefined,
          number_of_kids: data.number_of_kids !== undefined ? parseSafeInt(data.number_of_kids) : undefined,
          booking_reference: data.booking_reference !== undefined ? data.booking_reference : data.client_booking,
          file_reference: data.file_reference,
          invoice_number: data.invoice_number !== undefined ? data.invoice_number : undefined,
          booking_date: data.booking_date !== undefined ? parseOptionalDate(data.booking_date) : undefined,
          remarks: data.remarks, agent_id: finalAgentId,
          total_amount, discount_amount, final_amount,
          trip_start_date,
          client_email: data.client_email !== undefined ? data.client_email : undefined,
          user_id: resolvedUserId,
          // Keep conversion state intact during normal saves.
          is_booking: undefined,
          amount_paid: data.amount_paid !== undefined ? parseFloat(data.amount_paid) : undefined,
          penalty_cost: data.penalty_cost !== undefined ? parseFloat(data.penalty_cost) : undefined,
          status: statusAfterSave,
          include_assistance_fee: data.include_assistance_fee !== undefined
            ? calculated.include_assistance_fee
            : undefined,
          assistance_fee_amount: data.assistance_fee_amount !== undefined
            ? calculated.assistance_fee_amount
            : undefined,
          include_description_in_itinerary: data.include_description_in_itinerary !== undefined ? data.include_description_in_itinerary : undefined,
          payment_deadline,
          cancellation_deadline,
          affiliate_coupon_code: data.coupon_code || data.affiliate_coupon_code || undefined,
          utm_source: data.utm_source || undefined,
          utm_medium: data.utm_medium || undefined,
          utm_campaign: data.utm_campaign || undefined,
          utm_content: data.utm_content || undefined,
          utm_term: data.utm_term || undefined,
          referral_source: data.referral_source || undefined,
          special_package_id: finalSpecialPackageId,
          special_pkg_single_rooms: data.special_pkg_single_rooms !== undefined ? (data.special_pkg_single_rooms ? parseSafeInt(data.special_pkg_single_rooms) : 0) : undefined,
          special_pkg_double_rooms: data.special_pkg_double_rooms !== undefined ? (data.special_pkg_double_rooms ? parseSafeInt(data.special_pkg_double_rooms) : 0) : undefined,
          special_pkg_triple_rooms: data.special_pkg_triple_rooms !== undefined ? (data.special_pkg_triple_rooms ? parseSafeInt(data.special_pkg_triple_rooms) : 0) : undefined
        }
      });

      // Update existing service rows by their trip-item IDs. New rows are
      // created, while rows omitted from an explicitly supplied collection
      // are removed after all incoming rows have been processed.
      if (hotelItems.length) {
        for (const item of hotelItems) {
          const rtItems = item.room_type_items || item.room_types || [];
          const approvalState = getApprovalState('hotel', item);

          const rawHotelId = parseSafeFK(item.hotel_id);
          let validHotelId = null;
          if (rawHotelId) {
            const hotelExists = await tx.hotels.findUnique({ where: { id: rawHotelId }, select: { id: true } });
            if (hotelExists) validHotelId = rawHotelId;
          }

          const rawPromoId = parseSafeFK(item.promotions) || parseSafeFK(item.promotion_id);
          let validPromoId = null;
          if (rawPromoId) {
            const promoExists = await tx.hotel_promotions.findUnique({ where: { id: rawPromoId }, select: { id: true } });
            if (promoExists) validPromoId = rawPromoId;
          }

          await saveTripItem('hotel', item, {
              trip_item_id: id, hotel_id: validHotelId, from_date: parseRequiredDate(item.from_date, tripFallbackDate),
              to_date: parseRequiredDate(item.to_date, tripFallbackDate), city: safeTruncate(item.city, 100) || "", hotel_name: safeTruncate(item.hotel_name, 255) || "",
              nights: parseSafeInt(item.nights) || 1, single_price: parseFloat(item.single_price) || 0, double_price: parseFloat(item.double_price) || 0,
              extra_bed_price: parseFloat(item.extra_bed_price) || 0, room_type: safeTruncate(item.room_type || item.room_type_summary, 100),
              abf_price: parseFloat(item.abf_price) || 0, lunch_price: parseFloat(item.lunch_price) || 0, dinner_price: parseFloat(item.dinner_price) || 0,
              promotions: validPromoId, tour_package: safeTruncate(item.tour_package, 255),
              notes: item.notes, approved: approvalState.approved, declined: approvalState.declined,
              promotion: item.promotion || null,
              meals: item.meals || null,
              room_types_json: item.room_types_json || null,
              early_check_in: item.early_check_in || false,
              late_check_out: item.late_check_out || false,
              late_checkout_type: safeTruncate(item.late_checkout_type, 20),
              flight_in: item.flight_in || null,
              flight_out: item.flight_out || null,
              flight_info: item.flight_info || null,
              discount: item.discount !== undefined ? parseFloat(item.discount) : 0,
              booking_status: item.booking_status || null,
              booking_remark: item.booking_remark || null,
              promotion_id: validPromoId,
              total_price: item.total_price !== undefined ? parseFloat(item.total_price) : (item.final_cost !== undefined ? parseFloat(item.final_cost) : 0),
              display_order: parseSafeInt(item.display_order) || 0,
              extra_adult_bed_count: item.extra_adult_bed_count || 0,
              extra_child_bed_count: item.extra_child_bed_count || 0,
              rsvn_in: parseOptionalDate(item.rsvn_in),
              rsvn_out: parseOptionalDate(item.rsvn_out),
              payment_date: parseOptionalDate(item.payment_date),
              hotel_room_type_items: rtItems.length > 0 ? {
                create: rtItems.map(rt => ({
                  room_type_id: parseSafeFK(rt.room_type_id), room_type: safeTruncate(rt.room_type, 100),
                  adults: parseSafeInt(rt.adults) || 0, children: parseSafeInt(rt.children) || 0,
                  complimentary_abf: rt.complimentary_abf || false,
                  extra_adult_bed: rt.extra_adult_bed || false,
                  extra_child_bed: rt.extra_child_bed || false,
                  sharing_bed: rt.sharing_bed || false
                }))
              } : undefined
          });
        }
      }
      if (excursionItems.length) {
        for (const item of excursionItems) {
          const excursionDate = parseRequiredDate(item.from_date || item.date, tripFallbackDate);
          const approvalState = getApprovalState('excursion', item);

          const rawExcId = parseSafeFK(item.excursion_id);
          let validExcId = null;
          if (rawExcId) {
            const excExists = await tx.excursions.findUnique({ where: { id: rawExcId }, select: { id: true } });
            if (excExists) validExcId = rawExcId;
          }

          const rawSuppId = parseSafeFK(item.supplier_id);
          let validSuppId = null;
          if (rawSuppId) {
            const suppExists = await tx.suppliers.findUnique({ where: { id: rawSuppId }, select: { id: true } });
            if (suppExists) validSuppId = rawSuppId;
          }

          const rawCurrId = parseSafeFK(item.currency_id);
          let validCurrId = null;
          if (rawCurrId) {
            const currExists = await tx.currencies.findUnique({ where: { id: rawCurrId }, select: { id: true } });
            if (currExists) validCurrId = rawCurrId;
          }

          await saveTripItem('excursion', item, {
              trip_item_id: id, excursion_id: validExcId, supplier_id: validSuppId,
              city: safeTruncate(item.city, 255), toe: safeTruncate(item.toe, 50), from_date: excursionDate,
              to_date: excursionDate, hotel: safeTruncate(item.hotel, 255),
              guide_name: safeTruncate(item.guide_name, 255), guide_contact: safeTruncate(item.guide_contact, 50),
              price: parseFloat(item.price) || 0, currency_id: validCurrId, remarks: item.remarks,
              approved: approvalState.approved, declined: approvalState.declined,
              pickup_time: safeTruncate(item.pickup_time, 50) || null
          });
        }
      }
      if (tourItems.length) {
        for (const item of tourItems) {
          const approvalState = getApprovalState('tour', item);

          const rawTourId = parseSafeFK(item.tour_id);
          let validTourId = null;
          if (rawTourId) {
            const tourExists = await tx.tours.findUnique({ where: { id: rawTourId }, select: { id: true } });
            if (tourExists) validTourId = rawTourId;
          }

          const rawSuppId = parseSafeFK(item.supplier_id);
          let validSuppId = null;
          if (rawSuppId) {
            const suppExists = await tx.suppliers.findUnique({ where: { id: rawSuppId }, select: { id: true } });
            if (suppExists) validSuppId = rawSuppId;
          }

          const rawCurrId = parseSafeFK(item.currency_id);
          let validCurrId = null;
          if (rawCurrId) {
            const currExists = await tx.currencies.findUnique({ where: { id: rawCurrId }, select: { id: true } });
            if (currExists) validCurrId = rawCurrId;
          }

          await saveTripItem('tour', item, {
              trip_item_id: id, tour_id: validTourId, supplier_id: validSuppId,
              tot: safeTruncate(parseTot(item.tot), 50), from_location: safeTruncate(item.from_location, 255), to_location: safeTruncate(item.to_location, 255),
              number_of_adults: parseSafeInt(item.number_of_adults) || 0, number_of_kids: parseSafeInt(item.number_of_kids) || 0,
              from_date: parseRequiredDate(item.from_date, tripFallbackDate), to_date: parseRequiredDate(item.to_date, tripFallbackDate),
              flight_in: parseOptionalDate(item.flight_in),
              flight_number: safeTruncate(item.flight_number || item.flight_in, 50), flight_out: parseOptionalDate(item.flight_out),
              guide_name: safeTruncate(item.guide_name, 255), guide_contact: safeTruncate(item.guide_contact, 50),
              payment_car: item.payment_car, payment_service: item.payment_service,
              price: parseFloat(item.price) || 0, currency_id: validCurrId, remarks: item.remarks,
              approved: approvalState.approved, declined: approvalState.declined,
              transfer_in: item.transfer_in || buildTourTransferText(item, 'in') || null,
              transfer_out: item.transfer_out || buildTourTransferText(item, 'out') || null
          });
        }
      }
      if (transferItems.length) {
        for (const item of transferItems) {
          const transferDate = parseRequiredDate(item.from_date || item.date, tripFallbackDate);
          const approvalState = getApprovalState('transfer', item);

          const rawTransId = parseSafeFK(item.transfer_id);
          let validTransId = null;
          if (rawTransId) {
            const transExists = await tx.transfers.findUnique({ where: { id: rawTransId }, select: { id: true } });
            if (transExists) validTransId = rawTransId;
          }

          const rawSuppId = parseSafeFK(item.supplier_id);
          let validSuppId = null;
          if (rawSuppId) {
            const suppExists = await tx.suppliers.findUnique({ where: { id: rawSuppId }, select: { id: true } });
            if (suppExists) validSuppId = rawSuppId;
          }

          const rawCurrId = parseSafeFK(item.currency_id);
          let validCurrId = null;
          if (rawCurrId) {
            const currExists = await tx.currencies.findUnique({ where: { id: rawCurrId }, select: { id: true } });
            if (currExists) validCurrId = rawCurrId;
          }

          await saveTripItem('transfer', item, {
              trip_item_id: id,
              transfer_id: validTransId,
              from_location: safeTruncate(item.from_location, 255), to_location: safeTruncate(item.to_location, 255),
              from_date: transferDate, to_date: transferDate,
              flight_number: safeTruncate(item.flight_number, 50), tot: safeTruncate(parseTot(item.tot), 10) || "SIC",
              supplier_id: validSuppId, guide_name: safeTruncate(item.guide_name, 255),
              guide_contact: safeTruncate(item.guide_contact, 20), price: parseFloat(item.price) || 0,
              currency_id: validCurrId, remarks: item.remarks,
              approved: approvalState.approved, declined: approvalState.declined,
              city: safeTruncate(item.city || item.transferCity, 255),
              transfer_description: safeTruncate(item.transfer_description || item.transferType, 255),
              pickup_time: safeTruncate(item.pickup_time || item.transferPickupTime, 255),
              flight_time: safeTruncate(item.flight_time || item.flightTime, 50),
              type_of_transfer: safeTruncate(item.type_of_transfer || item.transferRouteType, 50)
          });
        }
      }
      if (flightItems.length) {
        for (const item of flightItems) {
          const flightDate = parseRequiredDate(item.from_date || item.flight_date || item.date, tripFallbackDate);
          const approvalState = getApprovalState('flight', item);

          const rawCurrId = parseSafeFK(item.currency_id);
          let validCurrId = null;
          if (rawCurrId) {
            const currExists = await tx.currencies.findUnique({ where: { id: rawCurrId }, select: { id: true } });
            if (currExists) validCurrId = rawCurrId;
          }

          const normalizedFlight = normalizeQuotationFlightFields(item);
          await saveTripItem('flight', item, {
              trip_item_id: id, from_date: flightDate, to_date: flightDate,
              flight_number: safeTruncate(item.flight_number, 50), in_or_out: safeTruncate(item.in_or_out, 10),
              route: safeTruncate(item.route, 100), issued_by: safeTruncate(item.issued_by, 100), price: parseFloat(item.price) || 0,
              currency_id: validCurrId, remarks: item.remarks,
              approved: approvalState.approved, declined: approvalState.declined,
              ...normalizedFlight,
              flight_airline: safeTruncate(normalizedFlight.flight_airline || item.flight_airline, 100)
          });
        }
      }
      if (otherItems.length) {
        for (const item of otherItems) {
          const otherDate = parseRequiredDate(item.from_date || item.date, tripFallbackDate);
          await saveTripItem('other', item, {
              trip_item_id: id, other_id: parseSafeFK(item.other_id),
              from_date: otherDate, to_date: otherDate

          });
        }
      }
      await Promise.all([
        deleteRemovedTripItems('hotel'),
        deleteRemovedTripItems('excursion'),
        deleteRemovedTripItems('tour'),
        deleteRemovedTripItems('transfer'),
        deleteRemovedTripItems('flight'),
        deleteRemovedTripItems('other')
      ]);
    }, { timeout: 20000 });

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
    return res.json(mapTripResponse(updated));
  } catch (err) { next(err); }
}

export async function finalizeQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');
    const claims = req.user;

    const existing = await prisma.trips.findUnique({ where: { id } });
    if (!existing) return res.status(404).send('Quotation not found');
    if (!agentOwnsTrip(existing, claims)) {
      return res.status(403).send('Forbidden: Access denied to this quotation');
    }

    if (!isConvertibleQuotation(existing)) {
      return res.status(409).json({
        message: 'Only a pending quotation can be converted to a booking.'
      });
    }

    const updateData = buildQuotationConversionData();

    const converted = await prisma.$transaction(async (transaction) => {
      const conversion = await transaction.trips.updateMany({
        where: buildQuotationConversionWhere(id),
        data: updateData
      });
      if (conversion.count !== 1) return null;

      const updated = await transaction.trips.findUnique({ where: { id } });
      return ensureBookingReferences(transaction, updated);
    });
    if (!converted) {
      return res.status(409).json({
        message: 'This quotation has already been converted or is no longer pending.'
      });
    }

    const trip = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true,
        hotel_trip_items: {
          orderBy: [{ display_order: 'asc' }, { from_date: 'asc' }],
          include: { hotels: true }
        },
        transfer_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { transfers: true }
        },
        excursion_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { excursions: true }
        },
        tour_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { tours: true }
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
    
    let emailNotification;
    try {
      emailNotification = await sendBookingGenerationRequest(trip);
    } catch (err) {
      console.error('Error sending booking generation notification email:', err);
      emailNotification = { sent: false, reason: 'send_failed' };
    }

    let message = 'Quotation converted to booking successfully.';
    if (emailNotification.sent) {
      message += ' The agent was notified and the reservation office was copied.';
    } else if (emailNotification.reason === 'recipient_missing') {
      message += ' The notification email was not sent because the agent email is missing.';
    } else {
      message += ' The booking was created, but the notification email could not be sent. Please check the email settings.';
    }

    return res.json({
      message,
      email_notification: {
        sent: Boolean(emailNotification.sent),
        to: emailNotification.to || trip.agents?.email || null,
        cc: emailNotification.cc || null,
        reason: emailNotification.reason || null
      },
      booking: mapTripResponse(trip)
    });
  } catch (err) { next(err); }
}

export async function cancelQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');
    const claims = req.user;

    const existing = await prisma.trips.findUnique({ where: { id } });
    if (!existing) return res.status(404).send('Quotation not found');
    if (!agentOwnsTrip(existing, claims)) {
      return res.status(403).send('Forbidden: Access denied to this quotation');
    }
    if (!agentCanModifyQuotation(existing, claims)) {
      return res.status(409).json({
        message: 'Only pending quotations can be cancelled by an agent.'
      });
    }

    const trip = await prisma.trips.update({
      where: { id },
      data: { declined: true, approved: false, status: 'Cancelled', updated_at: new Date() }
    });
    return res.json(trip);
  } catch (err) { next(err); }
}

export async function deleteQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');
    const claims = req.user;

    const existing = await prisma.trips.findUnique({ where: { id } });
    if (!existing) return res.status(404).send('Quotation not found');
    if (!agentOwnsTrip(existing, claims)) {
      return res.status(403).send('Forbidden: Access denied to this quotation');
    }
    if (!agentCanModifyQuotation(existing, claims)) {
      return res.status(409).json({
        message: 'Only pending quotations can be deleted by an agent.'
      });
    }

    await prisma.trips.delete({ where: { id } });
    return res.status(200).send('Quotation deleted');
  } catch (err) { next(err); }
}

// ==================== BOOKINGS ====================
const bookingStatusWhere = {
  is_booking: true,
  status: { in: ['InProgress', 'Approved', 'Confirmed'] }
};

function applyAgentTripScope(where, claims) {
  if (!claims || claims.role === 'admin' || claims.role === 'superadmin') return where;

  const ownership = [];
  const userId = parseSafeInt(claims.user_id);
  const agentId = parseSafeInt(claims.agent_id);
  if (userId) ownership.push({ user_id: userId });
  if (agentId) ownership.push({ agent_id: agentId });

  // A token without either identifier must never expose another agent's records.
  where.OR = ownership.length ? ownership : [{ id: -1 }];
  return where;
}

function agentOwnsTrip(trip, claims) {
  if (!claims || claims.role === 'admin' || claims.role === 'superadmin') return true;

  const userId = parseSafeInt(claims.user_id);
  const agentId = parseSafeInt(claims.agent_id);
  return Boolean(
    (userId && trip.user_id === userId) ||
    (agentId && trip.agent_id === agentId)
  );
}

function agentCanModifyQuotation(trip, claims) {
  if (!claims || claims.role === 'admin' || claims.role === 'superadmin') return true;
  return trip.is_booking !== true && trip.status === 'Pending';
}

const bookingAgentWithBillingProfile = {
  users: {
    select: {
      userProfile: {
        select: {
          isPrimaryProfile: true,
          companyName: true,
          billingName: true,
          address: true,
          billingAddress: true,
          city: true,
          billingCity: true,
          state: true,
          billingState: true,
          country: true,
          billingCountry: true,
          postalCode: true,
          billingPostalCode: true,
          taxId: true,
          vatNumber: true
        }
      }
    }
  }
};

export function attachProformaBilling(trip) {
  if (!trip) return trip;
  const agent = trip.agents || null;
  const profiles = (agent?.users || [])
    .map((user) => user.userProfile)
    .filter(Boolean);
  const profile = profiles.find((item) => item.isPrimaryProfile) || profiles[0] || null;
  const { users, ...publicAgent } = agent || {};

  return {
    ...trip,
    agents: agent ? publicAgent : null,
    proforma_billing: {
      agent_name: agent?.name || profile?.billingName || profile?.companyName || '',
      address: agent?.address || profile?.billingAddress || profile?.address || '',
      city: profile?.billingCity || profile?.city || '',
      state: profile?.billingState || profile?.state || '',
      postal_code: profile?.billingPostalCode || profile?.postalCode || '',
      country: profile?.billingCountry || profile?.country || '',
      tax_id: agent?.fax || profile?.taxId || profile?.vatNumber || ''
    }
  };
}

export async function listBookings(req, res, next) {
  try {
    const claims = req.user;
    const where = applyAgentTripScope({ ...bookingStatusWhere }, claims);
    const bookings = await prisma.trips.findMany({
      where,
      include: { agents: { include: bookingAgentWithBillingProfile } },
      orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }]
    });
    return res.json(bookings.map(attachProformaBilling));
  } catch (err) { next(err); }
}

export async function listBookingsByDateRange(req, res, next) {
  try {
    const from_date = req.query.from_date || req.query.start_date;
    const to_date = req.query.to_date || req.query.end_date;
    const claims = req.user;
    const where = { ...bookingStatusWhere };
    if (from_date && to_date) {
      where.created_at = { gte: new Date(from_date), lte: new Date(to_date) };
    }
    applyAgentTripScope(where, claims);
    const bookings = await prisma.trips.findMany({ where, include: { agents: { include: bookingAgentWithBillingProfile } }, orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }] });
    return res.json(bookings.map(attachProformaBilling));
  } catch (err) { next(err); }
}

export async function getBooking(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');
    const claims = req.user;
    const where = applyAgentTripScope({ id, ...bookingStatusWhere }, claims);
    const trip = await prisma.trips.findFirst({
      where,
      include: {
        agents: { include: bookingAgentWithBillingProfile },
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
    return res.json(mapTripResponse(attachProformaBilling(trip)));
  } catch (err) { next(err); }
}

export async function updateBooking(req, res, next) {
  return updateQuotation(req, res, next);
}

export async function confirmBooking(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid booking ID' });

    const trip = await prisma.trips.findUnique({
      where: { id },
      include: {
        hotel_trip_items: { select: { id: true, approved: true } },
        transfer_trip_items: { select: { id: true, approved: true } },
        excursion_trip_items: { select: { id: true, approved: true } }
      }
    });

    if (!trip) return res.status(404).json({ message: 'Booking not found' });

    if (!trip.is_booking) {
      return res.status(409).json({
        message: 'Convert the quotation to a booking before confirming it.'
      });
    }
    if (trip.status === 'Confirmed') {
      return res.status(409).json({
        message: 'This booking has already been confirmed.'
      });
    }

    const serviceItems = [
      ...(trip.hotel_trip_items || []),
      ...(trip.transfer_trip_items || []),
      ...(trip.excursion_trip_items || [])
    ];
    const unconfirmedItems = serviceItems.filter((item) => !item.approved);

    if (serviceItems.length === 0) {
      return res.status(400).json({
        message: 'Add hotel, transfer or excursion services before confirming the booking.'
      });
    }

    if (unconfirmedItems.length > 0) {
      return res.status(400).json({
        message: 'All hotel, transfer and excursion services must be confirmed first.',
        unconfirmed_count: unconfirmedItems.length
      });
    }

    const confirmed = await prisma.$transaction(async (transaction) => {
      const confirmation = await transaction.trips.updateMany({
        where: {
          id,
          is_booking: true,
          status: { not: 'Confirmed' }
        },
        data: {
          approved: true,
          status: 'Confirmed',
          updated_at: new Date()
        }
      });
      if (confirmation.count !== 1) return null;

      const updatedTrip = await transaction.trips.findUnique({ where: { id } });
      return ensureBookingReferences(transaction, updatedTrip, { assignInvoice: true });
    });
    if (!confirmed) {
      return res.status(409).json({
        message: 'This booking has already been confirmed.'
      });
    }

    const updated = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true,
        hotel_trip_items: {
          orderBy: [{ display_order: 'asc' }, { from_date: 'asc' }],
          include: { hotels: true, hotel_room_type_items: true }
        },
        transfer_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { transfers: true, suppliers: true }
        },
        excursion_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { excursions: true, suppliers: true }
        },
        tour_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { tours: true, suppliers: true }
        }
      }
    });
    sendFinalBookingConfirmation(updated).catch((err) => {
      console.error('Error sending final booking confirmation email:', err);
    });

    return res.json({
      status: 'confirmed',
      message: 'Booking confirmed successfully.',
      booking: mapTripResponse(updated)
    });
  } catch (err) { next(err); }
}

export async function unconfirmBooking(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');

    const { reason, remarks } = req.body || {};
    const rejectionReason = (reason || remarks || '').toString().trim();

    if (!rejectionReason) {
      return res.status(400).json({
        message: 'Reason for unconfirming or declining the booking is required.'
      });
    }

    const trip = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true,
        hotel_trip_items: { include: { hotels: true } },
        transfer_trip_items: { include: { transfers: true } },
        excursion_trip_items: { include: { excursions: true } },
        tour_trip_items: { include: { tours: true } },
        flight_trip_items: true,
        other_trip_items: { include: { others: true } }
      }
    });

    if (!trip || !trip.is_booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const updated = await prisma.trips.update({
      where: { id },
      data: {
        approved: false,
        declined: false,
        is_booking: false,
        status: 'Pending',
        remarks: rejectionReason,
        updated_at: new Date()
      },
      include: {
        agents: true,
        hotel_trip_items: { include: { hotels: true } },
        transfer_trip_items: { include: { transfers: true } },
        excursion_trip_items: { include: { excursions: true } },
        tour_trip_items: { include: { tours: true } },
        flight_trip_items: true,
        other_trip_items: { include: { others: true } }
      }
    });

    sendBookingUnconfirmedEmail(updated, rejectionReason).catch((err) => {
      console.error('Error sending booking unconfirmed email:', err);
    });

    return res.json({
      status: 'Pending',
      message: 'Booking unconfirmed and quotation status changed to Pending. Notification email sent to agent.',
      booking: mapTripResponse(updated)
    });
  } catch (err) { next(err); }
}

export async function approveItem(req, res, next) {
  try {
    const { itemType, itemID } = req.params;
    const id = parseInt(itemID);
    if (isNaN(id)) return res.status(400).send('Invalid item ID');
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) return res.status(400).send('Invalid booking ID');
    const modelMap = {
      hotel: 'hotel_trip_items', excursion: 'excursion_trip_items',
      tour: 'tour_trip_items', transfer: 'transfer_trip_items',
      flight: 'flight_trip_items'
    };
    const model = modelMap[itemType];
    if (!model) return res.status(400).send('Invalid item type');

    const booking = await prisma.trips.findFirst({
      where: { id: tripId, ...bookingStatusWhere },
      select: { id: true }
    });
    if (!booking) return res.status(404).send('Booking not found');

    const item = await prisma[model].findFirst({
      where: { id, trip_item_id: tripId },
      select: { id: true }
    });
    if (!item) return res.status(404).send('Booking service not found');

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
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) return res.status(400).send('Invalid booking ID');

    const booking = await prisma.trips.findFirst({
      where: { id: tripId, ...bookingStatusWhere },
      select: { id: true }
    });
    if (!booking) return res.status(404).send('Booking not found');

    const item = await prisma[model].findFirst({
      where: { id, trip_item_id: tripId },
      select: { id: true }
    });
    if (!item) return res.status(404).send('Booking service not found');

    await prisma.$transaction([
      prisma[model].update({ where: { id }, data: { declined: true, approved: false } }),
      // A declined supplier service means the booking can no longer remain final.
      prisma.trips.updateMany({
        where: { id: tripId, status: 'Confirmed' },
        data: { status: 'InProgress', approved: false, updated_at: new Date() }
      })
    ]);
    return res.json({ status: 'declined' });
  } catch (err) { next(err); }
}

export async function getPaymentInfo(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');
    const claims = req.user;
    const where = applyAgentTripScope({ id, is_booking: true }, claims);
    const trip = await prisma.trips.findFirst({
      where,
      select: {
        id: true, client_name: true, total_amount: true, discount_amount: true,
        final_amount: true, penalty_cost: true, received_amount: true, balance: true,
        payment_date: true, payment_reference: true, trip_start_date: true, payment_deadline: true, booking_date: true,
        booking_reference: true, file_reference: true, invoice_number: true, agent_id: true, status: true,
        agents: { select: { id: true, name: true, email: true, address: true, telephone: true } }
      }
    });
    if (!trip) return res.status(404).send('Booking not found');
    if (trip.status !== 'Confirmed') {
      return res.status(409).json({ message: 'Payment is available only after the booking is confirmed.' });
    }
    return res.json(formatPaymentInfo(trip));
  } catch (err) { next(err); }
}

export async function updatePaymentInfo(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');
    const claims = req.user;
    const where = applyAgentTripScope({ id, is_booking: true }, claims);
    const current = await prisma.trips.findFirst({
      where,
      select: {
        id: true,
        final_amount: true,
        total_amount: true,
        penalty_cost: true,
        payment_date: true,
        payment_reference: true,
        status: true
      }
    });
    if (!current) return res.status(404).send('Booking not found');
    if (current.status !== 'Confirmed') {
      return res.status(409).json({ message: 'Payment is available only after the booking is confirmed.' });
    }

    const data = req.body || {};
    const receivedAmount = Math.max(0, paymentNumber(data.received_amount));
    const penaltyCost = data.penalty_cost === undefined
      ? paymentNumber(current.penalty_cost)
      : Math.max(0, paymentNumber(data.penalty_cost));
    const amountDue = Math.max(0, paymentNumber(current.final_amount ?? current.total_amount) + penaltyCost);
    const paymentDate = Object.prototype.hasOwnProperty.call(data, 'payment_date')
      ? parsePaymentDate(data.payment_date)
      : current.payment_date;
    if (receivedAmount > 0 && !paymentDate) {
      return res.status(400).json({ message: 'Payment Received Date is required when an amount has been received.' });
    }
    const trip = await prisma.trips.update({
      where: { id: current.id },
      data: {
        penalty_cost: penaltyCost,
        received_amount: receivedAmount,
        amount_paid: receivedAmount,
        balance: Math.max(0, amountDue - receivedAmount),
        payment_date: paymentDate,
        payment_reference: Object.prototype.hasOwnProperty.call(data, 'payment_reference')
          ? (String(data.payment_reference || '').trim() || null)
          : current.payment_reference
      }
    });
    return res.json({ ...formatPaymentInfo(trip), amount_due: amountDue });
  } catch (err) { next(err); }
}

export async function listPaymentInfoFromBookings(req, res, next) {
  try {
    const claims = req.user;
    const where = applyAgentTripScope({ is_booking: true, status: 'Confirmed' }, claims);
    const bookings = await prisma.trips.findMany({
      where,
      select: {
        id: true, client_name: true, booking_reference: true,
        file_reference: true, invoice_number: true, agent_id: true, trip_start_date: true, total_amount: true, discount_amount: true,
        final_amount: true, penalty_cost: true, received_amount: true, balance: true,
        payment_date: true, payment_reference: true, payment_deadline: true, booking_date: true, status: true,
        agents: { select: { id: true, name: true, email: true, address: true, telephone: true } }, created_at: true
      },
      orderBy: { created_at: 'desc' }
    });
    return res.json(bookings.map(formatPaymentInfo));
  } catch (err) { next(err); }
}

export async function listPaymentInfoByDateRange(req, res, next) {
  try {
    const from_date = req.query.from_date || req.query.start_date;
    const to_date = req.query.to_date || req.query.end_date;
    const claims = req.user;
    const where = { is_booking: true, status: 'Confirmed' };
    if (from_date && to_date) {
      where.created_at = { gte: new Date(from_date), lte: new Date(to_date) };
    }
    applyAgentTripScope(where, claims);
    const bookings = await prisma.trips.findMany({
      where,
      select: {
        id: true, client_name: true, booking_reference: true,
        file_reference: true, invoice_number: true, agent_id: true, trip_start_date: true, total_amount: true, discount_amount: true,
        final_amount: true, penalty_cost: true, received_amount: true, balance: true,
        payment_date: true, payment_reference: true, payment_deadline: true, booking_date: true, status: true,
        agents: { select: { id: true, name: true, email: true, address: true, telephone: true } }, created_at: true
      },
      orderBy: { created_at: 'desc' }
    });
    return res.json(bookings.map(formatPaymentInfo));
  } catch (err) { next(err); }
}

// ==================== ITINERARY ====================
export async function listItinerary(req, res, next) {
  try {
    const itinerary = await prisma.trips.findMany({
      where: {
        is_booking: true,
        status: { in: ['InProgress', 'Confirmed'] }
      },
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

const itineraryInclude = {
  agents: true,
  hotel_trip_items: {
    orderBy: [{ display_order: 'asc' }, { from_date: 'asc' }],
    include: { hotels: true, hotel_room_type_items: true }
  },
  excursion_trip_items: {
    orderBy: { from_date: 'asc' },
    include: { excursions: true }
  },
  tour_trip_items: {
    orderBy: { from_date: 'asc' },
    include: { tours: true, tour_trip_item_hotels: true }
  },
  transfer_trip_items: {
    orderBy: { from_date: 'asc' },
    include: { transfers: true }
  },
  flight_trip_items: { orderBy: { from_date: 'asc' } }
};

export async function getItinerary(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid itinerary ID.' });

    const itinerary = await prisma.trips.findFirst({
      where: { id, is_booking: true },
      include: itineraryInclude
    });
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found.' });
    return res.json(itinerary);
  } catch (err) { next(err); }
}

function itineraryText(value, maxLength = 2000) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

export async function updateItineraryDetails(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid itinerary ID.' });

    const exists = await prisma.trips.findFirst({
      where: { id, is_booking: true },
      select: { id: true }
    });
    if (!exists) return res.status(404).json({ message: 'Itinerary not found.' });

    const body = req.body || {};
    const collections = [
      ['transfers', 'transfer_trip_items', ['pickup_time', 'flight_time', 'remarks']],
      ['excursions', 'excursion_trip_items', ['pickup_time', 'remarks']],
      ['flights', 'flight_trip_items', ['edt', 'eat', 'remarks']],
      ['tours', 'tour_trip_items', ['remarks']],
      ['hotels', 'hotel_trip_items', ['notes']]
    ];

    await prisma.$transaction(async (tx) => {
      for (const [payloadKey, modelName, fields] of collections) {
        const items = Array.isArray(body[payloadKey]) ? body[payloadKey] : [];
        for (const item of items) {
          const itemId = parseInt(item?.id, 10);
          if (isNaN(itemId)) continue;
          const data = {};
          fields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(item, field)) {
              data[field] = itineraryText(item[field], field === 'remarks' || field === 'notes' ? 4000 : 255);
            }
          });
          if (!Object.keys(data).length) continue;
          await tx[modelName].updateMany({
            where: { id: itemId, trip_item_id: id },
            data: { ...data, updated_at: new Date() }
          });
        }
      }
    });

    const itinerary = await prisma.trips.findUnique({
      where: { id },
      include: itineraryInclude
    });
    return res.json({ message: 'Itinerary saved successfully.', itinerary });
  } catch (err) { next(err); }
}

export async function updateInvoiceNumber(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');
    const { invoice_number } = req.body;
    const trip = await prisma.trips.update({
      where: { id },
      data: { invoice_number }
    });
    return res.json(trip);
  } catch (err) { next(err); }
}
