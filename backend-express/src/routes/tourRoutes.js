import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  createTour, getTourByID, getAllTours, listToursByCity,
  listAvailableToursByCity, updateTour, deleteTour, calculateToursCost
} from '../controllers/tourController.js';

const router = express.Router();
router.use(validateJWT);

router.post('/tours/calculate-cost', calculateToursCost);
router.post('/tours', authorize('admin'), createTour);
router.get('/tours', (req, res, next) => {
  if (req.query.city && req.query.from_date) return listAvailableToursByCity(req, res, next);
  if (req.query.city) return listToursByCity(req, res, next);
  return getAllTours(req, res, next);
});
router.get('/tours/:id', getTourByID);
router.put('/tours/:id', authorize('admin'), updateTour);
router.delete('/tours/:id', authorize('admin'), deleteTour);

export default router;
