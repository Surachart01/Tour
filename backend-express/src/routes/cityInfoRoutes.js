import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  createCityInfo,
  getCityInfo,
  getAllCityInfo,
  updateCityInfo,
  deleteCityInfo
} from '../controllers/cityInfoController.js';

const router = express.Router();
router.use(validateJWT);

router.get('/city-info', getAllCityInfo);
router.get('/city-info/:id', getCityInfo);
router.post('/city-info', authorize('admin'), createCityInfo);
router.put('/city-info/:id', authorize('admin'), updateCityInfo);
router.delete('/city-info/:id', authorize('admin'), deleteCityInfo);

export default router;
