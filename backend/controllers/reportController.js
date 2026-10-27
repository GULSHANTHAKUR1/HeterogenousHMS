const { reportService } = require('../services');

/**
 * Upload a medical report document.
 */
const uploadReport = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { reportType, clinicianNotes } = req.body;
    const file = req.file;

    const clientMeta = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const result = await reportService.uploadMedicalReport({
      patientId,
      doctor: req.doctor,
      file,
      reportType,
      clinicianNotes,
      clientMeta,
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.code || 'UploadError',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * List all reports for authorized patient.
 */
const getReports = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const doctorContext = {
      doctorId: req.doctor.doctorId,
      email: req.doctor.email,
      ip: req.ip,
    };

    const reports = await reportService.listPatientReports({
      patientId,
      doctorContext,
    });

    return res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve report details.
 */
const getReportById = async (req, res, next) => {
  try {
    const { patientId, reportId } = req.params;
    const doctorContext = {
      doctorId: req.doctor.doctorId,
      email: req.doctor.email,
      ip: req.ip,
    };

    const report = await reportService.getReportDetail({
      patientId,
      reportId,
      doctorContext,
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.code || 'ReportError',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Securely stream original document with safety headers (no public URL).
 */
const downloadDocument = async (req, res, next) => {
  try {
    const { patientId, reportId } = req.params;
    const doctorContext = {
      doctorId: req.doctor.doctorId,
      email: req.doctor.email,
      ip: req.ip,
    };

    const fileResult = await reportService.getReportDocumentStream({
      patientId,
      reportId,
      doctorContext,
    });

    // Security headers to prevent sniffing or direct script execution
    res.setHeader('Content-Type', fileResult.mimeType);
    res.setHeader('Content-Length', fileResult.fileSizeBytes);
    res.setHeader('Content-Disposition', `inline; filename="${fileResult.safeFileName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    fileResult.stream.pipe(res);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.code || 'DownloadError',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Confirm and update reviewed report parameters.
 */
const updateReportReview = async (req, res, next) => {
  try {
    const { patientId, reportId } = req.params;
    const result = await reportService.updateReportReview({
      patientId,
      reportId,
      doctor: req.doctor,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.code || 'ReviewError',
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  uploadReport,
  updateReportReview,
  getReports,
  getReportById,
  downloadDocument,
};

