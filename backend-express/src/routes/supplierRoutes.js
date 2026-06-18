import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  createSupplier, getSupplier, listSupplierNames, listAllSuppliers,
  listSuppliersByLocation, updateSupplier, deleteSupplier
} from '../controllers/supplierController.js';

const router = express.Router();
router.use(validateJWT);

router.post('/suppliers', authorize('admin'), createSupplier);
router.get('/suppliers/names', authorize('admin'), listSupplierNames);
router.get('/suppliers/all', authorize('admin'), listAllSuppliers);
router.get('/suppliers', authorize('admin'), (req, res, next) => {
  if (req.query.city) return listSuppliersByLocation(req, res, next);
  return listAllSuppliers(req, res, next);
});
router.get('/suppliers/:id', authorize('admin'), getSupplier);
router.put('/suppliers/:id', authorize('admin'), updateSupplier);
router.delete('/suppliers/:id', authorize('admin'), deleteSupplier);

export default router;
