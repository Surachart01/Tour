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
router.post('/logout', validateJWT, logout);
router.patch('/update-password', validateJWT, updatePassword);

router.post('/users', validateJWT, createUser);
router.delete('/users/:id', validateJWT, authorize('admin'), deleteUser);
router.get('/users', validateJWT, authorize('admin'), listUsers);
router.put('/users/:id', validateJWT, updateUser);
router.get('/users/me', validateJWT, getCurrentUser);
router.get('/users/organization/:organizationID', validateJWT, getOrganizationUsers);
router.get('/users/:id', validateJWT, getUser);

export default router;
