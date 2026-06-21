import prisma from './src/config/db.js';

async function run() {
  const trips = await prisma.trips.findMany({
    take: 3,
    orderBy: { id: 'desc' },
    include: {
      transfer_trip_items: {
        include: {
          transfers: true
        }
      }
    }
  });
  console.log("FULL DATA:", JSON.stringify(trips, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
