import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const columns = [
  ['excursions', 'supplier_name'],
  ['excursions', 'valid_days'],
  ['flight_trip_items', 'flight_airline'],
  ['hotel_trip_items', 'hotel_name'],
  ['hotel_trip_items', 'room_type'],
  ['tours', 'city'],
  ['tours', 'valid_days'],
  ['transfers', 'supplier_name'],
  ['trips', 'client_name'],
  ['trips', 'client_email'],
];

async function main() {
  for (const [table, column] of columns) {
    const metadata = await prisma.$queryRawUnsafe(
      `SELECT data_type, character_maximum_length
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      table,
      column,
    );
    const lengths = await prisma.$queryRawUnsafe(
      `SELECT max(length("${column}"::text))::int AS max_length FROM "${table}"`,
    );

    console.log(JSON.stringify({
      table,
      column,
      dataType: metadata[0]?.data_type ?? null,
      currentLimit: metadata[0]?.character_maximum_length ?? null,
      maxDataLength: lengths[0]?.max_length ?? 0,
    }));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
