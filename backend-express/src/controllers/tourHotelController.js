import prisma from '../config/db.js';

export async function getTourHotels(req, res, next) {
  try {
    const tourItemId = parseInt(req.params.tour_item_id);
    if (isNaN(tourItemId)) return res.status(400).send('Invalid tour item ID');
    const tourItem = await prisma.tour_trip_items.findUnique({
      where: { id: tourItemId },
      include: { tours: true }
    });
    if (!tourItem) return res.status(404).send('Tour trip item not found');
    return res.json({
      tour_trip_item_id: tourItemId, tour_id: tourItem.tour_id,
      tour_name: tourItem.tours?.name || '', has_overrides: false, hotels: []
    });
  } catch (err) { next(err); }
}

export async function updateTourHotels(req, res, next) {
  try {
    const tourItemId = parseInt(req.params.tour_item_id);
    if (isNaN(tourItemId)) return res.status(400).send('Invalid tour item ID');
    return res.json({ status: 'success', message: 'Tour hotels updated' });
  } catch (err) { next(err); }
}
