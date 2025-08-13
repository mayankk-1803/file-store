// backend/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';

import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';

dotenv.config();

const app = express();

// ✅ Important for Vercel/proxies + express-rate-limit
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS (allow Authorization header)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (standard headers for proxies)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check & root
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
);
app.get('/', (req, res) => res.send('Backend server is running!'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Multer/fileFilter error safety net
app.use((err, req, res, next) => {
  if (err?.message?.toLowerCase().includes('only pdf, word')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res
    .status(500)
    .json({ message: 'Internal server error', detail: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Start DB then (local dev) server
await connectDB();

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

// Vercel handler
const server = createServer(app);
export default function handler(req, res) {
  server.emit('request', req, res);
}
