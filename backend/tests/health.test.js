const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// Set test environment before requiring server
process.env.NODE_ENV = 'test';
const { app } = require('../server');

test('Health Endpoint Test Suite', async (t) => {
  let server;
  let baseUrl;

  // Start temporary server for testing
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

  await t.test('GET /health reports API status and safe database telemetry', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.service, 'Heterogeneous HMS Node.js Core Backend');
    assert.strictEqual(data.status, 'online');
    assert.ok(data.database, 'Database telemetry should be present');
    assert.ok(['connected', 'connecting', 'disconnected'].includes(data.database.status));

    // Security check: Ensure no connection string or password is leaked
    const jsonStr = JSON.stringify(data);
    assert.strictEqual(jsonStr.includes('mongodb+srv'), false, 'Never leak connection strings');
    assert.strictEqual(jsonStr.includes('password'), false, 'Never leak database passwords');
  });

  await t.test('GET /api/health is an alias with identical payload', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'online');
  });

  // Teardown
  await t.test('Server teardown', () => {
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  });
});
