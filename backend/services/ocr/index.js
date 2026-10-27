const PythonOcrService = require('./pythonOcrService');
const MockOcrService = require('./mockOcrService');

let ocrInstance = null;

const getOcrService = () => {
  if (!ocrInstance) {
    // If OCR_SERVICE_URL or OCR_SERVICE_SECRET is configured, use real Python microservice adapter
    if (process.env.USE_MOCK_OCR === 'true') {
      ocrInstance = new MockOcrService();
    } else {
      ocrInstance = new PythonOcrService();
    }
  }
  return ocrInstance;
};

module.exports = {
  getOcrService,
  PythonOcrService,
  MockOcrService,
};
