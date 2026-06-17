import prisma from '../config/db.js';

export async function updateStopSaleStatus(req, res, next) {
  try {
    const data = req.body;
    if (data.id) {
      const stopSale = await prisma.stop_sales.update({
        where: { id: data.id },
        data: { stopped: data.stopped }
      });
      return res.json(stopSale);
    }
    // Create new stop sale
    const stopSale = await prisma.stop_sales.create({
      data: {
        hotel_id: data.hotel_id, room_type_id: data.room_type_id,
        start_date: new Date(data.start_date), end_date: new Date(data.end_date),
        stopped: data.stopped !== undefined ? data.stopped : true
      }
    });
    return res.json(stopSale);
  } catch (err) { next(err); }
}

export async function getAvailableDatesForHotel(req, res, next) {
  try {
    const hotelId = parseInt(req.params.hotel_id);
    if (isNaN(hotelId)) return res.status(400).send('Invalid hotel ID');
    const stopSales = await prisma.stop_sales.findMany({
      where: { hotel_id: hotelId, deleted_at: null },
      include: { room_types: true }
    });
    return res.json(stopSales);
  } catch (err) { next(err); }
}
