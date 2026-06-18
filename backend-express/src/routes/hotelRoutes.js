import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  createHotel, getHotel, listHotels, listHotelsByCity,
  listAvailableHotelsByCity, updateHotel, deleteHotel,
  listCities, calculateHotelCost
} from '../controllers/hotelController.js';
import {
  generateHotelTemplate,
  importHotels,
  getImportStatus,
  cleanupHotelsAfterTime,
  cleanupHotelsByPattern,
  cleanupHotelsInCity,
  listHotelsCreatedAfter,
  cleanupHotelsAfterTimeSQL,
  cleanupHotelsByPatternSQL,
  cleanupHotelsInCitySQL,
  executeCustomCleanupSQL
} from '../controllers/importExportController.js';

const router = express.Router();
router.use(validateJWT);

router.get('/cities', listCities);
router.post('/hotels/calculate-cost', calculateHotelCost);

// Import and cleanup endpoints (MUST come before parameterized routes)
router.get('/hotels/import/template', authorize('admin'), generateHotelTemplate);
router.post('/hotels/import', authorize('admin'), importHotels);
router.get('/hotels/import/status/:import_id', authorize('admin'), getImportStatus);

router.delete('/hotels/cleanup/after-time', authorize('admin'), cleanupHotelsAfterTime);
router.delete('/hotels/cleanup/by-pattern', authorize('admin'), cleanupHotelsByPattern);
router.delete('/hotels/cleanup/in-city-after-time', authorize('admin'), cleanupHotelsInCity);
router.get('/hotels/list/after-time', authorize('admin'), listHotelsCreatedAfter);

router.delete('/hotels/cleanup/sql/after-time', authorize('admin'), cleanupHotelsAfterTimeSQL);
router.delete('/hotels/cleanup/sql/by-pattern', authorize('admin'), cleanupHotelsByPatternSQL);
router.delete('/hotels/cleanup/sql/in-city-after-time', authorize('admin'), cleanupHotelsInCitySQL);
router.post('/hotels/cleanup/sql/custom', authorize('admin'), executeCustomCleanupSQL);

router.post('/hotels', authorize('admin'), createHotel);
router.get('/hotels', /* authorize('admin', 'agent') */ (req, res, next) => {
  if (req.query.city && req.query.from_date) {
    return listAvailableHotelsByCity(req, res, next);
  }
  next();
}, authorize('admin', 'agent'), (req, res, next) => {
  if (req.query.city) return listHotelsByCity(req, res, next);
  return listHotels(req, res, next);
});
router.get('/hotels/:id', getHotel);
router.put('/hotels/:id', authorize('admin'), updateHotel);
router.delete('/hotels/:id', authorize('admin'), deleteHotel);
router.get('/hotels/:hotel_id/allotments', listCities);

export default router;

