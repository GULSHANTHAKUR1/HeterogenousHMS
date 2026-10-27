const IOcrService = require('./ocrServiceInterface');

/**
 * Mock / Staging OCR Service Adapter.
 * Prepares the asynchronous interface for Python microservice dispatch without executing OCR yet.
 */
class MockOcrService extends IOcrService {
  async enqueueDocument({ reportId, patientId, storageKey, mimeType }) {
    return {
      taskId: `OCR_TASK_${reportId}`,
      processingStatus: 'PENDING_OCR',
      message: 'Document enqueued for asynchronous OCR & NLP analysis.',
    };
  }

  async getProcessingStatus(reportId) {
    return {
      reportId,
      processingStatus: 'PENDING_OCR',
      extractedParameters: [],
      nlpFindings: [],
    };
  }
}

module.exports = MockOcrService;
