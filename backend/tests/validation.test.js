const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NODE_ENV = 'test';
const { app } = require('../server');

test('Patient Search & Request Validation Test Suite', async (t) => {
  let server;
  let baseUrl;

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

  await t.test('Missing PID parameter triggers Zod validation HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/search`);
    assert.strictEqual(res.status, 400);

    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Validation Error');
    assert.ok(Array.isArray(data.details), 'details should be an array');
    assert.ok(data.details.some((d) => d.field === 'pid'));
  });

  await t.test('Malformed PID format triggers Zod regex HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/search?pid=invalid-123`);
    assert.strictEqual(res.status, 400);

    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Validation Error');
    assert.ok(data.details.some((d) => d.message.includes('PID-YYYY-XXXX')));
  });

  const { generateAccessToken } = require('../utils/authUtils');
  const authHeader = {
    Authorization: `Bearer ${generateAccessToken({ doctorId: 'DOC-108', email: 'doctor@hospital.com', fullName: 'Dr. Test' })}`,
  };

  await t.test('Valid PID format locates patient with privacy protection', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/search?pid=PID-2026-1234`, {
      headers: authHeader,
    });
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.requiresOtpVerification, true);
    assert.ok(data.data, 'Patient data payload should be present');
    assert.strictEqual(data.data.patientId, 'PID-2026-1234');
    assert.strictEqual(data.data.firstName, 'Rahul');

    // CRITICAL PRIVACY REQUIREMENT:
    // Raw mobile numbers must NEVER be returned in patient-search responses!
    assert.strictEqual(data.data.contactNumber, undefined, 'Raw contactNumber must never be exposed');
    assert.ok(data.data.contactNumberMasked, 'Safe masked phone must be provided for verification prompt');
    assert.strictEqual(data.data.contactNumberMasked.includes('XXXXX'), true, 'Phone must be masked');
  });

  await t.test('Non-existent PID returns HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/api/v1/patients/search?pid=PID-2026-0000`, {
      headers: authHeader,
    });
    assert.strictEqual(res.status, 404);

    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Patient Not Found');
  });

  await t.test('Server teardown', () => {
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  });
});
