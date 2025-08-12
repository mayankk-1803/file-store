import fs from 'fs';
import path from 'path';
import Document from '../models/Document.js';
import SharedDocument from '../models/SharedDocument.js';
import mongoose from 'mongoose';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✅ Created uploads folder at: ${uploadDir}`);
}

/**
 * Upload document
 */
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const newDoc = new Document({
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      category: req.body.category,
      filename: req.file.filename,
      filePath: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      owner: req.user.userId, // ✅ Consistent owner field
      metadata: {
        uploadIP: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await newDoc.save();
    res.status(201).json({ message: 'File uploaded successfully', document: newDoc });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all documents for the logged-in user
 */
export const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ owner: req.user.userId }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get single document
 */
export const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Download document
 */
export const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const filePath = document.filePath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(filePath, document.originalName);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update document
 */
export const updateDocument = async (req, res) => {
  try {
    const updated = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { $set: req.body },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ message: 'Document updated successfully', document: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete document
 */
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from disk
    if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Dashboard stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    const count = await Document.countDocuments({ owner: req.user.userId });
    res.json({ totalDocuments: count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Categories
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await Document.distinct('category', { owner: req.user.userId });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Share document
 */
export const shareDocument = async (req, res) => {
  try {
    const { documentId, email, permissions, expiresIn } = req.body;

    const document = await Document.findOne({
      _id: documentId,
      owner: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : null;

    const sharedDoc = new SharedDocument({
      document: document._id,
      sharedWithEmail: email,
      permissions,
      expiresAt,
      isActive: true
    });

    await sharedDoc.save();
    res.status(201).json({ message: 'Document shared successfully', shareToken: sharedDoc._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get shared documents for logged-in user
 */
export const getSharedDocuments = async (req, res) => {
  try {
    const sharedDocs = await SharedDocument.find({
      sharedWithEmail: req.user.email,
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    }).populate('document');

    res.json(sharedDocs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Revoke share
 */
export const revokeShare = async (req, res) => {
  try {
    const updated = await SharedDocument.findByIdAndUpdate(
      req.params.shareId,
      { isActive: false },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Share not found' });
    }

    res.json({ message: 'Share revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Download shared document
 */
export const downloadSharedDocument = async (req, res) => {
  try {
    const sharedDoc = await SharedDocument.findOne({
      _id: req.params.shareToken,
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    }).populate('document');

    if (!sharedDoc) {
      return res.status(404).json({ message: 'Shared document not found or expired' });
    }

    const filePath = sharedDoc.document.filePath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(filePath, sharedDoc.document.originalName);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * View shared document inline
 */
export const viewSharedDocument = async (req, res) => {
  try {
    const sharedDoc = await SharedDocument.findOne({
      _id: req.params.shareToken,
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    }).populate('document');

    if (!sharedDoc) {
      return res.status(404).json({ message: 'Shared document not found or expired' });
    }

    const filePath = sharedDoc.document.filePath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.set({
      'Content-Type': sharedDoc.document.mimeType,
      'Content-Disposition': `inline; filename="${sharedDoc.document.originalName}"`,
      'Content-Length': sharedDoc.document.size
    });

    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
