import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bookingReferenceDate,
  formatAnnualInvoiceNumber,
  formatMonthlyFileReference,
  nextAnnualInvoiceSequence,
  nextMonthlyFileSequence
} from '../src/utils/bookingReferences.js';

test('formats the monthly booking file number using the trip start month', () => {
  const date = bookingReferenceDate({
    trip_start_date: '2026-12-22',
    booking_date: '2026-07-10'
  });

  assert.equal(formatMonthlyFileReference(date, 22), 'DEC22_2026');
});

test('continues a monthly file sequence without mixing another month or year', () => {
  const values = ['DEC01_2026', 'DEC21_2026', 'NOV99_2026', 'DEC50_2025'];
  assert.equal(nextMonthlyFileSequence(values, '2026-12-15'), 22);
});

test('formats and continues the annual Proforma number', () => {
  const values = ['001_2026', '099_2026', '250_2025'];
  assert.equal(nextAnnualInvoiceSequence(values, '2026-11-01'), 100);
  assert.equal(formatAnnualInvoiceNumber('2026-11-01', 100), '100_2026');
});
