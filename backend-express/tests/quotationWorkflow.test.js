import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNewQuotationWorkflowState,
  buildQuotationConversionData,
  buildQuotationConversionWhere,
  calculateQuotationCosts,
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
  const resolved = await resolveAgentIdFromRequest(
    { agent_id: 77 },
    { role: 'admin', agent_id: 1 }
  );

  assert.equal(resolved, 77);
});
