import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { listTaxInvoices, getTaxInvoice, createTaxInvoice, createTaxInvoiceWithCustomTax, createTaxInvoiceWithProfile, createTaxInvoiceWithProfileAndCustomTax, updateTaxInvoice, deleteTaxInvoice, getTaxInvoiceByTripID, calculateTaxBreakdown, validateTaxInvoiceAmounts, syncTaxInvoiceWithTrip, validateProfileForInvoice, getCompanyInfoForInvoice, getTaxRateForCountry, listTaxInvoicesByDateRange, generateTaxInvoicePDF, generateTaxInvoicePDFWithProfile, listEligibleBookings, getTaxInvoiceBooking, saveTaxInvoiceDocument } from '../controllers/taxInvoiceController.js';
const router = express.Router();
router.use(validateJWT);
// Specific routes BEFORE parameterized
router.post('/tax-invoice/:tripID', authorize('admin', 'agent'), createTaxInvoice);
router.post('/tax-invoice/:tripID/custom', authorize('admin', 'agent'), createTaxInvoiceWithCustomTax);
router.post('/tax-invoice/:tripID/with-profile', authorize('admin', 'agent'), createTaxInvoiceWithProfile);
router.post('/tax-invoice/:tripID/with-profile-custom', authorize('admin', 'agent'), createTaxInvoiceWithProfileAndCustomTax);
router.get('/tax-invoice/eligible-bookings', authorize('admin'), listEligibleBookings);
router.get('/tax-invoice/booking/:tripID', authorize('admin'), getTaxInvoiceBooking);
router.post('/tax-invoice/booking/:tripID/document', authorize('admin'), saveTaxInvoiceDocument);
router.get('/tax-invoice/trip/:tripID', authorize('admin', 'agent'), getTaxInvoiceByTripID);
router.get('/tax-invoice/calculate/:tripID', authorize('admin', 'agent'), calculateTaxBreakdown);
router.get('/tax-invoice/validate/:tripID', authorize('admin', 'agent'), validateTaxInvoiceAmounts);
router.post('/tax-invoice/sync/:tripID', authorize('admin'), syncTaxInvoiceWithTrip);
router.get('/tax-invoice/validate-profile/:agentID', authorize('admin', 'agent'), validateProfileForInvoice);
router.get('/tax-invoice/company-info/:agentID', authorize('admin', 'agent'), getCompanyInfoForInvoice);
router.get('/tax-invoice/tax-rate', authorize('admin', 'agent'), getTaxRateForCountry);
router.get('/tax-invoice/date-range', authorize('admin', 'agent'), listTaxInvoicesByDateRange);
router.get('/tax-invoice', authorize('admin'), listTaxInvoices);
// Parameterized routes AFTER specific
router.get('/tax-invoice/:id', authorize('admin', 'agent'), getTaxInvoice);
router.put('/tax-invoice/:id', authorize('admin', 'agent'), updateTaxInvoice);
router.delete('/tax-invoice/:id', authorize('admin'), deleteTaxInvoice);
router.get('/tax-invoice/:id/generate-pdf', authorize('admin', 'agent'), generateTaxInvoicePDF);
router.get('/tax-invoice/:id/generate-pdf-with-profile', authorize('admin', 'agent'), generateTaxInvoicePDFWithProfile);
export default router;
