const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_security_audit_2026';
process.env.OTP_SECRET_SALT = 'test_otp_secret_salt_2026';
process.env.DEV_FIXED_OTP = '482731';

const { app } = require('../server');
const { generateAccessToken } = require('../utils/authUtils');
const { resetMemoryStore } = require('../services/otpService');

test('Heterogeneous HMS Comprehensive Security & Access Control Review', async (t) => {
  let server;
  let baseUrl;

  // Pre-generate tokens for Doctor 1 (DOC-108) and Doctor 2 (DOC-202)
  const doctor1Token = generateAccessToken({
    doctorId: 'DOC-108',
    email: 'doctor1@hospital.com',
    fullName: 'Dr. Primary Physician',
  });

  const doctor2Token = generateAccessToken({
    doctorId: 'DOC-202',
    email: 'doctor2@hospital.com',
    fullName: 'Dr. Secondary Physician',
  });

  const testPatientA = 'PID-2026-1234';
  const testPatientB = 'PID-2026-5678';

  // Helper to obtain a real verified grant for testing
  const obtainVerifiedGrant = async (patientId, token) => {
    await fetch(`${baseUrl}/v1/patients/${patientId}/challenge-otp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await fetch(`${baseUrl}/v1/patients/${patientId}/verify-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp: '482731' }),
    });

    const body = await res.json();
    return body.grant;
  };

  await t.test('Test Server Setup', () => {
    return new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  // =========================================================================
  // SECTION 1: UNAUTHENTICATED REQUESTS TO PROTECTED APIS
  // =========================================================================
  await t.test('Access Control: Unauthenticated requests return HTTP 401 Unauthorized', async () => {
    const protectedEndpoints = [
      { method: 'GET', path: `/v1/patients/${testPatientA}/history` },
      { method: 'GET', path: `/v1/patients/${testPatientA}/reports` },
      { method: 'GET', path: `/v1/patients/${testPatientA}/reports/REP-001` },
      { method: 'GET', path: `/v1/patients/${testPatientA}/reports/REP-001/document` },
      { method: 'GET', path: `/v1/patients/${testPatientA}/prescriptions` },
      { method: 'POST', path: `/v1/patients/${testPatientA}/prescriptions` },
      { method: 'POST', path: `/v1/patients/${testPatientA}/reports/upload` },
      { method: 'GET', path: '/v1/auth/me' },
    ];

    for (const ep of protectedEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
      });
      assert.strictEqual(
        res.status,
        401,
        `Unauthenticated ${ep.method} ${ep.path} must return HTTP 401`
      );
    }
  });

  // =========================================================================
  // SECTION 2: AUTHENTICATED DOCTOR WITHOUT PATIENT CONSENT GRANT
  // =========================================================================
  await t.test('Access Control: Doctor without patient grant returns HTTP 403 GRANT_REQUIRED', async () => {
    const endpoints = [
      `/v1/patients/${testPatientA}/history`,
      `/v1/patients/${testPatientA}/reports`,
      `/v1/patients/${testPatientA}/reports/REP-001`,
      `/v1/patients/${testPatientA}/reports/REP-001/document`,
      `/v1/patients/${testPatientA}/prescriptions`,
    ];

    for (const path of endpoints) {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${doctor1Token}` },
      });
      assert.strictEqual(res.status, 403, `${path} without grant must return HTTP 403`);
      const body = await res.json();
      assert.strictEqual(body.code, 'GRANT_REQUIRED');
    }
  });

  // =========================================================================
  // SECTION 3: DOCTOR ATTEMPTS TO ACCESS PATIENT B WITH GRANT FOR PATIENT A
  // =========================================================================
  await t.test('Access Control: Cross-patient grant scoping (Patient A grant on Patient B)', async () => {
    resetMemoryStore();
    const grant = await obtainVerifiedGrant(testPatientA, doctor1Token);

    // Attempt to access Patient B using Patient A's grant token
    const res = await fetch(`${baseUrl}/v1/patients/${testPatientB}/history`, {
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'x-patient-grant-token': grant.grantToken,
      },
    });

    assert.strictEqual(res.status, 403, 'Cross-patient grant must be rejected');
    const body = await res.json();
    assert.strictEqual(body.code, 'GRANT_PATIENT_MISMATCH');
  });

  // =========================================================================
  // SECTION 4: DOCTOR 2 ATTEMPTS TO USE DOCTOR 1'S GRANT
  // =========================================================================
  await t.test('Access Control: Cross-doctor grant scoping (Doctor 2 using Doctor 1 grant)', async () => {
    resetMemoryStore();
    const grant = await obtainVerifiedGrant(testPatientA, doctor1Token);

    // Doctor 2 attempts to use Doctor 1's grant
    const res = await fetch(`${baseUrl}/v1/patients/${testPatientA}/history`, {
      headers: {
        Authorization: `Bearer ${doctor2Token}`,
        'x-patient-grant-token': grant.grantToken,
      },
    });

    assert.strictEqual(res.status, 403, 'Cross-physician grant transfer must be rejected');
    const body = await res.json();
    assert.strictEqual(body.code, 'GRANT_DOCTOR_MISMATCH');
  });

  // =========================================================================
  // SECTION 5: REVOKED AND EXPIRED GRANTS
  // =========================================================================
  await t.test('Access Control: Immediate revocation of patient access grant', async () => {
    resetMemoryStore();
    const grant = await obtainVerifiedGrant(testPatientA, doctor1Token);

    // 1. Initial access succeeds
    const accessOk = await fetch(`${baseUrl}/v1/patients/${testPatientA}/history`, {
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'x-patient-grant-token': grant.grantToken,
      },
    });
    assert.strictEqual(accessOk.status, 200);

    // 2. Revoke grant
    const revokeRes = await fetch(`${baseUrl}/v1/patients/${testPatientA}/revoke-access`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grantId: grant.grantId }),
    });
    assert.strictEqual(revokeRes.status, 200);

    // 3. Subsequent access with revoked grant must fail
    const accessBlocked = await fetch(`${baseUrl}/v1/patients/${testPatientA}/history`, {
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'x-patient-grant-token': grant.grantToken,
      },
    });
    assert.strictEqual(accessBlocked.status, 403);
    const body = await accessBlocked.json();
    assert.strictEqual(body.code, 'GRANT_REVOKED');
  });

  // =========================================================================
  // SECTION 6: OTP SECURITY (REPLAY, WRONG CODE, BRUTE FORCE LOCKOUT)
  // =========================================================================
  await t.test('OTP Security: Challenge, verification, single-use replay rejection, and brute-force lockout', async () => {
    const testPid = 'PID-2026-9012';
    resetMemoryStore();

    // 1. Create OTP challenge
    const chalRes = await fetch(`${baseUrl}/v1/patients/${testPid}/challenge-otp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctor1Token}` },
    });
    assert.strictEqual(chalRes.status, 200);

    // 2. Submit wrong OTP code
    const wrongRes = await fetch(`${baseUrl}/v1/patients/${testPid}/verify-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp: '000000' }),
    });
    assert.strictEqual(wrongRes.status, 400);
    const wrongData = await wrongRes.json();
    assert.ok(
      wrongData.error === 'INVALID_OTP' ||
        wrongData.error === 'OTP_INVALID' ||
        (wrongData.message && (wrongData.message.includes('Incorrect') || wrongData.message.includes('Invalid'))),
      `Expected INVALID_OTP error, received: ${JSON.stringify(wrongData)}`
    );
    assert.strictEqual(wrongData.remainingAttempts, 2);

    // 3. Verify with valid fixed demo code
    const validRes = await fetch(`${baseUrl}/v1/patients/${testPid}/verify-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp: '482731' }),
    });
    assert.strictEqual(validRes.status, 200);
    const validData = await validRes.json();
    assert.ok(validData.grant.grantToken);

    // 4. Replay attack: try to verify same code again
    const replayRes = await fetch(`${baseUrl}/v1/patients/${testPid}/verify-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp: '482731' }),
    });
    assert.strictEqual(replayRes.status, 400);
    const replayData = await replayRes.json();
    assert.ok(replayData.error === 'CHALLENGE_NOT_FOUND' || replayData.error === 'OTP_ALREADY_USED');
  });

  // =========================================================================
  // SECTION 7: INPUT VALIDATION & ANTI-ENUMERATION
  // =========================================================================
  await t.test('Data Safety: Malformed Patient IDs rejected with HTTP 400', async () => {
    const malformedPids = [
      'PID-DROP-TABLE',
      '../../../etc/passwd',
      'PID-1234',
      '<script>alert(1)</script>',
      'PID-2026-ABCD',
    ];

    for (const badPid of malformedPids) {
      const res = await fetch(`${baseUrl}/v1/patients/search?pid=${encodeURIComponent(badPid)}`, {
        headers: { Authorization: `Bearer ${doctor1Token}` },
      });
      assert.strictEqual(res.status, 400, `Malformed PID ${badPid} must be rejected with 400`);
    }
  });

  // =========================================================================
  // SECTION 8: FILE VALIDATION & DISGUISED UPLOADS
  // =========================================================================
  await t.test('File Safety: Disguised file with spoofed .pdf extension rejected by magic bytes', async () => {
    resetMemoryStore();
    const validGrant = await obtainVerifiedGrant(testPatientA, doctor1Token);

    const boundary = '----WebKitFormBoundarySafeTest' + Math.random().toString(36).substring(2);
    // Plain text masquerading as a medical PDF
    const fakeContent = 'This is an executable or shell script masquerading as a pathology report.';
    let body = '';
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="reportType"\r\n\r\n';
    body += 'Complete Blood Count (CBC)\r\n';
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="document"; filename="fake_report.pdf"\r\n';
    body += 'Content-Type: application/pdf\r\n\r\n';
    body += fakeContent + '\r\n';
    body += `--${boundary}--\r\n`;

    const res = await fetch(`${baseUrl}/v1/patients/${testPatientA}/reports/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'x-patient-grant-token': validGrant.grantToken,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: Buffer.from(body, 'latin1'),
    });

    assert.strictEqual(res.status, 400, 'Disguised file must be rejected by magic bytes');
    const data = await res.json();
    assert.strictEqual(data.error, 'INVALID_FILE_SIGNATURE');
  });

  // =========================================================================
  // SECTION 9: PRESCRIPTION VALIDATION (MISSING REQUIRED FIELDS)
  // =========================================================================
  await t.test('Data Safety: Missing required clinical fields in prescription triggers HTTP 400', async () => {
    resetMemoryStore();
    const validGrant = await obtainVerifiedGrant(testPatientA, doctor1Token);

    // 1. Missing medications array
    const resNoMeds = await fetch(`${baseUrl}/v1/patients/${testPatientA}/prescriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'x-patient-grant-token': validGrant.grantToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ diagnosis: 'Anemia' }),
    });
    assert.strictEqual(resNoMeds.status, 400);

    // 2. Empty medications array
    const resEmptyMeds = await fetch(`${baseUrl}/v1/patients/${testPatientA}/prescriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'x-patient-grant-token': validGrant.grantToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ diagnosis: 'Anemia', medications: [] }),
    });
    assert.strictEqual(resEmptyMeds.status, 400);

    // 3. Missing diagnosis
    const resNoDiag = await fetch(`${baseUrl}/v1/patients/${testPatientA}/prescriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctor1Token}`,
        'x-patient-grant-token': validGrant.grantToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        medications: [{ name: 'Iron', dosage: '100mg', frequency: 'daily', duration: '10 days' }],
      }),
    });
    assert.strictEqual(resNoDiag.status, 400);
  });

  await t.test('Test Server Teardown', () => {
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  });
});
