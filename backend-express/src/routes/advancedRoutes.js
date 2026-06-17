import express from 'express';
import { validateJWT, authorize, authorizeSuperAdmin } from '../middleware/auth.js';
import * as adv from '../controllers/advancedController.js';

const router = express.Router();
router.use(validateJWT);

// ==================== Operation Templates ====================
router.post('/operation-templates', authorize('admin', 'agent'), adv.createOperationTemplate);
router.get('/operation-templates', authorize('admin', 'agent'), adv.listOperationTemplates);
router.get('/operation-templates/:id', authorize('admin', 'agent'), adv.getOperationTemplate);
router.put('/operation-templates/:id', authorize('admin', 'agent'), adv.updateOperationTemplate);
router.delete('/operation-templates/:id', authorize('admin', 'agent'), adv.deleteOperationTemplate);
router.post('/operation-templates/initialize-defaults', authorize('admin'), adv.initializeDefaultTemplates);

// ==================== Service Directory (Services) ====================
router.get('/services', adv.listServices);
router.get('/services/:id', adv.getService);
router.post('/services', authorize('admin'), adv.createService);
router.put('/services/:id', authorize('admin'), adv.updateService);
router.delete('/services/:id', authorize('admin'), adv.deleteService);

// ==================== Guides ====================
router.post('/guides', authorize('admin', 'agent'), adv.createGuide);
router.get('/guides', authorize('admin', 'agent'), adv.getGuides);
router.get('/guides/available', authorize('admin', 'agent'), adv.getAvailableGuides);
router.get('/guides/:id', authorize('admin', 'agent'), adv.getGuide);
router.put('/guides/:id', authorize('admin', 'agent'), adv.updateGuide);
router.delete('/guides/:id', authorize('admin'), adv.deleteGuide);

// ==================== Drivers ====================
router.post('/drivers', authorize('admin', 'agent'), adv.createDriver);
router.get('/drivers', authorize('admin', 'agent'), adv.getDrivers);
router.get('/drivers/available', authorize('admin', 'agent'), adv.getAvailableDrivers);
router.get('/drivers/:id', authorize('admin', 'agent'), adv.getDriver);
router.put('/drivers/:id', authorize('admin', 'agent'), adv.updateDriver);
router.delete('/drivers/:id', authorize('admin'), adv.deleteDriver);

// ==================== Service Providers ====================
router.post('/service-providers', authorize('admin', 'agent'), adv.createServiceProvider);
router.get('/service-providers', authorize('admin', 'agent'), adv.getServiceProviders);
router.get('/service-providers/:id', authorize('admin', 'agent'), adv.getServiceProvider);
router.put('/service-providers/:id', authorize('admin', 'agent'), adv.updateServiceProvider);
router.delete('/service-providers/:id', authorize('admin'), adv.deleteServiceProvider);
router.post('/service-providers/:id/contacts', authorize('admin', 'agent'), adv.addServiceContact);
router.get('/service-providers/:id/contacts', authorize('admin', 'agent'), adv.getServiceContacts);

// ==================== Service Directory compilation ====================
router.post('/service-directory/compile/emergency', authorize('admin', 'agent'), adv.compileEmergencyContacts);
router.post('/service-directory/compile/all', authorize('admin', 'agent'), adv.compileAllContacts);
router.get('/service-directory/compile', authorize('admin', 'agent'), adv.getContactCompilation);
router.get('/service-directory/search', authorize('admin', 'agent'), adv.searchServiceDirectory);

// ==================== Service Tracking & Conflicts & Confirmations ====================
// Service Tracking
router.get('/service-tracking', authorize('admin', 'agent'), adv.listServiceTracking);
router.get('/service-tracking/:id', authorize('admin', 'agent'), adv.getServiceTracking);
router.post('/service-tracking', authorize('admin', 'agent'), adv.createServiceTracking);
router.put('/service-tracking/:id', authorize('admin', 'agent'), adv.updateServiceTracking);

// Real-time Service Status Tracking
router.put('/service-tracking/:serviceType/:serviceId/status', authorize('admin', 'agent'), adv.updateServiceStatus);
router.get('/service-tracking/:serviceType/:serviceId/status', authorize('admin', 'agent'), adv.getServiceStatus);
router.get('/service-tracking/status/:status', authorize('admin', 'agent'), adv.getServicesByStatus);
router.get('/service-tracking/:serviceType/:serviceId/history', authorize('admin', 'agent'), adv.getServiceHistory);

