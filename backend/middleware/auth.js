// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const raw = req.headers.authorization || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isVerified) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // normalize to req.user.id (string) + email
    req.user = { id: user._id.toString(), email: user.email };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};
