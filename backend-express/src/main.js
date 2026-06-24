import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import errorHandler from './middleware/error.js';

// BigInt JSON serialization polyfill
BigInt.prototype.toJSON = function () {
  const num = Number(this);
  return Number.isSafeInteger(num) ? num : this.toString();
};

// Phase 1: Core route modules
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import tourRoutes from './routes/tourRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import excursionRoutes from './routes/excursionRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import markupRoutes from './routes/markupRoutes.js';
import otherRoutes from './routes/otherRoutes.js';
import stopsalesRoutes from './routes/stopsalesRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import operationRoutes from './routes/operationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import taxInvoiceRoutes from './routes/taxInvoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import userProfileRoutes from './routes/userProfileRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import cityInfoRoutes from './routes/cityInfoRoutes.js';

// Phase 2: Advanced feature modules
import fileUploadRoutes from './routes/fileUploadRoutes.js';
import blackoutDateRoutes from './routes/blackoutDateRoutes.js';
import travelChecklistRoutes from './routes/travelChecklistRoutes.js';
import tourHotelRoutes from './routes/tourHotelRoutes.js';
import importExportRoutes from './routes/importExportRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import advancedRoutes from './routes/advancedRoutes.js';

const app = express();
const PORT = process.env.PORT || 8081;

// Global middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Phase 1: Core API Routes
app.use('/api/v1', authRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1', agentRoutes);
app.use('/api/v1', hotelRoutes);
app.use('/api/v1', tourRoutes);
app.use('/api/v1', transferRoutes);
app.use('/api/v1', excursionRoutes);
app.use('/api/v1', supplierRoutes);
app.use('/api/v1', tripRoutes);
app.use('/api/v1', markupRoutes);
app.use('/api/v1', otherRoutes);
app.use('/api/v1', stopsalesRoutes);
app.use('/api/v1', leadRoutes);
app.use('/api/v1', operationRoutes);
app.use('/api/v1', analyticsRoutes);
app.use('/api/v1', locationRoutes);
app.use('/api/v1', invoiceRoutes);
app.use('/api/v1', taxInvoiceRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/v1', userProfileRoutes);
app.use('/api/v1', notificationRoutes);
app.use('/api/v1', cityInfoRoutes);

// Phase 2: Advanced Feature Routes
app.use('/api/v1', fileUploadRoutes);
app.use('/api/v1', blackoutDateRoutes);
app.use('/api/v1', travelChecklistRoutes);
app.use('/api/v1', tourHotelRoutes);
app.use('/api/v1', importExportRoutes);
app.use('/api/v1', emailRoutes);
app.use('/api/v1', advancedRoutes);

// Root test endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Agent Operator Backend (Express)', version: '2.0' });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Error handling middleware (MUST be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📋 Phase 1: user, agent, hotel, tour, transfer, excursion, supplier, trip, markup, other, stopsales, lead, operation, analytics, location, invoice, taxInvoice, payment, userProfile, notification`);
  console.log(`📋 Phase 2: fileUpload, blackoutDate, travelChecklist, tourHotel, importExport, email, advanced (operationTemplate, serviceDirectory, serviceTracking, onboarding, subscription, affiliate, emailFooter)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => { console.log('HTTP server closed'); });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => { console.log('HTTP server closed'); });
});
