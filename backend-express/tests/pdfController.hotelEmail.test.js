import test from 'node:test';
import assert from 'node:assert/strict';
import { groupHotelItemsForSupplierEmail } from '../src/controllers/pdfController.js';

test('groups consecutive hotel nights into one hotel email with stay details', () => {
  const groups = groupHotelItemsForSupplierEmail([
    { id: 1, hotel_id: 10, hotel_name: 'Hotel A', from_date: '2026-11-01', to_date: '2026-11-02', nights: 1, room_type: 'Deluxe' },
    { id: 2, hotel_id: 10, hotel_name: 'Hotel A', from_date: '2026-11-02', to_date: '2026-11-03', nights: 1, room_type: 'Deluxe' },
    { id: 3, hotel_id: 10, hotel_name: 'Hotel A', from_date: '2026-11-03', to_date: '2026-11-04', nights: 1, room_type: 'Suite' }
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].originalItems.map((item) => item.id), [1, 2, 3]);
  assert.equal(groups[0].segments.length, 2);
  assert.equal(groups[0].segments[0].nights, 2);
  assert.equal(groups[0].segments[1].room_type, 'Suite');
});

test('keeps different hotels as different recipient emails', () => {
  const groups = groupHotelItemsForSupplierEmail([
    { id: 1, hotel_id: 10, hotel_name: 'Hotel A', from_date: '2026-11-01', to_date: '2026-11-02', nights: 1 },
    { id: 2, hotel_id: 20, hotel_name: 'Hotel B', from_date: '2026-11-01', to_date: '2026-11-02', nights: 1 }
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((group) => group.hotel_name), ['Hotel A', 'Hotel B']);
});

test('falls back to normalized hotel name when a hotel ID is unavailable', () => {
  const groups = groupHotelItemsForSupplierEmail([
    { id: 1, hotel_name: 'Hotel A', from_date: '2026-11-01', to_date: '2026-11-02', nights: 1 },
    { id: 2, hotel_name: ' hotel a ', from_date: '2026-11-02', to_date: '2026-11-03', nights: 1 }
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].originalItems.length, 2);
});
