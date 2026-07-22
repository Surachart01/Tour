import prisma from '../config/db.js';
import { attachProformaBilling } from './tripController.js';

const VAT_RATE = 0.07;
const WHT_RATE = 0.03;
const LOCAL_OPERATOR_DOCUMENT_TYPES = new Set([
  'local_operator_original_tax_invoice',
  'local_operator_copy_tax_invoice'
]);
const DOCUMENT_TYPES = new Set([
  'original_tax_invoice',
  'tax_invoice',
  'original_receipt_transportation',
  'tax_invoice_hotel',
  ...LOCAL_OPERATOR_DOCUMENT_TYPES
]);
const PUBLIC_DOCUMENT_TYPES = [
  'original_tax_invoice',
  'tax_invoice',
  'original_receipt_transportation',
  'local_operator_original_tax_invoice',
  'local_operator_copy_tax_invoice'
];
const DOCUMENT_SERVICE_TYPES = {
  original_tax_invoice: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package', 'assistance_fee'],
  tax_invoice: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package', 'assistance_fee'],
  original_receipt_transportation: ['transfer', 'excursion', 'tour'],
  tax_invoice_hotel: ['hotel', 'tour_hotel'],
  local_operator_original_tax_invoice: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package', 'assistance_fee'],
  local_operator_copy_tax_invoice: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package', 'assistance_fee']
};
const ORIGINAL_DOCUMENT_TYPE = 'original_tax_invoice';

const billingProfileSelect = {
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
};

const agentWithBillingProfile = {
  users: {
    select: {
      userProfile: { select: billingProfileSelect }
    }
  }
};

const bookingInclude = {
  agents: { include: agentWithBillingProfile },
  hotel_trip_items: { orderBy: [{ display_order: 'asc' }, { from_date: 'asc' }], include: { hotels: true, hotel_room_type_items: true } },
  excursion_trip_items: { orderBy: { from_date: 'asc' }, include: { excursions: true } },
  tour_trip_items: { orderBy: { from_date: 'asc' }, include: { tours: true, tour_trip_item_hotels: true } },
  transfer_trip_items: { orderBy: { from_date: 'asc' }, include: { transfers: true } },
  other_trip_items: { orderBy: { from_date: 'asc' }, include: { others: true } },
  special_packages: true
};

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value) {
  return Math.round((number(value) + Number.EPSILON) * 100) / 100;
}

function buildInvoiceNumber(trip, documentType) {
  const prefix = {
    original_tax_invoice: 'OTI',
    tax_invoice: 'TI',
    original_receipt_transportation: 'ORT',
    tax_invoice_hotel: 'TIH',
    local_operator_original_tax_invoice: 'LOTI',
    local_operator_copy_tax_invoice: 'LCTI'
  }[documentType] || 'TI';
  const date = new Date();
  const year = date.getFullYear();
  return `${prefix}-${year}-${String(trip.id).padStart(5, '0')}`;
}

function serviceRow(type, item, extra = {}) {
  const date = item.from_date || item.created_at || null;
  const name = extra.name || item.transfer_description || item.excursions?.name || item.tours?.name || item.hotel_name || '-';
  return {
    id: `${type}-${item.id}`,
    source_id: item.id,
    type,
    date,
    from_date: item.from_date || null,
    to_date: item.to_date || null,
    city: item.city || item.transfers?.city || item.excursions?.city || item.tours?.city || '',
    name,
    from: item.from_location || '',
    to: item.to_location || '',
    description: item.transfer_description || item.excursions?.name || item.tours?.name || item.hotel_name || '',
    room_type: item.room_type || '',
    pax: number(item.number_of_adults) + number(item.number_of_kids),
    nights: Math.max(0, number(item.nights)),
    single_rooms: Math.max(0, number(item.single_rooms ?? item.single_room)),
    double_rooms: Math.max(0, number(item.double_rooms ?? item.double_room)),
    extra_beds: Math.max(0, number(item.extra_adult_bed_count) + number(item.extra_child_bed_count)),
    total: round(extra.total ?? item.total_price ?? item.price),
    selected: true,
    adv: 0,
    parent_id: extra.parent_id || null,
    editable_total: Boolean(extra.editable_total)
  };
}

