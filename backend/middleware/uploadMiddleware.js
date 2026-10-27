const multer = require('multer');

// Memory storage to inspect and validate magic bytes before committing to disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB strict limit
    files: 1, // Single file upload per request
  },
});

const uploadDocumentMiddleware = (fieldName = 'document') => {
  const singleUpload = upload.single(fieldName);

  return (req, res, next) => {
    singleUpload(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'FILE_TOO_LARGE',
            message: 'Uploaded file exceeds the 15MB maximum allowable size.',
          });
        }
        return res.status(400).json({
          success: false,
          error: 'UPLOAD_ERROR',
          message: err.message || 'Failed to process document upload.',
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadDocumentMiddleware,
};
