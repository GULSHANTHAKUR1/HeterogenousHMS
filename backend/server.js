const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const configuredCors = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { connectDB, disconnectDB } = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database connection (non-fatal if disconnected)
connectDB();

const cookieParser = require('cookie-parser');

// Security and standard middlewares
app.use(helmet());
app.use(configuredCors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check routes
app.use('/health', require('./routes/healthRoutes'));
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/v1/health', require('./routes/healthRoutes'));

// Apply standard API rate limiter to API routes (except in test mode)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/', apiLimiter);
}

// Auth routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// Patient routes
app.use('/api/v1/patients', require('./routes/patientRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Heterogeneous HMS Backend API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Centralized error handling
app.use(errorHandler);

let server = null;

// Only start active port listener if not in automated test mode
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`[Heterogeneous HMS Backend] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  const handleShutdown = async (signal) => {
    console.log(`\n[Shutdown] Received ${signal}. Closing HTTP server and database connections...`);
    if (server) {
      server.close(async () => {
        console.log('[Shutdown] HTTP server closed.');
        await disconnectDB();
        console.log('[Shutdown] Graceful cleanup complete. Exiting.');
        process.exit(0);
      });
    } else {
      await disconnectDB();
      process.exit(0);
    }
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

module.exports = { app, server };
