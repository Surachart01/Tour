import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  createAgent, deleteAgent, updateAgent, getAgent,
  listAgentNames, listAgents, updateAssistanceFeeConfig
} from '../controllers/agentController.js';

const router = express.Router();
router.use(validateJWT);

router.post('/agents', authorize('admin'), createAgent);
router.get('/agents/names', authorize('admin'), listAgentNames);
router.get('/agents/', authorize('admin'), listAgents);
router.get('/agents/:id', getAgent);
router.put('/agents/:id', authorize('admin'), updateAgent);
router.delete('/agents/:id', authorize('admin'), deleteAgent);
router.patch('/agents/:id/assistance-fee-config', authorize('admin'), updateAssistanceFeeConfig);

export default router;
