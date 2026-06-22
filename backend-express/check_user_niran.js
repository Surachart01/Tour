import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const user = await prisma.user.findFirst({
    where: { username: 'niran1116' },
    include: { userProfile: true }
  });
  console.log('User niran1116:');
  console.log(user);
} catch (e) {
  console.error(e);
} finally {
  await prisma.$disconnect();
}
