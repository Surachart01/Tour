import prisma from './src/config/db.js';

async function main() {
  try {
    const markup = await prisma.markups.findUnique({
      where: { id: 3 }
    });
    console.log('TO Gold Markup details:');
    console.log(JSON.stringify(markup, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
