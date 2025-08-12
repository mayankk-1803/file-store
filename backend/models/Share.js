import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWithEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  sharedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  permissions: {
    type: String,
    enum: ['view', 'download'],
    default: 'view'
  },
  expiresAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessed: Date,
  shareToken: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Generate share token before saving
shareSchema.pre('save', function(next) {
  if (this.isNew) {
    this.shareToken = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
  }
  next();
});

export default mongoose.model('Share', shareSchema);