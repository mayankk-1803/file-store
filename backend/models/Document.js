import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['education', 'healthcare', 'government', 'finance', 'transport', 'other'],
    lowercase: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    uploadIP: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Index for better search performance
documentSchema.index({ title: 'text', description: 'text', tags: 'text' });
documentSchema.index({ owner: 1, category: 1 });
documentSchema.index({ createdAt: -1 });

export default mongoose.model('Document', documentSchema);