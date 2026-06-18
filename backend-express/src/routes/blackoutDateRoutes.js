import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { createTourBlackoutDate, getTourBlackoutDates, updateTourBlackoutDate, deleteTourBlackoutDate, createExcursionBlackoutDate, getExcursionBlackoutDates, updateExcursionBlackoutDate, deleteExcursionBlackoutDate, createTransferBlackoutDate, getTransferBlackoutDates, updateTransferBlackoutDate, deleteTransferBlackoutDate } from '../controllers/blackoutDateController.js';
const router = express.Router();
router.use(validateJWT);
// Tour blackout dates
router.post('/tours/:id/blackout-dates', authorize('admin'), createTourBlackoutDate);
router.get('/tours/:id/blackout-dates', authorize('admin'), getTourBlackoutDates);
router.put('/tours/:id/blackout-dates/:blackout_id', authorize('admin'), updateTourBlackoutDate);
router.delete('/tours/:id/blackout-dates/:blackout_id', authorize('admin'), deleteTourBlackoutDate);
// Excursion blackout dates
router.post('/excursions/:id/blackout-dates', authorize('admin'), createExcursionBlackoutDate);
router.get('/excursions/:id/blackout-dates', authorize('admin'), getExcursionBlackoutDates);
router.put('/excursions/:id/blackout-dates/:blackout_id', authorize('admin'), updateExcursionBlackoutDate);
router.delete('/excursions/:id/blackout-dates/:blackout_id', authorize('admin'), deleteExcursionBlackoutDate);
// Transfer blackout dates
router.post('/transfers/:id/blackout-dates', authorize('admin'), createTransferBlackoutDate);
router.get('/transfers/:id/blackout-dates', authorize('admin'), getTransferBlackoutDates);
router.put('/transfers/:id/blackout-dates/:blackout_id', authorize('admin'), updateTransferBlackoutDate);
router.delete('/transfers/:id/blackout-dates/:blackout_id', authorize('admin'), deleteTransferBlackoutDate);
export default router;
