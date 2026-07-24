import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { 
  updateStopSaleStatus, 
  getAvailableDatesForHotel,
  updateTourStopSaleStatus,
  getAvailableDatesForTour,
  updateExcursionStopSaleStatus,
  getAvailableDatesForExcursion,
  updateSpecialPackageStopSaleStatus,
  getAvailableDatesForSpecialPackage
} from '../controllers/stopsalesController.js';

const router = express.Router();
router.use(validateJWT);

router.put('/stop-sales', authorize('admin', 'agent'), updateStopSaleStatus);
router.get('/hotels/:hotel_id/availability', getAvailableDatesForHotel);

router.put('/tour-stop-sales', authorize('admin', 'agent'), updateTourStopSaleStatus);
router.get('/tour-stop-sales/:tour_id', getAvailableDatesForTour);

router.put('/excursion-stop-sales', authorize('admin', 'agent'), updateExcursionStopSaleStatus);
router.get('/excursion-stop-sales/:excursion_id', getAvailableDatesForExcursion);

router.put('/special-packages-stop-sales', authorize('admin', 'agent'), updateSpecialPackageStopSaleStatus);
router.get('/special-packages-stop-sales/:package_id', getAvailableDatesForSpecialPackage);

export default router;
