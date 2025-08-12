// routes/documentRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { body } from 'express-validator';
import {
  uploadDocument,
  getDocuments,
  getDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  getDashboardStats,
  getCategories,
  shareDocument,
  getSharedDocuments,
  revokeShare,
  downloadSharedDocument,
  viewSharedDocument
} from '../controllers/documentController.js';
import { authenticateToken } from '../middleware/auth.js';

// Ensure uploads folder exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer disk storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, Word documents, and images are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

const documentValidation = [
  body('category').isIn(['education', 'healthcare', 'government', 'finance', 'transport', 'other'])
    .withMessage('Invalid category'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 })
];

const shareValidation = [
  body('documentId').isMongoId().withMessage('Valid document ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('permissions').optional().isIn(['view', 'download']),
  body('expiresIn').optional().isInt({ min: 1, max: 365 })
];

// Routes
const router = express.Router();
router.use(authenticateToken);

router.post('/upload', upload.single('file'), documentValidation, uploadDocument);
router.get('/', getDocuments);
router.get('/dashboard', getDashboardStats);
router.get('/categories', getCategories);
router.get('/shared', getSharedDocuments);
router.get('/:id', getDocument);
router.get('/:id/download', downloadDocument);
router.put('/:id', documentValidation, updateDocument);
router.delete('/:id', deleteDocument);
router.post('/share', shareValidation, shareDocument);
router.delete('/share/:shareId', revokeShare);
router.get('/shared/:shareToken/download', downloadSharedDocument);
router.get('/shared/:shareToken/view', viewSharedDocument);

export default router;
