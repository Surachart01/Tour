import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServices, calculateRows, sanitizeServices, servicesForDocument, isPaymentReceived, validateTaxTreatments, validateAllocations } from '../src/controllers/taxInvoiceController.js';

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

test('calculates the customer ADV example from a VAT-inclusive amount', () => {
  const result = calculateRows([{
    id: 'transfer-example', type: 'transfer', total: 1000, adv: 500, adv_enabled: true, selected: true
  }], 'original_tax_invoice');

  assert.equal(result.totals.document_total, 1000);
  assert.equal(result.totals.adv, 500);
  assert.equal(result.totals.vat_taxable_amount, 467.29);
  assert.equal(result.totals.vat, 32.71);
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

  assert.equal(rows[0].total, 8750);
  assert.equal(rows[1].total, 2500);
  assert.ok(rows.every((row) => row.selected && row.adv === 0 && row.tax_treatment === 'vat'));
});

test('applies explicit VAT, ADV and split treatments to document totals', () => {
  const result = calculateRows([
    { id: 'vat', type: 'hotel', total: 1070, adv: 0, tax_treatment: 'vat', selected: true },
    { id: 'adv', type: 'transfer', total: 1000, adv: 0, tax_treatment: 'adv', selected: true },
    { id: 'split', type: 'transfer', total: 2000, adv: 500, vat_base: 1, tax_treatment: 'split', selected: true }
  ], 'original_tax_invoice');

  assert.equal(result.totals.document_total, 4070);
  assert.equal(result.totals.adv, 1500);
  assert.equal(result.totals.vat_taxable_amount, 2401.87);
  assert.equal(result.totals.vat, 168.13);
  assert.equal(result.rows.find((row) => row.id === 'split').adv, 500);
  assert.equal(result.rows.find((row) => row.id === 'split').vat_taxable_amount, 1401.87);

  const vatDocument = calculateRows([
    { id: 'vat', type: 'hotel', total: 1070, adv: 0, tax_treatment: 'vat', selected: true },
    { id: 'adv', type: 'transfer', total: 1000, adv: 0, tax_treatment: 'adv', selected: true }
  ], 'tax_invoice');
  assert.equal(vatDocument.totals.document_total, 1070);
});

test('deducts ADV before calculating VAT for transfers, excursions and tours', () => {
  for (const type of ['transfer', 'excursion', 'tour']) {
    const result = calculateRows([{
      id: `${type}-split`, type, total: 1070, adv: 535, vat_base: 1, tax_treatment: 'split', selected: true
    }], 'original_tax_invoice');

    assert.equal(result.totals.document_total, 1070, `${type} keeps its full selling price`);
    assert.equal(result.totals.adv, 535, `${type} deducts ADV first`);
    assert.equal(result.totals.taxable_gross, 535, `${type} uses the remainder as VAT-inclusive gross`);
    assert.equal(result.totals.vat_taxable_amount, 500, `${type} calculates the VAT taxable base automatically`);
    assert.equal(result.totals.vat, 35, `${type} calculates VAT 7% from the remainder`);
  }
});

test('ignores a submitted VAT base for automatic remainder VAT services', () => {
  for (const type of ['transfer', 'excursion', 'tour']) {
    const [saved] = sanitizeServices([
      { id: `${type}-1`, type, total: 1070, editable_total: false }
    ], [
      { id: `${type}-1`, selected: true, total: 1070, adv: 535, vat_base: 1, tax_treatment: 'split' }
    ]);

    assert.equal(saved.vat_base, 500, `${type} derives VAT taxable amount during save`);
  }
});

