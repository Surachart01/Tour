import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { updateStopSaleStatus, getAvailableDatesForHotel } from '../controllers/stopsalesController.js';

const router = express.Router();
router.use(validateJWT);

router.put('/stop-sales', authorize('admin'), updateStopSaleStatus);
router.get('/hotels/:hotel_id/availability', getAvailableDatesForHotel);

export default router;
