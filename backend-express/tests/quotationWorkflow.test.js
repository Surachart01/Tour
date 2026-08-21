import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNewQuotationWorkflowState,
  buildQuotationConversionData,
  buildQuotationConversionWhere,
  calculateQuotationCosts,
  calculateSpecialPackageAmount,
  buildPartialQuotationCostInput,
  buildSuppliedQuotationItems,
  isConvertibleQuotation,
  normalizeQuotationFlightFields,
  resolveAgentIdFromRequest
} from '../src/controllers/tripController.js';

test('a new quotation always starts pending and is not a booking', () => {
  assert.deepEqual(buildNewQuotationWorkflowState(), {
    approved: false,
    declined: false,
    is_booking: false,
    status: 'Pending'
  });
});

test('quotation totals include every service and the default assistance fee', () => {
  const result = calculateQuotationCosts({
    flights: [{ price: 1000 }],
    hotels: [{ total_price: 5000 }],
    transfers: [{ price: 1200 }],
    excursions: [{ price: 1800 }],
    tours: [{ price: 3000 }],
    others: [{ price: 500 }],
    discount: 1500
  });

  assert.deepEqual(result, {
    total_amount: 13500,
    discount_amount: 1500,
    final_amount: 12000,
    include_assistance_fee: true,
    assistance_fee_amount: 1000
  });
});

test('quotation totals can exclude assistance fee and never become negative', () => {
  const result = calculateQuotationCosts({
    hotel_items: [{ total_price: '2500' }],
    include_assistance_fee: false,
    discount_amount: 3000
  });

  assert.equal(result.total_amount, 2500);
  assert.equal(result.assistance_fee_amount, 0);
  assert.equal(result.final_amount, 0);
});

test('special package pricing is authoritative and package component rows are not charged twice', () => {
  const pkg = { price_per_adult: 5000, price_dbl: 6000, price_per_child: 2500 };
  const packageAmount = calculateSpecialPackageAmount(pkg, {
    special_pkg_single_rooms: 0,
    special_pkg_double_rooms: 1,
    special_pkg_triple_rooms: 0,
    number_of_adults: 2
  });
  const result = calculateQuotationCosts({
    _has_special_package: true,
    _special_package_amount: packageAmount,
    hotels: [{ total_price: 9000, remarks: '[Special Package]' }],
    transfers: [
      { price: 1500, is_special_package: true },
      { price: 800, remarks: 'Additional private transfer' }
    ],
    include_assistance_fee: true,
    assistance_fee_amount: 1000
  });

  assert.equal(packageAmount, 12000);
  assert.equal(result.total_amount, 13800);
  assert.equal(result.final_amount, 13800);
});

test('quotation totals reject malformed, negative, and non-finite prices', () => {
  const result = calculateQuotationCosts({
    hotels: [{ total_price: 'not-a-number' }],
    transfers: [{ price: -500 }],
    tours: [{ price: Infinity }],
    assistance_fee_amount: -1000,
    discount_amount: 'invalid'
  });

  assert.equal(result.total_amount, 0);
  assert.equal(result.discount_amount, 0);
  assert.equal(result.final_amount, 0);
});

test('quotation totals ignore forged aggregate totals from the browser', () => {
  const result = calculateQuotationCosts({
    hotels: [{ total_price: 4000 }],
    transfers: [{ price: 1500 }],
    include_assistance_fee: true,
    assistance_fee_amount: 1000,
    discount_amount: 500,
    total_amount: 1,
    final_amount: 1
  });

  assert.equal(result.total_amount, 6500);
  assert.equal(result.final_amount, 6000);
});

test('a partial quotation save keeps prices from service tabs that were not submitted', () => {
  const existing = {
    hotel_trip_items: [{ total_price: 5000 }],
    transfer_trip_items: [{ price: 1200 }],
    excursion_trip_items: [{ price: 800 }],
    tour_trip_items: [],
    flight_trip_items: [{ price: 500 }],
    other_trip_items: [],
    include_assistance_fee: true,
    assistance_fee_amount: 1000,
    discount_amount: 200
  };
  const data = { hotel_items: [{ total_price: 6000 }] };
  const merged = buildPartialQuotationCostInput(data, existing, {
    hotel: true, transfer: false, excursion: false, tour: false, flight: false, other: false
  });

  assert.deepEqual(merged.transfer_items, existing.transfer_trip_items);
  assert.deepEqual(merged.flight_items, existing.flight_trip_items);
  assert.deepEqual(calculateQuotationCosts(merged), {
    total_amount: 9500,
    discount_amount: 200,
    final_amount: 9300,
    include_assistance_fee: true,
    assistance_fee_amount: 1000
  });
});

