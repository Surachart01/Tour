import prisma from './src/config/db.js';
import { calculateExcursionCostLogic } from './src/utils/pricing.js';

async function check() {
  try {
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true }
    });

    // Get the Koh Tao excursion
    const excursion = await prisma.excursions.findFirst({
      where: { name: { contains: 'Koh Tao', mode: 'insensitive' } },
      include: { excursion_pricing: true }
    });

    console.log('Excursion:', excursion?.id, excursion?.name.trim());
    console.log('SIC adult price:', excursion?.sic_price_adult, '| SIC child price:', excursion?.sic_price_child);
    console.log('PVT pricing entries:');
    excursion?.excursion_pricing.forEach(p => {
      console.log(`  id=${p.id} pax=${p.pax} price=${p.price} from=${p.start_date.toISOString().slice(0,10)} to=${p.end_date.toISOString().slice(0,10)}`);
    });

    const markupGroup = 'Web'; // niran1116's markup group

    // Test SIC with 2 adults
    const sicRequest = {
      excursion_id: excursion?.id,
      toe: 'SIC',
      travel_date: '2026-05-21',
      number_of_adults: 2,
      number_of_kids: 0,
    };
    try {
      const cost = calculateExcursionCostLogic(excursion, sicRequest, markupGroup, markups);
      console.log('\n✅ SIC price (2 adults, Web markup):', cost);
    } catch (e) {
      console.error('\n❌ SIC error:', e.message);
    }

    // Test PVT with 1 adult (the only available pax tier)
    const pvt1Request = {
      excursion_id: excursion?.id,
      toe: 'PVT',
      travel_date: '2026-05-21',
      number_of_adults: 1,
      number_of_kids: 0,
    };
    try {
      const cost = calculateExcursionCostLogic(excursion, pvt1Request, markupGroup, markups);
      console.log('✅ PVT price (1 adult, Web markup):', cost, '(base per person:', excursion?.excursion_pricing[0]?.price, ')');
    } catch (e) {
      console.error('❌ PVT (1 adult) error:', e.message);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
