import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['education', 'healthcare', 'government', 'finance', 'transport', 'other'],
    lowercase: true
  },
  fileUrl: { type: String, required: true }, // Cloudinary file URL
  cloudinaryId: { type: String, required: true }, // for deleting later
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isEncrypted: { type: Boolean, default: false },
  tags: [{ type: String, trim: true }],
  metadata: {
    uploadIP: String,
    userAgent: String
  }
}, { timestamps: true });

documentSchema.index({ title: 'text', description: 'text', tags: 'text' });
documentSchema.index({ owner: 1, category: 1 });
documentSchema.index({ createdAt: -1 });

export default mongoose.model('Document', documentSchema);
