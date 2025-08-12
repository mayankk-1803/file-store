// routes/documentRoutes.js
import express from 'express';
import multer from 'multer';
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
  downloadSharedDocument
} from '../controllers/documentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Use multer memory storage for buffer upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|gif/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, Word documents, and images are allowed'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

// Validation rules
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

// All routes require authentication
router.use(authenticateToken);

// Routes
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

export default router;
