import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  createExcursion, getExcursionByID, getExcursions, listExcursionsByLocation,
  listAvailableExcursionsByCity, updateExcursion, deleteExcursion, calculateExcursionCost
} from '../controllers/excursionController.js';

const router = express.Router();
router.use(validateJWT);

router.post('/excursions/calculate-cost', calculateExcursionCost);
router.post('/excursions', authorize('admin'), createExcursion);
router.get('/excursions', (req, res, next) => {
  if (req.query.city && req.query.from_date) return listAvailableExcursionsByCity(req, res, next);
  if (req.query.city) return listExcursionsByLocation(req, res, next);
  return getExcursions(req, res, next);
});
router.get('/excursions/:id', getExcursionByID);
router.put('/excursions/:id', authorize('admin'), updateExcursion);
router.delete('/excursions/:id', authorize('admin'), deleteExcursion);

export default router;