function addDays(dateValue, days) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function buildServices(booking) {
  const rows = [];
  (booking.transfer_trip_items || []).forEach((item) => rows.push(serviceRow('transfer', item)));
  (booking.excursion_trip_items || []).forEach((item) => rows.push(serviceRow('excursion', item)));
  (booking.tour_trip_items || []).forEach((item) => {
    const tourRow = serviceRow('tour', item);
    rows.push(tourRow);
    (item.tour_trip_item_hotels || []).forEach((hotel) => {
      const day = Math.max(1, number(hotel.day) || 1);
      const fromDate = addDays(item.from_date, day - 1) || item.from_date || null;
      const toDate = addDays(item.from_date, day) || item.to_date || null;
      rows.push({
      id: `tour_hotel-${item.id}-${hotel.id}`,
      source_id: hotel.id,
      type: 'tour_hotel',
      date: fromDate,
      from_date: fromDate,
      to_date: toDate,
      city: hotel.city || item.tours?.city || '',
      name: hotel.hotel_name || 'Tour accommodation',
      from: '', to: '', description: hotel.hotel_name || 'Tour accommodation',
      room_type: hotel.room_type || '',
      pax: number(item.number_of_adults) + number(item.number_of_kids),
      nights: 1,
      single_rooms: 0,
      double_rooms: 0,
      extra_beds: 0,
      total: 0,
      selected: true,
      adv: 0,
      parent_id: tourRow.id,
      editable_total: true
      });
    });
  });
  (booking.hotel_trip_items || []).forEach((item) => rows.push(serviceRow('hotel', item)));
  (booking.other_trip_items || []).forEach((item) => rows.push(serviceRow('other', item, {
    name: item.others?.description || 'Other service',
    total: item.others?.amount || 0
  })));
  const assistanceFee = booking.include_assistance_fee === false ? 0 : Math.max(0, number(booking.assistance_fee_amount));
  if (assistanceFee > 0) {
    rows.push({
      id: `assistance_fee-${booking.id}`,
      source_id: booking.id,
      type: 'assistance_fee',
      date: booking.booking_date || booking.created_at || null,
      from_date: null,
      to_date: null,
      city: '',
      name: 'Assistance Fee',
      from: '',
      to: '',
      description: 'Assistance Fee',
      room_type: '',
      pax: number(booking.number_of_adults) + number(booking.number_of_kids),
      nights: 0,
      single_rooms: 0,
      double_rooms: 0,
      extra_beds: 0,
      total: assistanceFee,
      selected: true,
      adv: 0,
      parent_id: null,
      editable_total: false
    });
  }
  if (booking.special_package_id && booking.special_packages) {
    const total = Math.max(0, number(booking.final_amount ?? booking.total_amount) -
      assistanceFee);
    rows.push({
      id: `special_package-${booking.id}`,
      source_id: booking.special_package_id,
      type: 'special_package',
      date: booking.trip_start_date || null,
      from_date: booking.trip_start_date || null,
      to_date: null,
      city: booking.special_packages.city || '',
      name: booking.special_packages.name || 'Special package',
      from: '', to: '',
      description: booking.special_packages.description || booking.special_packages.name || 'Special package',
      room_type: '',
      pax: number(booking.number_of_adults) + number(booking.number_of_kids),
      nights: 0,
      single_rooms: Math.max(0, number(booking.special_pkg_single_rooms)),
      double_rooms: Math.max(0, number(booking.special_pkg_double_rooms)),
      extra_beds: 0,
      total, selected: true, adv: 0, parent_id: null, editable_total: false
    });
    const packageRow = rows[rows.length - 1];
    rows.forEach((row) => {
      if (row.id !== packageRow.id && row.type !== 'assistance_fee') {
        row.parent_id = packageRow.id;
        row.editable_total = true;
      }
    });
  }
  return rows;
}

function servicesForDocument(booking, documentType) {
  const allowedTypes = DOCUMENT_SERVICE_TYPES[documentType] || [];
  return buildServices(booking).filter((service) => allowedTypes.includes(service.type));
}

