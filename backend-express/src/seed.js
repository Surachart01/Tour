import prisma from './config/db.js';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Standard lookup data
const defaultCountries = [
  { id: 1, name: 'Thailand', code: 'TH' },
  { id: 2, name: 'Vietnam', code: 'VN' },
  { id: 3, name: 'Cambodia', code: 'KH' },
  { id: 4, name: 'Laos', code: 'LA' }
];

const defaultCurrencies = [
  { id: 1, city: 'Bangkok', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 2, city: 'Phuket', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 3, city: 'Chiang Mai', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 4, city: 'Koh Tao', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 5, city: 'Krabi', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 6, city: 'Koh Kood', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 7, city: 'Koh Samui', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 8, city: 'Ayutthaya', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 9, city: 'Pattaya', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 10, city: 'Koh Phangan', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 11, city: 'Kanchanaburi', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 12, city: 'Chiang Saen', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 13, city: 'Hua Hin', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 14, city: 'Koh Samed', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 15, city: 'Koh Chang', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 16, city: 'Amphawa', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 17, city: 'Phi Phi Island', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 18, city: 'Koh Yao Noi', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 19, city: 'Koh Lipe', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 20, city: 'Rayong', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 21, city: 'Khao Lak', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 22, city: 'Koh Lanta', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 23, city: 'Chiang Rai', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 24, city: 'Pai', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 25, city: 'Ubon Ratchathani', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 26, city: 'Surin', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 27, city: 'Koh Kradan', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 28, city: 'Khao Yai', currency_code: 'THB', currency_name: 'Thai Baht' },
  { id: 29, city: 'Mae Hong Son', currency_code: 'THB', currency_name: 'Thai Baht' }
];

const defaultCities = [
  { id: 1, name: 'Sukhothai', country_id: 1 },
  { id: 2, name: 'Ayutthaya', country_id: 1 },
  { id: 3, name: 'Bangkok', country_id: 1 },
  { id: 4, name: 'Chiang Mai', country_id: 1 },
  { id: 5, name: 'Chiang Rai', country_id: 1 },
  { id: 6, name: 'Hat Yai', country_id: 1 },
  { id: 7, name: 'Hua Hin', country_id: 1 },
  { id: 8, name: 'Kanchanaburi', country_id: 1 },
  { id: 9, name: 'Khao Lak', country_id: 1 },
  { id: 10, name: 'Koh Chang', country_id: 1 },
  { id: 11, name: 'Koh Kood', country_id: 1 },
  { id: 12, name: 'Koh Lanta', country_id: 1 },
  { id: 13, name: 'Koh Lipe', country_id: 1 },
  { id: 14, name: 'Koh Phangan', country_id: 1 },
  { id: 15, name: 'Koh Samui', country_id: 1 },
  { id: 16, name: 'Koh Tao', country_id: 1 },
  { id: 17, name: 'Krabi', country_id: 1 },
  { id: 18, name: 'Mae Hong Son', country_id: 1 },
  { id: 19, name: 'Nan', country_id: 1 },
  { id: 20, name: 'Pai', country_id: 1 },
  { id: 21, name: 'Pattaya', country_id: 1 },
  { id: 22, name: 'Phi Phi Island', country_id: 1 },
  { id: 23, name: 'Phuket', country_id: 1 },
  { id: 24, name: 'Rayong', country_id: 1 },
  { id: 25, name: 'Satun', country_id: 1 },
  { id: 26, name: 'Lampang', country_id: 1 },
  { id: 27, name: 'Khao Kho', country_id: 1 },
  { id: 28, name: 'Phitsanulok', country_id: 1 },
  { id: 29, name: 'Koh Larn', country_id: 1 },
  { id: 34, name: 'Khao Sok', country_id: 1 },
  { id: 35, name: 'Khao Yai', country_id: 1 }
];

