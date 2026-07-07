import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = req.params.type || 'general';
    if (!req.params.type) {
      if (req.path.includes('/logo')) subDir = 'logo';
      else if (req.path.includes('/document')) subDir = 'document';
      else if (req.path.includes('/avatar')) subDir = 'avatar';
    }
    const dir = path.join(UPLOAD_DIR, subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

export async function uploadLogo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });
    return res.json({
      success: true, message: 'Logo uploaded successfully',
      file_info: {
        id: req.file.filename, original_name: req.file.originalname,
        mime_type: req.file.mimetype, file_size: req.file.size,
        url: `/uploads/logo/${req.file.filename}`
      }
    });
  } catch (err) { next(err); }
}

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });
    return res.json({
      success: true, message: 'Document uploaded successfully',
      file_info: {
        id: req.file.filename, original_name: req.file.originalname,
        mime_type: req.file.mimetype, file_size: req.file.size,
        url: `/uploads/document/${req.file.filename}`
      }
    });
  } catch (err) { next(err); }
}

export async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });
    return res.json({
      success: true, message: 'Avatar uploaded successfully',
      file_info: {
        id: req.file.filename, original_name: req.file.originalname,
        mime_type: req.file.mimetype, file_size: req.file.size,
        url: `/uploads/avatar/${req.file.filename}`
      }
    });
  } catch (err) { next(err); }
}

export async function getFile(req, res, next) {
  try {
    const { file_id } = req.params;
    // Search in all subdirectories
    for (const subDir of ['logo', 'document', 'avatar', 'general']) {
      const filePath = path.join(UPLOAD_DIR, subDir, file_id);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }
    return res.status(404).json({ success: false, error: 'File not found' });
  } catch (err) { next(err); }
}

export async function deleteFile(req, res, next) {
  try {
    const { file_id } = req.params;
    for (const subDir of ['logo', 'document', 'avatar', 'general']) {
      const filePath = path.join(UPLOAD_DIR, subDir, file_id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return res.json({ success: true, message: 'File deleted successfully' });
      }
    }
    return res.status(404).json({ success: false, error: 'File not found' });
  } catch (err) { next(err); }
}

export async function listFiles(req, res, next) {
  try {
    const files = [];
    const fileType = req.query.file_type;
    const dirs = fileType ? [fileType] : ['logo', 'document', 'avatar', 'general'];
    for (const dir of dirs) {
      const dirPath = path.join(UPLOAD_DIR, dir);
      if (fs.existsSync(dirPath)) {
        const dirFiles = fs.readdirSync(dirPath);
        for (const f of dirFiles) {
          const stat = fs.statSync(path.join(dirPath, f));
          files.push({ id: f, type: dir, size: stat.size, created_at: stat.birthtime });
        }
      }
    }
    return res.json({ success: true, files, stats: { total: files.length } });
  } catch (err) { next(err); }
}

export async function uploadExcel(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    return res.json("Upload successful");
  } catch (err) { next(err); }
}

