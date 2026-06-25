import prisma from './src/config/db.js';
import { calculateTourCostLogic } from './src/utils/pricing.js';

async function check() {
  try {
    // 1. Get tour
    const tour = await prisma.tours.findUnique({
      where: { id: 16 },
      include: { tour_pricing: true }
    });
    console.log('Tour 16:', JSON.stringify(tour, null, 2));

    // 2. Get markups
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });
    console.log('Markups count:', markups.length);
    console.log('Markups details:', JSON.stringify(markups, null, 2));

    // 3. Test calculation with various markup groups
    const request = {
      tour_id: 16,
      travel_date: '2026-07-01',
      single_rooms: 0,
      double_rooms: 1,
      triple_rooms: 0,
      number_of_adults: 2,
      number_of_kids: 0,
      tot: 'SIC'
    };

    console.log('\n--- Tour Calculation ---');
    for (const m of markups) {
      try {
        const cost = calculateTourCostLogic(tour, request, m.markup_group, markups);
        console.log(`Markup Group [${m.markup_group}]:`, cost);
      } catch (err) {
        console.log(`Markup Group [${m.markup_group}] Error:`, err.message);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
