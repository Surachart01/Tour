import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  login,
  logout,
  createAdmin,
  createUser,
  getUser,
  getCurrentUser,
  listUsers,
  updateUser,
  deleteUser,
  updatePassword,
  getOrganizationUsers
} from '../controllers/userController.js';

const router = express.Router();

// Public routes (no JWT required)
router.post('/create-admin', createAdmin);
router.post('/login', login);

// Private routes (JWT required)
router.use(validateJWT);

router.post('/logout', logout);
router.patch('/update-password', updatePassword);

router.post('/users', createUser);
router.delete('/users/:id', authorize('admin'), deleteUser);
router.get('/users', authorize('admin'), listUsers);
router.put('/users/:id', updateUser);
router.get('/users/me', getCurrentUser);
router.get('/users/organization/:organizationID', getOrganizationUsers);
router.get('/users/:id', getUser);

export default router;
