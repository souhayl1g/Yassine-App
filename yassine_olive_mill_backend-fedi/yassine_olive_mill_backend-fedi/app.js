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

// CORS configuration - SINGLE CONFIGURATION
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173',
    'http://192.168.1.22:5173',  // Add your actual frontend IP
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
      'processing-decisions': '/api/processing-decisions',
      'pressing-sessions': '/api/pressing-sessions',
      'oil-batches': '/api/oil-batches',
      'quality-tests': '/api/quality-tests',
      invoices: '/api/invoices',
      payments: '/api/payments',
      employees: '/api/employees',
      prices: '/api/prices',
      dashboard: '/api/dashboard'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
const HOST = 'localhost';

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Sync database
    await sequelize.sync({ 
      force: false,
      alter: false,
      logging: false
    });
    
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