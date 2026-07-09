import prisma from './config/db.js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse and split SQL statements ignoring semicolons inside strings/comments
function splitSql(sqlText) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inComment = false;
  let inMultiLineComment = false;

  for (let i = 0; i < sqlText.length; i++) {
    const char = sqlText[i];
    const nextChar = sqlText[i + 1];

    if (inComment) {
      if (char === '\n' || char === '\r') {
        inComment = false;
      }
      continue;
    }

    if (inMultiLineComment) {
      if (char === '*' && nextChar === '/') {
        inMultiLineComment = false;
        i++;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '-' && nextChar === '-') {
        inComment = true;
        i++;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inMultiLineComment = true;
        i++;
        continue;
      }
    }

    // Toggle single quotes
    if (char === "'" && sqlText[i - 1] !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && sqlText[i - 1] !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    statements.push(current.trim());
  }
  return statements;
}

async function main() {
  console.log('🌱 Starting FAST database import using pg client...');
  
  // Locate public.sql - support multiple paths (local root, backend root, cwd)
  let sqlPath = path.resolve(__dirname, '../../public.sql');
  if (!fs.existsSync(sqlPath)) {
    sqlPath = path.resolve(__dirname, '../public.sql');
  }
  if (!fs.existsSync(sqlPath)) {
    sqlPath = path.resolve(process.cwd(), 'public.sql');
  }
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Error: public.sql not found at standard locations`);
    process.exit(1);
  }

  console.log(`📖 Reading SQL dump from ${sqlPath}...`);
  const sqlText = fs.readFileSync(sqlPath, 'utf8');

  console.log('🧩 Splitting and filtering SQL statements...');
  const rawStatements = splitSql(sqlText);
  const filteredStatements = [];
  for (const stmt of rawStatements) {
    if (!stmt || stmt.startsWith('\\')) continue;
    // Skip drop or create statements for uuid helper functions as they are handled by the uuid-ossp extension
    if (/FUNCTION.*uuid_/i.test(stmt)) {
      continue;
    }
    filteredStatements.push(stmt);
  }
  console.log(`✅ Filtered SQL statements to ${filteredStatements.length} commands.`);
  
  const filteredSqlText = filteredStatements.join(';\n');

  // Connect via PG Client
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('✅ Connected to PostgreSQL.');

  console.log('🧹 Clearing existing database schema...');
  await client.query('DROP SCHEMA IF EXISTS public CASCADE');
  await client.query('CREATE SCHEMA public');
  console.log('✅ Database schema cleared.');

  // Pre-enable uuid-ossp extension so Prisma and SQL schema can use it immediately
  console.log('🔌 Enabling uuid-ossp extension...');
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  console.log('🚀 Executing raw SQL dump (this will take only a few seconds)...');
  try {
    await client.query(filteredSqlText);
    console.log('✅ Raw SQL dump executed successfully.');
  } catch (err) {
    console.warn('⚠️ Warning during raw SQL execution:', err.message);
  } finally {
    await client.end();
  }

  console.log('🔧 Fixing NULL agent_id values in users table to satisfy schema constraints...');
  try {
    await prisma.$executeRawUnsafe('UPDATE users SET agent_id = 1 WHERE agent_id IS NULL');
    console.log('✅ Updated users with NULL agent_id to default Agent ID 1.');
  } catch (err) {
    console.warn('⚠️ Warning updating agent_id:', err.message);
  }

  console.log('🔧 Dropping legacy database constraints that conflict with new schema...');
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_google_id_key CASCADE');
    console.log('✅ Dropped users_google_id_key constraint.');
  } catch (err) {
    console.warn('⚠️ Warning dropping users_google_id_key constraint:', err.message);
  }

  console.log('🔧 Ensuring hotel markup amounts support fixed THB ranges...');
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE hotel_markup_percentages ALTER COLUMN markup_percentage TYPE numeric(10,2)');
    console.log('✅ Hotel markup amount column supports fixed THB values.');
  } catch (err) {
    console.warn('⚠️ Warning updating markup_percentage:', err.message);
  }

  console.log('🔧 Truncating client_name in trips to 100 characters to fit VarChar(100) constraint...');
  try {
    await prisma.$executeRawUnsafe('UPDATE trips SET client_name = SUBSTRING(client_name FROM 1 FOR 100) WHERE LENGTH(client_name) > 100');
    console.log('✅ Truncated trips.client_name to fit VARCHAR(100).');
  } catch (err) {
    console.warn('⚠️ Warning updating trips.client_name:', err.message);
  }

  console.log('🔧 Fixing duplicate agent email values to satisfy unique constraint...');
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE agents
      SET email = regexp_replace(email, '@', '+' || id || '@')
      WHERE email IN (
        SELECT email FROM agents GROUP BY email HAVING COUNT(*) > 1
      )
    `);
    console.log('✅ Updated duplicate agent emails to be unique.');
  } catch (err) {
    console.warn('⚠️ Warning updating duplicate agent emails:', err.message);
  }

  // Upgrade the schema to new SaaS model
  console.log('🔄 Upgrading database schema to SaaS model using Prisma db push...');
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ Schema upgraded to new model successfully.');
  } catch (err) {
    console.error('❌ Failed to run prisma db push:', err.message);
    process.exit(1);
  }

  // Create default organization and user profiles for imported users
  console.log('👤 Creating user profiles and organizations for imported users...');
  
  // Create default organization
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'vera-thailandia' },
    update: {},
    create: {
      name: 'Vera Thailandia',
      slug: 'vera-thailandia',
      domain: 'verathailandia.com',
      subdomain: 'vera',
      settings: {}
    }
  });

  // Query all users and build profiles
  const dbUsers = await prisma.user.findMany();
  for (const user of dbUsers) {
    // Link user to organization
    await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: defaultOrg.id }
    });

    // Check user profile
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id }
    });

    if (!existingProfile) {
      let subscriptionTier = 'starter';
      let subscriptionStatus = 'trial';
      let userType = 'agent';

      if (user.role === 'superadmin') {
        subscriptionTier = 'enterprise';
        subscriptionStatus = 'active';
        userType = 'superadmin';
      } else if (user.role === 'admin') {
        subscriptionTier = 'enterprise';
        subscriptionStatus = 'active';
        userType = 'admin';
      }

      const companyName = user.username.charAt(0).toUpperCase() + user.username.slice(1) + ' Travel';

      await prisma.userProfile.create({
        data: {
          userId: user.id,
          userType: userType,
          companyName: companyName,
          companyEmail: user.email,
          subscriptionTier,
          subscriptionStatus,
          role: 'admin',
          isPrimaryProfile: user.role === 'superadmin' || user.role === 'admin',
          organizationId: defaultOrg.id
        }
      });
      console.log(`Created profile for user: ${user.username}`);
    }
  }
  console.log('✅ User profiles migration complete.');

  console.log('👤 Creating default superadmin user for testing...');
  try {
    const superadminUsername = 'superadmin';
    const superadminEmail = 'superadmin@verathailandia.com';
    const superadminPassword = 'admin123';
    const hashedSuperPassword = await bcrypt.hash(superadminPassword, 10);

    const testSuperUser = await prisma.user.upsert({
      where: { username: superadminUsername },
      update: {
        password: hashedSuperPassword,
        role: 'superadmin',
        isSuperAdmin: true,
        canCreateUsers: true,
        canViewAnalytics: true,
        organizationId: defaultOrg.id
      },
      create: {
        username: superadminUsername,
        email: superadminEmail,
        role: 'superadmin',
        password: hashedSuperPassword,
        agentId: 1, // Default agent 1
        userType: 'superadmin',
        isSuperAdmin: true,
        canCreateUsers: true,
        canViewAnalytics: true,
        organizationId: defaultOrg.id
      }
    });

    await prisma.userProfile.upsert({
      where: { userId: testSuperUser.id },
      update: {
        userType: 'superadmin',
        subscriptionTier: 'enterprise',
        subscriptionStatus: 'active',
        isPrimaryProfile: true,
        role: 'admin',
        organizationId: defaultOrg.id
      },
      create: {
        userId: testSuperUser.id,
        userType: 'superadmin',
        companyName: 'Vera Thailandia Admin',
        companyEmail: superadminEmail,
        subscriptionTier: 'enterprise',
        subscriptionStatus: 'active',
        isPrimaryProfile: true,
        role: 'admin',
        organizationId: defaultOrg.id
      }
    });
    console.log('✅ Default superadmin account verified (superadmin / admin123).');
  } catch (err) {
    console.warn('⚠️ Warning creating default superadmin user:', err.message);
  }

  console.log('🌱 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
