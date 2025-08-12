import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Document from '../models/Document.js';
import DocumentShare from '../models/Share.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Update profile
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, select: '-password' }
    );
    
    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalDocuments = await Document.countDocuments({ userId: req.user._id });
    const verifiedDocuments = await Document.countDocuments({ 
      userId: req.user._id, 
      isVerified: true 
    });
    const sharedDocuments = await DocumentShare.countDocuments({ 
      sharedBy: req.user._id,
      isActive: true 
    });

    res.json({
      totalDocuments,
      verifiedDocuments,
      sharedDocuments
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;