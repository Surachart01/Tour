import prisma from './config/db.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting comprehensive database seeding for production...');

  // 1. Seed Currencies
  console.log('1️⃣ Seeding Currencies...');
  const defaultCities = [
    { city: 'Bangkok', code: 'THB', name: 'Thai Baht' },
    { city: 'Phuket', code: 'THB', name: 'Thai Baht' },
    { city: 'Chiang Mai', code: 'THB', name: 'Thai Baht' },
    { city: 'Koh Tao', code: 'THB', name: 'Thai Baht' },
    { city: 'Krabi', code: 'THB', name: 'Thai Baht' },
    { city: 'Koh Kood', code: 'THB', name: 'Thai Baht' },
    { city: 'Koh Samui', code: 'THB', name: 'Thai Baht' },
    { city: 'Ayutthaya', code: 'THB', name: 'Thai Baht' },
    { city: 'Pattaya', code: 'THB', name: 'Thai Baht' },
    { city: 'Koh Phangan', code: 'THB', name: 'Thai Baht' },
    { city: 'Kanchanaburi', code: 'THB', name: 'Thai Baht' },
    { city: 'Chiang Saen', code: 'THB', name: 'Thai Baht' },
    { city: 'Hua Hin', code: 'THB', name: 'Thai Baht' },
    { city: 'Koh Samed', code: 'THB', name: 'Thai Baht' },
    { city: 'Koh Chang', code: 'THB', name: 'Thai Baht' },
    { city: 'Amphawa', code: 'THB', name: 'Thai Baht' },
    { city: 'Phi Phi Island', code: 'THB', name: 'Thai Baht' },
    { city: 'Koh Yao Noi', code: 'THB', name: 'Thai Baht' },
    { city: 'Koh Lipe', code: 'THB', name: 'Thai Baht' },
    { city: 'Rayong', code: 'THB', name: 'Thai Baht' },
    { city: 'Khao Lak', code: 'THB', name: 'Thai Baht' },
    { city: 'Koh Lanta', code: 'THB', name: 'Thai Baht' },
    { city: 'Chiang Rai', code: 'THB', name: 'Thai Baht' },
    { city: 'Pai', code: 'THB', name: 'Thai Baht' },
    { city: 'Ubon Ratchathani', code: 'THB', name: 'Thai Baht' },
    { city: 'Surin', code: 'THB', name: 'Thai Baht' },
    { city: 'Koh Kradan', code: 'THB', name: 'Thai Baht' },
    { city: 'Khao Yai', code: 'THB', name: 'Thai Baht' },
    { city: 'Mae Hong Son', code: 'THB', name: 'Thai Baht' }
  ];

  for (const c of defaultCities) {
    await prisma.currencies.upsert({
      where: { city: c.city },
      update: {
        currency_code: c.code,
        currency_name: c.name
      },
      create: {
        city: c.city,
        currency_code: c.code,
        currency_name: c.name
      }
    });
  }
  console.log('✅ Currencies seeded.');

  // Find Bangkok currency to link markups and others
  const bangkokCurrency = await prisma.currencies.findUnique({
    where: { city: 'Bangkok' }
  });
  const fallbackCurrencyId = bangkokCurrency ? bangkokCurrency.id : 1;

  // 2. Seed Markups
  console.log('2️⃣ Seeding Markups...');
  const defaultMarkups = [
    { group: 'Web', excUnit: '%', excVal: 25.0, tourUnit: '%', tourVal: 25.0, transUnit: '%', transVal: 25.0 },
    { group: 'TO Silver', excUnit: 'flat rate', excVal: 200.0, tourUnit: 'flat rate', tourVal: 1500.0, transUnit: 'flat rate', transVal: 200.0 },
    { group: 'TO Gold', excUnit: 'flat rate', excVal: 300.0, tourUnit: 'flat rate', tourVal: 2000.0, transUnit: 'flat rate', transVal: 300.0 },
    { group: 'TO Bronze', excUnit: 'flat rate', excVal: 100.0, tourUnit: 'flat rate', tourVal: 1000.0, transUnit: 'flat rate', transVal: 100.0 },
    { group: 'Local Agent', excUnit: '%', excVal: 10.0, tourUnit: '%', tourVal: 10.0, transUnit: '%', transVal: 10.0 },
    { group: 'Travel Agent', excUnit: '%', excVal: 15.0, tourUnit: '%', tourVal: 15.0, transUnit: '%', transVal: 15.0 }
  ];

  for (const m of defaultMarkups) {
    await prisma.markups.upsert({
      where: { markup_group: m.group },
      update: {
        excursion_markup_unit: m.excUnit,
        excursion_markup: m.excVal,
        tour_markup_unit: m.tourUnit,
        tour_markup: m.tourVal,
        transfer_markup_unit: m.transUnit,
        transfer_markup: m.transVal,
        currency_id: fallbackCurrencyId
      },
      create: {
        markup_group: m.group,
        excursion_markup_unit: m.excUnit,
        excursion_markup: m.excVal,
        tour_markup_unit: m.tourUnit,
        tour_markup: m.tourVal,
        transfer_markup_unit: m.transUnit,
        transfer_markup: m.transVal,
        currency_id: fallbackCurrencyId
      }
    });
  }
  console.log('✅ Markups seeded.');

  // 3. Seed Organizations
  console.log('3️⃣ Seeding Organizations...');
  const orgVera = await prisma.organization.upsert({
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

  const orgWA = await prisma.organization.upsert({
    where: { slug: 'wheelsapart' },
    update: {},
    create: {
      name: 'WheelsApart',
      slug: 'wheelsapart',
      domain: 'wheelsapart.com',
      subdomain: 'wa',
      settings: {}
    }
  });
  console.log('✅ Organizations seeded.');

  // 4. Seed Agents
  console.log('4️⃣ Seeding Agents...');
  const agentVera = await prisma.agent.upsert({
    where: { id: 1 },
    update: {
      name: 'Vera Thailandia Online',
      email: 'beppe@verathailandia.com',
      markupGroup: 'Web',
      address: 'Life condo Sathorn soi 10',
      telephone: '026353551',
      fax: '026353550',
      enableAssistanceFee: true,
      defaultAssistanceFee: 1000.0
    },
    create: {
      id: 1,
      name: 'Vera Thailandia Online',
      email: 'beppe@verathailandia.com',
      markupGroup: 'Web',
      address: 'Life condo Sathorn soi 10',
      telephone: '026353551',
      fax: '026353550',
      enableAssistanceFee: true,
      defaultAssistanceFee: 1000.0
    }
  });

  const agentWA = await prisma.agent.upsert({
    where: { name: 'WheelsApart Partner' },
    update: {
      email: 'partner@wheelsapart.com',
      markupGroup: 'TO Gold',
      address: 'Sukumvit Road, Bangkok',
      telephone: '021234567',
      enableAssistanceFee: false
    },
    create: {
      name: 'WheelsApart Partner',
      email: 'partner@wheelsapart.com',
      markupGroup: 'TO Gold',
      address: 'Sukumvit Road, Bangkok',
      telephone: '021234567',
      enableAssistanceFee: false
    }
  });

  const agentPhuket = await prisma.agent.upsert({
    where: { name: 'Phuket Adventure Travel' },
    update: {
      email: 'info@phuketadventure.com',
      markupGroup: 'TO Silver',
      address: 'Patong Beach, Phuket',
      telephone: '076123456',
      enableAssistanceFee: true,
      defaultAssistanceFee: 500.0
    },
    create: {
      name: 'Phuket Adventure Travel',
      email: 'info@phuketadventure.com',
      markupGroup: 'TO Silver',
      address: 'Patong Beach, Phuket',
      telephone: '076123456',
      enableAssistanceFee: true,
      defaultAssistanceFee: 500.0
    }
  });
  console.log('✅ Agents seeded.');

  // 5. Seed Users & Profiles (Hashed Passwords)
  console.log('5️⃣ Seeding Users & Profiles...');
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const agentPasswordHash = bcrypt.hashSync('agent123', 10);

  // Superadmin
  const superadmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {
      email: 'admin@gmail.com',
      role: 'superadmin',
      userType: 'superadmin',
      password: adminPasswordHash,
      isSuperAdmin: true,
      isPrimaryAdmin: false,
      canCreateUsers: true,
      canViewAnalytics: true,
      agentId: agentVera.id,
      organizationId: orgVera.id
    },
    create: {
      username: 'superadmin',
      email: 'admin@gmail.com',
      role: 'superadmin',
      userType: 'superadmin',
      password: adminPasswordHash,
      isSuperAdmin: true,
      isPrimaryAdmin: false,
      canCreateUsers: true,
      canViewAnalytics: true,
      agentId: agentVera.id,
      organizationId: orgVera.id
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: superadmin.id },
    update: {
      userType: 'superadmin',
      companyName: 'Vera Thailandia Online',
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      role: 'admin',
      isPrimaryProfile: true,
      organizationId: orgVera.id
    },
    create: {
      userId: superadmin.id,
      userType: 'superadmin',
      companyName: 'Vera Thailandia Online',
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      role: 'admin',
      isPrimaryProfile: true,
      organizationId: orgVera.id
    }
  });

  // Agent admin
  const agentadmin = await prisma.user.upsert({
    where: { username: 'agentadmin' },
    update: {
      email: 'agent@gmail.com',
      role: 'agent',
      userType: 'admin',
      password: agentPasswordHash,
      isSuperAdmin: false,
      isPrimaryAdmin: true,
      canCreateUsers: true,
      canViewAnalytics: true,
      agentId: agentVera.id,
      organizationId: orgVera.id
    },
    create: {
      username: 'agentadmin',
      email: 'agent@gmail.com',
      role: 'agent',
      userType: 'admin',
      password: agentPasswordHash,
      isSuperAdmin: false,
      isPrimaryAdmin: true,
      canCreateUsers: true,
      canViewAnalytics: true,
      agentId: agentVera.id,
      organizationId: orgVera.id
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: agentadmin.id },
    update: {
      userType: 'admin',
      companyName: 'Vera Thailandia Online',
      subscriptionTier: 'starter',
      subscriptionStatus: 'trial',
      role: 'admin',
      isPrimaryProfile: false,
      organizationId: orgVera.id
    },
    create: {
      userId: agentadmin.id,
      userType: 'admin',
      companyName: 'Vera Thailandia Online',
      subscriptionTier: 'starter',
      subscriptionStatus: 'trial',
      role: 'admin',
      isPrimaryProfile: false,
      organizationId: orgVera.id
    }
  });

  // Free agent
  const freeagent = await prisma.user.upsert({
    where: { username: 'freeagent' },
    update: {
      email: 'freeagent@gmail.com',
      role: 'user',
      userType: 'free_agent',
      password: agentPasswordHash,
      isSuperAdmin: false,
      isPrimaryAdmin: false,
      canCreateUsers: false,
      canViewAnalytics: false,
      agentId: agentVera.id,
      organizationId: orgVera.id
    },
    create: {
      username: 'freeagent',
      email: 'freeagent@gmail.com',
      role: 'user',
      userType: 'free_agent',
      password: agentPasswordHash,
      isSuperAdmin: false,
      isPrimaryAdmin: false,
      canCreateUsers: false,
      canViewAnalytics: false,
      agentId: agentVera.id,
      organizationId: orgVera.id
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: freeagent.id },
    update: {
      userType: 'free_agent',
      companyName: 'Vera Thailandia Online',
      subscriptionTier: 'starter',
      subscriptionStatus: 'trial',
      role: 'user',
      isPrimaryProfile: false,
      organizationId: orgVera.id
    },
    create: {
      userId: freeagent.id,
      userType: 'free_agent',
      companyName: 'Vera Thailandia Online',
      subscriptionTier: 'starter',
      subscriptionStatus: 'trial',
      role: 'user',
      isPrimaryProfile: false,
      organizationId: orgVera.id
    }
  });
  console.log('✅ Users and profiles seeded.');

  // 6. Clean up transactional & master data to prevent constraints and duplicate entries on multiple runs
  console.log('6️⃣ Cleaning up master/transactional tables...');
  await prisma.stop_sales.deleteMany({});
  await prisma.hotel_room_type_items.deleteMany({});
  await prisma.hotel_trip_items.deleteMany({});
  await prisma.transfer_trip_items.deleteMany({});
  await prisma.excursion_trip_items.deleteMany({});
  await prisma.tour_trip_items.deleteMany({});
  await prisma.flight_trip_items.deleteMany({});
  await prisma.other_trip_items.deleteMany({});
  await prisma.invoice_items.deleteMany({});
  await prisma.invoices.deleteMany({});
  await prisma.trips.deleteMany({});
  await prisma.room_types.deleteMany({});
  await prisma.hotels.deleteMany({});
  await prisma.tour_pricing.deleteMany({});
  await prisma.tours.deleteMany({});
  await prisma.transfer_pricing.deleteMany({});
  await prisma.transfers.deleteMany({});
  await prisma.excursion_pricing.deleteMany({});
  await prisma.excursions.deleteMany({});
  await prisma.suppliers.deleteMany({});
  console.log('✅ Master/transactional tables cleaned.');

  // 7. Seed Suppliers
  console.log('7️⃣ Seeding Suppliers...');
  const suppliersData = [
    { name: 'Andaman Wave Master', description: 'Ferry and speedboat transfers in Andaman Sea', email: 'booking@andamanwave.com', telephone: '076345678', location: 'Phuket', offers_transfers: true, offers_excursions: true, offers_tours: false },
    { name: 'Sea Star Tour', description: 'Snorkeling trips and boat excursions', email: 'info@seastartour.com', telephone: '076219876', location: 'Phuket', offers_transfers: false, offers_excursions: true, offers_tours: true },
    { name: 'Asia Aviation', description: 'Domestic flights and airport private transfers', email: 'charter@asiaaviation.com', telephone: '021054321', location: 'Bangkok', offers_transfers: true, offers_excursions: false, offers_tours: false },
    { name: 'Thai Scenic Tours', description: 'Guided city tours and cultural experiences', email: 'guide@thaiscenictours.com', telephone: '028887766', location: 'Bangkok', offers_transfers: false, offers_excursions: true, offers_tours: true }
  ];

  for (const s of suppliersData) {
    await prisma.suppliers.create({
      data: s
    });
  }
  console.log('✅ Suppliers seeded.');

  // Find destination currencies
  const bkkCurrency = await prisma.currencies.findFirst({ where: { city: 'Bangkok' } });
  const pktCurrency = await prisma.currencies.findFirst({ where: { city: 'Phuket' } });
  const bkkCurrId = bkkCurrency ? bkkCurrency.id : fallbackCurrencyId;
  const pktCurrId = pktCurrency ? pktCurrency.id : fallbackCurrencyId;

  // 8. Seed Hotels and Room Types
  console.log('8️⃣ Seeding Hotels & Room Types...');
  
  // Banyan Tree Bangkok
  const hotelBanyan = await prisma.hotels.create({
    data: {
      name: 'Banyan Tree Bangkok',
      city: 'Bangkok',
      address: '21/100 South Sathon Road, Sathon, Bangkok 10120',
      notes: 'Luxury hotel in the heart of Sathon. Famous for Vertigo Rooftop Bar.',
      room_types: {
        create: [
          {
            name: 'Oasis Retreat',
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            allotment: 10,
            single_price: 4500.0,
            double_price: 5000.0,
            extra_bed_adult: 1500.0,
            extra_bed_child: 750.0,
            food_adult_abf: 600.0,
            food_child_abf: 300.0,
            currency_id: bkkCurrId
          },
          {
            name: 'Serenity Club',
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            allotment: 5,
            single_price: 7000.0,
            double_price: 7500.0,
            extra_bed_adult: 2000.0,
            extra_bed_child: 1000.0,
            food_adult_abf: 800.0,
            food_child_abf: 400.0,
            currency_id: bkkCurrId
          }
        ]
      }
    }
  });

  // The Slate Phuket
  const hotelSlate = await prisma.hotels.create({
    data: {
      name: 'The Slate Phuket',
      city: 'Phuket',
      address: '116 Moo 1, Sakhu, Thalang, Phuket 83110',
      notes: 'Industrial chic design resort by Bill Bensley next to Nai Yang Beach.',
      room_types: {
        create: [
          {
            name: 'D-Buk Suite',
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            allotment: 8,
            single_price: 6000.0,
            double_price: 6500.0,
            extra_bed_adult: 1800.0,
            extra_bed_child: 900.0,
            food_adult_abf: 700.0,
            food_child_abf: 350.0,
            currency_id: pktCurrId
          },
          {
            name: 'Pearl Bed Suite',
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            allotment: 8,
            single_price: 7500.0,
            double_price: 8000.0,
            extra_bed_adult: 1800.0,
            extra_bed_child: 900.0,
            food_adult_abf: 700.0,
            food_child_abf: 350.0,
            currency_id: pktCurrId
          }
        ]
      }
    }
  });
  console.log('✅ Hotels & Room Types seeded.');

  // 9. Seed Tours and pricing
  console.log('9️⃣ Seeding Tours & Tour Pricing...');
  const tourBkk = await prisma.tours.create({
    data: {
      name: 'Bangkok Cultural Heritage',
      code: 'BKK-CUL-01',
      category: 'Standard',
      description: 'A full-day guided tour of Grand Palace, Wat Pho, and Wat Arun including lunch.',
      duration: 1,
      departures: 'PVT',
      tour_pricing: {
        create: [
          {
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            single_room_price: 1500.0,
            double_room_price: 1200.0,
            triple_room_price: 1000.0,
            currency_id: bkkCurrId
          }
        ]
      }
    }
  });

  const tourPhuket = await prisma.tours.create({
    data: {
      name: 'Phuket Island Explorer',
      code: 'HKT-EXP-03',
      category: 'Superior',
      description: '3-Day tour exploring Old Phuket Town, Big Buddha, Phromthep Cape and Kata Viewpoint.',
      duration: 3,
      departures: 'SIC',
      tour_pricing: {
        create: [
          {
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            single_room_price: 4500.0,
            double_room_price: 3800.0,
            triple_room_price: 3500.0,
            currency_id: pktCurrId
          }
        ]
      }
    }
  });
  console.log('✅ Tours seeded.');

  // 10. Seed Transfers & pricing
  console.log('🔟 Seeding Transfers & Transfer Pricing...');
  const transferBkk = await prisma.transfers.create({
    data: {
      transfer_type: 'Private Car',
      city: 'Bangkok',
      description: 'Airport arrival transfer from Suvarnabhumi Airport to Bangkok Hotel by private sedan.',
      departure: 'Suvarnabhumi Airport',
      arrival: 'Bangkok Hotel',
      transfer_pricing: {
        create: [
          {
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            pax: 2,
            price: 1200.0,
            cost: 900.0,
            currency_id: bkkCurrId
          },
          {
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            pax: 4,
            price: 1600.0,
            cost: 1200.0,
            currency_id: bkkCurrId
          }
        ]
      }
    }
  });

  const transferPkt = await prisma.transfers.create({
    data: {
      transfer_type: 'Shared Shuttle',
      city: 'Phuket',
      description: 'Seat-in-coach transfer from Phuket International Airport to Patong hotels.',
      departure: 'Phuket Airport',
      arrival: 'Patong Hotel',
      transfer_pricing: {
        create: [
          {
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            pax: 1,
            price: 300.0,
            cost: 200.0,
            currency_id: pktCurrId
          }
        ]
      }
    }
  });
  console.log('✅ Transfers seeded.');

  // 11. Seed Excursions & pricing
  console.log('1️⃣1️⃣ Seeding Excursions & Excursion Pricing...');
  const excursionPkt = await prisma.excursions.create({
    data: {
      name: 'Phi Phi Island Speedboat Tour',
      city: 'Phuket',
      code: 'HKT-EXC-PP',
      is_sic_excursion: true,
      description: 'Full day snorkeling tour to Phi Phi Don, Phi Phi Leh and Bamboo Island by speedboat.',
      sic_price_adult: 1800.0,
      sic_price_child: 1200.0,
      walkin_price: 2500.0,
      currency_id: pktCurrId,
      excursion_pricing: {
        create: [
          {
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            pax: 1,
            price: 1800.0,
            cost: 1300.0,
            currency_id: pktCurrId
          }
        ]
      }
    }
  });

  const excursionBkk = await prisma.excursions.create({
    data: {
      name: 'Dinner Cruise on Chao Phraya River',
      city: 'Bangkok',
      code: 'BKK-EXC-CRUISE',
      is_sic_excursion: false,
      description: 'International buffet dinner cruise along the historic Chao Phraya River passing Wat Arun.',
      walkin_price: 1800.0,
      currency_id: bkkCurrId,
      excursion_pricing: {
        create: [
          {
            start_date: new Date('2026-01-01'),
            end_date: new Date('2026-12-31'),
            pax: 1,
            price: 1400.0,
            cost: 1000.0,
            currency_id: bkkCurrId
          }
        ]
      }
    }
  });
  console.log('✅ Excursions seeded.');

  // 12. Seed Stop Sales
  console.log('1️⃣2️⃣ Seeding Stop Sales...');
  const oasisRetreatRoom = await prisma.room_types.findFirst({
    where: { hotel_id: hotelBanyan.id, name: 'Oasis Retreat' }
  });
  if (oasisRetreatRoom) {
    const nextWeekStart = new Date();
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekEnd = new Date();
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 10);

    await prisma.stop_sales.create({
      data: {
        hotel_id: hotelBanyan.id,
        room_type_id: oasisRetreatRoom.id,
        start_date: nextWeekStart,
        end_date: nextWeekEnd,
        stopped: true
      }
    });
  }
  console.log('✅ Stop Sales seeded.');

  // 13. Seed a Sample Trip (Quotation/Booking)
  console.log('1️⃣3️⃣ Seeding Sample Trip...');
  const sampleTrip = await prisma.trips.create({
    data: {
      agent_id: agentVera.id,
      client_name: 'John Doe',
      client_phone: '+66999999999',
      number_of_adults: 2,
      number_of_kids: 0,
      booking_reference: 'QT-2026-0001',
      file_reference: 'FILE-VERA-001',
      remarks: 'Preferred room near elevator, non-smoking.',
      total_amount: 15000.0,
      discount_amount: 500.0,
      final_amount: 14500.0,
      approved: false,
      declined: false,
      hotel_trip_items: {
        create: [
          {
            hotel_id: hotelBanyan.id,
            hotel_name: hotelBanyan.name,
            city: hotelBanyan.city,
            room_type: 'Oasis Retreat',
            from_date: new Date('2026-07-01'),
            to_date: new Date('2026-07-03'),
            nights: 2,
            single_price: 4500.0,
            double_price: 5000.0,
            approved: true
          }
        ]
      },
      transfer_trip_items: {
        create: [
          {
            transfer_id: transferBkk.id,
            from_location: 'Suvarnabhumi Airport',
            to_location: 'Banyan Tree Bangkok',
            from_date: new Date('2026-07-01T10:00:00Z'),
            to_date: new Date('2026-07-01T11:00:00Z'),
            tot: 'PVT',
            price: 1200.0,
            approved: true,
            currency_id: bkkCurrId
          }
        ]
      },
      excursion_trip_items: {
        create: [
          {
            excursion_id: excursionBkk.id,
            city: 'Bangkok',
            toe: 'PVT',
            from_date: new Date('2026-07-02T18:00:00Z'),
            to_date: new Date('2026-07-02T21:00:00Z'),
            price: 1400.0,
            approved: true,
            currency_id: bkkCurrId
          }
        ]
      }
    }
  });
  console.log('✅ Sample Trip seeded.');

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