function sanitizeServices(baseRows, submittedServices) {
  if (!Array.isArray(submittedServices) || submittedServices.length === 0) return baseRows;
  const submitted = new Map(submittedServices
    .filter((row) => row && typeof row.id === 'string')
    .map((row) => [row.id, row]));

  return baseRows.map((base) => {
    const input = submitted.get(base.id);
    const submittedTreatment = String(input?.tax_treatment ?? input?.taxTreatment ?? '').trim().toLowerCase();
    const legacyAdv = input ? Math.max(0, number(input.adv)) : 0;
    const effectiveTotal = base.editable_total && input ? Math.max(0, number(input.total ?? base.total)) : Math.max(0, number(base.total));
    const hasAdvFlag = Boolean(input && Object.prototype.hasOwnProperty.call(input, 'adv_enabled'));
    const legacyAdvRequested = submittedTreatment === 'adv'
      || submittedTreatment === 'split'
      || (submittedTreatment !== 'vat' && legacyAdv > 0);
    const advEnabled = usesRemainingAmountVat(base)
      && Boolean(input && (hasAdvFlag ? input.adv_enabled : legacyAdvRequested));
    const adv = advEnabled && submittedTreatment === 'adv' && legacyAdv <= 0
      ? effectiveTotal
      : advEnabled ? legacyAdv : 0;
    const taxTreatment = adv <= 0 ? 'vat' : adv >= effectiveTotal ? 'adv' : 'split';
    const vatBase = round(Math.max(0, effectiveTotal - adv) / (1 + VAT_RATE));
    return {
      ...base,
      // A missing row is treated as unselected, so partial payloads cannot add services by accident.
      selected: Boolean(input && input.selected !== false),
      // Booking prices are authoritative. Tour and Special Package detail allocations are editable.
      total: base.editable_total && input ? Math.max(0, number(input.total ?? base.total)) : base.total,
      adv_enabled: advEnabled,
      adv,
      tax_treatment: taxTreatment,
      vat_base: vatBase,
      wht_selected: Boolean(input?.wht_selected)
    };
  });
}

function applyWithholdingSelections(masterRows, submittedServices) {
  const submitted = new Map((Array.isArray(submittedServices) ? submittedServices : [])
    .filter((row) => row && typeof row.id === 'string')
    .map((row) => [row.id, row]));

  return masterRows.map((row) => ({
    ...row,
    // WHT selection is independent from the Tax Settings inclusion flag.
    // A Tax Invoice preview may only toggle WHT on a service already included
    // by the saved Original Tax Invoice.
    wht_selected: row.selected !== false && Boolean(submitted.get(row.id)?.wht_selected)
  }));
}

function treatmentAdv(row, total) {
  if (!usesRemainingAmountVat(row)) return 0;
  const treatment = String(row?.tax_treatment ?? row?.taxTreatment ?? '').trim().toLowerCase();
  const hasAdvFlag = Object.prototype.hasOwnProperty.call(row || {}, 'adv_enabled');
  const advEnabled = hasAdvFlag
    ? Boolean(row.adv_enabled)
    : treatment === 'adv' || treatment === 'split' || (treatment !== 'vat' && number(row?.adv) > 0);
  if (!advEnabled) return 0;
  if (treatment === 'adv' && number(row?.adv) <= 0) return total;
  return Math.min(total, Math.max(0, round(row?.adv)));
}

function usesRemainingAmountVat(row) {
  return ['transfer', 'excursion', 'tour'].includes(String(row?.type || '').toLowerCase());
}

function isLocalOperatorDocument(documentType) {
  return LOCAL_OPERATOR_DOCUMENT_TYPES.has(documentType);
}

function usesSelectiveWithholding(documentType) {
  return documentType === 'tax_invoice';
}

