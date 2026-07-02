import express from 'express';
import { authorize } from '../middleware/auth.js';
import {
  listServiceDocuments,
  uploadServiceDocument,
  deleteServiceDocument,
  updateTourDescription,
  updateExcursionDescription,
  uploadServiceDoc,
} from '../controllers/serviceDocumentController.js';

const router = express.Router();

// Service documents
router.get('/service-documents', authorize('user'), listServiceDocuments);
router.post(
  '/service-documents/upload',
  authorize('admin', 'superadmin'),
  uploadServiceDoc.single('file'),
  uploadServiceDocument
);
router.delete('/service-documents/:id', authorize('admin', 'superadmin'), deleteServiceDocument);

// Description updates
router.patch('/tours/:id/description', authorize('admin', 'superadmin'), updateTourDescription);
router.patch('/excursions/:id/description', authorize('admin', 'superadmin'), updateExcursionDescription);

export default router;
