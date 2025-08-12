import Document from '../models/Document.js';
import Share from '../models/Share.js';
import User from '../models/User.js';
import { sendShareNotification } from '../utils/email.js';
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
      data: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
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
        size: document.size,
        createdAt: document.createdAt
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
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
      .select('-data');  // exclude file buffer

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
    }).select('-data');  // exclude file buffer

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

    if (!document.data || !document.mimeType) {
      return res.status(404).json({ message: 'Document data not found' });
    }

    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.originalName}"`,
      'Content-Length': document.size
    });

    return res.send(document.data);

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

    const totalDocuments = await Document.countDocuments({ owner: userId });

    const recentDocuments = await Document.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category createdAt');

    const sharedDocuments = await Share.countDocuments({
      sharedBy: userId,
      isActive: true
    });

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

    const sharer = await User.findById(req.user.userId).select('name email');

    try {
      await sendShareNotification(
        email,
        document.title,
        sharer.name,
        share.shareToken
      );
    } catch (emailError) {
      console.error('Error sending share notification:', emailError);
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
    const sharedByMe = await Share.find({ sharedBy: req.user.userId })
      .populate('document', 'title category createdAt')
      .sort({ createdAt: -1 });

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

    if (share.permissions !== 'download') {
      return res.status(403).json({ message: 'Download permission not granted' });
    }

    const document = share.document;

    if (!document.data || !document.mimeType) {
      return res.status(404).json({ message: 'Document data not found' });
    }

    share.accessCount = (share.accessCount || 0) + 1;
    share.lastAccessed = new Date();
    await share.save();

    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.originalName}"`,
      'Content-Length': document.size
    });

    return res.send(document.data);

  } catch (error) {
    console.error('Download shared document error:', error);
    res.status(500).json({
      message: 'Error downloading shared document',
      error: error.message
    });
  }
};

// New controller to view shared document inline
export const viewSharedDocument = async (req, res) => {
  try {
    const { shareToken } = req.params;

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

    // Check if permission allows viewing (either 'view' or 'download')
    if (!['view', 'download'].includes(share.permissions)) {
      return res.status(403).json({ message: 'View permission not granted' });
    }

    const document = share.document;

    if (!document.data || !document.mimeType) {
      return res.status(404).json({ message: 'Document data not found' });
    }

    // Update access info
    share.accessCount = (share.accessCount || 0) + 1;
    share.lastAccessed = new Date();
    await share.save();

    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `inline; filename="${document.originalName}"`,
      'Content-Length': document.size
    });

    return res.send(document.data);

  } catch (error) {
    console.error('View shared document error:', error);
    res.status(500).json({
      message: 'Error viewing shared document',
      error: error.message
    });
  }
};
