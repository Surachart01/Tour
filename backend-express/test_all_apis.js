import { getTransfers } from './src/controllers/transferController.js';
import { getExcursions } from './src/controllers/excursionController.js';
import { getAllTours } from './src/controllers/tourController.js';

// Mock request and response
const req = {
  query: {},
  user: {
    role: 'agent',
    markup_group: 'TO Gold'
  }
};

const res = {
  json: (data) => {
    console.log('Success! Count:', data.length);
  },
  status: (code) => ({
    send: (msg) => {
      console.log(`Status ${code}: ${msg}`);
    }
  })
};

try {
  console.log('Testing getTransfers...');
  await getTransfers(req, res, (err) => console.error('Transfers error:', err));
  
  console.log('Testing getExcursions...');
  await getExcursions(req, res, (err) => console.error('Excursions error:', err));
  
  console.log('Testing getAllTours...');
  await getAllTours(req, res, (err) => console.error('Tours error:', err));
} catch (e) {
  console.error('Outer catch error:', e);
}
