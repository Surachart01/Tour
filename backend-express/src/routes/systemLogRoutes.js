import express from 'express';
import { validateJWT, authorizeSuperAdmin } from '../middleware/auth.js';
import {
  getLogs,
  getLogStats,
  clearLogs,
  createTestLog,
} from '../controllers/systemLogController.js';

const router = express.Router();

// Apply strict SuperAdmin authentication specifically to /system-logs routes
router.use('/system-logs', validateJWT, authorizeSuperAdmin);

router.get('/system-logs', getLogs);
router.get('/system-logs/stats', getLogStats);
router.post('/system-logs/clear', clearLogs);
router.post('/system-logs/test', createTestLog);

export default router;
