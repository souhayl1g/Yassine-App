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

// Private Network Access (PNA) preflight: allow Vercel (HTTPS) to call local HTTP (LAN)
app.use((req, res, next) => {
  if (
    req.method === 'OPTIONS' &&
    req.headers['access-control-request-private-network'] === 'true'
  ) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});

// CORS configuration - allow local dev, LAN, and optional Vercel domains via env
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
];

// Include LAN origins if provided via env (comma-separated), e.g. http://192.168.1.31:5173
if (process.env.CORS_EXTRA_ORIGINS) {
  DEFAULT_ALLOWED_ORIGINS.push(
    ...process.env.CORS_EXTRA_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  );
}

// Include Vercel preview/prod domains if provided
if (process.env.ALLOWED_VERCEL_ORIGINS) {
  DEFAULT_ALLOWED_ORIGINS.push(
    ...process.env.ALLOWED_VERCEL_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  );
}

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser tools
    const allowed = DEFAULT_ALLOWED_ORIGINS.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        // convert wildcard to regex
        const pattern = allowedOrigin.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowedOrigin === origin;
    });
    if (allowed) return callback(null, true);
    // Allow Vercel default domains by pattern if not explicitly set
    if (/https?:\/\/.*vercel\.app$/i.test(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
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

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

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
      console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard/overview`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 If on LAN, try: http://<YOUR-LAN-IP>:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

export default app;