// Supplier Confirmation Tracking
router.post('/supplier-confirmations', authorize('admin', 'agent'), adv.createSupplierConfirmation);
router.put('/supplier-confirmations/:id/status', authorize('admin', 'agent'), adv.updateConfirmationStatus);
router.get('/supplier-confirmations/pending', authorize('admin', 'agent'), adv.getPendingConfirmations);
router.get('/supplier-confirmations/overdue', authorize('admin', 'agent'), adv.getOverdueConfirmations);
router.get('/supplier-confirmations/follow-up', authorize('admin', 'agent'), adv.getConfirmationsNeedingFollowUp);
router.post('/supplier-confirmations/:id/follow-up', authorize('admin', 'agent'), adv.sendFollowUpReminder);

// Operation Real-time Tracking
router.get('/operation-tracking/:operationId', authorize('admin', 'agent'), adv.getOperationTracking);
router.put('/operation-tracking/:operationId/progress', authorize('admin', 'agent'), adv.updateOperationProgress);

// Resource Availability Management
router.get('/resource-availability/check', authorize('admin', 'agent'), adv.checkResourceAvailability);
router.post('/resource-availability/book', authorize('admin', 'agent'), adv.bookResource);
router.delete('/resource-availability/release', authorize('admin', 'agent'), adv.releaseResource);
router.get('/resource-availability/available', authorize('admin', 'agent'), adv.getAvailableResources);
router.get('/resource-availability/:resourceType/:resourceId/calendar', authorize('admin', 'agent'), adv.getResourceCalendar);

// Conflict Detection and Resolution
router.get('/conflicts/unresolved', authorize('admin', 'agent'), adv.getUnresolvedConflicts);
router.get('/conflicts/critical', authorize('admin', 'agent'), adv.getCriticalConflicts);
router.put('/conflicts/:id/resolve', authorize('admin', 'agent'), adv.resolveConflict);

// Real-time Service Updates
router.get('/service-updates/recent', authorize('admin', 'agent'), adv.getRecentUpdates);
router.put('/service-updates/:id/read', authorize('admin', 'agent'), adv.markUpdateAsRead);

// Service Analytics and Metrics
router.post('/service-metrics/generate', authorize('admin', 'agent'), adv.generateServiceMetrics);
router.get('/service-metrics/performance', authorize('admin', 'agent'), adv.getServicePerformance);
router.get('/service-metrics/confirmation-rates', authorize('admin', 'agent'), adv.getConfirmationRates);

// Integration Auto-Confirmations
router.post('/trips/:tripId/auto-confirmations', authorize('admin', 'agent'), adv.autoCreateConfirmationsFromTrip);

// ==================== Onboarding ====================
router.get('/onboarding/status', adv.getOnboardingStatus);
router.put('/onboarding/step', adv.updateOnboardingStep);
router.post('/onboarding/complete', adv.completeOnboarding);
router.get('/onboarding/:userID/progress', adv.getOnboardingProgress);
router.post('/onboarding/:userID/payment-method', adv.addOnboardingPaymentMethod);
router.post('/onboarding/:userID/team', adv.inviteTeamMember);
router.post('/onboarding/:userID/skip/:stepID', adv.skipOnboardingStep);

// ==================== Subscriptions ====================
router.get('/subscription', adv.getCurrentSubscription);
router.post('/subscription', adv.createSubscription);
router.post('/subscription/cancel', adv.cancelSubscription);
router.get('/subscription/invoices', adv.listSubscriptionInvoices);

// Go matching subscription paths
router.get('/subscriptions/plans', adv.listSubscriptionPlans);
router.get('/subscription/plans', adv.listSubscriptionPlans);
router.post('/subscriptions', adv.createSubscription);
router.post('/subscriptions/:id/cancel', adv.cancelSubscription);
router.post('/subscriptions/upgrade', authorize('agent', 'admin', 'free_agent'), adv.upgradeSubscription);

// Subscription Plan endpoints
router.post('/subscription-plans', authorize('admin'), adv.createSubscriptionPlan);
router.get('/subscription-plans', authorize('admin'), adv.listSubscriptionPlans);
router.get('/subscription-plans/:planType', authorize('admin'), adv.getSubscriptionPlan);

