/**
 * Centralized error handling middleware.
 * Formats Mongoose, Zod, and standard application errors with appropriate HTTP status codes.
 */
const errorHandler = (err, req, res, next) => {
  // Safe logging: log message and stack in development
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${err.name || 'ApplicationError'}: ${err.message}`);
  }

  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let errorTitle = 'Internal Server Error';
  let message = err.message || 'An unexpected server error occurred.';
  let details = undefined;

  // Handle Zod Validation Error (if reaching global handler)
  if (err.name === 'ZodError') {
    statusCode = 400;
    errorTitle = 'Validation Error';
    const issues = err.issues || err.errors || [];
    details = issues.map((e) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
      message: e.message,
    }));
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorTitle = 'Mongoose Validation Error';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle Mongoose Cast Error (Invalid ObjectId or type)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorTitle = 'Resource Malformed';
    message = `Invalid value for parameter: ${err.path}`;
  }

  // Handle MongoDB Duplicate Key (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    errorTitle = 'Conflict';
    const field = Object.keys(err.keyValue || {})[0];
    message = `A record with this ${field || 'identifier'} already exists.`;
  }

  res.status(statusCode).json({
    success: false,
    error: errorTitle,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
