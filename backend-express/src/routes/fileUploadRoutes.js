import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { upload, uploadLogo, uploadDocument, uploadAvatar, getFile, deleteFile, listFiles, uploadExcel } from '../controllers/fileUploadController.js';

const router = express.Router();
router.use(validateJWT);

router.post('/files/upload/logo', upload.single('file'), uploadLogo);
router.post('/files/upload/document', upload.single('file'), uploadDocument);
router.post('/files/upload/avatar', upload.single('file'), uploadAvatar);
router.get('/files/stats', listFiles);
router.get('/files', listFiles);
router.get('/files/:file_id', getFile);
router.delete('/files/:file_id', deleteFile);

// Go matching generic excel upload
router.post('/upload', authorize('admin'), upload.single('file'), uploadExcel);

export default router;