function calculateWithholdingSummary(totals, documentType, rows = []) {
  if (!isLocalOperatorDocument(documentType) && !usesSelectiveWithholding(documentType)) return null;
  const withholdingRows = usesSelectiveWithholding(documentType)
    ? rows.filter((row) => row.wht_selected)
    : rows;
  const withholdingTaxBase = Math.max(0, round(withholdingRows.reduce(
    (sum, row) => sum + number(row.vat_taxable_amount),
    0
  )));
  const withholdingTax = round(withholdingTaxBase * WHT_RATE);
  const invoiceTotal = Math.max(0, round(totals.document_total));
  return {
    withholding_tax_rate: WHT_RATE,
    withholding_tax_base: withholdingTaxBase,
    withholding_tax: withholdingTax,
    invoice_total: invoiceTotal,
    amount_payable: round(Math.max(0, invoiceTotal - withholdingTax))
  };
}

function applyWithholdingAmounts(rows, documentType, withholdingSummary) {
  if (!withholdingSummary) return rows;
  const targets = rows.filter((row) => isLocalOperatorDocument(documentType) || row.wht_selected);
  let allocated = 0;

  return rows.map((row) => {
    if (!targets.includes(row)) return { ...row, withholding_tax: 0 };
    const isLast = row === targets[targets.length - 1];
    const amount = isLast
      ? round(withholdingSummary.withholding_tax - allocated)
      : round(number(row.vat_taxable_amount) * WHT_RATE);
    allocated = round(allocated + amount);
    return { ...row, withholding_tax: Math.max(0, amount) };
  });
}

function calculateRows(rows, documentType) {
  const noVat = documentType === 'original_receipt_transportation';
  const localOperatorDocument = isLocalOperatorDocument(documentType);
  const childTotals = rows.reduce((sum, row) => {
    if (row.parent_id && row.selected) sum[row.parent_id] = (sum[row.parent_id] || 0) + Math.max(0, round(row.total));
    return sum;
  }, {});
  const calculated = rows.filter((row) => row.selected).map((row) => {
    const total = Math.max(0, round(row.total) - (childTotals[row.id] || 0));
    const adv = treatmentAdv(row, total);
    const treatment = adv <= 0 ? 'vat' : adv >= total ? 'adv' : 'split';
    const remainingGross = round(Math.max(0, total - adv));
    const taxableNet = noVat ? remainingGross : round(remainingGross / (1 + VAT_RATE));
    const taxableGross = remainingGross;
    const vat = noVat ? 0 : round(taxableGross - taxableNet);
    const allocatedGross = round(adv + taxableGross);
    const documentTotal = noVat ? adv : (documentType === ORIGINAL_DOCUMENT_TYPE || localOperatorDocument) ? total : taxableGross;
    const vatTaxableAmount = noVat ? 0 : taxableNet;
    const documentAdv = documentType === 'tax_invoice' || documentType === 'tax_invoice_hotel' ? 0 : adv;
    return { ...row, adv_enabled: usesRemainingAmountVat(row) && adv > 0, tax_treatment: treatment, total, gross_total: total, adv, vat_base: taxableNet, document_adv: documentAdv, taxable_gross: taxableGross, taxable_net: taxableNet, vat_taxable_amount: vatTaxableAmount, vat, allocated_gross: allocatedGross, document_total: documentTotal };
  });
  const totals = calculated.reduce((sum, row) => ({
    total: sum.total + row.total,
    document_total: sum.document_total + row.document_total,
    adv: sum.adv + row.adv,
    document_adv: sum.document_adv + row.document_adv,
    taxable_gross: sum.taxable_gross + row.taxable_gross,
    taxable_net: sum.taxable_net + row.taxable_net,
    vat_taxable_amount: sum.vat_taxable_amount + row.vat_taxable_amount,
    vat: sum.vat + row.vat
  }), { total: 0, document_total: 0, adv: 0, document_adv: 0, taxable_gross: 0, taxable_net: 0, vat_taxable_amount: 0, vat: 0 });
  const roundedTotals = Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, round(value)]));
  const withholdingSummary = calculateWithholdingSummary(roundedTotals, documentType, calculated);
  const calculatedWithWithholding = applyWithholdingAmounts(calculated, documentType, withholdingSummary);
  return {
    rows: calculatedWithWithholding,
    totals: withholdingSummary ? { ...roundedTotals, ...withholdingSummary } : roundedTotals
  };
}

