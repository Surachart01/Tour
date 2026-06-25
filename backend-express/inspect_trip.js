import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const trip = await prisma.trips.findUnique({
    where: { id: 96 },
    include: {
      tour_trip_items: true
    }
  });
  console.log("Trip 96:", JSON.stringify(trip, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

