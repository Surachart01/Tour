import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attachProformaBilling,
  resolveBookingStatusAfterSave,
  resolveServiceApprovalState
} from '../src/controllers/tripController.js';

test('preserves an existing service confirmation while saving a booking', () => {
  const savedById = new Map([
    [12, { approved: true, declined: false }]
  ]);

  assert.deepEqual(
    resolveServiceApprovalState(savedById, { id: 12, approved: false }),
    { approved: true, declined: false }
  );
});

test('new services remain unconfirmed until an admin confirms them', () => {
  assert.deepEqual(
    resolveServiceApprovalState(new Map(), { id: null }),
    { approved: false, declined: false }
  );
});

test('a confirmed booking returns to InProgress when a new unconfirmed service is saved', () => {
  assert.equal(
    resolveBookingStatusAfterSave('Confirmed', false, undefined),
    'InProgress'
  );
});

test('saving confirmed services does not confirm an InProgress booking automatically', () => {
  assert.equal(
    resolveBookingStatusAfterSave('InProgress', true, undefined),
    undefined
  );
});

test('uses the booking agent as the primary Proforma billing source', () => {
  const booking = attachProformaBilling({
    id: 74,
    agents: {
      id: 9,
      name: 'Current Booking Agent',
      address: 'Current agent address',
      fax: 'TAX-BOOKING-001',
      users: [{
        userProfile: {
          isPrimaryProfile: true,
          billingName: 'Old profile name',
          billingAddress: 'Old profile address',
          taxId: 'OLD-TAX-ID',
          billingCity: 'Rome',
          billingCountry: 'Italy'
        }
      }]
    }
  });

  assert.deepEqual(booking.proforma_billing, {
    agent_name: 'Current Booking Agent',
    address: 'Current agent address',
    city: 'Rome',
    state: '',
    postal_code: '',
    country: 'Italy',
    tax_id: 'TAX-BOOKING-001'
  });
  assert.equal('users' in booking.agents, false);
});