function validateTaxTreatments(rows) {
  const selectedRows = rows.filter((row) => row.selected);
  const childTotals = selectedRows.reduce((sum, row) => {
    if (row.parent_id) sum[row.parent_id] = (sum[row.parent_id] || 0) + Math.max(0, round(row.total));
    return sum;
  }, {});
  const invalidAdv = selectedRows.filter((row) => {
    const treatment = String(row?.tax_treatment ?? row?.taxTreatment ?? '').trim().toLowerCase();
    const hasAdvFlag = Object.prototype.hasOwnProperty.call(row || {}, 'adv_enabled');
    const advEnabled = usesRemainingAmountVat(row) && (hasAdvFlag
      ? Boolean(row.adv_enabled)
      : treatment === 'adv' || treatment === 'split' || (treatment !== 'vat' && number(row.adv) > 0));
    if (!advEnabled) return false;
    const total = Math.max(0, round(row.total) - (childTotals[row.id] || 0));
    const adv = treatment === 'adv' && number(row.adv) <= 0 ? total : Math.max(0, round(row.adv));
    return total <= 0 || adv <= 0 || adv > total;
  });
  if (invalidAdv.length) {
    return `Enter an ADV amount greater than zero and not exceeding the service price for: ${invalidAdv.slice(0, 3).map((row) => row.name || row.id).join(', ')}.`;
  }
  return null;
}

function validateAllocations(rows) {
  const allocated = rows.reduce((result, row) => {
    if (row.parent_id && row.selected) result[row.parent_id] = (result[row.parent_id] || 0) + Math.max(0, round(row.total));
    return result;
  }, {});
  const exceeded = rows.find((row) => allocated[row.id] > Math.max(0, round(row.total)) + 0.01);
  if (!exceeded) return null;
  return `The allocated detail prices for ${exceeded.name || exceeded.id} cannot exceed ${round(exceeded.total).toFixed(2)}.`;
}

async function getDocumentRows(tripId) {
  return prisma.$queryRawUnsafe(
    'SELECT * FROM tax_invoice_documents WHERE trip_id = $1 ORDER BY updated_at DESC',
    tripId
  );
}

function parseJson(value, fallback) {
  try { return typeof value === 'string' ? JSON.parse(value) : (value || fallback); } catch { return fallback; }
}

function normalizeInvoiceDate(value) {
  const raw = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : raw;
}

function isPaymentReceived(booking) {
  const dueAmount = Math.max(0, number(booking?.final_amount ?? booking?.total_amount) + number(booking?.penalty_cost));
  // Older bookings stored the received amount in `amount_paid`; current payment updates keep both fields in sync.
  const recordedAmount = Math.max(number(booking?.received_amount), number(booking?.amount_paid));
  return Boolean(booking?.payment_date) && recordedAmount >= dueAmount;
}

function buildSnapshot(booking, calculated, invoiceDate) {
  return {
    booking: {
      id: booking.id,
      booking_reference: booking.booking_reference,
      file_reference: booking.file_reference,
      invoice_number: booking.invoice_number,
      booking_date: booking.booking_date,
      payment_date: booking.payment_date,
      payment_reference: booking.payment_reference,
      client_name: booking.client_name,
      client_phone: booking.client_phone,
      client_email: booking.client_email,
      number_of_adults: booking.number_of_adults,
      number_of_kids: booking.number_of_kids,
      proforma_billing: booking.proforma_billing
    },
    invoice_date: invoiceDate,
    rows: calculated.rows,
    totals: calculated.totals
  };
}

async function upsertDocument({ tripId, documentType, invoiceNumber, invoiceDate, services, adjustments, snapshot }, db = prisma) {
  const rows = await db.$queryRawUnsafe(`
    INSERT INTO tax_invoice_documents
      (trip_id, document_type, invoice_number, invoice_date, selected_services, adjustments, snapshot, updated_at)
    VALUES ($1, $2, $3, $4::date, $5::jsonb, $6::jsonb, $7::jsonb, now())
    ON CONFLICT (trip_id, document_type)
    DO UPDATE SET invoice_number = EXCLUDED.invoice_number,
                  invoice_date = EXCLUDED.invoice_date,
                  selected_services = EXCLUDED.selected_services,
                  adjustments = EXCLUDED.adjustments,
                  snapshot = EXCLUDED.snapshot,
                  updated_at = now()
    RETURNING *
  `, tripId, documentType, invoiceNumber, invoiceDate, JSON.stringify(services), JSON.stringify(adjustments), JSON.stringify(snapshot));
  return rows[0];
}