const defaultMarkups = [
  {
    id: 1,
    markup_group: 'Web',
    excursion_markup_unit: '%',
    excursion_markup: 25,
    tour_markup_unit: '%',
    tour_markup: 25,
    transfer_markup_unit: '%',
    transfer_markup: 25,
    hotel_markup_unit: 'flat rate',
    hotel_markup_value: 5000,
    currency_id: 1
  },
  {
    id: 2,
    markup_group: 'TO Silver',
    excursion_markup_unit: 'flat rate',
    excursion_markup: 300,
    tour_markup_unit: 'flat rate',
    tour_markup: 1500,
    transfer_markup_unit: 'flat rate',
    transfer_markup: 200,
    hotel_markup_unit: 'flat rate',
    hotel_markup_value: 0,
    currency_id: 1
  },
  {
    id: 3,
    markup_group: 'TO Gold',
    excursion_markup_unit: 'flat rate',
    excursion_markup: 200,
    tour_markup_unit: 'flat rate',
    tour_markup: 1000,
    transfer_markup_unit: 'flat rate',
    transfer_markup: 150,
    hotel_markup_unit: 'flat rate',
    hotel_markup_value: 500,
    currency_id: 1
  },
  {
    id: 5,
    markup_group: 'Local Agent',
    excursion_markup_unit: '%',
    excursion_markup: 10,
    tour_markup_unit: '%',
    tour_markup: 10,
    transfer_markup_unit: '%',
    transfer_markup: 10,
    hotel_markup_unit: 'flat rate',
    hotel_markup_value: 0,
    currency_id: 1
  },
  {
    id: 6,
    markup_group: 'Travel Agent',
    excursion_markup_unit: 'flat rate',
    excursion_markup: 15,
    tour_markup_unit: 'flat rate',
    tour_markup: 15,
    transfer_markup_unit: 'flat rate',
    transfer_markup: 15,
    hotel_markup_unit: '%',
    hotel_markup_value: 0,
    currency_id: 1
  }
];

