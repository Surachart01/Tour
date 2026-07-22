import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateRoomNightOverlap, resolveBookedRoomCount } from '../src/controllers/analyticsController.js';

const testDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const rootDirectory = resolve(testDirectory, '..', '..');
const page = readFileSync(resolve(rootDirectory, 'frontend-main/production/room_nights.html'), 'utf8');
const pageScript = readFileSync(resolve(rootDirectory, 'frontend-main/production/js/analytics/room_nights.js'), 'utf8');
const routes = readFileSync(resolve(rootDirectory, 'backend-express/src/routes/analyticsRoutes.js'), 'utf8');

test('room night overlap follows rooms multiplied by occupied nights', () => {
  const nights = calculateRoomNightOverlap('2026-07-01', '2026-07-06', '2026-07-01', '2026-08-01');
  assert.equal(nights, 5);
  assert.equal(2 * nights, 10);
});

test('room nights are allocated only to the selected calendar month', () => {
  assert.equal(calculateRoomNightOverlap('2026-06-29', '2026-07-03', '2026-07-01', '2026-08-01'), 2);
  assert.equal(calculateRoomNightOverlap('2026-07-30', '2026-08-03', '2026-07-01', '2026-08-01'), 2);
  assert.equal(calculateRoomNightOverlap('2026-08-01', '2026-08-03', '2026-07-01', '2026-08-01'), 0);
});

test('early check-in reserves the preceding room night', () => {
  assert.equal(calculateRoomNightOverlap('2026-07-02', '2026-07-03', '2026-07-01', '2026-08-01', true), 2);
});

test('saved room rows and special-package rooms determine room quantity', () => {
  assert.equal(resolveBookedRoomCount({ hotel_room_type_items: [{ id: 1 }, { id: 2 }] }), 2);
  assert.equal(resolveBookedRoomCount({ room_types_json: JSON.stringify([{ room_type: 'A' }, { room_type: 'B' }]) }), 2);
  assert.equal(resolveBookedRoomCount({
    tour_package: 'Package',
    trips: { special_package_id: 4, special_pkg_single_rooms: 1, special_pkg_double_rooms: 2, special_pkg_triple_rooms: 0 }
  }), 3);
  assert.equal(resolveBookedRoomCount({}), 1);
});

test('Room Nights page exposes monthly hotel reporting, print, and CSV actions', () => {
  assert.match(routes, /router\.get\('\/analytics\/room-nights', authorize\('admin', 'agent'\), getRoomNights\)/);
  assert.match(page, /<title>Room Nights<\/title>/);
  assert.match(page, /id="periodMonth"[^>]*type="month"/);
  assert.match(page, /id="hotelFilter"/);
  assert.match(page, /id="printReport"/);
  assert.match(page, /id="exportCsv"/);
  assert.match(page, /Total Room Nights/);
  assert.match(pageScript, /\/api\/v1\/analytics\/room-nights/);
  assert.match(pageScript, /function exportCsv\(\)/);
  assert.match(pageScript, /function printReport\(\)/);
});
