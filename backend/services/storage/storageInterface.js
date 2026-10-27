/**
 * Abstract Private Storage Provider Interface.
 * Allows seamless replacement of local filesystem storage with S3/GCS/Azure Blob in production.
 */
class IStorageProvider {
  /**
   * Save private document buffer.
   * @param {Object} options
   * @param {Buffer} options.buffer
   * @param {string} options.originalFileName
   * @param {string} options.mimeType
   * @param {string} options.patientId
   * @returns {Promise<{ storageKey: string, fileSizeBytes: number, mimeType: string }>}
   */
  async saveDocument(options) {
    throw new Error('IStorageProvider.saveDocument must be implemented.');
  }

  /**
   * Retrieve readable stream for secure downloading.
   * @param {string} storageKey
   * @returns {Promise<{ stream: NodeJS.ReadableStream, mimeType: string, fileSizeBytes: number, safeFileName: string }>}
   */
  async getDocumentStream(storageKey) {
    throw new Error('IStorageProvider.getDocumentStream must be implemented.');
  }

  /**
   * Delete private document.
   * @param {string} storageKey
   * @returns {Promise<boolean>}
   */
  async deleteDocument(storageKey) {
    throw new Error('IStorageProvider.deleteDocument must be implemented.');
  }
}

module.exports = IStorageProvider;
