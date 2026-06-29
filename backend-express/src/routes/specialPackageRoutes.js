import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  listSpecialPackages,
  getSpecialPackage,
  createSpecialPackage,
  updateSpecialPackage,
  deleteSpecialPackage,
  toggleSpecialPackage,
  cloneSpecialPackage
} from '../controllers/specialPackageController.js';

const router = express.Router();
router.use(validateJWT);

// List all special packages (admin sees all, agent sees only active)
router.get('/special-packages', authorize('admin', 'agent'), listSpecialPackages);

// Get single special package
router.get('/special-packages/:id', authorize('admin', 'agent'), getSpecialPackage);

// Create special package (admin only)
router.post('/special-packages', authorize('admin'), createSpecialPackage);

// Update special package (admin only)
router.put('/special-packages/:id', authorize('admin'), updateSpecialPackage);

// Delete special package (admin only)
router.delete('/special-packages/:id', authorize('admin'), deleteSpecialPackage);

// Toggle active/inactive (admin only)
router.patch('/special-packages/:id/toggle', authorize('admin'), toggleSpecialPackage);

// Clone special package (admin only)
router.post('/special-packages/:id/clone', authorize('admin'), cloneSpecialPackage);

export default router;
