const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();

// Database Connection
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Robust Express 5 CORS Middleware: Dynamically reflects incoming origin (e.g. Vercel) and handles OPTIONS
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

const corsOptions = {
  origin: true, // Express cors reflects req.header('Origin')
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'CampusDesk Student Support & Ticket Management API is live on Render',
    health: '/api/health',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Student Support & Ticket Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at ${req.originalUrl}`,
  });
});

// Central Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Server] Campus Support API running on port ${PORT}`);
  });
}

module.exports = app;
