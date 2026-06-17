import express from 'express';
import { validateJWT } from '../middleware/auth.js';
import {
  createUserProfile,
  listUserProfiles,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  validateProfile,
  getCountryRequirements,
  migrateAgentToProfile,
  updateBasicProfile,
  updateTaxInfo,
  updateBillingInfo,
  updateBankInfo,
  getBankInfo,
  addPaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getPaymentMethodDecrypted,
  getSubscriptionStatus,
  getUsageDashboard,
  getUsageAlerts,
  getFeatureAccess,
  getOrganization,
  updateOrganization,
  getOrganizationUserCount,
  getProfileCompleteness
} from '../controllers/userProfileController.js';

const router = express.Router();
router.use(validateJWT);

// Compatibility profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.get('/profile/completeness', getProfileCompleteness);

// Go matching routes
router.post('/user-profiles', createUserProfile);
router.get('/user-profiles', listUserProfiles);
router.get('/user-profiles/:userID', getUserProfile);
router.put('/user-profiles/:userID', updateUserProfile);
router.delete('/user-profiles/profile/:id', deleteUserProfile);
router.post('/user-profiles/:userID/validate', validateProfile);
router.get('/user-profiles/countries/requirements', getCountryRequirements);
router.post('/user-profiles/migrate/:agentID', migrateAgentToProfile);

router.put('/user-profiles/:userID/basic', updateBasicProfile);
router.put('/user-profiles/:userID/tax-info', updateTaxInfo);
router.put('/user-profiles/:userID/billing', updateBillingInfo);
router.put('/user-profiles/:userID/bank-info', updateBankInfo);
router.get('/user-profiles/:userID/bank-info', getBankInfo);

router.post('/user-profiles/:userID/payment-method', addPaymentMethod);
router.get('/user-profiles/:userID/payment-methods', getPaymentMethods);
router.delete('/user-profiles/:userID/payment-methods/:paymentMethodID', deletePaymentMethod);
router.post('/user-profiles/:userID/payment-methods/:paymentMethodID/set-default', setDefaultPaymentMethod);
router.get('/user-profiles/:userID/payment-methods/:paymentMethodID/decrypt', getPaymentMethodDecrypted);

router.get('/user-profiles/:userID/subscription', getSubscriptionStatus);
router.get('/user-profiles/:userID/usage', getUsageDashboard);
router.get('/user-profiles/:userID/usage-alerts', getUsageAlerts);
router.get('/user-profiles/:userID/features/:feature', getFeatureAccess);

router.get('/user-profiles/:userID/organization', getOrganization);
router.put('/user-profiles/:userID/organization', updateOrganization);
router.get('/user-profiles/organization/:organizationID/user-count', getOrganizationUserCount);

export default router;

