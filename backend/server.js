import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentRoutes from './routes/document.js';

dotenv.config();
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

//  Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  Health check
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

//  Routes
app.use('/api/documents', documentRoutes);

//  Export for Vercel
export default app;
