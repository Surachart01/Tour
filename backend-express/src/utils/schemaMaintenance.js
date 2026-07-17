import prisma from '../config/db.js';

let markupSchemaReady = false;

export async function ensureMarkupSchema() {
  if (markupSchemaReady) return;

    await prisma.$executeRawUnsafe(`
      ALTER TABLE hotel_promotions
      DROP CONSTRAINT IF EXISTS hotel_promotions_hotel_id_discount_amount_discount_type_key
    `);
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS hotel_promotions_hotel_id_discount_amount_discount_type_key
    `);
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        constraint_record record;
      BEGIN
        FOR constraint_record IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'hotel_promotions'::regclass
            AND contype = 'u'
            AND pg_get_constraintdef(oid) ILIKE '%hotel_id%'
            AND pg_get_constraintdef(oid) ILIKE '%discount_amount%'
            AND pg_get_constraintdef(oid) ILIKE '%discount_type%'
        LOOP
          EXECUTE format('ALTER TABLE hotel_promotions DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        END LOOP;
      END $$;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE markups
      ADD COLUMN IF NOT EXISTS extra_bed_markup_unit varchar(10),
      ADD COLUMN IF NOT EXISTS extra_bed_markup numeric(10,2)
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE hotel_trip_items
      ADD COLUMN IF NOT EXISTS late_checkout_type varchar(20)
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trips
      ADD COLUMN IF NOT EXISTS invoice_number varchar(100),
      ADD COLUMN IF NOT EXISTS booking_date date
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tax_invoice_documents (
        id serial PRIMARY KEY,
        trip_id integer NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        document_type varchar(50) NOT NULL,
        invoice_number varchar(100),
        selected_services jsonb NOT NULL DEFAULT '[]'::jsonb,
        adjustments jsonb NOT NULL DEFAULT '{}'::jsonb,
        snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (trip_id, document_type)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS tax_invoice_documents_trip_id_idx
      ON tax_invoice_documents (trip_id)
    `);

  markupSchemaReady = true;
  await prisma.$disconnect();
}
