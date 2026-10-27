const ISmsProvider = require('./smsProviderInterface');

/**
 * DEVELOPMENT-ONLY SMS ADAPTER
 * Used strictly during local development and testing with fictional patient records.
 * NEVER enabled or deployed to production environments.
 *
 * Notice: This adapter does NOT bypass validation or create a backdoor.
 * It simulates message transmission without contacting telecom carriers.
 */
class DevelopmentSmsAdapter extends ISmsProvider {
  constructor() {
    super();
    this.name = 'DevelopmentSmsMockAdapter';
  }

  isConfigured() {
    return process.env.NODE_ENV !== 'production';
  }

  /**
   * Simulate SMS dispatch for local development.
   * Note: The plaintext OTP is NOT logged to console or stored in log files to prevent accidental leakage.
   */
  async sendOtp({ to, maskedTo, otp, patientId, patientName, doctorId }) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SECURITY VIOLATION: DevelopmentSmsAdapter cannot be invoked in production.'
      );
    }

    // Safe development telemetry without logging plain OTP
    console.log(
      `[DevelopmentSmsAdapter] Simulated SMS dispatched for patient "${patientId}" to ${maskedTo} on behalf of Doctor "${doctorId}". (Carrier: Mock Sandbox, DeliveryStatus: SIMULATED_LOCAL)`
    );

    return {
      success: true,
      provider: 'development-mock',
      deliveryStatus: 'SIMULATED_LOCAL',
      message:
        'Simulated SMS dispatched in local development sandbox. No telecom charges incurred.',
      phoneMasked: maskedTo,
    };
  }
}

module.exports = DevelopmentSmsAdapter;
