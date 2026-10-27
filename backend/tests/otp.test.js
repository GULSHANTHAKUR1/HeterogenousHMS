const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_node_testing_2026';
process.env.OTP_SECRET_SALT = 'test_otp_secret_salt_2026';
process.env.DEV_FIXED_OTP = '482731'; // Fixed demo code for test determinism

const { app } = require('../server');
const { generateAccessToken } = require('../utils/authUtils');
const { resetMemoryStore } = require('../services/otpService');

test('Patient Search, Consent OTP & Access Grant Authorization Suite', async (t) => {
  let server;
  let baseUrl;

  // Setup test tokens for Doctor A (DOC-108) and Doctor B (DOC-202)
  const doctorAToken = generateAccessToken({
    doctorId: 'DOC-108',
    email: 'doctor@hospital.com',
    fullName: 'Dr. Ananya Sharma',
  });

  const doctorBToken = generateAccessToken({
    doctorId: 'DOC-202',
    email: 'other.doctor@hospital.com',
    fullName: 'Dr. Vikram Patel',
  });

  const authHeaderA = {
    Authorization: `Bearer ${doctorAToken}`,
    'Content-Type': 'application/json',
  };

  const authHeaderB = {
    Authorization: `Bearer ${doctorBToken}`,
    'Content-Type': 'application/json',
  };

  await t.test('Server setup', () => {
    return new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  // 1. Patient Search reveals NO medical history
  await t.test('1. Patient search reveals NO medical history or raw contact details', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/search?pid=PID-2026-1234`, {
      headers: authHeaderA,
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.requiresOtpVerification, true);
    assert.strictEqual(body.data.patientId, 'PID-2026-1234');
    assert.strictEqual(body.data.fullName, 'Rahul Sharma');
    assert.ok(body.data.contactNumberMasked.includes('XXXXX'));

    // STRICT PRIVACY CHECK:
    assert.strictEqual(body.data.chronicConditions, undefined, 'Medical history must not be exposed in search');
    assert.strictEqual(body.data.allergies, undefined, 'Allergies must not be exposed in search');
    assert.strictEqual(body.data.contactNumber, undefined, 'Raw contactNumber must never be exposed');
  });

  // 2. Direct medical record access without grant is FORBIDDEN
  await t.test('2. Direct clinical history access without consent grant is rejected (HTTP 403)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/history`, {
      headers: authHeaderA,
    });
    assert.strictEqual(res.status, 403);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'GRANT_REQUIRED');
  });

  // 3. Initiate OTP challenge: Never exposes plaintext OTP
  await t.test('3. Initiate OTP challenge returns masked phone and hides plaintext OTP', async () => {
    resetMemoryStore();

    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/challenge-otp`, {
      method: 'POST',
      headers: authHeaderA,
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.patientId, 'PID-2026-1234');
    assert.ok(body.data.phoneMasked.includes('XXXXX'));
    assert.strictEqual(body.data.otp, undefined, 'Plaintext OTP must NEVER be returned in response');
  });

  // 4. Resend Cooldown
  await t.test('4. Requesting OTP during active cooldown triggers HTTP 429', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/challenge-otp`, {
      method: 'POST',
      headers: authHeaderA,
    });
    assert.strictEqual(res.status, 429);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'RESEND_COOLDOWN_ACTIVE');
    assert.ok(body.cooldownRemainingSeconds > 0);
  });

  // 5. Wrong OTP decrements attempts
  await t.test('5. Submitting wrong OTP fails and shows remaining attempts', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/verify-otp`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({ otp: '000000' }),
    });
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'INVALID_OTP');
    assert.strictEqual(body.remainingAttempts, 2);
  });

  // 6. Max attempts rate limit locks the challenge
  await t.test('6. Exceeding max attempts (3) locks and invalidates challenge (HTTP 429)', async () => {
    // Attempt 2
    await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/verify-otp`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({ otp: '000000' }),
    });

    // Attempt 3: Triggers lockout
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/verify-otp`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({ otp: '000000' }),
    });
    assert.strictEqual(res.status, 429);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'MAX_ATTEMPTS_EXCEEDED');
  });

  // 7. Doctor Binding: Doctor B cannot verify Doctor A's challenge
  await t.test('7. Challenge is strictly bound: Doctor B cannot verify Doctor A challenge', async () => {
    resetMemoryStore();

    // Doctor A initiates challenge
    await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/challenge-otp`, {
      method: 'POST',
      headers: authHeaderA,
    });

    // Doctor B tries to verify it
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/verify-otp`, {
      method: 'POST',
      headers: authHeaderB,
      body: JSON.stringify({ otp: '482731' }),
    });
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.error, 'CHALLENGE_NOT_FOUND');
  });

  let validGrantToken = '';
  let validGrantId = '';

  // 8. Valid OTP verification issues short-lived access grant
  await t.test('8. Valid OTP verification issues scoped PatientAccessGrant', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/verify-otp`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({ otp: '482731' }),
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.grant.grantToken);
    assert.strictEqual(body.grant.patientId, 'PID-2026-1234');
    assert.strictEqual(body.grant.doctorId, 'DOC-108');
    assert.strictEqual(body.grant.validityMinutes, 30);

    validGrantToken = body.grant.grantToken;
    validGrantId = body.grant.grantId;
  });

  // 9. Reused OTP rejected
  await t.test('9. Reused OTP is rejected as challenge is already consumed', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/verify-otp`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({ otp: '482731' }),
    });
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.error, 'CHALLENGE_NOT_FOUND');
  });

  // 10. Access Authorized Medical History with valid grant
  await t.test('10. Authorized doctor with valid grant successfully retrieves medical records', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/history`, {
      headers: {
        ...authHeaderA,
        'x-patient-grant-token': validGrantToken,
      },
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.patientId, 'PID-2026-1234');
    assert.ok(Array.isArray(body.data.chronicConditions));
    assert.ok(Array.isArray(body.data.allergies));
  });

  // 11. Patient Mismatch: Grant for Patient X cannot be used for Patient Y
  await t.test('11. Grant scoped to Patient X cannot be used to access Patient Y', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-5678/history`, {
      headers: {
        ...authHeaderA,
        'x-patient-grant-token': validGrantToken, // Token was issued for PID-2026-1234
      },
    });
    assert.strictEqual(res.status, 403);

    const body = await res.json();
    assert.strictEqual(body.code, 'GRANT_PATIENT_MISMATCH');
  });

  // 12. Doctor Mismatch: Doctor B cannot use Doctor A's grant
  await t.test('12. Grant scoped to Doctor A cannot be used by Doctor B', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/history`, {
      headers: {
        ...authHeaderB,
        'x-patient-grant-token': validGrantToken, // Token was issued to DOC-108
      },
    });
    assert.strictEqual(res.status, 403);

    const body = await res.json();
    assert.strictEqual(body.code, 'GRANT_DOCTOR_MISMATCH');
  });

  // 13. Revoke Access Grant
  await t.test('13. Revoking grant terminates access immediately', async () => {
    const revokeRes = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/revoke-access`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({ grantId: validGrantId }),
    });
    assert.strictEqual(revokeRes.status, 200);

    // Subsequent history fetch with revoked grant must fail
    const historyRes = await fetch(`${baseUrl}/api/v1/patients/PID-2026-1234/history`, {
      headers: {
        ...authHeaderA,
        'x-patient-grant-token': validGrantToken,
      },
    });
    assert.strictEqual(historyRes.status, 403);

    const body = await historyRes.json();
    assert.strictEqual(body.code, 'GRANT_REVOKED');
  });

  // 14. Patient Enumeration Protection: Non-existent PID
  await t.test('14. Non-existent PID returns HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/PID-2026-9999/challenge-otp`, {
      method: 'POST',
      headers: authHeaderA,
    });
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.error, 'PATIENT_NOT_FOUND');
  });

  await t.test('Server teardown', () => {
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  });
});
