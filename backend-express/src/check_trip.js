import prisma from './config/db.js';
import { getQuotation } from './controllers/tripController.js';

async function main() {
  const req = { params: { id: "60" } };
  const res = {
    json: (data) => {
      console.log("TRIP 60 DATA:");
      console.log(JSON.stringify(data, null, 2));
    },
    status: (code) => {
      console.log("STATUS:", code);
      return res;
    },
    send: (msg) => {
      console.log("SEND:", msg);
    }
  };
  await getQuotation(req, res, (err) => console.error(err));
}
main().then(() => prisma.$disconnect());
