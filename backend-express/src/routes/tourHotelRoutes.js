import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { getTourHotels, updateTourHotels } from '../controllers/tourHotelController.js';
const router = express.Router();
router.use(validateJWT);
router.get('/trips/:trip_id/tour-items/:tour_item_id/hotels', getTourHotels);
router.put('/trips/:trip_id/tour-items/:tour_item_id/hotels', authorize('admin'), updateTourHotels);
export default router;