async function loadBooking(tripId) {
  const booking = await prisma.trips.findUnique({ where: { id: tripId }, include: bookingInclude });
  return booking ? attachProformaBilling(booking) : null;
}

function assertType(documentType, res) {
  if (DOCUMENT_TYPES.has(documentType)) return true;
  res.status(400).json({ message: 'Invalid tax invoice document type.' });
  return false;
}

function bookingAllowed(booking) {
  // Confirmed bookings can be configured and previewed before payment.
  // The payment state remains available to the UI for operational tracking.
  return bookingConfirmed(booking);
}

function bookingConfirmed(booking) {
  return String(booking?.status || '').toLowerCase() === 'confirmed';
}

export async function listEligibleBookings(req, res, next) {
  try {
    const claims = req.user;
    const where = { status: { equals: 'Confirmed', mode: 'insensitive' } };
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin') {
      where.agent_id = Number(claims.agent_id) || 0;
    }
    const bookings = await prisma.trips.findMany({
      where,
      include: { agents: { include: agentWithBillingProfile } },
      orderBy: [{ booking_date: 'desc' }, { created_at: 'desc' }]
    });
    const result = await Promise.all(bookings.map(async (booking) => ({
      ...attachProformaBilling(booking),
      tax_documents: await getDocumentRows(booking.id),
      payment_received: isPaymentReceived(booking)
    })));
    return res.json({ bookings: result });
  } catch (error) { next(error); }
}

export async function getTaxInvoiceBooking(req, res, next) {
  try {
    const tripId = Number(req.params.tripID);
    if (!Number.isInteger(tripId)) return res.status(400).json({ message: 'Invalid booking ID.' });
    const booking = await loadBooking(tripId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin' && Number(booking.agent_id) !== Number(claims.agent_id)) {
      return res.status(403).json({ message: 'You do not have access to this booking.' });
    }
    if (!bookingAllowed(booking)) return res.status(400).json({ message: 'A tax invoice can be configured only after the booking is Confirmed.' });
    return res.json({ booking, services: buildServices(booking), documents: await getDocumentRows(tripId) });
  } catch (error) { next(error); }
}

