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

router.post('/payments/create-intent', validateJWT, authorize('agent', 'admin', 'free_agent'), createPaymentIntent);
router.post('/payments/confirm', validateJWT, authorize('agent', 'admin', 'free_agent'), confirmPayment);
router.get('/payments/status/:id', validateJWT, authorize('agent', 'admin', 'free_agent'), getPaymentStatus);
router.post('/payments/cancel/:id', validateJWT, authorize('agent', 'admin', 'free_agent'), cancelPayment);
router.get('/payments/history', validateJWT, authorize('agent', 'admin', 'free_agent'), getUserTransactions);

export default router;

