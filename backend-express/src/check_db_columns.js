import prisma from './config/db.js';

async function main() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'transfer_trip_items';
    `;
    console.log("COLUMNS IN DB:");
    console.log(JSON.stringify(columns, null, 2));
  } catch (err) {
    console.error("DB Query Error:", err);
  }
}
main().then(() => prisma.$disconnect());
