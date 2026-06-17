import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  createQuotation, listQuotations, listQuotationsByDateRange, getQuotation,
  updateQuotation, finalizeQuotation, cancelQuotation, deleteQuotation,
  listBookings, listBookingsByDateRange, getBooking, updateBooking,
  approveItem, declineItem, getPaymentInfo, updatePaymentInfo,
  listPaymentInfoFromBookings, listPaymentInfoByDateRange,
  listItinerary, updateInvoiceNumber
} from '../controllers/tripController.js';
import { generateQuotationPDF, generateReceiptPDF, generateTripPDF, generateTripServicesPDF, notifySupplierOrHotel, sendQuotationEmail } from '../controllers/pdfController.js';

const router = express.Router();
router.use(validateJWT);

// Quotation routes
router.get('/quotations/date-range', authorize('admin', 'agent'), listQuotationsByDateRange);
router.post('/quotations', authorize('agent', 'admin'), createQuotation);
router.get('/quotations', authorize('agent', 'admin'), listQuotations);
router.get('/quotations/:id', authorize('agent', 'admin'), getQuotation);
router.put('/quotations/:id', authorize('agent', 'admin'), updateQuotation);
router.post('/quotations/:id/finalize', authorize('agent', 'admin'), finalizeQuotation);
router.post('/quotations/:id/cancel', authorize('agent', 'admin'), cancelQuotation);
router.get('/quotations/:id/generate-pdf', authorize('admin', 'agent'), generateQuotationPDF);
router.post('/quotations/:id/send-email', authorize('admin', 'agent'), sendQuotationEmail);
router.delete('/quotations/:id', authorize('agent', 'admin'), deleteQuotation);

// Booking routes
router.get('/bookings/date-range', authorize('admin', 'agent'), listBookingsByDateRange);
router.get('/bookings/payments/date-range', authorize('admin', 'agent'), listPaymentInfoByDateRange);
router.get('/bookings/all/payments', authorize('admin', 'agent'), listPaymentInfoFromBookings);
router.get('/bookings', authorize('admin'), listBookings);
router.get('/bookings/:id/generate-pdf', authorize('admin'), generateQuotationPDF);
router.get('/bookings/:id/receipt', authorize('admin'), generateReceiptPDF);
router.get('/bookings/:id', authorize('admin'), getBooking);
router.put('/bookings/:id', authorize('admin'), updateBooking);
router.post('/bookings/:id/approveItem/:itemType/:itemID', authorize('admin'), approveItem);
router.post('/bookings/:id/declineItem/:itemType/:itemID', authorize('admin'), declineItem);
router.post('/bookings/:id/notify/:itemType/:itemID', authorize('admin'), notifySupplierOrHotel);
router.get('/bookings/:id/payment', authorize('admin', 'agent'), getPaymentInfo);
router.put('/bookings/:id/payment', authorize('admin'), updatePaymentInfo);
router.put('/bookings/:id/invoice-number', authorize('admin'), updateInvoiceNumber);

// Itinerary routes
router.get('/itinerary', authorize('admin'), listItinerary);
router.get('/itinerary/:id/generate-pdf', authorize('admin', 'agent'), generateTripPDF);
router.get('/itinerary/:id/generate-services-pdf', authorize('admin', 'agent'), generateTripServicesPDF);

export default router;
