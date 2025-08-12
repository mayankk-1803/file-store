import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import connectDB from './config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Connect to DB before handling requests (wrapped in async function)
async function startServer() {
  await connectDB();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Root route - useful for "Cannot GET /" message
  app.get('/', (req, res) => {
    res.send('Backend server is running!');
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      message: 'Something went wrong!',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
  });

  // Only listen in non-production (local dev)
  if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// Start DB connection and server setup
await startServer();

// Create HTTP server instance for Vercel
const server = createServer(app);

// Export handler for Vercel serverless
export default function handler(req, res) {
  server.emit('request', req, res);
}
