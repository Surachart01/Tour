import prisma from '../config/db.js';

export async function getInvoice(req, res, next) {
  try {
    const tripId = parseInt(req.params.tripId);
    if (isNaN(tripId)) return res.status(400).send('Invalid trip ID');
    const invoice = await prisma.invoices.findUnique({
      where: { trip_id: tripId },
      include: { invoice_items: true }
    });
    if (!invoice) return res.status(404).send('Invoice not found');
    return res.json(invoice);
  } catch (err) { next(err); }
}

export async function createInvoice(req, res, next) {
  try {
    const data = req.body;
    const invoice = await prisma.invoices.create({
      data: {
        trip_id: data.trip_id, total_cost: data.total_cost,
        invoice_items: data.items ? {
          create: data.items.map(i => ({
            name: i.name, time: i.time, description: i.description,
            location: i.location, cost: i.cost, discount: i.discount || 0,
            price: i.price, tax: i.tax || 0
          }))
        } : undefined
      },
      include: { invoice_items: true }
    });
    return res.status(201).json(invoice);
  } catch (err) { next(err); }
}
