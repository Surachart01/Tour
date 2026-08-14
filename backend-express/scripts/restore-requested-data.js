import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { synchronizeAutoincrementSequences } from '../src/utils/postgresSequences.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const prisma = new PrismaClient();
const exportTablesDir = path.resolve(backendRoot, '../database-exports/2026-07-14T14-41-35-064Z/tables');

function deserializeRow(row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      result[key] = null;
    } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      result[key] = new Date(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function loadTableJson(filename) {
  const filepath = path.join(exportTablesDir, filename);
  const raw = await fs.readFile(filepath, 'utf8');
  return JSON.parse(raw);
}

async function restoreMasterData() {
  console.log('🔄 Starting restore of users, transfers, excursions, tours, hotels and master data...');

  // 1. Organization
  console.log('📦 Restoring Organization...');
  const orgs = await loadTableJson('Organization.json');
  for (const org of orgs) {
    const data = deserializeRow(org);
    await prisma.organization.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 2. Currencies
  console.log('📦 Restoring Currencies...');
  const currencies = await loadTableJson('currencies.json');
  for (const curr of currencies) {
    const data = deserializeRow(curr);
    await prisma.currencies.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 3. Markups & Hotel Markup Percentages
  console.log('📦 Restoring Markups...');
  const markups = await loadTableJson('markups.json');
  for (const m of markups) {
    const data = deserializeRow(m);
    await prisma.markups.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  const hotelMarkups = await loadTableJson('hotel_markup_percentages.json');
  for (const hm of hotelMarkups) {
    const data = deserializeRow(hm);
    await prisma.hotel_markup_percentages.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 4. Agents
  console.log('📦 Restoring Agents...');
  const agents = await loadTableJson('Agent.json');
  for (const agent of agents) {
    const data = deserializeRow(agent);
    
    // Check if another agent has the same name or email
    const duplicateEmail = await prisma.agent.findFirst({
      where: { email: data.email, NOT: { id: data.id } }
    });
    if (duplicateEmail) {
      await prisma.agent.update({
        where: { id: duplicateEmail.id },
        data: { email: `temp_${duplicateEmail.id}_${duplicateEmail.email}` }
      });
    }

    const duplicateName = await prisma.agent.findFirst({
      where: { name: data.name, NOT: { id: data.id } }
    });
    if (duplicateName) {
      await prisma.agent.update({
        where: { id: duplicateName.id },
        data: { name: `temp_${duplicateName.id}_${duplicateName.name}` }
      });
    }

    await prisma.agent.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // Clean up any temp agents created if not in export
  const exportAgentIds = new Set(agents.map(a => a.id));
  const existingAgents = await prisma.agent.findMany();
  for (const ag of existingAgents) {
    if (!exportAgentIds.has(ag.id) && (ag.name.startsWith('temp_') || ag.email.startsWith('temp_'))) {
      try {
        await prisma.agent.delete({ where: { id: ag.id } });
      } catch (e) {
        // Ignored if agent has foreign key references
      }
    }
  }

  const currentAgentList = await prisma.agent.findMany({ select: { id: true } });
  const validAgentIds = new Set(currentAgentList.map(a => a.id));
  const fallbackAgentId = validAgentIds.has(1) ? 1 : currentAgentList[0]?.id;

  // 5. Users
  console.log('📦 Restoring Users...');
  const users = await loadTableJson('User.json');
  const orgIds = new Set((await prisma.organization.findMany({ select: { id: true } })).map(o => o.id));

  for (const u of users) {
    const data = deserializeRow(u);
    if (!data.agentId || !validAgentIds.has(data.agentId)) {
      data.agentId = fallbackAgentId;
    }
    if (data.organizationId && !orgIds.has(data.organizationId)) {
      data.organizationId = null;
    }
    if (data.username === 'Oltremare/Caleidoscopio' && data.email === 'beppe@verathailandia.com') {
      data.email = 'oltremare@verathailandia.com';
    }

    // Resolve duplicate username / email
    const duplicateEmail = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: data.id } }
    });
    if (duplicateEmail) {
      await prisma.user.update({
        where: { id: duplicateEmail.id },
        data: { email: `temp_${duplicateEmail.id}_${duplicateEmail.email}` }
      });
    }

    const duplicateUsername = await prisma.user.findFirst({
      where: { username: data.username, NOT: { id: data.id } }
    });
    if (duplicateUsername) {
      await prisma.user.update({
        where: { id: duplicateUsername.id },
        data: { username: `temp_${duplicateUsername.id}_${duplicateUsername.username}` }
      });
    }

    await prisma.user.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // Ensure 'beppe' user exists and is active SuperAdmin / Admin
  const hashedPassword = await bcrypt.hash('123456', 10);
  const beppeUser = await prisma.user.findFirst({
    where: { OR: [{ username: 'beppe' }, { email: 'beppe@verathailandia.com' }] }
  });

  if (beppeUser) {
    await prisma.user.update({
      where: { id: beppeUser.id },
      data: {
        username: 'beppe',
        email: 'beppe@verathailandia.com',
        password: hashedPassword,
        role: 'admin',
        isSuperAdmin: true,
        isPrimaryAdmin: true,
        canCreateUsers: true,
        canViewAnalytics: true,
        userType: 'enterprise'
      }
    });
  } else {
    await prisma.user.create({
      data: {
        username: 'beppe',
        email: 'beppe@verathailandia.com',
        password: hashedPassword,
        role: 'admin',
        isSuperAdmin: true,
        isPrimaryAdmin: true,
        canCreateUsers: true,
        canViewAnalytics: true,
        userType: 'enterprise',
        organizationId: 1,
        agentId: fallbackAgentId,
        permissions: JSON.stringify({
          pages: ['all'],
          all_modules: true,
          notifications_enabled: true
        })
      }
    });
  }

  // 6. User Profiles
  console.log('📦 Restoring User Profiles...');
  const profiles = await loadTableJson('UserProfile.json');
  const existingUserIds = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));

  for (const prof of profiles) {
    const data = deserializeRow(prof);
    if (!existingUserIds.has(data.userId)) continue;

    await prisma.userProfile.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 7. Suppliers
  console.log('📦 Restoring Suppliers...');
  const suppliers = await loadTableJson('suppliers.json');
  for (const supp of suppliers) {
    const data = deserializeRow(supp);
    await prisma.suppliers.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 8. Hotels
  console.log('📦 Restoring Hotels (408 records)...');
  const hotels = await loadTableJson('hotels.json');
  for (const h of hotels) {
    const data = deserializeRow(h);
    if (data.user_id && !existingUserIds.has(data.user_id)) {
      data.user_id = null;
    }

    const duplicateName = await prisma.hotels.findFirst({
      where: { name: data.name, NOT: { id: data.id } }
    });
    if (duplicateName) {
      await prisma.hotels.update({
        where: { id: duplicateName.id },
        data: { name: `temp_${duplicateName.id}_${duplicateName.name}` }
      });
    }

    await prisma.hotels.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 9. Hotel Contacts, Fees, Promotions
  console.log('📦 Restoring Hotel Contacts...');
  const contacts = await loadTableJson('hotel_contacts.json');
  for (const c of contacts) {
    const data = deserializeRow(c);
    await prisma.hotel_contacts.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  console.log('📦 Restoring Hotel Fees...');
  const fees = await loadTableJson('hotel_fees.json');
  for (const f of fees) {
    const data = deserializeRow(f);
    await prisma.hotel_fees.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  console.log('📦 Restoring Hotel Promotions...');
  const promotions = await loadTableJson('hotel_promotions.json');
  for (const p of promotions) {
    const data = deserializeRow(p);
    await prisma.hotel_promotions.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 10. Room Types (Restored BEFORE Stop Sales)
  console.log('📦 Restoring Room Types (2219 records)...');
  const roomTypes = await loadTableJson('room_types.json');
  const BATCH_SIZE = 50;
  for (let i = 0; i < roomTypes.length; i += BATCH_SIZE) {
    const batch = roomTypes.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(rt => {
        const data = deserializeRow(rt);
        return prisma.room_types.upsert({
          where: { id: data.id },
          update: data,
          create: data
        });
      })
    );
  }

  // 11. Hotel Stop Sales (Depends on Room Types)
  console.log('📦 Restoring Hotel Stop Sales...');
  const stopSales = await loadTableJson('stop_sales.json');
  for (const ss of stopSales) {
    const data = deserializeRow(ss);
    await prisma.stop_sales.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 12. Transfers & Transfer Pricing
  console.log('📦 Restoring Transfers (171 records)...');
  const transfers = await loadTableJson('transfers.json');
  for (const t of transfers) {
    const data = deserializeRow(t);
    await prisma.transfers.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  console.log('📦 Restoring Transfer Pricing (670 records)...');
  const transferPricing = await loadTableJson('transfer_pricing.json');
  for (let i = 0; i < transferPricing.length; i += BATCH_SIZE) {
    const batch = transferPricing.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(tp => {
        const data = deserializeRow(tp);
        return prisma.transfer_pricing.upsert({
          where: { id: data.id },
          update: data,
          create: data
        });
      })
    );
  }

  // 12. Excursions & Excursion Pricing
  console.log('📦 Restoring Excursions (34 records)...');
  const excursions = await loadTableJson('excursions.json');
  for (const exc of excursions) {
    const data = deserializeRow(exc);
    await prisma.excursions.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  console.log('📦 Restoring Excursion Pricing (103 records)...');
  const excursionPricing = await loadTableJson('excursion_pricing.json');
  for (const ep of excursionPricing) {
    const data = deserializeRow(ep);
    await prisma.excursion_pricing.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 13. Tours, Tour Days, Tour Details, Tour Pricing
  console.log('📦 Restoring Tours (20 records)...');
  const tours = await loadTableJson('tours.json');
  for (const tour of tours) {
    const data = deserializeRow(tour);
    if (data.created_by && !existingUserIds.has(data.created_by)) {
      data.created_by = null;
    }
    await prisma.tours.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  console.log('📦 Restoring Tour Days (95 records)...');
  const tourDays = await loadTableJson('tour_days.json');
  for (const td of tourDays) {
    const data = deserializeRow(td);
    await prisma.tour_days.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  console.log('📦 Restoring Tour Details (103 records)...');
  const tourDetails = await loadTableJson('tour_details.json');
  for (const tdet of tourDetails) {
    const data = deserializeRow(tdet);
    await prisma.tour_details.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  console.log('📦 Restoring Tour Pricing (55 records)...');
  const tourPricing = await loadTableJson('tour_pricing.json');
  for (const tp of tourPricing) {
    const data = deserializeRow(tp);
    await prisma.tour_pricing.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 14. Synchronize auto-increment sequences
  console.log('🔄 Synchronizing PostgreSQL autoincrement sequences...');
  await synchronizeAutoincrementSequences(prisma);

  console.log('✅ Master data restored successfully!');
}

restoreMasterData()
  .catch((err) => {
    console.error('❌ Restore failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
