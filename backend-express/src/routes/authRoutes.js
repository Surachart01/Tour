import express from 'express';
import {
  oauthLogin, oauthCallback, enhancedOAuthCallback, completeRegistration,
  requestMagicLink, verifyMagicLink, oauthProviderLogin, oauthProviderCallback,
  dependentUserLogin
} from '../controllers/authController.js';
import { validateCoupon } from '../controllers/advancedController.js';

const router = express.Router();

// OAuth routes (public - no JWT required)
router.post('/auth/oauth/:provider', oauthLogin);
router.get('/auth/oauth/:provider/callback', oauthCallback);
router.get('/auth/oauth/enhanced/:provider/callback', enhancedOAuthCallback);
router.post('/auth/register/complete', completeRegistration);
router.post('/auth/magic-link', requestMagicLink);
router.post('/auth/magic-link/verify', verifyMagicLink);
router.get('/auth/:provider/login', oauthProviderLogin);
router.get('/auth/:provider/callback', oauthProviderCallback);
router.post('/auth/dependent/login', dependentUserLogin);

// Public affiliate/coupon routes
router.get('/affiliates/coupons/validate', validateCoupon);

// Health check route
router.get('/health', (req, res) => res.status(200).send('OK'));

export default router;
