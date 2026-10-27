const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const IStorageProvider = require('./storageInterface');
const { sanitizeFileName } = require('../../utils/fileValidation');

class LocalStorageProvider extends IStorageProvider {
  constructor(customStorageDir) {
    super();
    // Private directory outside the public web path
    this.storageDir = customStorageDir || path.resolve(__dirname, '../../storage/uploads/private');

    // Ensure private storage directory exists with restricted permissions
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Save file buffer with randomized collision-resistant name.
   */
  async saveDocument({ buffer, originalFileName, mimeType, patientId }) {
    const ext = path.extname(originalFileName).toLowerCase();
    const safePid = patientId.replace(/[^a-zA-Z0-9_-]/g, '');
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const storageKey = `${safePid}_${Date.now()}_${randomSuffix}${ext}`;

    const destinationPath = this._resolveSafePath(storageKey);

    await fs.promises.writeFile(destinationPath, buffer);

    return {
      storageKey,
      fileSizeBytes: buffer.length,
      mimeType,
      savedAt: new Date(),
    };
  }

  /**
   * Stream document file buffer for authorized streaming.
   */
  async getDocumentStream(storageKey) {
    const safePath = this._resolveSafePath(storageKey);

    if (!fs.existsSync(safePath)) {
      const error = new Error('Document file not found in storage.');
      error.status = 404;
      error.code = 'DOCUMENT_FILE_NOT_FOUND';
      throw error;
    }

    const stat = await fs.promises.stat(safePath);
    const stream = fs.createReadStream(safePath);
    const ext = path.extname(storageKey).toLowerCase();

    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

    return {
      stream,
      fileSizeBytes: stat.size,
      mimeType,
      safeFileName: sanitizeFileName(storageKey),
    };
  }

  /**
   * Delete document.
   */
  async deleteDocument(storageKey) {
    try {
      const safePath = this._resolveSafePath(storageKey);
      if (fs.existsSync(safePath)) {
        await fs.promises.unlink(safePath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[LocalStorageProvider] Could not delete ${storageKey}:`, err.message);
      return false;
    }
  }

  /**
   * Strict path traversal prevention:
   * Resolves storage path and ensures it stays strictly within this.storageDir.
   */
  _resolveSafePath(storageKey) {
    const sanitizedKey = path.basename(storageKey);
    const resolvedPath = path.resolve(this.storageDir, sanitizedKey);

    // Defense-in-depth against directory traversal
    if (!resolvedPath.startsWith(this.storageDir)) {
      const error = new Error('Security alert: Directory traversal attempt detected.');
      error.status = 400;
      error.code = 'PATH_TRAVERSAL_ATTEMPT';
      throw error;
    }

    return resolvedPath;
  }
}

module.exports = LocalStorageProvider;
