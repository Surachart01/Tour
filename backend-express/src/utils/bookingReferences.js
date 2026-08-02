const MONTH_ABBREVIATIONS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const FILE_REFERENCE_LOCK_BASE = 1100000000;
const INVOICE_NUMBER_LOCK_BASE = 1200000000;

function validDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function bookingReferenceDate(trip = {}) {
  return validDate(
    trip.trip_start_date ||
    trip.booking_date ||
    trip.created_at ||
    new Date()
  ) || new Date();
}

export function formatMonthlyFileReference(value, sequence) {
  const date = validDate(value) || new Date();
  const month = MONTH_ABBREVIATIONS[date.getUTCMonth()];
  const number = String(Math.max(1, Number(sequence) || 1)).padStart(2, '0');
  return `${month}${number}_${date.getUTCFullYear()}`;
}

export function formatAnnualInvoiceNumber(value, sequence) {
  const date = validDate(value) || new Date();
  const number = String(Math.max(1, Number(sequence) || 1)).padStart(3, '0');
  return `${number}_${date.getUTCFullYear()}`;
}

function nextSequence(values, matcher) {
  return values.reduce((maximum, value) => {
    const match = String(value || '').match(matcher);
    return match ? Math.max(maximum, Number(match[1]) || 0) : maximum;
  }, 0) + 1;
}

export function nextMonthlyFileSequence(values, value) {
  const date = validDate(value) || new Date();
  const month = MONTH_ABBREVIATIONS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return nextSequence(values, new RegExp(`^${month}(\\d+)_${year}$`, 'i'));
}

export function nextAnnualInvoiceSequence(values, value) {
  const date = validDate(value) || new Date();
  const year = date.getUTCFullYear();
  return nextSequence(values, new RegExp(`^(\\d+)_${year}$`));
}

export async function acquireAdvisoryTransactionLock(client, lockKey) {
  if (typeof client.$queryRawUnsafe === 'function') {
    // Return a supported scalar instead of PostgreSQL's `void` lock result.
    await client.$queryRawUnsafe(
      'SELECT 1 AS locked FROM pg_advisory_xact_lock($1)',
      lockKey
    );
  }
}

export async function ensureBookingReferences(client, trip, options = {}) {
  const assignInvoice = Boolean(options.assignInvoice);
  const referenceDate = bookingReferenceDate(trip);
  const year = referenceDate.getUTCFullYear();
  const monthIndex = referenceDate.getUTCMonth();
  const month = MONTH_ABBREVIATIONS[monthIndex];
  const updates = {};

  if (!trip.file_reference) {
    await acquireAdvisoryTransactionLock(
      client,
      FILE_REFERENCE_LOCK_BASE + (year * 12) + monthIndex
    );
    const rows = await client.trips.findMany({
      where: { file_reference: { startsWith: month } },
      select: { file_reference: true }
    });
    const sequence = nextMonthlyFileSequence(
      rows.map((row) => row.file_reference),
      referenceDate
    );
    updates.file_reference = formatMonthlyFileReference(referenceDate, sequence);
  }

  if (assignInvoice && !trip.invoice_number) {
    await acquireAdvisoryTransactionLock(client, INVOICE_NUMBER_LOCK_BASE + year);
    const rows = await client.trips.findMany({
      where: { invoice_number: { endsWith: `_${year}` } },
      select: { invoice_number: true }
    });
    const sequence = nextAnnualInvoiceSequence(
      rows.map((row) => row.invoice_number),
      referenceDate
    );
    updates.invoice_number = formatAnnualInvoiceNumber(referenceDate, sequence);
  }

  if (Object.keys(updates).length === 0) return trip;

  return client.trips.update({
    where: { id: trip.id },
    data: {
      ...updates,
      updated_at: new Date()
    }
  });
}