test('an accidental empty service payload preserves existing rows unless explicitly cleared', () => {
  const existing = {
    hotel_trip_items: [{ id: 10 }],
    transfer_trip_items: [],
    excursion_trip_items: [],
    tour_trip_items: [],
    flight_trip_items: [],
    other_trip_items: []
  };

  assert.equal(buildSuppliedQuotationItems({ hotels: [] }, existing).hotel, false);
  assert.equal(buildSuppliedQuotationItems({ hotels: [], clear_service_types: ['hotel'] }, existing).hotel, true);
  assert.equal(buildSuppliedQuotationItems({ hotels: [{ id: 10 }] }, existing).hotel, true);
});

test('a partial quotation update preserves existing pricing controls', () => {
  const existing = {
    hotel_trip_items: [],
    transfer_trip_items: [],
    excursion_trip_items: [],
    tour_trip_items: [],
    flight_trip_items: [],
    other_trip_items: [],
    include_assistance_fee: false,
    assistance_fee_amount: 750,
    discount_amount: 125
  };
  const supplied = buildSuppliedQuotationItems({ remarks: 'Updated only' }, existing);
  const merged = buildPartialQuotationCostInput({ remarks: 'Updated only' }, existing, supplied);

  assert.equal(merged.include_assistance_fee, false);
  assert.equal(merged.assistance_fee_amount, 750);
  assert.equal(merged.discount_amount, 125);
});

test('only pending quotations that are not bookings can be converted', () => {
  assert.equal(isConvertibleQuotation({ status: 'Pending', is_booking: false }), true);
  assert.equal(isConvertibleQuotation({ status: 'Pending', is_booking: null }), true);
  assert.equal(isConvertibleQuotation({ status: 'Pending', is_booking: true }), false);
  assert.equal(isConvertibleQuotation({ status: 'InProgress', is_booking: false }), false);
  assert.equal(isConvertibleQuotation({ status: 'Confirmed', is_booking: true }), false);
  assert.equal(isConvertibleQuotation(null), false);
});

test('conversion query supports legacy null values and prevents duplicate conversion', () => {
  assert.deepEqual(buildQuotationConversionWhere(56), {
    id: 56,
    status: 'Pending',
    OR: [
      { is_booking: false },
      { is_booking: null }
    ]
  });
});

test('conversion moves a quotation to an unconfirmed in-progress booking', () => {
  const updatedAt = new Date('2026-08-01T00:00:00.000Z');
  assert.deepEqual(buildQuotationConversionData(updatedAt), {
    approved: false,
    declined: false,
    is_booking: true,
    status: 'InProgress',
    updated_at: updatedAt
  });
});

test('flight fields preserve canonical values and support legacy aliases', () => {
  assert.deepEqual(normalizeQuotationFlightFields({
    edt: '07:30',
    eat: '09:15',
    flight_airline: 'TG',
    departure_time: 'wrong',
    arrival_time: 'wrong',
    flight_name: 'wrong'
  }), {
    edt: '07:30',
    eat: '09:15',
    flight_airline: 'TG'
  });

  assert.deepEqual(normalizeQuotationFlightFields({
    departure_time: '10:00',
    arrival_time: '11:20',
    flight_name: 'PG'
  }), {
    edt: '10:00',
    eat: '11:20',
    flight_airline: 'PG'
  });

  assert.deepEqual(normalizeQuotationFlightFields(), {
    edt: null,
    eat: null,
    flight_airline: null
  });
});

test('an agent cannot assign a quotation to a different agent from form data', async () => {
  const lookupClient = {
    agent: {
      findUnique: async ({ where }) => ({ id: where.id }),
      findFirst: async () => {
        throw new Error('agent lookup must not run for an authenticated agent');
      }
    }
  };

  const resolved = await resolveAgentIdFromRequest(
    { agent_id: 999, agent_name: 'Wrong Agent' },
    { role: 'agent', agent_id: 42 },
    lookupClient
  );

  assert.equal(resolved, 42);
});

test('an admin can explicitly select the quotation owner', async () => {
  const lookupClient = {
    agent: {
      findUnique: async ({ where }) => where.id === 77 ? { id: 77 } : null,
      findFirst: async () => null
    }
  };
  const resolved = await resolveAgentIdFromRequest(
    { agent_id: 77 },
    { role: 'admin', agent_id: 1 },
    lookupClient
  );

  assert.equal(resolved, 77);
});

test('an invalid explicit agent selection is rejected instead of falling back to another agent', async () => {
  const lookupClient = {
    agent: {
      findUnique: async () => null,
      findFirst: async () => null
    }
  };
  const resolved = await resolveAgentIdFromRequest(
    { agent_id: 999 },
    { role: 'admin', agent_id: 1 },
    lookupClient,
    { agent_id: 77 }
  );

  assert.equal(resolved, null);
});
