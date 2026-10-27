const mongoose = require('mongoose');

let isConnecting = false;

/**
 * Connect to MongoDB Atlas safely with retry handling and non-fatal fallback.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI is not set in environment. Running with disconnected database state.');
    return false;
  }

  // Already connected
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (isConnecting) {
    return false;
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Successfully connected to host: ${conn.connection.host}`);
    isConnecting = false;
    return true;
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    isConnecting = false;
    return false;
  }
};

/**
 * Disconnect cleanly (used during testing and graceful shutdown).
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected from database.');
  }
};

/**
 * Retrieve database connection telemetry without exposing credentials.
 */
const getDbStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const state = states[mongoose.connection.readyState] || 'unknown';
  const isConfigured = Boolean(process.env.MONGODB_URI);

  return {
    state,
    isConfigured,
    // Safely report host name only, never the full connection string or credentials
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};

// Event listeners for telemetry and diagnostics
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected successfully.');
});

module.exports = {
  connectDB,
  disconnectDB,
  getDbStatus,
};