async function main() {
  console.log('🚀 Starting clean database reset and seed...');

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Connected to PostgreSQL database.');

  try {
    console.log('🧹 Clearing operational, inventory, booking, and transaction data...');

    const tablesToTruncate = [
      'operation_assignment_history',
      'operation_assignments',
      'operation_guides',
      'tax_invoice_documents',
      'service_documents',
      'check_invoice_records',
      'invoice_items',
      'invoices',
      'special_package_stop_sales',
      'special_package_items',
      'special_packages',
      'special_promos',
      'tour_trip_item_hotels',
      'tour_details',
      'tour_days',
      'tour_services',
      'tour_stop_sales',
      'tour_pricing',
      'tour_trip_items',
      'tours',
      'hotel_trip_items',
      'hotel_room_type_items',
      'hotel_promotions',
      'hotel_markup_percentages',
      'hotel_fees',
      'hotel_contacts',
      'stop_sales',
      'room_types',
      'hotels',
      'excursion_stop_sales',
      'excursion_pricing',
      'excursion_trip_items',
      'excursions',
      'transfer_pricing',
      'transfer_trip_items',
      'transfers',
      'flight_trip_items',
      'other_trip_items',
      'others',
      'travel_checklists',
      'trips',
      'suppliers',
      'notifications',
      'workflow_email_log',
      'city_info'
    ];

    for (const table of tablesToTruncate) {
      try {
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (err) {
        console.warn(`⚠️ Warning truncating ${table}:`, err.message);
      }
    }
    console.log('✅ All inventory, tour, excursion, transfer, hotel, special package, and trip tables cleared.');

    // Clean up non-default users and profiles
    console.log('👤 Cleaning up non-default users (preserving "beppe")...');
    
    // First, delete user profiles for users other than beppe
    await client.query(`
      DELETE FROM user_profiles 
      WHERE user_id NOT IN (SELECT id FROM users WHERE username = 'beppe')
    `);

    // Delete users other than beppe
    await client.query(`
      DELETE FROM users 
      WHERE username != 'beppe'
    `);

    // Delete non-default agents (keep agent 1)
    console.log('🏢 Cleaning up non-default agents (preserving default agent ID 1)...');
    await client.query(`
      DELETE FROM agents 
      WHERE id != 1
    `);

    // Reset sequences for clean future IDs where appropriate
    const tablesToResetSeq = [
      'hotels',
      'transfers',
      'excursions',
      'tours',
      'special_packages',
      'trips',
      'invoices',
      'suppliers'
    ];
    for (const tbl of tablesToResetSeq) {
      try {
        await client.query(`SELECT setval(pg_get_serial_sequence('"${tbl}"', 'id'), 1, false)`);
      } catch (e) {
        // Sequence may not exist or may have different name
      }
    }

  } finally {
    await client.end();
  }

  // Use Prisma client to seed/upsert baseline data
  console.log('🌱 Seeding baseline lookup and master configuration data...');

  // 1. Organization
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'vera-thailandia' },
    update: {
      name: 'Vera Thailandia',
      domain: 'verathailandia.com',
      subdomain: 'vera'
    },
    create: {
      name: 'Vera Thailandia',
      slug: 'vera-thailandia',
      domain: 'verathailandia.com',
      subdomain: 'vera',
      settings: {}
    }
  });
  console.log(`✅ Default Organization: ${defaultOrg.name} (ID: ${defaultOrg.id})`);

  // 2. Default Agent 1
  const defaultAgent = await prisma.agent.upsert({
    where: { id: 1 },
    update: {
      name: 'Vera Thailandia Online',
      markupGroup: 'Web',
      address: 'Life condo Sathorn soi 10',
      email: 'reservation@verathailandia.com',
      telephone: '026353551',
      fax: '026353550',
      paymentDeadlineType: 'eom',
      paymentDeadlineDays: 0
    },
    create: {
      id: 1,
      name: 'Vera Thailandia Online',
      markupGroup: 'Web',
      address: 'Life condo Sathorn soi 10',
      email: 'reservation@verathailandia.com',
      telephone: '026353551',
      fax: '026353550',
      paymentDeadlineType: 'eom',
      paymentDeadlineDays: 0
    }
  });
  console.log(`✅ Default Agent: ${defaultAgent.name} (ID: ${defaultAgent.id})`);

  // 3. Countries
  for (const c of defaultCountries) {
    await prisma.countries.upsert({
      where: { id: c.id },
      update: { name: c.name, code: c.code },
      create: { id: c.id, name: c.name, code: c.code }
    });
  }
  console.log(`✅ Seeded ${defaultCountries.length} countries.`);

  // 4. Currencies
  for (const curr of defaultCurrencies) {
    await prisma.currencies.upsert({
      where: { id: curr.id },
      update: { city: curr.city, currency_code: curr.currency_code, currency_name: curr.currency_name },
      create: { id: curr.id, city: curr.city, currency_code: curr.currency_code, currency_name: curr.currency_name }
    });
  }
  console.log(`✅ Seeded ${defaultCurrencies.length} currencies.`);

  // 5. Cities
  for (const ct of defaultCities) {
    await prisma.cities.upsert({
      where: { id: ct.id },
      update: { name: ct.name, country_id: ct.country_id },
      create: { id: ct.id, name: ct.name, country_id: ct.country_id }
    });
  }
  console.log(`✅ Seeded ${defaultCities.length} cities.`);

  // 6. Markups
  for (const m of defaultMarkups) {
    await prisma.markups.upsert({
      where: { id: m.id },
      update: {
        markup_group: m.markup_group,
        excursion_markup_unit: m.excursion_markup_unit,
        excursion_markup: m.excursion_markup,
        tour_markup_unit: m.tour_markup_unit,
        tour_markup: m.tour_markup,
        transfer_markup_unit: m.transfer_markup_unit,
        transfer_markup: m.transfer_markup,
        hotel_markup_unit: m.hotel_markup_unit,
        hotel_markup_value: m.hotel_markup_value,
        currency_id: m.currency_id
      },
      create: {
        id: m.id,
        markup_group: m.markup_group,
        excursion_markup_unit: m.excursion_markup_unit,
        excursion_markup: m.excursion_markup,
        tour_markup_unit: m.tour_markup_unit,
        tour_markup: m.tour_markup,
        transfer_markup_unit: m.transfer_markup_unit,
        transfer_markup: m.transfer_markup,
        hotel_markup_unit: m.hotel_markup_unit,
        hotel_markup_value: m.hotel_markup_value,
        currency_id: m.currency_id
      }
    });
  }
  console.log(`✅ Seeded ${defaultMarkups.length} markups.`);

  // 7. Default Admin Account 'beppe'
  console.log('👤 Configuring default admin account: beppe...');

  const fullPermissions = JSON.stringify({
    tours: true,
    hotels: true,
    transfers: true,
    excursions: true,
    bookings: true,
    special_packages: true,
    activities: true,
    suppliers: true,
    agents: true,
    markups: true,
    city_info: true,
    users: true,
    analytics: true,
    proforma_invoices: true,
    tax_invoices: true
  });

  const existingBeppe = await prisma.user.findFirst({
    where: { username: 'beppe' }
  });

  let passwordHash = '$2a$10$wCbTLhwgZtlbd.nno75n7OrjxauARLWiS6ah7iajSwguEse58xOh.';
  if (process.env.SEED_ADMIN_PASSWORD) {
    passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 10);
  } else if (existingBeppe?.password) {
    passwordHash = existingBeppe.password;
  }

  const beppeUser = await prisma.user.upsert({
    where: { username: 'beppe' },
    update: {
      email: 'reservation@verathailandia.com',
      role: 'admin',
      userType: 'admin',
      agentId: 1,
      isSuperAdmin: true,
      isPrimaryAdmin: true,
      canCreateUsers: true,
      canViewAnalytics: true,
      organizationId: defaultOrg.id,
      permissions: fullPermissions
    },
    create: {
      username: 'beppe',
      email: 'reservation@verathailandia.com',
      role: 'admin',
      userType: 'admin',
      password: passwordHash,
      agentId: 1,
      isSuperAdmin: true,
      isPrimaryAdmin: true,
      canCreateUsers: true,
      canViewAnalytics: true,
      organizationId: defaultOrg.id,
      permissions: fullPermissions
    }
  });

  // UserProfile for beppe
  await prisma.userProfile.upsert({
    where: { userId: beppeUser.id },
    update: {
      userType: 'admin',
      role: 'admin',
      companyName: 'Verathailandia Travel',
      companyEmail: 'reservation@verathailandia.com',
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      isPrimaryProfile: true,
      organizationId: defaultOrg.id,
      primaryCurrency: 'THB',
      country: 'Thailand',
      featureFlags: {
        export: true,
        api_access: true,
        white_label: true,
        integrations: true,
        custom_reports: true,
        priority_support: true
      },
      usageLimits: {
        users: -1,
        agents: -1,
        exports: -1,
        bookings: -1,
        api_calls: -1,
        quotations: -1,
        storage_mb: -1,
        integrations: -1
      }
    },
    create: {
      userId: beppeUser.id,
      userType: 'admin',
      role: 'admin',
      companyName: 'Verathailandia Travel',
      companyEmail: 'reservation@verathailandia.com',
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      isPrimaryProfile: true,
      organizationId: defaultOrg.id,
      primaryCurrency: 'THB',
      country: 'Thailand',
      featureFlags: {
        export: true,
        api_access: true,
        white_label: true,
        integrations: true,
        custom_reports: true,
        priority_support: true
      },
      usageLimits: {
        users: -1,
        agents: -1,
        exports: -1,
        bookings: -1,
        api_calls: -1,
        quotations: -1,
        storage_mb: -1,
        integrations: -1
      }
    }
  });

  console.log(`✅ Default admin account 'beppe' configured successfully (User ID: ${beppeUser.id}).`);
  console.log('✨ Clean database reset and seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