export async function saveTaxInvoiceDocument(req, res, next) {
  try {
    const tripId = Number(req.params.tripID);
    const { document_type: documentType, invoice_date: invoiceDateInput, services = [], adjustments = {} } = req.body || {};
    if (!Number.isInteger(tripId)) return res.status(400).json({ message: 'Invalid booking ID.' });
    if (!assertType(documentType, res)) return;
    const booking = await loadBooking(tripId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (!bookingAllowed(booking)) return res.status(400).json({ message: 'A tax invoice can be configured only after the booking is Confirmed.' });

    const existingDocuments = await getDocumentRows(tripId);
    const byType = new Map(existingDocuments.map((document) => [document.document_type, document]));
    const original = byType.get(ORIGINAL_DOCUMENT_TYPE);
    const allowedRows = servicesForDocument(booking, documentType);
    let visibleRows;
    let resolvedInvoiceDate;
    let effectiveAdjustments = adjustments;

    if (documentType === ORIGINAL_DOCUMENT_TYPE) {
      resolvedInvoiceDate = normalizeInvoiceDate(invoiceDateInput);
      if (!resolvedInvoiceDate) return res.status(400).json({ message: 'Invoice Date is required.' });
      const paymentReceivedDate = normalizeInvoiceDate(booking.payment_date);
      if (paymentReceivedDate && resolvedInvoiceDate !== paymentReceivedDate) {
        return res.status(400).json({ message: 'Invoice Date must match the Payment Received Date recorded for this booking.' });
      }
      const submittedRows = Array.isArray(services) ? services : [];
      const knownServiceIds = new Set(allowedRows.map((service) => service.id));
      if (submittedRows.some((row) => row?.id && !knownServiceIds.has(row.id))) {
        return res.status(400).json({ message: 'The request contains a service that is not available for this document.' });
      }
      visibleRows = sanitizeServices(allowedRows, submittedRows);
      const allocationError = validateAllocations(visibleRows);
      if (allocationError) return res.status(400).json({ message: allocationError });
      const treatmentError = validateTaxTreatments(visibleRows);
      if (treatmentError) return res.status(400).json({ message: treatmentError });
    } else {
      if (!original) return res.status(400).json({ message: 'Create and save the Original Tax Invoice first. The remaining tax documents will then be copied automatically.' });
      resolvedInvoiceDate = normalizeInvoiceDate(original.invoice_date);
      if (!resolvedInvoiceDate) return res.status(400).json({ message: 'The Original Tax Invoice does not have a valid Invoice Date.' });
      const masterRows = sanitizeServices(allowedRows, parseJson(original.selected_services, []));
      visibleRows = usesSelectiveWithholding(documentType)
        ? applyWithholdingSelections(masterRows, services)
        : masterRows;
      effectiveAdjustments = parseJson(original.adjustments, {});
    }

    const calculated = calculateRows(visibleRows, documentType);
    const preparedDocuments = [{
      tripId,
      documentType,
      invoiceNumber: String(byType.get(documentType)?.invoice_number || buildInvoiceNumber(booking, documentType)).trim(),
      invoiceDate: resolvedInvoiceDate,
      services: visibleRows,
      adjustments: effectiveAdjustments,
      snapshot: buildSnapshot(booking, calculated, resolvedInvoiceDate)
    }];

    if (documentType === ORIGINAL_DOCUMENT_TYPE) {
      for (const secondaryType of PUBLIC_DOCUMENT_TYPES.filter((type) => type !== ORIGINAL_DOCUMENT_TYPE)) {
        const copiedRows = sanitizeServices(servicesForDocument(booking, secondaryType), visibleRows);
        const synchronizedRows = usesSelectiveWithholding(secondaryType)
          ? applyWithholdingSelections(copiedRows, parseJson(byType.get(secondaryType)?.selected_services, []))
          : copiedRows;
        const copiedCalculation = calculateRows(synchronizedRows, secondaryType);
        preparedDocuments.push({
          tripId,
          documentType: secondaryType,
          invoiceNumber: String(byType.get(secondaryType)?.invoice_number || buildInvoiceNumber(booking, secondaryType)).trim(),
          invoiceDate: resolvedInvoiceDate,
          services: synchronizedRows,
          adjustments: effectiveAdjustments,
          snapshot: buildSnapshot(booking, copiedCalculation, resolvedInvoiceDate)
        });
      }
    }

    // Original and derived documents must move together. A failed secondary
    // write rolls back the Original instead of leaving a partial document set.
    const savedDocuments = await prisma.$transaction(async (transaction) => {
      const results = [];
      for (const prepared of preparedDocuments) {
        results.push(await upsertDocument(prepared, transaction));
      }
      return results;
    });
    const [document, ...synchronized] = savedDocuments;
    return res.json({ document, synchronized, calculated, booking });
  } catch (error) { next(error); }
}

export async function listTaxInvoices(req, res, next) {
  try {
    const documents = await prisma.$queryRawUnsafe(`
      SELECT d.*, t.booking_reference, t.file_reference, t.client_name, t.final_amount,
             a.name AS agent_name
      FROM tax_invoice_documents d
      JOIN trips t ON t.id = d.trip_id
      LEFT JOIN agents a ON a.id = t.agent_id
      ORDER BY d.updated_at DESC
    `);
    return res.json({ invoices: documents, metadata: { total_count: documents.length } });
  } catch (error) { next(error); }
}

export async function getTaxInvoice(req, res, next) {
  try {
    const id = Number(req.params.id);
    const rows = await prisma.$queryRawUnsafe(`
      SELECT d.*, t.agent_id
      FROM tax_invoice_documents d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = $1
    `, id);
    if (!rows[0]) return res.status(404).json({ message: 'Tax invoice not found.' });
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin' && Number(rows[0].agent_id) !== Number(claims.agent_id)) {
      return res.status(403).json({ message: 'You do not have access to this tax invoice.' });
    }
    const { agent_id: _, ...document } = rows[0];
    return res.json(document);
  } catch (error) { next(error); }
}

