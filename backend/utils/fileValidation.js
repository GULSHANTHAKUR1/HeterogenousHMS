const path = require('path');

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);

/**
 * Magic numbers (file signatures) to detect real content regardless of spoofed extensions.
 */
const FILE_SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  jpeg: [0xff, 0xd8, 0xff],       // JPEG SOI
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG Header
};

/**
 * Validate buffer magic numbers against expected file signatures.
 */
const detectMagicMimeType = (buffer) => {
  if (!buffer || buffer.length < 4) return null;

  // Check PDF
  if (
    buffer[0] === FILE_SIGNATURES.pdf[0] &&
    buffer[1] === FILE_SIGNATURES.pdf[1] &&
    buffer[2] === FILE_SIGNATURES.pdf[2] &&
    buffer[3] === FILE_SIGNATURES.pdf[3]
  ) {
    return 'application/pdf';
  }

  // Check JPEG
  if (
    buffer[0] === FILE_SIGNATURES.jpeg[0] &&
    buffer[1] === FILE_SIGNATURES.jpeg[1] &&
    buffer[2] === FILE_SIGNATURES.jpeg[2]
  ) {
    return 'image/jpeg';
  }

  // Check PNG
  if (
    buffer.length >= 8 &&
    buffer[0] === FILE_SIGNATURES.png[0] &&
    buffer[1] === FILE_SIGNATURES.png[1] &&
    buffer[2] === FILE_SIGNATURES.png[2] &&
    buffer[3] === FILE_SIGNATURES.png[3] &&
    buffer[4] === FILE_SIGNATURES.png[4] &&
    buffer[5] === FILE_SIGNATURES.png[5] &&
    buffer[6] === FILE_SIGNATURES.png[6] &&
    buffer[7] === FILE_SIGNATURES.png[7]
  ) {
    return 'image/png';
  }

  return null;
};

/**
 * Sanitize original filename removing directory traversal characters.
 */
const sanitizeFileName = (fileName) => {
  if (!fileName) return 'unnamed_document.pdf';
  const basename = path.basename(fileName);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Complete document validation check (size, extension, mime, magic bytes).
 */
const validateUploadedDocument = (file) => {
  if (!file) {
    const error = new Error('No document file was uploaded.');
    error.status = 400;
    error.code = 'FILE_MISSING';
    throw error;
  }

  // 1. File size check
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const error = new Error(`File size exceeds 15MB limit. Uploaded size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    error.status = 400;
    error.code = 'FILE_TOO_LARGE';
    throw error;
  }

  // 2. Extension check
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error(`File extension "${ext}" is not permitted. Only PDF, PNG, and JPEG documents are accepted.`);
    error.status = 400;
    error.code = 'INVALID_FILE_EXTENSION';
    throw error;
  }

  // 3. MIME type header check
  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    const error = new Error(`MIME type "${file.mimetype}" is not permitted.`);
    error.status = 400;
    error.code = 'INVALID_MIME_TYPE';
    throw error;
  }

  // 4. File signature (magic bytes) validation - Do not trust extension or client MIME alone!
  const detectedMime = detectMagicMimeType(file.buffer);
  if (!detectedMime) {
    const error = new Error('File content signature does not match any valid medical document format (PDF, PNG, JPEG). The file may be corrupted or disguised.');
    error.status = 400;
    error.code = 'INVALID_FILE_SIGNATURE';
    throw error;
  }

  // Ensure extension matches detected real signature
  if (detectedMime === 'application/pdf' && ext !== '.pdf') {
    const error = new Error('Mismatched file extension and detected content format.');
    error.status = 400;
    error.code = 'FORMAT_MISMATCH';
    throw error;
  }
  if ((detectedMime === 'image/jpeg' || detectedMime === 'image/png') && ext === '.pdf') {
    const error = new Error('Image file disguised with .pdf extension is not permitted.');
    error.status = 400;
    error.code = 'FORMAT_MISMATCH';
    throw error;
  }

  return {
    valid: true,
    safeFileName: sanitizeFileName(file.originalname),
    detectedMime,
    fileSizeBytes: file.size,
  };
};

module.exports = {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  detectMagicMimeType,
  sanitizeFileName,
  validateUploadedDocument,
};
