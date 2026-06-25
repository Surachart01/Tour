import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const transfers = await prisma.transfers.findMany({
    orderBy: { id: 'desc' },
    take: 10,
    include: { transfer_pricing: true }
  });
  console.log("Last 10 Transfers:", JSON.stringify(transfers, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
