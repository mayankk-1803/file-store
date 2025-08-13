// backend/routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Minimal login route: expects verified users
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: (email || '').toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await user.comparePassword(password || '');
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Account not verified' });

    const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    res.json({ token, user: { id: user._id.toString(), email: user.email, name: user.name } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'Login failed' });
  }
});

export default router;
