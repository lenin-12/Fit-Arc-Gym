
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');



let serverProcess;
let baseUrl;


function startServer() {
  return new Promise((resolve, reject) => {
    const startScript = path.join(__dirname, 'server-for-test.js');
    serverProcess = spawn(process.execPath, [startScript], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DISABLE_AUTO_CONNECT: 'true',
        JWT_SECRET: 'ci-test-secret-not-used-in-prod',
        MONGO_URI: 'mongodb://localhost:27017/fit-arc-test',
        PORT: '0',         // bind to random free port
        HOST: '127.0.0.1',
        OPENAI_API_KEY: '' // no API calls in tests
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let outputBuffer = '';
    const onData = (chunk) => {
      outputBuffer += chunk.toString();
      const match = outputBuffer.match(/READY port=(\d+)/);
      if (match) {
        serverProcess.stdout.off('data', onData);
        baseUrl = `http://127.0.0.1:${match[1]}`;
        resolve();
      }
    };

    serverProcess.stdout.on('data', onData);
    serverProcess.stderr.on('data', (d) => {
      // Forward server stderr to our stderr for debugging
      process.stderr.write('[server] ' + d.toString());
    });

    serverProcess.on('error', reject);
    serverProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0 && !baseUrl) {
        reject(new Error(`Server process exited with code ${code} before becoming ready`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!baseUrl) {
        serverProcess.kill();
        reject(new Error('Timed out waiting for server to start'));
      }
    }, 30000);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess || serverProcess.exitCode !== null) {
      return resolve();
    }
    serverProcess.on('exit', resolve);
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      serverProcess.kill('SIGKILL');
    }, 5000);
  });
}

const testFetch = (urlPath, options = {}) =>
  fetch(`${baseUrl}${urlPath}`, {
    ...options,
    headers: { Connection: 'close', ...(options.headers || {}) }
  });

// ─── Test suite ─────────────────────────────────────────────────────────────

describe('Fit-Arc-Gym HTTP Integration Tests', () => {
  before(async () => {
    await startServer();
  });

  after(async () => {
    await stopServer();
  });

  // ── Health endpoints ──────────────────────────────────────────────────────

  describe('Health Check Endpoints', () => {
    test('GET /api/health returns 200 with operational status', async () => {
      const res = await testFetch('/api/health');
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'OK');
      assert.ok(data.message, 'response should have a message');
    });

    test('GET /api/health/db returns 503 when database is disconnected (test mode, no DB)', async () => {
      const res = await testFetch('/api/health/db');
      assert.equal(res.status, 503);
      const data = await res.json();
      assert.equal(data.status, 'UNAVAILABLE');
      assert.equal(data.database, 'disconnected');
      assert.equal(data.readyState, 0);
    });
  });

  // ── Auth input validation ─────────────────────────────────────────────────

  describe('Auth Route Input Validation', () => {
    test('POST /api/auth/register fails with 400 when body is empty', async () => {
      const res = await testFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.message);
    });

    test('POST /api/auth/register fails with 400 for invalid email or mismatched password', async () => {
      const res = await testFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'not-an-email',
          mobile: '9876543210',
          firstSchoolName: 'Primary School',
          password: 'password123',
          confirmPassword: 'differentPassword'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
    });

    test('POST /api/auth/login fails with 400 when body is empty', async () => {
      const res = await testFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
    });
  });

  // ── Protected route 401 rejection ─────────────────────────────────────────

  describe('Protected Routes Return 401 Without Auth Token', () => {
    const protectedRoutes = [
      { method: 'GET',  path: '/api/user/profile' },
      { method: 'GET',  path: '/api/workout/today' },
      { method: 'GET',  path: '/api/nutrition/today' },
      { method: 'POST', path: '/api/ai/coach' },
      { method: 'GET',  path: '/api/wallet' },
      { method: 'POST', path: '/api/payments/plan' }
    ];

    for (const route of protectedRoutes) {
      test(`${route.method} ${route.path} returns 401 for unauthenticated requests`, async () => {
        const options = { method: route.method };
        if (route.method === 'POST') {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify({});
        }
        const res = await testFetch(route.path, options);
        assert.equal(res.status, 401, `Expected 401 for ${route.method} ${route.path}`);
      });
    }
  });
});
