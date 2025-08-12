import express from 'express';
import { body } from 'express-validator';
import {
  register,
  verifyOTP,
  login,
  getProfile,
  updateProfile
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number is required'),
  body('aadhaar').isLength({ min: 12, max: 12 }).isNumeric().withMessage('Valid 12-digit Aadhaar number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().isMobilePhone('en-IN')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginValidation, login);
router.get('/me', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfileValidation, updateProfile);

export default router;