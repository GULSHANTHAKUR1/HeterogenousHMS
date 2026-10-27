const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_node_testing_2026';
const { app } = require('../server');

test('Doctor Authentication & Session Security Suite', async (t) => {
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

  let validAccessToken = '';
  let authCookieHeader = '';
  let validRefreshToken = '';

  // 1. Valid Login with Email
  await t.test('1. Valid doctor login using registered email', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrId: 'doctor@hospital.com',
        password: 'DoctorPass123!',
      }),
    });

    assert.strictEqual(res.status, 200, 'Should return HTTP 200 for valid email login');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.accessToken, 'Access token should be issued');
    assert.strictEqual(data.data.doctor.doctorId, 'DOC-108');
    assert.strictEqual(data.data.doctor.email, 'doctor@hospital.com');
    assert.strictEqual(data.data.doctor.passwordHash, undefined, 'Password hash must never be returned');

    // Verify Set-Cookie headers
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'HttpOnly session cookie must be set');
    assert.ok(setCookie.includes('hms_doctor_token='), 'hms_doctor_token cookie should be present');
    assert.ok(setCookie.includes('HttpOnly'), 'Cookie must be HttpOnly');

    validAccessToken = data.data.accessToken;
    // Capture cookies for subsequent requests
    authCookieHeader = setCookie;
  });

  // 2. Valid Login with Doctor ID (DOC-108)
  await t.test('2. Valid doctor login using Doctor ID (DOC-108)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrId: 'DOC-108',
        password: 'DoctorPass123!',
      }),
    });

    assert.strictEqual(res.status, 200, 'Should return HTTP 200 for Doctor ID login');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.doctor.doctorId, 'DOC-108');
  });

  // 3. Invalid credentials (incorrect password)
  await t.test('3. Invalid credentials returns HTTP 401 with generic error', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrId: 'doctor@hospital.com',
        password: 'WrongPassword123!',
      }),
    });

    assert.strictEqual(res.status, 401, 'Should return HTTP 401 for wrong password');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    // Generic failure response prevents user enumeration
    assert.strictEqual(data.message, 'Invalid email/doctor ID or password.');
  });

  // 4. Non-existent user returns IDENTICAL generic message
  await t.test('4. Non-existent account returns identical HTTP 401 generic error (anti-enumeration)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrId: 'nonexistent.doctor@hospital.com',
        password: 'SomeRandomPassword123!',
      }),
    });

    assert.strictEqual(res.status, 401, 'Should return HTTP 401 for unknown user');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(
      data.message,
      'Invalid email/doctor ID or password.',
      'Message must not reveal whether account exists'
    );
  });

  // 5. Disabled / Deactivated Account Check
  await t.test('5. Deactivated doctor account returns HTTP 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrId: 'inactive@hospital.com',
        password: 'DoctorPass123!',
      }),
    });

    assert.strictEqual(res.status, 403, 'Should return HTTP 403 for deactivated account');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'ACCOUNT_DEACTIVATED');
    assert.ok(data.message.toLowerCase().includes('deactivated'));
  });

  // 6. Missing authentication on protected route
  await t.test('6. Missing authentication token on protected /me returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Unauthorized');
  });

  // 7. Access protected route with Bearer token header
  await t.test('7. Protected /me succeeds with valid Bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${validAccessToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.doctor.doctorId, 'DOC-108');
    assert.strictEqual(data.data.doctor.fullName, 'Dr. Ananya Sharma');
  });

  // 8. Access protected route with session cookie
  await t.test('8. Protected /me succeeds with session cookie', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        Cookie: `hms_doctor_token=${validAccessToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.doctor.doctorId, 'DOC-108');
  });

  // 9. Expired session token rejected with HTTP 401 and TOKEN_EXPIRED code
  await t.test('9. Expired session token returns HTTP 401 with TOKEN_EXPIRED', async () => {
    // Generate intentionally expired token (-10 seconds)
    const expiredToken = jwt.sign(
      { doctorId: 'DOC-108', email: 'doctor@hospital.com', fullName: 'Dr. Expired' },
      process.env.JWT_SECRET,
      { expiresIn: '-10s', issuer: 'heterogeneous-hms' }
    );

    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.code, 'TOKEN_EXPIRED');
  });

  // 10. Logout clears cookies
  await t.test('10. Logout clears session cookies and returns HTTP 200', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validAccessToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.message, 'Logged out successfully');

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Should set cookie clearing headers');
    // Cleared cookie has empty value or expires in past
    assert.ok(setCookie.includes('hms_doctor_token=;'));
  });

  // 11. Rate limiting on repeated login attempts
  await t.test('11. Rate limiter triggers HTTP 429 after exceeding login attempts', async () => {
    // Make rapid requests to exceed login rate limiter (max 5)
    let rateLimited = false;
    for (let i = 0; i < 7; i++) {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrId: 'attacker@hospital.com',
          password: 'Password123!',
        }),
      });

      if (res.status === 429) {
        rateLimited = true;
        const data = await res.json();
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.error, 'Too Many Login Attempts');
        break;
      }
    }

    assert.strictEqual(rateLimited, true, 'Rate limiter should trigger HTTP 429');
  });

  await t.test('Server teardown', () => {
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  });
});
