import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServices, calculateRows, sanitizeServices, servicesForDocument, isPaymentReceived, validateTaxTreatments } from '../src/controllers/taxInvoiceController.js';

test('calculates VAT only from the selling price remaining after ADV', () => {
  const result = calculateRows([{
    id: 'transfer-1', type: 'transfer', total: 2500, adv: 1000, selected: true
  }], 'original_tax_invoice');

  assert.deepEqual(result.totals, {
    total: 2500,
    document_total: 2500,
    adv: 1000,
    document_adv: 1000,
    taxable_gross: 1500,
    taxable_net: 1401.87,
    vat_taxable_amount: 1401.87,
    vat: 98.13
  });
});

test('keeps transportation receipt free of VAT', () => {
  const result = calculateRows([{
    id: 'transfer-1', type: 'transfer', total: 2500, adv: 1000, selected: true
  }], 'original_receipt_transportation');

  assert.equal(result.totals.taxable_net, 1500);
  assert.equal(result.totals.taxable_gross, 1500);
  assert.equal(result.totals.vat, 0);
  assert.equal(result.totals.document_total, 1000);
  assert.equal(result.totals.document_adv, 1000);
});

test('deducts manually allocated tour accommodation from the tour selling price', () => {
  const result = calculateRows([
    { id: 'tour-1', type: 'tour', total: 42000, adv: 13500, selected: true },
    { id: 'tour-hotel-1', type: 'tour_hotel', parent_id: 'tour-1', total: 2500, adv: 0, selected: true },
    { id: 'tour-hotel-2', type: 'tour_hotel', parent_id: 'tour-1', total: 2500, adv: 0, selected: true }
  ], 'original_tax_invoice');

  assert.equal(result.rows.find((row) => row.id === 'tour-1').total, 37000);
  assert.equal(result.totals.total, 42000);
});

test('keeps Booking service prices authoritative while allowing a tour hotel allocation', () => {
  const rows = sanitizeServices([
    { id: 'hotel-1', type: 'hotel', total: 8750, editable_total: false },
    { id: 'tour-hotel-1', type: 'tour_hotel', total: 0, editable_total: true }
  ], [
    { id: 'hotel-1', selected: true, total: 1, adv: 500 },
    { id: 'tour-hotel-1', selected: true, total: 2500, adv: 100 }
  ]);

  assert.deepEqual(rows, [
    { id: 'hotel-1', type: 'hotel', total: 8750, editable_total: false, selected: true, adv: 500 },
    { id: 'tour-hotel-1', type: 'tour_hotel', total: 2500, editable_total: true, selected: true, adv: 100 }
  ]);
});

test('applies explicit VAT, ADV and split treatments to document totals', () => {
  const result = calculateRows([
    { id: 'vat', type: 'hotel', total: 1070, adv: 0, tax_treatment: 'vat', selected: true },
    { id: 'adv', type: 'transfer', total: 1000, adv: 0, tax_treatment: 'adv', selected: true },
    { id: 'split', type: 'transfer', total: 2000, adv: 500, tax_treatment: 'split', selected: true }
  ], 'original_tax_invoice');

  assert.equal(result.totals.document_total, 4070);
  assert.equal(result.totals.adv, 1500);
  assert.equal(result.totals.vat_taxable_amount, 2401.87);
  assert.equal(result.totals.vat, 168.13);

  const vatDocument = calculateRows([
    { id: 'vat', type: 'hotel', total: 1070, adv: 0, tax_treatment: 'vat', selected: true },
    { id: 'adv', type: 'transfer', total: 1000, adv: 0, tax_treatment: 'adv', selected: true }
  ], 'tax_invoice');
  assert.equal(vatDocument.totals.document_total, 1070);
});

test('requires every selected original-invoice service to have a tax treatment', () => {
  assert.match(validateTaxTreatments([
    { id: 'hotel-1', name: 'Hotel', total: 1000, adv: 0, selected: true, tax_treatment: '' }
  ]), /select VAT 7% or ADV/);
  assert.equal(validateTaxTreatments([
    { id: 'hotel-1', name: 'Hotel', total: 1000, adv: 0, selected: true, tax_treatment: 'vat' }
  ]), null);
});

