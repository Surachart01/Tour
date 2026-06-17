import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { sendEmail, sendBookingConfirmation, sendQuotation } from '../controllers/emailController.js';
const router = express.Router();
router.use(validateJWT);
router.post('/email/send', authorize('admin', 'agent'), sendEmail);
router.post('/email/booking-confirmation', authorize('admin', 'agent'), sendBookingConfirmation);
router.post('/email/quotation', authorize('admin', 'agent'), sendQuotation);
export default router;
