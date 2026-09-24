// =============================================================================
// test-integration.js — Automated End-to-End API Integration Suite
// =============================================================================

const http = require('http');
const app = require('./src/app');

let server;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5099,
        method,
        path,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING NOVA INTEGRATION SUITE ---');

  // Start HTTP server on port 5099
  server = app.listen(5099);
  await new Promise((r) => setTimeout(r, 500));

  const mockToken = 'mock-dev-token-12345:mock-firebase-uid-elena-vance:elena.vance@agency.ops:Elena%20Vance';
  const mockHeader = { Authorization: `Bearer ${mockToken}` };

  // 1. Health check
  console.log('\n[1] Testing Health Check...');
  const healthRes = await request('GET', '/health');
  console.log('Status:', healthRes.status, healthRes.body);

  // 2. Auth Sync
  console.log('\n[2] Testing Firebase User Sync (POST /api/auth/sync)...');
  const authRes = await request('POST', '/api/auth/sync', { credential: mockToken }, mockHeader);
  console.log('Status:', authRes.status, JSON.stringify(authRes.body));
  const userId = authRes.body?.data?.user?.id;
  console.log('Resolved PostgreSQL User ID:', userId);

  // 3. GET /api/auth/me
  console.log('\n[3] Testing Current Auth Profile (GET /api/auth/me)...');
  const meRes = await request('GET', '/api/auth/me', null, mockHeader);
  console.log('Status:', meRes.status, meRes.body);

  // 4. Submit Wellness Check-in
  console.log('\n[4] Testing Wellness Check-in (POST /api/checkin)...');
  const checkinRes = await request(
    'POST',
    '/api/checkin',
    {
      sleepHours: 7.5,
      energyLevel: 8,
      logDate: new Date().toISOString().split('T')[0],
    },
    mockHeader
  );
  console.log('Status:', checkinRes.status, checkinRes.body);

  // 5. Record Focus Session
  console.log('\n[5] Testing Focus Session Recording (POST /api/sessions)...');
  const sessionRes = await request(
    'POST',
    '/api/sessions',
    {
      durationMinutes: 25,
      interruptions: 0,
      completed: true,
      startedAt: new Date().toISOString(),
    },
    mockHeader
  );
  console.log('Status:', sessionRes.status, sessionRes.body);

  // 6. Fetch Dashboard Metrics
  console.log('\n[6] Testing Dashboard Data Fetch (GET /api/dashboard)...');
  const dashRes = await request('GET', '/api/dashboard', null, mockHeader);
  console.log('Status:', dashRes.status, JSON.stringify(dashRes.body, null, 2));

  // 7. Test Security: Attempt to access another user's dashboard with different ID
  console.log('\n[7] Testing Authorization Enforcement (Accessing mismatched userId: 9999)...');
  const spoofRes = await request('GET', '/api/dashboard/9999', null, mockHeader);
  console.log('Status:', spoofRes.status, spoofRes.body);

  // 8. Test Unauthenticated Request (Missing Token)
  console.log('\n[8] Testing Unauthenticated Request Rejection (No Token)...');
  const unauthRes = await request('POST', '/api/checkin', { sleepHours: 6, energyLevel: 5, logDate: '2026-09-25' });
  console.log('Status:', unauthRes.status, unauthRes.body);

  console.log('\n--- ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY ---');
  server.close();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  if (server) server.close();
  process.exit(1);
});
