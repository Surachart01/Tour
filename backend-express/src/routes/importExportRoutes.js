import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  exportHotels,
  exportExcursions,
  exportTransfers,
  exportTours,
  exportOthers,
  exportFlights,
  getImportTemplate,
  generateFlightTemplate,
  importExcursions,
  getExcursionImportStatus,
  importTours,
  getTourImportStatus,
  importTransfers,
  getTransferImportStatus,
  importOthers,
  getOtherImportStatus
} from '../controllers/importExportController.js';

const router = express.Router();
router.use(validateJWT);

// Old legacy compatibility paths
router.get('/export/hotels', authorize('admin'), exportHotels);
router.get('/export/excursions', authorize('admin'), exportExcursions);
router.get('/export/transfers', authorize('admin'), exportTransfers);
router.get('/export/tours', authorize('admin'), exportTours);
router.get('/export/others', authorize('admin'), exportOthers);
router.get('/import/template/:type', authorize('admin'), getImportTemplate);

// Go matching paths for Excursions
router.get('/excursions/export', authorize('admin'), exportExcursions);
router.get('/excursions/import/template', authorize('admin'), (req, res, next) => {
  req.params.type = 'excursions';
  return getImportTemplate(req, res, next);
});
router.post('/excursions/import', authorize('admin'), importExcursions);
router.get('/excursions/import/status/:import_id', authorize('admin'), getExcursionImportStatus);

// Go matching paths for Tours
router.get('/tours/export', authorize('admin'), exportTours);
router.get('/tours/import/template', authorize('admin'), (req, res, next) => {
  req.params.type = 'tours';
  return getImportTemplate(req, res, next);
});
router.post('/tours/import', authorize('admin'), importTours);
router.get('/tours/import/status/:import_id', authorize('admin'), getTourImportStatus);

// Go matching paths for Transfers
router.get('/transfers/export', authorize('admin'), exportTransfers);
router.get('/transfers/import/template', authorize('admin'), (req, res, next) => {
  req.params.type = 'transfers';
  return getImportTemplate(req, res, next);
});
router.post('/transfers/import', authorize('admin'), importTransfers);
router.get('/transfers/import/status/:import_id', authorize('admin'), getTransferImportStatus);

// Go matching paths for Others
router.get('/others/export', authorize('admin'), exportOthers);
router.get('/others/import/template', authorize('admin'), (req, res, next) => {
  req.params.type = 'others';
  return getImportTemplate(req, res, next);
});
router.post('/others/import', authorize('admin'), importOthers);
router.get('/others/import/status/:import_id', authorize('admin'), getOtherImportStatus);

// Go matching paths for Flights
router.get('/flights/export', authorize('admin'), exportFlights);
router.get('/flights/import/template', authorize('admin'), generateFlightTemplate);

// Go matching path for hotel export
router.get('/hotels/export', authorize('admin'), exportHotels);

export default router;