test('applies VAT automatically and validates optional ADV amounts', () => {
  assert.equal(validateTaxTreatments([
    { id: 'hotel-1', name: 'Hotel', total: 1000, adv: 0, selected: true, tax_treatment: '' }
  ]), null);
  assert.equal(validateTaxTreatments([
    { id: 'hotel-1', name: 'Hotel', total: 1000, adv: 0, selected: true, tax_treatment: 'vat' }
  ]), null);
  assert.equal(validateTaxTreatments([
    { id: 'transfer-1', type: 'transfer', name: 'Transfer', total: 1070, adv: 500, adv_enabled: true, selected: true }
  ]), null);
  assert.match(validateTaxTreatments([
    { id: 'transfer-1', type: 'transfer', name: 'Transfer', total: 1070, adv: 0, adv_enabled: true, selected: true }
  ]), /greater than zero/);
  assert.equal(validateTaxTreatments([
    { id: 'tour-1', type: 'tour', name: 'Tour', total: 1070, adv: 1070, adv_enabled: true, selected: true }
  ]), null);
  assert.match(validateTaxTreatments([
    { id: 'tour-1', type: 'tour', name: 'Tour', total: 1070, adv: 1071, adv_enabled: true, selected: true }
  ]), /not exceeding/);
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

test('allows Special Package detail allocations without double counting the package price', () => {
  const services = buildServices({
    id: 22,
    special_package_id: 9,
    special_packages: { name: 'Bangkok Package', city: 'Bangkok', description: 'Package services' },
    final_amount: 14000,
    transfer_trip_items: [{ id: 1, from_date: '2026-11-01', to_date: '2026-11-01', from_location: 'Airport', to_location: 'Hotel', price: 0 }],
    excursion_trip_items: [{ id: 2, from_date: '2026-11-02', to_date: '2026-11-02', name: 'Market Tour', price: 0 }]
  });
  const packageRow = services.find((row) => row.type === 'special_package');
  const details = services.filter((row) => row.parent_id === packageRow.id);

  assert.equal(details.length, 2);
  assert.ok(details.every((row) => row.editable_total));
  const allocated = details.map((row) => ({ id: row.id, selected: true, total: row.type === 'transfer' ? 6000 : 8000, tax_treatment: 'vat' }));
  const savedRows = sanitizeServices(services, [
    { id: packageRow.id, selected: true, total: 14000, tax_treatment: 'vat' },
    ...allocated
  ]);
  assert.equal(validateAllocations(savedRows), null);
  assert.equal(calculateRows(savedRows, 'original_tax_invoice').totals.total, 14000);

  const exceededRows = sanitizeServices(services, [
    { id: packageRow.id, selected: true, total: 14000, tax_treatment: 'vat' },
    ...allocated.map((row) => ({ ...row, total: 9000 }))
  ]);
  assert.match(validateAllocations(exceededRows), /cannot exceed 14000\.00/);
});

test('includes ADV-capable transfers, excursions and tours in the transportation receipt', () => {
  const booking = {
    transfer_trip_items: [{ id: 1, from_date: '2026-11-20', to_date: '2026-11-20', price: 2500 }],
    excursion_trip_items: [{ id: 3, from_date: '2026-11-21', to_date: '2026-11-21', price: 1800 }],
    tour_trip_items: [{ id: 4, from_date: '2026-11-22', to_date: '2026-11-24', price: 9000, number_of_adults: 2, number_of_kids: 0, tour_trip_item_hotels: [] }],
    hotel_trip_items: [{ id: 2, from_date: '2026-11-20', to_date: '2026-11-21', city: 'Bangkok', hotel_name: 'Hotel', nights: 1, total_price: 8750 }]
  };

  assert.deepEqual(servicesForDocument(booking, 'original_receipt_transportation').map((service) => service.type), ['transfer', 'excursion', 'tour']);
});

test('includes ADV from transfers, excursions and tours in the transportation receipt total', () => {
  const result = calculateRows([
    { id: 'transfer-1', type: 'transfer', total: 2500, adv: 500, adv_enabled: true, selected: true },
    { id: 'excursion-1', type: 'excursion', total: 3000, adv: 750, adv_enabled: true, selected: true },
    { id: 'tour-1', type: 'tour', total: 9000, adv: 1250, adv_enabled: true, selected: true }
  ], 'original_receipt_transportation');

  assert.deepEqual(result.rows.map((row) => [row.type, row.document_adv]), [
    ['transfer', 500],
    ['excursion', 750],
    ['tour', 1250]
  ]);
  assert.equal(result.totals.document_adv, 2500);
  assert.equal(result.totals.document_total, 2500);
  assert.equal(result.totals.vat, 0);
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

test('reports payment as received only when the full required amount and received date are recorded', () => {
  assert.equal(isPaymentReceived({ final_amount: 15000, received_amount: 15000, payment_date: '2026-07-18' }), true);
  assert.equal(isPaymentReceived({ final_amount: 15000, received_amount: 0, amount_paid: 15000, payment_date: '2026-07-18' }), true);
  assert.equal(isPaymentReceived({ final_amount: 15000, received_amount: 14999.99, payment_date: '2026-07-18' }), false);
  assert.equal(isPaymentReceived({ final_amount: 15000, received_amount: 15000, payment_date: null }), false);
});

test('includes a penalty in the amount that must be received', () => {
  assert.equal(isPaymentReceived({ final_amount: 15000, penalty_cost: 500, received_amount: 15000, payment_date: '2026-07-18' }), false);
  assert.equal(isPaymentReceived({ final_amount: 15000, penalty_cost: 500, received_amount: 15500, payment_date: '2026-07-18' }), true);
});
