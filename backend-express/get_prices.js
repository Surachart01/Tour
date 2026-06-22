import jwt from 'jsonwebtoken';

const JWT_SECRET = 'WheelsApartSecretTokenKeyVerySecure32!';
const PORT = 8081;
const Endpoint = `http://localhost:${PORT}`;

async function main() {
  try {
    const userPayload = {
      user_id: 32,
      username: 'niran1116',
      role: 'agent',
      userType: 'agent',
      organization_id: 1,
      markup_group: 'TO Gold' // niran1116's actual markup group in DB
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    console.log('Fetching transfers...');
    const transRes = await fetch(`${Endpoint}/api/v1/transfers`, { headers });
    if (transRes.ok) {
      const transfers = await transRes.json();
      console.log(`Loaded ${transfers.length} transfers.`);
      const sampleTrans = transfers.find(t => t.sic_price_adult > 0 || (t.prices && t.prices.length > 0));
      if (sampleTrans) {
        console.log(`Sample Transfer ID ${sampleTrans.id}: ${sampleTrans.transfer_type}`);
        console.log(`  SIC Price Adult: ${sampleTrans.sic_price_adult}`);
        console.log(`  SIC Price Child: ${sampleTrans.sic_price_child}`);
        console.log(`  Prices Table (first 3):`, sampleTrans.prices.slice(0, 3));
      }
    }

    console.log('\nFetching excursions...');
    const excRes = await fetch(`${Endpoint}/api/v1/excursions`, { headers });
    if (excRes.ok) {
      const excursions = await excRes.json();
      console.log(`Loaded ${excursions.length} excursions.`);
      const sampleExc = excursions.find(e => e.sic_price_adult > 0 || (e.prices && e.prices.length > 0));
      if (sampleExc) {
        console.log(`Sample Excursion ID ${sampleExc.id}: ${sampleExc.name}`);
        console.log(`  SIC Price Adult: ${sampleExc.sic_price_adult}`);
        console.log(`  SIC Price Child: ${sampleExc.sic_price_child}`);
        console.log(`  Prices Table (first 3):`, sampleExc.prices.slice(0, 3));
      }
    }
  } catch (error) {
    console.error(error);
  }
}

main();
