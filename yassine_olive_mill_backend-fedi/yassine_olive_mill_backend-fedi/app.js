import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();

// Import middleware
import logger from "./middleware/logger.js";
import errorHandler from "./middleware/errorHandler.js";
import { verifyToken } from "./middleware/auth.js";

// Import routes
import apiRoutes from "./routes/index.js";
import authRoutes from "./routes/auth.js";

// Import database
import db from "./models/index.js";
const { sequelize } = db;

const app = express();

// CORS configuration - Support for ngrok and Vercel
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:5173',
  'https://localhost:5173',
  'http://192.168.1.22:5173',
  'http://127.0.0.1:5173',
  'https://yassine-olive-mill-app.vercel.app',  // Vercel production
  'https://yassine-olive-mill-app-*.vercel.app'  // Vercel preview deployments
];

// Dynamic CORS for ngrok (allows any ngrok URL)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Check if origin is an ngrok URL
    if (origin.includes('.ngrok-free.app') || origin.includes('.ngrok.io')) {
      return callback(null, true);
    }
    
    // Check if origin matches Vercel pattern
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ngrok header middleware - Add ngrok-skip-browser-warning header
app.use((req, res, next) => {
  // Allow ngrok to skip browser warning
  if (req.headers['ngrok-skip-browser-warning']) {
    res.setHeader('ngrok-skip-browser-warning', '1');
  }
  next();
});

// Logging middleware
app.use(logger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Public routes (auth routes should NOT require token)
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api', verifyToken, apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🫒 Olive Oil Mill Management API',
    version: '1.0.0',
    endpoints: {
      clients: '/api/clients',
      batches: '/api/batches',
      'pressing-sessions': '/api/pressing-sessions',
      'oil-batches': '/api/oil-batches',
      'quality-tests': '/api/quality-tests',
      invoices: '/api/invoices',
      payments: '/api/payments',
      employees: '/api/employees',
      prices: '/api/prices',
      dashboard: '/api/dashboard',
      users: '/api/users'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Sync database - normal sync mode for regular operation
    await sequelize.sync();
    
    console.log('✅ Database synchronized');
    
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Olive Oil Mill API server running on port ${PORT}`);
      console.log(`📊 Dashboard: http://${HOST}:${PORT}/api/dashboard/overview`);
      console.log(`🏥 Health check: http://${HOST}:${PORT}/api/health`);
      console.log(`🌐 Server accessible from: http://192.168.1.31:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

export default app;
