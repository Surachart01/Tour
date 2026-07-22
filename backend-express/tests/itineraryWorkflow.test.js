import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildItineraryDays, itineraryHotelName } from '../src/controllers/pdfController.js';

const testDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const projectRoot = resolve(testDirectory, '..', '..');
const routes = readFileSync(resolve(projectRoot, 'backend-express/src/routes/tripRoutes.js'), 'utf8');
const editor = readFileSync(resolve(projectRoot, 'frontend-main/production/edit_itinerary.html'), 'utf8');
const list = readFileSync(resolve(projectRoot, 'frontend-main/production/itinerary.html'), 'utf8');

test('itinerary services are grouped chronologically and keep manual pickup times', () => {
  const days = buildItineraryDays({
    client_name: 'Example Client',
    transfer_trip_items: [{
      id: 1,
      from_date: '2026-11-02T00:00:00.000Z',
      from_location: 'Hotel',
      to_location: 'Airport',
      pickup_time: '07:30'
    }],
    excursion_trip_items: [{
      id: 2,
      from_date: '2026-11-01T00:00:00.000Z',
      pickup_time: '10:40',
      excursions: { name: 'Railway Market' }
    }],
    hotel_trip_items: [{
      id: 3,
      from_date: '2026-11-01T00:00:00.000Z',
      to_date: '2026-11-03T00:00:00.000Z',
      hotel_name: 'Example Hotel',
      nights: 2
    }]
  });

  assert.deepEqual(days.map((day) => day.key), ['2026-11-01', '2026-11-02', '2026-11-03']);
  assert.equal(days[0].services[0].title, 'Railway Market');
  assert.match(days[0].services[0].timeLabel, /10:40 AM/);
  assert.match(days[1].services[0].timeLabel, /07:30 AM/);
  assert.match(days[2].services[0].title, /Check-out/);
});

test('itinerary hotel names prefer master data and collapse repeated package labels', () => {
  assert.equal(
    itineraryHotelName({ hotel_name: 'Old Name Special Package Special Package', hotels: { name: 'Master Hotel' } }),
    'Master Hotel'
  );
  assert.equal(
    itineraryHotelName({ hotel_name: 'Bizotel Bangkok Special Package Special Package Special Package' }),
    'Bizotel Bangkok Special Package'
  );
});

test('itinerary routes separate read, save, and PDF actions', () => {
  assert.match(routes, /router\.get\('\/itinerary\/:id', authorize\('admin', 'agent'\), getItinerary\)/);
  assert.match(routes, /router\.put\('\/itinerary\/:id\/details', authorize\('admin'\), updateItineraryDetails\)/);
  assert.match(routes, /router\.get\('\/itinerary\/:id\/generate-pdf', authorize\('admin', 'agent'\), generateTripPDF\)/);
});

test('itinerary editor only saves operational fields and opens a PDF preview', () => {
  assert.match(editor, /Save Itinerary/);
  assert.match(editor, /Open PDF \/ Print/);
  assert.match(editor, /pickup_time/);
  assert.match(editor, /Operational Notes/);
  assert.doesNotMatch(editor, /Save Quotation/);
  assert.doesNotMatch(editor, /Convert to Booking/);
  assert.match(list, /api\/v1\/itinerary/);
});
