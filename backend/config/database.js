// backend/config/database.js
import mongoose from 'mongoose';

export default async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  // Driver v4+: useNewUrlParser/useUnifiedTopology no longer needed
  if (mongoose.connection.readyState >= 1) return;

  await mongoose.connect(uri);
  console.log(' MongoDB connected');
}
