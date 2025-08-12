import Document from '../models/Document.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import SharedDocument from '../models/SharedDocument.js';

// Helper: Upload to Cloudinary from buffer
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// Upload Document
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' });

    const result = await uploadToCloudinary(req.file.buffer, 'documents');

    const document = new Document({
      title: req.body.title || req.file.originalname,
      description: req.body.description,
      category: req.body.category,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      owner: req.user.id,
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
      metadata: {
        uploadIP: req.ip,
        userAgent: req.headers['user-agent']
      },
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id
    });

    await document.save();
    res.status(201).json(document);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading document' });
  }
};

// Get all documents for user
export const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents' });
  }
};

// Get single document
export const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching document' });
  }
};

// Download document
export const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.redirect(document.cloudinaryUrl); // Let Cloudinary serve the file
  } catch (error) {
    res.status(500).json({ message: 'Error downloading document' });
  }
};

// Update document metadata
export const updateDocument = async (req, res) => {
  try {
    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: req.body },
      { new: true }
    );
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: 'Error updating document' });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!document) return res.status(404).json({ message: 'Document not found' });

    // Remove from Cloudinary
    await cloudinary.uploader.destroy(document.cloudinaryPublicId, { resource_type: 'raw' });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document' });
  }
};

// Dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const totalDocs = await Document.countDocuments({ owner: req.user.id });
    res.json({ totalDocs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

// Get categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Document.distinct('category', { owner: req.user.id });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

// Share document
export const shareDocument = async (req, res) => {
  try {
    const { documentId, email, permissions, expiresIn } = req.body;
    const document = await Document.findOne({ _id: documentId, owner: req.user.id });
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const sharedDoc = new SharedDocument({
      document: document._id,
      email,
      permissions,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null
    });

    await sharedDoc.save();
    res.status(201).json(sharedDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error sharing document' });
  }
};

// Get shared documents
export const getSharedDocuments = async (req, res) => {
  try {
    const sharedDocs = await SharedDocument.find({ email: req.user.email }).populate('document');
    res.json(sharedDocs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shared documents' });
  }
};

// Revoke share
export const revokeShare = async (req, res) => {
  try {
    await SharedDocument.findByIdAndDelete(req.params.shareId);
    res.json({ message: 'Share revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error revoking share' });
  }
};

// Download shared document
export const downloadSharedDocument = async (req, res) => {
  try {
    const sharedDoc = await SharedDocument.findOne({ shareToken: req.params.shareToken }).populate('document');
    if (!sharedDoc) return res.status(404).json({ message: 'Shared document not found' });
    res.redirect(sharedDoc.document.cloudinaryUrl);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading shared document' });
  }
};

// View shared document inline
export const viewSharedDocument = async (req, res) => {
  try {
    const sharedDoc = await SharedDocument.findOne({ shareToken: req.params.shareToken }).populate('document');
    if (!sharedDoc) return res.status(404).json({ message: 'Shared document not found' });
    res.redirect(sharedDoc.document.cloudinaryUrl);
  } catch (error) {
    res.status(500).json({ message: 'Error viewing shared document' });
  }
};
