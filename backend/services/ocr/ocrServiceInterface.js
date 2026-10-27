/**
 * Abstract OCR & NLP Microservice Interface.
 * Defines the contract for communicating with the Python FastAPI OCR service.
 */
class IOcrService {
  /**
   * Enqueue a medical document for OCR extraction and NLP entity recognition.
   * @param {Object} options
   * @param {string} options.reportId
   * @param {string} options.patientId
   * @param {string} options.storageKey
   * @param {string} options.mimeType
   * @returns {Promise<{ taskId: string, processingStatus: string }>}
   */
  async enqueueDocument(options) {
    throw new Error('IOcrService.enqueueDocument must be implemented.');
  }

  /**
   * Check processing status of an enqueued document.
   * @param {string} reportId
   * @returns {Promise<{ processingStatus: 'PENDING_OCR' | 'PROCESSING' | 'COMPLETED' | 'FAILED', extractedParameters?: Array, nlpFindings?: Array }>}
   */
  async getProcessingStatus(reportId) {
    throw new Error('IOcrService.getProcessingStatus must be implemented.');
  }
}

module.exports = IOcrService;
