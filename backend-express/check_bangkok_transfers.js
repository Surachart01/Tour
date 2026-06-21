import prisma from './src/config/db.js';

async function check() {
  try {
    const transfers = await prisma.transfers.findMany({
      where: {
        city: 'Bangkok',
        description: {
          contains: 'Airport DON MUANG - Hotel BANGKOK',
          mode: 'insensitive'
        }
      },
      include: {
        transfer_pricing: true
      }
    });

    console.log('Found transfers:', JSON.stringify(transfers, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
