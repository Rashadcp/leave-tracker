import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Auto-reload environment
dotenv.config();
import fs from 'fs';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve frontend static files if client build exists (production single-host deployment)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Root info when running API-only
  app.get('/', (req, res) => {
    res.json({
      message: 'Winshine Leave Management API Server',
      status: 'running',
      frontend: process.env.DOMAIN || 'http://localhost:5173',
      timestamp: new Date()
    });
  });
}

// Connect DB & Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Leave Management API running at http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch(err => {
  console.error('[Server Error] Startup failed:', err);
});
