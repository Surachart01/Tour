import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.transfer_trip_items.findMany({
    where: { trip_item_id: 132 }
  });
  console.log("Trip 132 Transfer Items in DB:");
  console.log(JSON.stringify(items, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
