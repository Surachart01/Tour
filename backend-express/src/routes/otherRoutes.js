import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { listOthers, createOther, getOther, updateOther, deleteOther } from '../controllers/otherController.js';

const router = express.Router();
router.use(validateJWT);

router.get('/others', listOthers);
router.post('/others', authorize('admin'), createOther);
router.get('/others/:id', getOther);
router.put('/others/:id', authorize('admin'), updateOther);
router.delete('/others/:id', authorize('admin'), deleteOther);

export default router;
