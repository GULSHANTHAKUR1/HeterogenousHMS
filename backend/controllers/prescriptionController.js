const { prescriptionService } = require('../services');

/**
 * List all historical and active prescriptions for authorized patient.
 */
const getPrescriptions = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const doctorContext = {
      doctorId: req.doctor.doctorId,
      email: req.doctor.email,
      ip: req.ip,
    };

    const prescriptions = await prescriptionService.listPatientPrescriptions({
      patientId,
      doctorContext,
    });

    return res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new prescription to the patient's medical record.
 */
const addPrescription = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const clientMeta = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const result = await prescriptionService.addPrescription({
      patientId,
      doctor: req.doctor,
      prescriptionData: req.body,
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
        error: error.code || 'PrescriptionError',
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  getPrescriptions,
  addPrescription,
};
