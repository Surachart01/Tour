import prisma from '../config/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'service-docs');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

export const uploadServiceDoc = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, PowerPoint, Excel, and Word files are allowed'));
    }
  }
});

/** GET /api/v1/service-documents?service_type=tour&service_id=1 */
export async function listServiceDocuments(req, res, next) {
  try {
    const { service_type, service_id } = req.query;
    const where = {};
    if (service_type) where.service_type = service_type;
    if (service_id) where.service_id = parseInt(service_id);

    const docs = await prisma.service_documents.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
    return res.json(docs);
  } catch (err) { next(err); }
}

/** POST /api/v1/service-documents/upload */
export async function uploadServiceDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { service_type, service_id, description } = req.body;
    if (!service_type || !service_id) {
      return res.status(400).json({ error: 'service_type and service_id are required' });
    }

    const doc = await prisma.service_documents.create({
      data: {
        service_type,
        service_id: parseInt(service_id),
        file_name: req.file.originalname,
        file_path: req.file.filename,
        file_type: path.extname(req.file.originalname).replace('.', '').toLowerCase(),
        file_size: req.file.size,
        description: description || null,
      }
    });

    return res.json({
      success: true,
      message: 'File uploaded successfully',
      document: {
        ...doc,
        url: `/uploads/service-docs/${req.file.filename}`
      }
    });
  } catch (err) { next(err); }
}

/** DELETE /api/v1/service-documents/:id */
export async function deleteServiceDocument(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const doc = await prisma.service_documents.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Remove file from disk
    const filePath = path.join(UPLOAD_DIR, doc.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.service_documents.delete({ where: { id } });
    return res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) { next(err); }
}

/** PATCH /api/v1/tours/:id/description */
export async function updateTourDescription(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { description } = req.body;
    const tour = await prisma.tours.update({
      where: { id },
      data: { description }
    });
    return res.json({ success: true, tour });
  } catch (err) { next(err); }
}

/** PATCH /api/v1/excursions/:id/description */
export async function updateExcursionDescription(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { description } = req.body;
    const excursion = await prisma.excursions.update({
      where: { id },
      data: { description }
    });
    return res.json({ success: true, excursion });
  } catch (err) { next(err); }
}
