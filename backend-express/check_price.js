import prisma from './src/config/db.js';
import { calculateTransferCostLogic } from './src/utils/pricing.js';

async function check() {
  try {
    // 1. Get transfer
    const transfer = await prisma.transfers.findUnique({
      where: { id: 32 },
      include: { transfer_pricing: true }
    });
    console.log('Transfer:', JSON.stringify(transfer, null, 2));

    // 2. Get markups
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });
    console.log('Markups count:', markups.length);

    // 3. Test calculation with various markup groups
    const request = {
      transfer_id: 32,
      city: 'Bangkok',
      tot: 'PVT',
      travel_date: '2026-06-14',
      number_of_adults: 1,
      number_of_kids: 0
    };

    console.log('\n--- PVT 1 Adult ---');
    for (const m of markups) {
      try {
        const cost = calculateTransferCostLogic(transfer, request, m.markup_group, markups);
        console.log(`Markup Group [${m.markup_group}]:`, cost);
      } catch (err) {
        console.log(`Markup Group [${m.markup_group}] Error:`, err.message);
      }
    }

    // Try without login/agent name (default 'TO Bronze')
    try {
      const cost = calculateTransferCostLogic(transfer, request, 'TO Bronze', markups);
      console.log('Markup Group [TO Bronze] (Default):', cost);
    } catch (err) {
      console.log('Markup Group [TO Bronze] Error:', err.message);
    }

    // Test with 2 Adults
    const request2 = { ...request, number_of_adults: 2 };
    console.log('\n--- PVT 2 Adults ---');
    for (const m of markups) {
      try {
        const cost = calculateTransferCostLogic(transfer, request2, m.markup_group, markups);
        console.log(`Markup Group [${m.markup_group}]:`, cost);
      } catch (err) {
        console.log(`Markup Group [${m.markup_group}] Error:`, err.message);
      }
    }

    // 4. Let's check existing trip 60 or similar recent trips
    const trip = await prisma.trips.findFirst({
      where: { client_name: 'Santo' }
    });
    if (trip) {
      console.log('\nTrip info for Santo:', JSON.stringify(trip, null, 2));
      // check agent
      const agent = await prisma.agent.findUnique({
        where: { id: trip.agent_id }
      });
      console.log('Agent:', JSON.stringify(agent, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
