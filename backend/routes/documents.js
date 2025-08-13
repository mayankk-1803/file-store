// import express from 'express';
// import multer from 'multer';
// import { body, validationResult } from 'express-validator';
// import {
//   uploadDocument,
//   getDocuments,
//   getDocument,
//   downloadDocument,
//   updateDocument,
//   deleteDocument,
//   getDashboardStats,
//   getCategories,
//   shareDocument,
//   getSharedDocuments,
//   revokeShare,
//   downloadSharedDocument,
//   viewSharedDocument
// } from '../controllers/documentController.js';
// import { authenticateToken } from '../middleware/auth.js';

// const router = express.Router();

// // Multer: in-memory storage for Cloudinary uploads
// const storage = multer.memoryStorage();
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|gif/;
//   const extname = allowedTypes.test(file.originalname.toLowerCase());
//   const mimetype = allowedTypes.test(file.mimetype);
//   if (mimetype && extname) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only PDF, Word documents, and image files are allowed'));
//   }
// };

// const upload = multer({
//   storage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
//   fileFilter
// });

// // Common validation middleware to handle express-validator errors
// const handleValidationErrors = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       message: 'Validation failed',
//       errors: errors.array()
//     });
//   }
//   next();
// };

// const documentValidation = [
//   body('category')
//     .optional()
//     .isIn(['education', 'healthcare', 'government', 'finance', 'transport', 'other'])
//     .withMessage('Invalid category'),
//   body('title').optional().trim().isLength({ min: 1, max: 200 }),
//   body('description').optional().trim().isLength({ max: 1000 })
// ];

// const shareValidation = [
//   body('documentId').isMongoId().withMessage('Valid document ID is required'),
//   body('email').isEmail().withMessage('Valid email is required'),
//   body('permissions').optional().isIn(['view', 'download']),
//   body('expiresIn').optional().isInt({ min: 1, max: 365 })
// ];

// // Require authentication for all document routes
// router.use(authenticateToken);

// // Document routes
// router.post('/upload', upload.single('file'), documentValidation, handleValidationErrors, uploadDocument);
// router.get('/', getDocuments);
// router.get('/dashboard', getDashboardStats);
// router.get('/categories', getCategories);
// router.get('/shared', getSharedDocuments);
// router.get('/:id', getDocument);
// router.get('/:id/download', downloadDocument);
// router.put('/:id', documentValidation, handleValidationErrors, updateDocument);
// router.delete('/:id', deleteDocument);

// // Sharing routes
// router.post('/share', shareValidation, handleValidationErrors, shareDocument);
// router.delete('/share/:shareId', revokeShare);
// router.get('/shared/:shareToken/download', downloadSharedDocument);
// router.get('/shared/:shareToken/view', viewSharedDocument);

// export default router;

// backend/routes/documentRoutes.js
import express from 'express';
import multer from 'multer';
import { body, validationResult } from 'express-validator';

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

const router = express.Router();

/* ==============================
   Multer Configuration
================================= */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|gif/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, Word documents, and image files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter
});

/* ==============================
   Validation Middleware
================================= */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const documentValidation = [
  body('category')
    .optional()
    .isIn(['education', 'healthcare', 'government', 'finance', 'transport', 'other'])
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

/* ==============================
   Authentication
================================= */
router.use(authenticateToken);

/* ==============================
   Document Routes
================================= */
router.post('/upload', upload.single('file'), documentValidation, handleValidationErrors, uploadDocument);
router.get('/', getDocuments);
router.get('/dashboard', getDashboardStats);
router.get('/categories', getCategories);
router.get('/shared', getSharedDocuments);
router.get('/:id', getDocument);
router.get('/:id/download', downloadDocument);
router.put('/:id', documentValidation, handleValidationErrors, updateDocument);
router.delete('/:id', deleteDocument);

/* ==============================
   Sharing Routes
================================= */
router.post('/share', shareValidation, handleValidationErrors, shareDocument);
router.delete('/share/:shareId', revokeShare);
router.get('/shared/:shareToken/download', downloadSharedDocument);
router.get('/shared/:shareToken/view', viewSharedDocument);

export default router;
