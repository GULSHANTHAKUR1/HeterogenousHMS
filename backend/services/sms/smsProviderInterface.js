/**
 * Abstract SMS Provider Interface for Heterogeneous HMS.
 * All SMS delivery adapters (development, Twilio, MSG91, AWS SNS) must implement this contract.
 */
class ISmsProvider {
  /**
   * Dispatch an OTP message to the patient's registered contact number.
   * @param {Object} options
   * @param {string} options.to - Raw recipient mobile number (E.164 format)
   * @param {string} options.maskedTo - Masked mobile number for safe display (+91 98765-XXXXX)
   * @param {string} options.otp - The plain OTP (handled securely, never logged)
   * @param {string} options.patientId - Patient Identifier (e.g. PID-2026-1234)
   * @param {string} options.patientName - Patient full name
   * @param {string} options.doctorId - Requesting doctor ID (e.g. DOC-108)
   * @returns {Promise<{ success: boolean, provider: string, deliveryStatus: string, message: string }>}
   */
  async sendOtp(options) {
    throw new Error('ISmsProvider.sendOtp must be implemented by an adapter subclass.');
  }

  /**
   * Check if the SMS provider is configured with valid production credentials.
   * @returns {boolean}
   */
  isConfigured() {
    throw new Error('ISmsProvider.isConfigured must be implemented by an adapter subclass.');
  }
}

module.exports = ISmsProvider;
