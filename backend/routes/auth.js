// backend/routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d',
  });
};

// Middleware to check token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
}

// REGISTER route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      isVerified: true // set true for now; adjust if you have email verification
    });

    const token = jwt.sign({ userId: newUser._id.toString() }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user: { id: newUser._id.toString(), email: newUser.email, name: newUser.name } });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// LOGIN route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: (email || '').toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await user.comparePassword(password || '');
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Account not verified' });

    const token = generateToken(user._id.toString());

    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'Login failed' });
  }
});


// ME route (get current user)
router.get('/me', async (req, res) => {
  try {
    const raw = req.headers.authorization || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });
  } catch (err) {
    console.error('Auth /me error:', err);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

export default router;
