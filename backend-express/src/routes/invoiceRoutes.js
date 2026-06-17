import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { getInvoice, createInvoice } from '../controllers/invoiceController.js';
const router = express.Router();
router.use(validateJWT);
router.get('/invoices/:tripId', authorize('admin', 'agent'), getInvoice);
router.post('/invoices', authorize('admin'), createInvoice);
export default router;
