import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
  console.log('Tables in database:', tables.map(t => t.table_name));
} catch (e) {
  console.error(e);
} finally {
  await prisma.$disconnect();
}
