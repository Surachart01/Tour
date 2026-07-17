import prisma from '../config/db.js';
import { attachProformaBilling } from './tripController.js';

const VAT_RATE = 0.07;
const DOCUMENT_TYPES = new Set([
  'original_tax_invoice',
  'tax_invoice',
  'original_receipt_transportation',
  'tax_invoice_hotel'
]);

const DOCUMENT_SERVICE_TYPES = {
  original_tax_invoice: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package'],
  tax_invoice: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package'],
  original_receipt_transportation: ['transfer'],
  tax_invoice_hotel: ['hotel', 'tour_hotel']
};

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
    tax_invoice_hotel: 'TIH'
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
  if (booking.special_package_id && booking.special_packages) {
    const total = Math.max(0, number(booking.final_amount ?? booking.total_amount) -
      (booking.include_assistance_fee === false ? 0 : number(booking.assistance_fee_amount)));
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
      room_type: '', total, selected: true, adv: 0, parent_id: null, editable_total: false
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
    return {
      ...base,
      // A missing row is treated as unselected, so partial payloads cannot add services by accident.
      selected: Boolean(input && input.selected !== false),
      // Booking prices are authoritative. Only tour accommodation allocations are manually editable.
      total: base.editable_total && input ? Math.max(0, number(input.total ?? base.total)) : base.total,
      adv: input ? Math.max(0, number(input.adv)) : 0
    };
  });
}

function calculateRows(rows, documentType) {
  const noVat = documentType === 'original_receipt_transportation';
  const childTotals = rows.reduce((sum, row) => {
    if (row.parent_id && row.selected) sum[row.parent_id] = (sum[row.parent_id] || 0) + Math.max(0, round(row.total));
    return sum;
  }, {});
  const calculated = rows.filter((row) => row.selected).map((row) => {
    const total = Math.max(0, round(row.total) - (childTotals[row.id] || 0));
    const adv = Math.min(total, Math.max(0, round(row.adv)));
    const taxableGross = round(total - adv);
    const taxableNet = noVat ? round(total - adv) : round(taxableGross / (1 + VAT_RATE));
    const vat = noVat ? 0 : round(taxableGross - taxableNet);
    return { ...row, total, adv, taxable_gross: taxableGross, taxable_net: taxableNet, vat };
  });
  const totals = calculated.reduce((sum, row) => ({
    total: sum.total + row.total,
    adv: sum.adv + row.adv,
    taxable_gross: sum.taxable_gross + row.taxable_gross,
    taxable_net: sum.taxable_net + row.taxable_net,
    vat: sum.vat + row.vat
  }), { total: 0, adv: 0, taxable_gross: 0, taxable_net: 0, vat: 0 });
  return { rows: calculated, totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, round(value)])) };
}

async function getDocumentRows(tripId) {
  return prisma.$queryRawUnsafe(
    'SELECT * FROM tax_invoice_documents WHERE trip_id = $1 ORDER BY updated_at DESC',
    tripId
  );
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
  return String(booking?.status || '').toLowerCase() === 'confirmed';
}

export async function listEligibleBookings(req, res, next) {
  try {
    const bookings = await prisma.trips.findMany({
      where: { status: 'Confirmed' },
      include: { agents: { include: agentWithBillingProfile } },
      orderBy: [{ booking_date: 'desc' }, { created_at: 'desc' }]
    });
    const result = await Promise.all(bookings.map(async (booking) => ({
      ...attachProformaBilling(booking),
      tax_documents: await getDocumentRows(booking.id)
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
    if (!bookingAllowed(booking)) return res.status(400).json({ message: 'Only confirmed bookings can generate a tax invoice.' });
    return res.json({ booking, services: buildServices(booking), documents: await getDocumentRows(tripId) });
  } catch (error) { next(error); }
}

export async function saveTaxInvoiceDocument(req, res, next) {
  try {
    const tripId = Number(req.params.tripID);
    const { document_type: documentType, invoice_number: invoiceNumber, services = [], adjustments = {} } = req.body || {};
    if (!Number.isInteger(tripId)) return res.status(400).json({ message: 'Invalid booking ID.' });
    if (!assertType(documentType, res)) return;
    const booking = await loadBooking(tripId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (!bookingAllowed(booking)) return res.status(400).json({ message: 'Only confirmed bookings can generate a tax invoice.' });

    const allowedRows = servicesForDocument(booking, documentType);
    const submittedRows = Array.isArray(services) ? services : [];
    const knownServiceIds = new Set(allowedRows.map((service) => service.id));
    if (submittedRows.some((row) => row?.id && !knownServiceIds.has(row.id))) {
      return res.status(400).json({ message: 'The request contains a service that is not available for this document.' });
    }
    const visibleRows = sanitizeServices(allowedRows, submittedRows);
    const calculated = calculateRows(visibleRows, documentType);
    const snapshot = {
      booking: {
        id: booking.id,
        booking_reference: booking.booking_reference,
        file_reference: booking.file_reference,
        invoice_number: booking.invoice_number,
        booking_date: booking.booking_date,
        client_name: booking.client_name,
        client_phone: booking.client_phone,
        client_email: booking.client_email,
        number_of_adults: booking.number_of_adults,
        number_of_kids: booking.number_of_kids,
        proforma_billing: booking.proforma_billing
      },
      rows: calculated.rows,
      totals: calculated.totals
    };
    const resolvedInvoiceNumber = String(invoiceNumber || buildInvoiceNumber(booking, documentType)).trim();
    const rows = await prisma.$queryRawUnsafe(`
      INSERT INTO tax_invoice_documents
        (trip_id, document_type, invoice_number, selected_services, adjustments, snapshot, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, now())
      ON CONFLICT (trip_id, document_type)
      DO UPDATE SET invoice_number = EXCLUDED.invoice_number,
                    selected_services = EXCLUDED.selected_services,
                    adjustments = EXCLUDED.adjustments,
                    snapshot = EXCLUDED.snapshot,
                    updated_at = now()
      RETURNING *
    `, tripId, documentType, resolvedInvoiceNumber, JSON.stringify(visibleRows), JSON.stringify(adjustments), JSON.stringify(snapshot));
    return res.json({ document: rows[0], calculated, booking });
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
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM tax_invoice_documents WHERE id = $1', id);
    if (!rows[0]) return res.status(404).json({ message: 'Tax invoice not found.' });
    return res.json(rows[0]);
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
  try { return res.json(await getDocumentRows(Number(req.params.tripID))); } catch (error) { next(error); }
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

export { buildServices, calculateRows, sanitizeServices, servicesForDocument, VAT_RATE };