// Subscription Invoice endpoints
router.post('/subscription-invoices', authorize('admin'), adv.createSubscriptionInvoice);
router.get('/subscription-invoices', authorize('admin'), adv.listSubscriptionInvoices);
router.get('/subscription-invoices/:id', authorize('admin'), adv.getSubscriptionInvoice);
router.put('/subscription-invoices/:id', authorize('admin'), adv.updateSubscriptionInvoice);
router.delete('/subscription-invoices/:id', authorize('admin'), adv.deleteSubscriptionInvoice);
router.post('/subscription-invoices/:id/send-email', authorize('admin'), adv.sendSubscriptionInvoiceEmail);
router.get('/subscription-invoices/:id/email-logs', authorize('admin'), adv.getSubscriptionInvoiceEmailLogs);

// ==================== Affiliate ====================
router.get('/affiliates', authorize('admin'), adv.listAffiliates);
router.get('/affiliates/:id', authorize('admin'), adv.getAffiliate);
router.post('/affiliates', authorize('admin'), adv.createAffiliate);
router.put('/affiliates/:id', authorize('admin'), adv.updateAffiliate);
router.delete('/affiliates/:id', authorize('admin'), adv.deleteAffiliate);

// Advanced Affiliates (Superadmin only)
router.post('/admin/affiliates/partners', authorizeSuperAdmin, adv.createPartner);
router.get('/admin/affiliates/partners', authorizeSuperAdmin, adv.listPartners);
router.get('/admin/affiliates/partners/:partnerCode', authorizeSuperAdmin, adv.getPartner);
router.put('/admin/affiliates/partners/:partnerCode', authorizeSuperAdmin, adv.updatePartner);
router.post('/admin/affiliates/partners/:partnerCode/deactivate', authorizeSuperAdmin, adv.deactivatePartner);
router.get('/admin/affiliates/partners/:partnerId/stats', authorizeSuperAdmin, adv.getPartnerStats);
router.get('/admin/affiliates/partners/:partnerId/reports/monthly', authorizeSuperAdmin, adv.getPartnerMonthlyReport);
router.get('/admin/affiliates/partners/:partnerId/commissions', authorizeSuperAdmin, adv.getCommissionReport);
router.post('/admin/affiliates/partners/:partnerId/payouts', authorizeSuperAdmin, adv.generatePayout);

router.post('/admin/affiliates/coupons', authorizeSuperAdmin, adv.createCoupon);
router.get('/admin/affiliates/coupons', authorizeSuperAdmin, adv.listCoupons);
router.put('/admin/affiliates/coupons/:couponId', authorizeSuperAdmin, adv.updateCoupon);
router.post('/admin/affiliates/coupons/:couponId/deactivate', authorizeSuperAdmin, adv.deactivateCoupon);

router.post('/admin/affiliates/commissions/:commissionId/approve', authorizeSuperAdmin, adv.approveCommission);
router.post('/admin/affiliates/trips/:tripId/reverse-commission', authorizeSuperAdmin, adv.reverseCommission);

router.get('/admin/affiliates/payouts/pending', authorizeSuperAdmin, adv.getPendingPayouts);
router.get('/admin/affiliates/payouts', authorizeSuperAdmin, adv.getPayoutHistory);
router.post('/admin/affiliates/payouts/:payoutId/process', authorizeSuperAdmin, adv.processPayout);

router.post('/admin/affiliates/reports/generate', authorizeSuperAdmin, adv.generateMonthlyReports);

// ==================== Profile Upgrade ====================
router.post('/profile/upgrade', adv.upgradeSubscription);

// ==================== Email Footer ====================
router.get('/email-footer', adv.getEmailFooter);
router.put('/email-footer', authorize('admin'), adv.updateEmailFooter);
router.get('/email-footer/settings', authorize('admin'), adv.getEmailFooterSettings);
router.put('/email-footer/settings', authorize('admin'), adv.updateEmailFooterSettings);
router.post('/email-footer/preview', authorize('admin'), adv.previewEmailFooter);
router.get('/email-footer/current', authorize('admin'), adv.getCurrentEmailFooter);
router.post('/email-footer/reset', authorize('admin'), adv.resetEmailFooter);

// ==================== Migration ====================
router.get('/migration/status', authorize('admin'), adv.getMigrationStatus);
router.post('/migration/backup', authorize('admin'), adv.createMigrationBackup);
router.get('/migration/validate', authorize('admin'), adv.validateMigrationIntegrity);
router.post('/migration/agents/all', authorize('admin'), adv.migrateAllAgents);
router.post('/migration/agents/specific', authorize('admin', 'agent'), adv.migrateSpecificAgents);
router.post('/migration/agents', authorize('admin'), adv.migrateAgentByQuery);
router.post('/migration/rollback', authorize('admin'), adv.rollbackMigration);

export default router;
