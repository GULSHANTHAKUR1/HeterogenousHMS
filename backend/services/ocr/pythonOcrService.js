const IOcrService = require('./ocrServiceInterface');
const { getStorageProvider } = require('../storage');
const mongoose = require('mongoose');

class PythonOcrService extends IOcrService {
  constructor() {
    super();
    this.baseUrl = (process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
    this.serviceSecret = process.env.OCR_SERVICE_SECRET || 'dev_internal_ocr_secret_2026';
    this.timeoutMs = parseInt(process.env.OCR_REQUEST_TIMEOUT_MS || '30000', 10);
  }

  /**
   * Send document to Python OCR microservice and save extracted candidate parameters pending clinician review.
   */
  async enqueueDocument({ reportId, patientId, storageKey, mimeType }) {
    const MedicalReport = mongoose.models.MedicalReport;
    const storageProvider = getStorageProvider();

    try {
      // 1. Read document buffer from private storage
      const fileData = await storageProvider.getDocumentStream(storageKey);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of fileData.stream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // 2. Build multipart form data using native Node fetch
      const formData = new FormData();
      const fileBlob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', fileBlob, fileData.safeFileName || `${reportId}.pdf`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/api/v1/ocr/process-report`, {
        method: 'POST',
        headers: {
          'X-Internal-Service-Key': this.serviceSecret,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCR service responded with HTTP ${response.status}: ${errorText}`);
      }

      const ocrResult = await response.json();

      // 3. Transform extracted candidate parameters to HMS schema
      const mappedParams = (ocrResult.extracted_parameters || []).map((p) => ({
        testName: p.test_name,
        observedValue: p.value,
        unit: p.unit || '',
        normalRange: p.reference_range || '',
        status: p.abnormality_flag || 'Normal',
        sourcePage: p.source_page || 1,
        extractionMethod: p.extraction_method || 'pymupdf_embedded',
        confidence: p.confidence || 0.9,
        reviewStatus: p.review_status || 'PENDING_CLINICIAN_REVIEW',
      }));

      const findings = ocrResult.clinical_findings || [];
      const hasAbnormal = mappedParams.some((p) => p.status === 'Low' || p.status === 'High' || p.status === 'Abnormal');
      const overallStatus = hasAbnormal ? 'Abnormal' : 'Normal';

      // 4. Update database report record
      if (mongoose.connection.readyState === 1 && MedicalReport) {
        await MedicalReport.findOneAndUpdate(
          { reportId },
          {
            $set: {
              processingStatus: 'COMPLETED',
              status: overallStatus,
              extractedParameters: mappedParams,
              nlpFindings: findings,
              'metadata.totalCharacters': ocrResult.total_characters_extracted,
              'metadata.confidenceScore': ocrResult.confidence_score,
            },
          }
        );
      }

      return {
        taskId: `OCR_TASK_${reportId}`,
        processingStatus: 'COMPLETED',
        extractedCount: mappedParams.length,
        findingsCount: findings.length,
        extractedParameters: mappedParams,
        nlpFindings: findings,
        status: overallStatus,
        message: 'Document successfully digitized by Python OCR microservice. Result saved pending clinician review.',
      };
    } catch (err) {
      // Graceful fallback: report remains pending clinician review without breaking upload
      if (mongoose.connection.readyState === 1 && MedicalReport) {
        await MedicalReport.findOneAndUpdate(
          { reportId },
          {
            $set: {
              processingStatus: 'FAILED',
              clinicianNotes: `OCR Processing Note: ${err.message}`,
            },
          }
        ).catch(() => {});
      }

      return {
        taskId: `OCR_TASK_${reportId}`,
        processingStatus: 'FAILED',
        error: err.message,
        message: 'Document saved to storage. OCR microservice processing will retry upon manual request.',
      };
    }
  }

  async getProcessingStatus(reportId) {
    const MedicalReport = mongoose.models.MedicalReport;
    if (mongoose.connection.readyState === 1 && MedicalReport) {
      const report = await MedicalReport.findOne({ reportId }).select('processingStatus extractedParameters nlpFindings status').lean();
      if (report) {
        return {
          reportId,
          processingStatus: report.processingStatus,
          status: report.status,
          extractedParameters: report.extractedParameters || [],
          nlpFindings: report.nlpFindings || [],
        };
      }
    }

    return {
      reportId,
      processingStatus: 'PENDING_OCR',
      extractedParameters: [],
      nlpFindings: [],
    };
  }
}

module.exports = PythonOcrService;
