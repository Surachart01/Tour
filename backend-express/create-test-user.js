import prisma from './src/config/db.js';
import bcrypt from 'bcryptjs';

async function main() {
  const username = 'vtadmin';
  const email = 'vtadmin@verathailandia.com';
  const password = 'testing@123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const defaultOrg = await prisma.organization.findFirst({
    where: { slug: 'vera-thailandia' }
  });

  const orgId = defaultOrg ? defaultOrg.id : null;

  const testUser = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      role: 'superadmin',
      isSuperAdmin: true,
      canCreateUsers: true,
      canViewAnalytics: true,
      organizationId: orgId
    },
    create: {
      username,
      email,
      role: 'superadmin',
      password: hashedPassword,
      agentId: 1,
      userType: 'superadmin',
      isSuperAdmin: true,
      canCreateUsers: true,
      canViewAnalytics: true,
      organizationId: orgId
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: testUser.id },
    update: {
      userType: 'superadmin',
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      isPrimaryProfile: true,
      role: 'admin',
      organizationId: orgId
    },
    create: {
      userId: testUser.id,
      userType: 'superadmin',
      companyName: 'Vera Thailandia vtadmin',
      companyEmail: email,
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      isPrimaryProfile: true,
      role: 'admin',
      organizationId: orgId
    }
  });

  console.log('✅ Created test user vtadmin / testing@123 successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