export async function deleteTaxInvoice(req, res, next) {
  try {
    const id = Number(req.params.id);
    await prisma.$executeRawUnsafe('DELETE FROM tax_invoice_documents WHERE id = $1', id);
    return res.json({ status: 'deleted' });
  } catch (error) { next(error); }
}

export async function getTaxInvoiceByTripID(req, res, next) {
  try {
    const tripId = Number(req.params.tripID);
    const booking = await prisma.trips.findUnique({ where: { id: tripId }, select: { agent_id: true } });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const claims = req.user;
    if (claims && claims.role !== 'admin' && claims.role !== 'superadmin' && Number(booking.agent_id) !== Number(claims.agent_id)) {
      return res.status(403).json({ message: 'You do not have access to this booking.' });
    }
    return res.json(await getDocumentRows(tripId));
  } catch (error) { next(error); }
}

export async function updateTaxInvoice(req, res, next) {
  try {
    const id = Number(req.params.id);
    const documents = await prisma.$queryRawUnsafe(
      'SELECT trip_id, document_type FROM tax_invoice_documents WHERE id = $1',
      id
    );
    if (!documents[0]) return res.status(404).json({ message: 'Tax invoice not found.' });
    req.params.tripID = String(documents[0].trip_id);
    req.body = { ...(req.body || {}), document_type: req.body?.document_type || documents[0].document_type };
    return saveTaxInvoiceDocument(req, res, next);
  } catch (error) { next(error); }
}
export async function createTaxInvoice(req, res, next) { return saveTaxInvoiceDocument(req, res, next); }
export async function createTaxInvoiceWithCustomTax(req, res, next) { return saveTaxInvoiceDocument(req, res, next); }
export async function createTaxInvoiceWithProfile(req, res, next) { return saveTaxInvoiceDocument(req, res, next); }
export async function createTaxInvoiceWithProfileAndCustomTax(req, res, next) { return saveTaxInvoiceDocument(req, res, next); }
export async function calculateTaxBreakdown(req, res, next) {
  try {
    const booking = await loadBooking(Number(req.params.tripID));
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const documentType = req.query.document_type || 'tax_invoice';
    if (!DOCUMENT_TYPES.has(documentType)) return res.status(400).json({ message: 'Invalid tax invoice document type.' });
    return res.json(calculateRows(servicesForDocument(booking, documentType), documentType));
  } catch (error) { next(error); }
}
export async function validateTaxInvoiceAmounts(req, res, next) { return res.json({ valid: true }); }
export async function syncTaxInvoiceWithTrip(req, res, next) { return res.json({ status: 'synced' }); }
export async function validateProfileForInvoice(req, res, next) { return res.json({ valid: true, missing_fields: [] }); }
export async function getCompanyInfoForInvoice(req, res, next) {
  return res.json({
    name: 'Verathailandia Co., Ltd.',
    tax_id: '0105547045569',
    tat_license: '14/03484',
    bank_name: 'SIAM COMMERCIAL BANK',
    bank_account: '419-200606-3',
    swift_code: 'SICOTHBK'
  });
}
export async function getTaxRateForCountry(req, res, next) { return res.json({ country: req.query.country || 'TH', tax_rate: 7 }); }
export async function listTaxInvoicesByDateRange(req, res, next) { return listTaxInvoices(req, res, next); }
export async function generateTaxInvoicePDF(req, res, next) { return res.status(501).json({ message: 'Open the saved tax invoice and use Open PDF / Print.' }); }
export async function generateTaxInvoicePDFWithProfile(req, res, next) { return generateTaxInvoicePDF(req, res, next); }

export { applyWithholdingSelections, buildServices, calculateRows, calculateWithholdingSummary, sanitizeServices, servicesForDocument, isPaymentReceived, validateTaxTreatments, validateAllocations, VAT_RATE, WHT_RATE, PUBLIC_DOCUMENT_TYPES, bookingConfirmed };