test('treats omitted submitted services as unselected', () => {
  const rows = sanitizeServices([
    { id: 'transfer-1', type: 'transfer', total: 2500, editable_total: false },
    { id: 'transfer-2', type: 'transfer', total: 1500, editable_total: false }
  ], [{ id: 'transfer-2', selected: true, adv: 0 }]);

  assert.equal(rows.find((row) => row.id === 'transfer-1').selected, false);
  assert.equal(rows.find((row) => row.id === 'transfer-2').selected, true);
});

test('includes special-package, other-service and assistance-fee totals from the Booking data', () => {
  const services = buildServices({
    id: 21,
    special_package_id: 8,
    special_packages: { name: 'Bangkok Package', city: 'Bangkok', description: 'Package services' },
    final_amount: 25000,
    assistance_fee_amount: 1000,
    include_assistance_fee: true,
    other_trip_items: [{ id: 4, from_date: '2026-11-20', to_date: '2026-11-20', others: { description: 'Visa fee', amount: 500 } }]
  });

  assert.equal(services.find((service) => service.id === 'special_package-21').total, 24000);
  assert.equal(services.find((service) => service.id === 'other-4').total, 500);
  assert.equal(services.find((service) => service.id === 'assistance_fee-21').total, 1000);
  assert.deepEqual(servicesForDocument({
    id: 21,
    include_assistance_fee: true,
    assistance_fee_amount: 1000
  }, 'original_tax_invoice').map((service) => service.type), ['assistance_fee']);
});

test('limits a transportation receipt to transfers only', () => {
  const booking = {
    transfer_trip_items: [{ id: 1, from_date: '2026-11-20', to_date: '2026-11-20', price: 2500 }],
    hotel_trip_items: [{ id: 2, from_date: '2026-11-20', to_date: '2026-11-21', city: 'Bangkok', hotel_name: 'Hotel', nights: 1, total_price: 8750 }]
  };

  assert.deepEqual(servicesForDocument(booking, 'original_receipt_transportation').map((service) => service.type), ['transfer']);
});

test('uses each tour accommodation day to calculate its own stay dates', () => {
  const services = buildServices({
    tour_trip_items: [{
      id: 12,
      from_date: '2026-11-26T00:00:00.000Z',
      to_date: '2026-11-30T00:00:00.000Z',
      price: 53000,
      tours: { name: 'North Tour', city: 'Bangkok' },
      tour_trip_item_hotels: [{ id: 44, day: 3, hotel_name: 'Chiang Rai Hotel', city: 'Chiang Rai', room_type: 'Deluxe' }]
    }]
  });
  const hotel = services.find((service) => service.id === 'tour_hotel-12-44');

  assert.equal(hotel.from_date.toISOString().slice(0, 10), '2026-11-28');
  assert.equal(hotel.to_date.toISOString().slice(0, 10), '2026-11-29');
});

test('requires a full recorded payment before a tax invoice is eligible', () => {
  assert.equal(isPaymentReceived({ final_amount: 15000, received_amount: 15000, payment_date: '2026-07-18' }), true);
  assert.equal(isPaymentReceived({ final_amount: 15000, received_amount: 0, amount_paid: 15000, payment_date: '2026-07-18' }), true);
  assert.equal(isPaymentReceived({ final_amount: 15000, received_amount: 14999.99, payment_date: '2026-07-18' }), false);
  assert.equal(isPaymentReceived({ final_amount: 15000, received_amount: 15000, payment_date: null }), false);
});

test('includes a penalty in the amount that must be received', () => {
  assert.equal(isPaymentReceived({ final_amount: 15000, penalty_cost: 500, received_amount: 15000, payment_date: '2026-07-18' }), false);
  assert.equal(isPaymentReceived({ final_amount: 15000, penalty_cost: 500, received_amount: 15500, payment_date: '2026-07-18' }), true);
});
