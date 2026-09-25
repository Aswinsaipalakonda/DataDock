require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const materialRoutes = require('./routes/materialRoutes');
const userRoutes = require('./routes/userRoutes');
const taxonomyRoutes = require('./routes/taxonomyRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const examRoutes = require('./routes/examRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { uploadBaseDir } = require('./middleware/upload');
require('./database/backup');

const server = express();
const port = parseInt(process.env.PORT || process.env.SERVER_PORT || '5000', 10);

// Ensure upload directory exists
if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}

// 1. CORS Configuration (Supports both localhost and custom domain cookies)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  process.env.FRONTEND_URL,
].filter(Boolean);

server.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/self-hosted
    },
    credentials: true,
  })
);

// 2. Request Parsing Middleware
server.use(express.json({ limit: '50mb' }));
server.use(express.urlencoded({ extended: true, limit: '50mb' }));
server.use(cookieParser());

// 3. Static Uploads Serving
server.use('/uploads/materials', express.static(uploadBaseDir));

// 4. API Endpoints
server.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DE E-Learn Node.js/Express API',
    database: 'MySQL',
  });
});

server.use('/api/auth', authRoutes);
server.use('/api/materials', materialRoutes);
server.use('/api/users', userRoutes);
server.use('/api/taxonomy', taxonomyRoutes);
server.use('/api/inquiries', inquiryRoutes);
server.use('/api/announcements', announcementRoutes);
server.use('/api/exams', examRoutes);
server.use('/api/analytics', analyticsRoutes);

// Global Error Handler
server.use((err, req, res, next) => {
  console.error('Server Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Optional Next.js Unified Handler (for Hostinger single-process deployment)
const startServer = async () => {
  if (process.env.SERVE_NEXTJS === 'true') {
    try {
      const next = require('next');
      const dev = process.env.NODE_ENV !== 'production';
      const nextApp = next({ dev });
      const handle = nextApp.getRequestHandler();

      await nextApp.prepare();
      server.all('*', (req, res) => handle(req, res));
      console.log('✓ Next.js request handler mounted on Express.');
    } catch (err) {
      console.warn('Next.js unified mount bypassed:', err.message);
    }
  }

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 DE E-Learn Express API running at: http://localhost:${port}`);
    console.log(`🏥 Health check:                      http://localhost:${port}/api/health`);
    console.log(`📁 Uploads stored at:                 ${uploadBaseDir}`);
    console.log(`======================================================\n`);
  });
};

startServer();

module.exports = server;
