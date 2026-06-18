import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
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
router.post('/user-profiles', authorize('admin', 'agent'), createUserProfile);
router.get('/user-profiles', authorize('admin', 'agent'), listUserProfiles);
router.get('/user-profiles/:userID', authorize('admin', 'agent'), getUserProfile);
router.put('/user-profiles/:userID', authorize('admin', 'agent'), updateUserProfile);
router.delete('/user-profiles/profile/:id', authorize('admin'), deleteUserProfile);
router.post('/user-profiles/:userID/validate', authorize('admin', 'agent'), validateProfile);
router.get('/user-profiles/countries/requirements', authorize('admin', 'agent'), getCountryRequirements);
router.post('/user-profiles/migrate/:agentID', authorize('admin'), migrateAgentToProfile);

router.put('/user-profiles/:userID/basic', authorize('admin', 'agent'), updateBasicProfile);
router.put('/user-profiles/:userID/tax-info', authorize('admin', 'agent'), updateTaxInfo);
router.put('/user-profiles/:userID/billing', authorize('admin', 'agent'), updateBillingInfo);
router.put('/user-profiles/:userID/bank-info', authorize('admin', 'agent'), updateBankInfo);
router.get('/user-profiles/:userID/bank-info', authorize('admin', 'agent'), getBankInfo);

router.post('/user-profiles/:userID/payment-method', authorize('admin', 'agent'), addPaymentMethod);
router.get('/user-profiles/:userID/payment-methods', authorize('admin', 'agent'), getPaymentMethods);
router.delete('/user-profiles/:userID/payment-methods/:paymentMethodID', authorize('admin', 'agent'), deletePaymentMethod);
router.post('/user-profiles/:userID/payment-methods/:paymentMethodID/set-default', authorize('admin', 'agent'), setDefaultPaymentMethod);
router.get('/user-profiles/:userID/payment-methods/:paymentMethodID/decrypt', authorize('admin', 'agent'), getPaymentMethodDecrypted);

router.get('/user-profiles/:userID/subscription', authorize('admin', 'agent'), getSubscriptionStatus);
router.get('/user-profiles/:userID/usage', authorize('admin', 'agent'), getUsageDashboard);
router.get('/user-profiles/:userID/usage-alerts', authorize('admin', 'agent'), getUsageAlerts);
router.get('/user-profiles/:userID/features/:feature', authorize('admin', 'agent'), getFeatureAccess);

router.get('/user-profiles/:userID/organization', authorize('admin', 'agent'), getOrganization);
router.put('/user-profiles/:userID/organization', authorize('admin', 'agent'), updateOrganization);
router.get('/user-profiles/organization/:organizationID/user-count', authorize('admin'), getOrganizationUserCount);

export default router;

