import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
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

async function restoreSpecialPackages() {
  console.log('🔄 Starting restore of Special Packages data...');

  const existingCurrencies = new Set((await prisma.currencies.findMany({ select: { id: true } })).map(c => c.id));
  const existingUsers = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));
  const existingHotels = new Set((await prisma.hotels.findMany({ select: { id: true } })).map(h => h.id));
  const existingTransfers = new Set((await prisma.transfers.findMany({ select: { id: true } })).map(t => t.id));
  const existingExcursions = new Set((await prisma.excursions.findMany({ select: { id: true } })).map(e => e.id));
  const existingTours = new Set((await prisma.tours.findMany({ select: { id: true } })).map(t => t.id));

  // 1. Special Packages
  console.log('📦 Restoring special_packages (99 records)...');
  const packages = await loadTableJson('special_packages.json');
  for (const pkg of packages) {
    const data = deserializeRow(pkg);
    if (data.currency_id && !existingCurrencies.has(data.currency_id)) {
      data.currency_id = null;
    }
    if (data.created_by && !existingUsers.has(data.created_by)) {
      data.created_by = null;
    }

    await prisma.special_packages.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 2. Special Package Items
  console.log('📦 Restoring special_package_items (612 records)...');
  const items = await loadTableJson('special_package_items.json');
  const BATCH_SIZE = 50;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(item => {
        const data = deserializeRow(item);
        if (data.hotel_id && !existingHotels.has(data.hotel_id)) data.hotel_id = null;
        if (data.transfer_id && !existingTransfers.has(data.transfer_id)) data.transfer_id = null;
        if (data.excursion_id && !existingExcursions.has(data.excursion_id)) data.excursion_id = null;
        if (data.tour_id && !existingTours.has(data.tour_id)) data.tour_id = null;

        return prisma.special_package_items.upsert({
          where: { id: data.id },
          update: data,
          create: data
        });
      })
    );
  }

  // 3. Special Package Stop Sales
  console.log('📦 Restoring special_package_stop_sales...');
  const stopSales = await loadTableJson('special_package_stop_sales.json');
  for (const ss of stopSales) {
    const data = deserializeRow(ss);
    await prisma.special_package_stop_sales.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 4. Special Promos
  console.log('📦 Restoring special_promos...');
  const promos = await loadTableJson('special_promos.json');
  for (const pr of promos) {
    const data = deserializeRow(pr);
    await prisma.special_promos.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
  }

  // 5. Synchronize auto-increment sequences
  console.log('🔄 Synchronizing PostgreSQL autoincrement sequences...');
  await synchronizeAutoincrementSequences(prisma);

  console.log('✅ Special Packages data restored successfully!');
}

restoreSpecialPackages()
  .catch((err) => {
    console.error('❌ Restore failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
