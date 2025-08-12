import mongoose from 'mongoose';
import Document from '../models/Document.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import SharedDocument from '../models/SharedDocument.js';

// Helper: Upload to Cloudinary from buffer
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) return reject(new Error('No file buffer provided'));

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'raw' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// Helper: Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Upload Document
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'documents');

    const document = await Document.create({
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      category: req.body.category || 'Uncategorized',
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      owner: req.user.id,
      tags: req.body.tags
        ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [],
      metadata: {
        uploadIP: req.ip,
        userAgent: req.headers['user-agent'] || ''
      },
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id
    });

    return res.status(201).json(document);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'Error uploading document' });
  }
};

// Get all documents for user
export const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ owner: req.user.id }).sort({ createdAt: -1 });
    return res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    return res.status(500).json({ message: 'Error fetching documents' });
  }
};

// Get single document
export const getDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!document) return res.status(404).json({ message: 'Document not found' });
    return res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    return res.status(500).json({ message: 'Error fetching document' });
  }
};

// Download document
export const downloadDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!document) return res.status(404).json({ message: 'Document not found' });
    return res.redirect(document.cloudinaryUrl);
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ message: 'Error downloading document' });
  }
};

// Update document metadata
export const updateDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: req.body },
      { new: true }
    );
    if (!document) return res.status(404).json({ message: 'Document not found' });
    return res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    return res.status(500).json({ message: 'Error updating document' });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    const document = await Document.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!document) return res.status(404).json({ message: 'Document not found' });

    try {
      await cloudinary.uploader.destroy(document.cloudinaryPublicId, { resource_type: 'raw' });
    } catch (cloudErr) {
      console.error('Cloudinary delete error:', cloudErr);
    }

    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({ message: 'Error deleting document' });
  }
};

// Dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const totalDocs = await Document.countDocuments({ owner: req.user.id });
    return res.json({ totalDocs });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ message: 'Error fetching stats' });
  }
};

// Get categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Document.distinct('category', { owner: req.user.id });
    return res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ message: 'Error fetching categories' });
  }
};

// Share document
export const shareDocument = async (req, res) => {
  try {
    const { documentId, email, permissions, expiresIn } = req.body;
    if (!isValidObjectId(documentId)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    const document = await Document.findOne({ _id: documentId, owner: req.user.id });
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const sharedDoc = await SharedDocument.create({
      document: document._id,
      email,
      permissions,
      shareToken: new mongoose.Types.ObjectId().toString(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null
    });

    return res.status(201).json(sharedDoc);
  } catch (error) {
    console.error('Share document error:', error);
    return res.status(500).json({ message: 'Error sharing document' });
  }
};

// Get shared documents
export const getSharedDocuments = async (req, res) => {
  try {
    const sharedDocs = await SharedDocument.find({ email: req.user.email }).populate('document');
    return res.json(sharedDocs);
  } catch (error) {
    console.error('Get shared docs error:', error);
    return res.status(500).json({ message: 'Error fetching shared documents' });
  }
};

// Revoke share
export const revokeShare = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.shareId)) {
      return res.status(400).json({ message: 'Invalid share ID' });
    }
    await SharedDocument.findByIdAndDelete(req.params.shareId);
    return res.json({ message: 'Share revoked successfully' });
  } catch (error) {
    console.error('Revoke share error:', error);
    return res.status(500).json({ message: 'Error revoking share' });
  }
};

// Download shared document
export const downloadSharedDocument = async (req, res) => {
  try {
    const sharedDoc = await SharedDocument.findOne({ shareToken: req.params.shareToken }).populate('document');
    if (!sharedDoc) return res.status(404).json({ message: 'Shared document not found' });
    return res.redirect(sharedDoc.document.cloudinaryUrl);
  } catch (error) {
    console.error('Download shared doc error:', error);
    return res.status(500).json({ message: 'Error downloading shared document' });
  }
};

// View shared document
export const viewSharedDocument = async (req, res) => {
  try {
    const sharedDoc = await SharedDocument.findOne({ shareToken: req.params.shareToken }).populate('document');
    if (!sharedDoc) return res.status(404).json({ message: 'Shared document not found' });
    return res.redirect(sharedDoc.document.cloudinaryUrl);
  } catch (error) {
    console.error('View shared doc error:', error);
    return res.status(500).json({ message: 'Error viewing shared document' });
  }
};
