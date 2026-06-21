import prisma from './src/config/db.js';

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users in DB:", users.map(u => ({ id: u.id, username: u.username, role: u.role })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
