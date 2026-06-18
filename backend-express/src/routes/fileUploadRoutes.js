import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { upload, uploadLogo, uploadDocument, uploadAvatar, getFile, deleteFile, listFiles, uploadExcel } from '../controllers/fileUploadController.js';

const router = express.Router();
router.use(validateJWT);

router.post('/files/upload/logo', authorize('admin', 'agent', 'free_agent'), upload.single('file'), uploadLogo);
router.post('/files/upload/document', authorize('admin', 'agent', 'free_agent'), upload.single('file'), uploadDocument);
router.post('/files/upload/avatar', authorize('admin', 'agent', 'free_agent'), upload.single('file'), uploadAvatar);
router.get('/files/stats', authorize('admin', 'agent', 'free_agent'), listFiles);
router.get('/files', authorize('admin', 'agent', 'free_agent'), listFiles);
router.get('/files/:file_id', authorize('admin', 'agent', 'free_agent'), getFile);
router.delete('/files/:file_id', authorize('admin', 'agent', 'free_agent'), deleteFile);

// Go matching generic excel upload
router.post('/upload', authorize('admin'), upload.single('file'), uploadExcel);

export default router;

