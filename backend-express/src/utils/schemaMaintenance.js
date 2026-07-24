import prisma from '../config/db.js';

let markupSchemaReady = false;
let operationSchemaReady = false;
let availabilitySchemaReady = false;
let checkInvoiceSchemaReady = false;

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
        invoice_date date,
        selected_services jsonb NOT NULL DEFAULT '[]'::jsonb,
        adjustments jsonb NOT NULL DEFAULT '{}'::jsonb,
        snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (trip_id, document_type)
      )
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE tax_invoice_documents
      ADD COLUMN IF NOT EXISTS invoice_date date
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS tax_invoice_documents_trip_id_idx
      ON tax_invoice_documents (trip_id)
  `);

  markupSchemaReady = true;
}

export async function ensureOperationSchema() {
  if (operationSchemaReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS operation_assignments (
      id serial PRIMARY KEY,
      trip_id integer NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      service_type varchar(20) NOT NULL,
      service_item_id integer NOT NULL,
      operation_date date NOT NULL,
      status varchar(30) NOT NULL DEFAULT 'unassigned',
      supplier_id integer REFERENCES suppliers(id) ON DELETE SET NULL,
      supplier_name varchar(150),
      vehicle_type varchar(100),
      vehicle_quantity integer NOT NULL DEFAULT 1,
      guide_name varchar(150),
      guide_mobile varchar(50),
      pickup_time varchar(50),
      remarks text,
      source_updated_at timestamptz,
      assigned_by integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT operation_assignments_service_type_check
        CHECK (service_type IN ('transfer', 'excursion', 'tour')),
      CONSTRAINT operation_assignments_status_check
        CHECK (status IN ('unassigned', 'assigned', 'ready', 'in_operation', 'completed', 'changed', 'cancelled')),
      CONSTRAINT operation_assignments_vehicle_quantity_check
        CHECK (vehicle_quantity >= 0),
      UNIQUE (service_type, service_item_id, operation_date)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS operation_assignments_date_idx
    ON operation_assignments (operation_date)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS operation_assignments_status_idx
    ON operation_assignments (status)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS operation_assignments_trip_idx
    ON operation_assignments (trip_id)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS operation_assignment_history (
      id serial PRIMARY KEY,
      assignment_id integer NOT NULL REFERENCES operation_assignments(id) ON DELETE CASCADE,
      changed_by integer,
      change_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS operation_assignment_history_assignment_idx
    ON operation_assignment_history (assignment_id, created_at DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS operation_guides (
      id serial PRIMARY KEY,
      name varchar(150) NOT NULL,
      mobile varchar(50),
      cities text,
      languages text,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS operation_guides_name_unique_idx
    ON operation_guides (lower(name))
  `);

  operationSchemaReady = true;
}

export async function ensureAvailabilitySchema() {
  if (availabilitySchemaReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS excursion_stop_sales (
      id serial PRIMARY KEY,
      excursion_id integer NOT NULL REFERENCES excursions(id) ON DELETE CASCADE,
      start_date date NOT NULL,
      end_date date NOT NULL,
      stopped boolean NOT NULL DEFAULT true,
      attachment_url varchar(500),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      UNIQUE (excursion_id, start_date, end_date)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS excursion_stop_sales_excursion_date_idx
    ON excursion_stop_sales (excursion_id, start_date, end_date)
  `);

  availabilitySchemaReady = true;
}

export async function ensureCheckInvoiceSchema() {
  if (checkInvoiceSchemaReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS check_invoice_records (
      id serial PRIMARY KEY,
      trip_id integer NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      report_month date NOT NULL,
      monthly_file_number integer NOT NULL,
      generated_invoice_number varchar(100) NOT NULL,
      invoice_year integer NOT NULL,
      generated_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (trip_id),
      UNIQUE (report_month, monthly_file_number),
      UNIQUE (generated_invoice_number)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS check_invoice_records_month_idx
    ON check_invoice_records (report_month, monthly_file_number)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS check_invoice_records_year_idx
    ON check_invoice_records (invoice_year, generated_invoice_number)
  `);

  checkInvoiceSchemaReady = true;
}
