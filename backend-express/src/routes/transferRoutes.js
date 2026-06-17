import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  createTransfer, getTransferByID, getTransfers, getTransferByCity,
  listAvailableTransfersByCity, updateTransfer, deleteTransfer, calculateTransfersCost
} from '../controllers/transferController.js';

const router = express.Router();
router.use(validateJWT);

router.post('/transfers/calculate-cost', calculateTransfersCost);
router.post('/transfers', authorize('admin'), createTransfer);
router.get('/transfers', (req, res, next) => {
  if (req.query.city && req.query.from_date) return listAvailableTransfersByCity(req, res, next);
  if (req.query.city) return getTransferByCity(req, res, next);
  return getTransfers(req, res, next);
});
router.get('/transfers/:id', getTransferByID);
router.put('/transfers/:id', authorize('admin'), updateTransfer);
router.delete('/transfers/:id', authorize('admin'), deleteTransfer);

export default router;
