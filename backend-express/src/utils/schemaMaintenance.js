import prisma from '../config/db.js';

let markupSchemaReady = false;

export async function ensureMarkupSchema() {
  if (markupSchemaReady) return;

    await prisma.$executeRawUnsafe(`
      ALTER TABLE markups
      ADD COLUMN IF NOT EXISTS extra_bed_markup_unit varchar(10),
      ADD COLUMN IF NOT EXISTS extra_bed_markup numeric(10,2)
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE hotel_trip_items
      ADD COLUMN IF NOT EXISTS late_checkout_type varchar(20)
    `);

  markupSchemaReady = true;
  await prisma.$disconnect();
}
