const { getDbStatus } = require('../config/db');

/**
 * Health check controller reporting server availability and database connectivity.
 * Credentials and raw connection strings are never exposed.
 */
const getHealthStatus = (req, res) => {
  const dbStatus = getDbStatus();

  res.status(200).json({
    success: true,
    service: 'Heterogeneous HMS Node.js Core Backend',
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: {
      status: dbStatus.state,
      configured: dbStatus.isConfigured,
      cluster: dbStatus.host ? 'Connected (Host verified)' : 'Unavailable / Offline',
    },
    services: {
      frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
      ocr_service: process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8000',
    },
  });
};

module.exports = {
  getHealthStatus,
};
