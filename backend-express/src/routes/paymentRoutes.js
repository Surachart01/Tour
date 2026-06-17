import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  createPaymentIntent,
  confirmPayment,
  getPaymentStatus,
  cancelPayment,
  getUserTransactions,
  handleStripeWebhook,
  handleRazorpayWebhook
} from '../controllers/paymentController.js';

const router = express.Router();

// Webhook endpoints (Public - no JWT required)
router.post('/webhooks/stripe', handleStripeWebhook);
router.post('/webhooks/razorpay', handleRazorpayWebhook);

router.use(validateJWT);

router.post('/payments/create-intent', createPaymentIntent);
router.post('/payments/confirm', confirmPayment);
router.get('/payments/status/:id', getPaymentStatus);
router.post('/payments/cancel/:id', cancelPayment);
router.get('/payments/history', getUserTransactions);

export default router;

