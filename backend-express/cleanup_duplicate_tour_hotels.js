/**
 * Cleanup script: Remove duplicate entries in tour_trip_item_hotels table.
 * Keeps the latest entry (highest id) for each (tour_trip_item_id, day) pair.
 * Run once: node cleanup_duplicate_tour_hotels.js
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('🔍 Scanning tour_trip_item_hotels for duplicates...');

  // Group all rows by (tour_trip_item_id, day)
  const allRows = await prisma.tour_trip_item_hotels.findMany({
    orderBy: [
      { tour_trip_item_id: 'asc' },
      { day: 'asc' },
      { id: 'asc' }
    ]
  });

  console.log(`Total rows found: ${allRows.length}`);

  // Find which rows are duplicates (keep the last/highest id per group)
  const seen = new Map();
  const toDelete = [];

  for (const row of allRows) {
    const key = `${row.tour_trip_item_id}-${row.day}`;
    if (seen.has(key)) {
      // This is a duplicate - delete the older one (lower id), keep the newer
      toDelete.push(seen.get(key));
    }
    seen.set(key, row.id);
  }

  if (toDelete.length === 0) {
    console.log('✅ No duplicates found. Database is clean.');
    return;
  }

  console.log(`🗑️  Found ${toDelete.length} duplicate rows to remove:`);
  console.log('  IDs to delete:', toDelete);

  // Delete the duplicates
  const result = await prisma.tour_trip_item_hotels.deleteMany({
    where: { id: { in: toDelete } }
  });

  console.log(`✅ Deleted ${result.count} duplicate rows.`);
  console.log('🏁 Cleanup complete!');
}

cleanupDuplicates()
  .catch(e => {
    console.error('❌ Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
