import mongoose from 'mongoose';
import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';
import Document from '../models/Document.js';
import SharedDocument from '../models/Share.js';
import { validationResult } from 'express-validator';

// Upload to Cloudinary from buffer
const uploadToCloudinary = (fileBuffer, folder) =>
  new Promise((resolve, reject) => {
    if (!fileBuffer) return reject(new Error('No file buffer provided'));

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'raw' }, // raw for any file type
      (error, result) => (error ? reject(error) : resolve(result))
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── Upload Document ──────────────────────────────────────────────
export const uploadDocument = async (req, res) => {
  try {
    console.log('Authenticated user:', req.user);
    console.log('File received:', req.file);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    // Upload file to Cloudinary
    const cloudResult = await uploadToCloudinary(file.buffer, 'documents');
    console.log('Cloudinary upload result:', cloudResult);

    // Save document in MongoDB
    const doc = await Document.create({
      owner: req.user.userId,
      name: file.originalname,
      fileUrl: cloudResult.secure_url,
      cloudinaryId: cloudResult.public_id,
      mimeType: file.mimetype,
      size: file.size,
      category: req.body.category || 'other',
      description: req.body.description || '',
    });

    res.status(201).json({ message: 'Document uploaded successfully', document: doc });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Document upload failed', error: err.message });
  }
};

// ── Get all documents ────────────────────────────────────────────
export const getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.user.userId }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Error fetching documents' });
  }
};

// ── Get single document ──────────────────────────────────────────
export const getDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid document ID' });

    const doc = await Document.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    res.json(doc);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Error fetching document' });
  }
};

// ── Download document ────────────────────────────────────────────
export const downloadDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid document ID' });

    const doc = await Document.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    res.redirect(doc.fileUrl);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Error downloading document' });
  }
};

// ── Update document metadata ─────────────────────────────────────
export const updateDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid document ID' });

    const updated = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { $set: req.body },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Document not found' });
    res.json(updated);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ message: 'Error updating document' });
  }
};

// ── Delete document ──────────────────────────────────────────────
export const deleteDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid document ID' });

    const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.user.userId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    try {
      await cloudinary.uploader.destroy(doc.cloudinaryId, { resource_type: 'raw' });
    } catch (cloudErr) {
      console.error('Cloudinary delete error:', cloudErr);
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Error deleting document' });
  }
};

// ── Dashboard stats ──────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const totalDocs = await Document.countDocuments({ owner: req.user.userId });
    res.json({ totalDocs });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

// ── Get distinct categories ──────────────────────────────────────
export const getCategories = async (req, res) => {
  try {
    const categories = await Document.distinct('category', { owner: req.user.userId });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

// ── Share document ───────────────────────────────────────────────
export const shareDocument = async (req, res) => {
  try {
    const { documentId, email, permissions, expiresIn } = req.body;

    if (!isValidObjectId(documentId)) return res.status(400).json({ message: 'Invalid document ID' });

    const doc = await Document.findOne({ _id: documentId, owner: req.user.userId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const sharedDoc = await SharedDocument.create({
      document: doc._id,
      email,
      permissions,
      shareToken: new mongoose.Types.ObjectId().toString(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null,
    });

    res.status(201).json(sharedDoc);
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({ message: 'Error sharing document' });
  }
};

// ── Get shared documents ─────────────────────────────────────────
export const getSharedDocuments = async (req, res) => {
  try {
    const shared = await SharedDocument.find({ email: req.user.email }).populate('document');
    res.json(shared);
  } catch (error) {
    console.error('Get shared docs error:', error);
    res.status(500).json({ message: 'Error fetching shared documents' });
  }
};

// ── Revoke share ─────────────────────────────────────────────────
export const revokeShare = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.shareId)) return res.status(400).json({ message: 'Invalid share ID' });

    await SharedDocument.findByIdAndDelete(req.params.shareId);
    res.json({ message: 'Share revoked successfully' });
  } catch (error) {
    console.error('Revoke share error:', error);
    res.status(500).json({ message: 'Error revoking share' });
  }
};

// ── Download/view via share token ────────────────────────────────
export const downloadSharedDocument = async (req, res) => {
  try {
    const sharedDoc = await SharedDocument.findOne({ shareToken: req.params.shareToken }).populate('document');
    if (!sharedDoc) return res.status(404).json({ message: 'Shared document not found' });
    res.redirect(sharedDoc.document.fileUrl);
  } catch (error) {
    console.error('Download shared doc error:', error);
    res.status(500).json({ message: 'Error downloading shared document' });
  }
};

export const viewSharedDocument = async (req, res) => {
  try {
    const sharedDoc = await SharedDocument.findOne({ shareToken: req.params.shareToken }).populate('document');
    if (!sharedDoc) return res.status(404).json({ message: 'Shared document not found' });
    res.redirect(sharedDoc.document.fileUrl);
  } catch (error) {
    console.error('View shared doc error:', error);
    res.status(500).json({ message: 'Error viewing shared document' });
  }
};
