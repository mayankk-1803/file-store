import Document from '../models/Document.js';
import Share from '../models/Share.js';
import User from '../models/User.js';
import { sendShareNotification } from '../utils/email.js';
import path from 'path';
import fs from 'fs/promises';
import { validationResult } from 'express-validator';

export const uploadDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, description, category } = req.body;
    
    const document = new Document({
      title: title || req.file.originalname,
      description,
      category: category.toLowerCase(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      filePath: req.file.path,
      owner: req.user.userId,
      metadata: {
        uploadIP: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await document.save();

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document._id,
        title: document.title,
        description: document.description,
        category: document.category,
        filename: document.filename,
        size: document.size,
        createdAt: document.createdAt
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    // Delete uploaded file if document creation failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    res.status(500).json({
      message: 'Document upload failed',
      error: error.message
    });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const query = { owner: req.user.userId };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-filePath');

    const total = await Document.countDocuments(query);

    res.json({
      documents,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      message: 'Error fetching documents',
      error: error.message
    });
  }
};

export const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user.userId
    }).select('-filePath');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ document });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      message: 'Error fetching document',
      error: error.message
    });
  }
};

export const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if file exists
    try {
      await fs.access(document.filePath);
    } catch {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(document.filePath, document.originalName);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      message: 'Error downloading document',
      error: error.message
    });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, category, tags } = req.body;

    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    document.title = title || document.title;
    document.description = description || document.description;
    document.category = category ? category.toLowerCase() : document.category;
    document.tags = tags || document.tags;

    await document.save();

    res.json({
      message: 'Document updated successfully',
      document: {
        id: document._id,
        title: document.title,
        description: document.description,
        category: document.category,
        tags: document.tags,
        updatedAt: document.updatedAt
      }
    });

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      message: 'Error updating document',
      error: error.message
    });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    // Delete shares associated with this document
    await Share.deleteMany({ document: document._id });

    // Delete document from database
    await Document.findByIdAndDelete(document._id);

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      message: 'Error deleting document',
      error: error.message
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get total documents count
    const totalDocuments = await Document.countDocuments({ owner: userId });

    // Get recent documents (last 5)
    const recentDocuments = await Document.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category createdAt');

    // Get shared documents count
    const sharedDocuments = await Share.countDocuments({ 
      sharedBy: userId, 
      isActive: true 
    });

    // Get categories breakdown
    const categoriesAgg = await Document.aggregate([
      { $match: { owner: userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const categories = {};
    categoriesAgg.forEach(item => {
      categories[item._id] = item.count;
    });

    res.json({
      totalDocuments,
      recentDocuments,
      sharedDocuments,
      categories
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Document.distinct('category', { owner: req.user.userId });
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

export const shareDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { documentId, email, permissions = 'view', expiresIn } = req.body;

    const document = await Document.findOne({
      _id: documentId,
      owner: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user exists (optional - can share with non-users via email)
    const sharedWithUser = await User.findOne({ email });

    let expiresAt;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
    }

    const share = new Share({
      document: documentId,
      sharedBy: req.user.userId,
      sharedWithEmail: email,
      sharedWith: sharedWithUser?._id,
      permissions,
      expiresAt
    });

    await share.save();

    // Get the sharer's information
    const sharer = await User.findById(req.user.userId).select('name email');

    // Send email notification
    try {
      await sendShareNotification(
        email,
        document.title,
        sharer.name,
        share.shareToken
      );
    } catch (emailError) {
      console.error('Error sending share notification:', emailError);
      // Don't fail the share if email fails
    }

    res.status(201).json({
      message: 'Document shared successfully',
      shareToken: share.shareToken,
      share: {
        id: share._id,
        sharedWithEmail: share.sharedWithEmail,
        permissions: share.permissions,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt
      }
    });

  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({
      message: 'Error sharing document',
      error: error.message
    });
  }
};

export const getSharedDocuments = async (req, res) => {
  try {
    // Documents shared by the user
    const sharedByMe = await Share.find({ sharedBy: req.user.userId })
      .populate('document', 'title category createdAt')
      .sort({ createdAt: -1 });

    // Documents shared with the user
    const sharedWithMe = await Share.find({ 
      $or: [
        { sharedWith: req.user.userId },
        { sharedWithEmail: req.user.email }
      ]
    })
      .populate('document', 'title category createdAt')
      .populate('sharedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      sharedByMe,
      sharedWithMe
    });

  } catch (error) {
    console.error('Get shared documents error:', error);
    res.status(500).json({
      message: 'Error fetching shared documents',
      error: error.message
    });
  }
};

export const revokeShare = async (req, res) => {
  try {
    const share = await Share.findOne({
      _id: req.params.shareId,
      sharedBy: req.user.userId
    });

    if (!share) {
      return res.status(404).json({ message: 'Share not found' });
    }

    await Share.findByIdAndDelete(share._id);

    res.json({ message: 'Share revoked successfully' });

  } catch (error) {
    console.error('Revoke share error:', error);
    res.status(500).json({
      message: 'Error revoking share',
      error: error.message
    });
  }
};

export const downloadSharedDocument = async (req, res) => {
  try {
    const { shareToken } = req.params;

    // Find the share by token
    const share = await Share.findOne({ 
      shareToken,
      isActive: true,
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null }
      ]
    }).populate('document');

    if (!share) {
      return res.status(404).json({ message: 'Shared document not found or expired' });
    }

    // Check permissions
    if (share.permissions !== 'download') {
      return res.status(403).json({ message: 'Download permission not granted' });
    }

    const document = share.document;

    // Check if file exists
    try {
      await fs.access(document.filePath);
    } catch {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Update access count and last accessed
    share.accessCount += 1;
    share.lastAccessed = new Date();
    await share.save();

    res.download(document.filePath, document.originalName);

  } catch (error) {
    console.error('Download shared document error:', error);
    res.status(500).json({
      message: 'Error downloading shared document',
      error: error.message
    });
  }
};