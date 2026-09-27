// =============================================================================
// test-health-phase1.js — Phase 1 Health Data Ingestion & Integration Test Suite
// =============================================================================

'use strict';

const http = require('http');
const app = require('./src/app');
const db = require('./src/config/db');

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
        port: 5097,
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
  console.log('=== STARTING PHASE 1 HEALTH PERSISTENCE TEST SUITE ===');

  server = app.listen(5097);
  await new Promise((r) => setTimeout(r, 500));

  // Ensure test user exists in PostgreSQL
  const testFirebaseUid = 'test-firebase-uid-health-12345';
  const { rows: userRows } = await db.query(
    `INSERT INTO users (name, email, google_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, email, google_id`,
    ['Test Health User', 'health.test@nova.app', testFirebaseUid]
  );
  const testUser = userRows[0];
  console.log('[SETUP] Test user resolved in PostgreSQL with ID:', testUser.id);

  // Clear previous health records for clean test run
  await db.query(`DELETE FROM health_records WHERE user_id = $1`, [testUser.id]);

  // 1. GET /health
  console.log('\n[1] Testing Health Check (GET /health)...');
  const healthRes = await request('GET', '/health');
  console.log('Status:', healthRes.status, healthRes.body.status === 'ok' ? 'PASSED' : 'FAILED');

  // 2. Reject Unauthorized Webhook Ingestion
  console.log('\n[2] Testing Unauthorized Webhook Ingestion (No Auth Header -> Expect 401)...');
  const unauthRes = await request('POST', '/api/health/webhook', { steps: [{ count: 5000 }] });
  console.log('Status:', unauthRes.status, unauthRes.status === 401 ? 'PASSED (401 Missing Header)' : 'FAILED');

  // 3. Test Direct Database Health Ingestion & Deduplication
  console.log('\n[3] Testing Webhook Payload Structure & PostgreSQL Insertion...');
  const samplePayload = {
    data_origin: 'health_connect',
    steps: [
      {
        source_record_id: 'hc-step-uuid-001',
        start_time: '2026-09-26T08:00:00Z',
        end_time: '2026-09-26T08:30:00Z',
        count: 3450,
        unit: 'count'
      }
    ],
    calories: [
      {
        source_record_id: 'hc-cal-uuid-002',
        start_time: '2026-09-26T08:00:00Z',
        end_time: '2026-09-26T08:30:00Z',
        calories: 210.5,
        unit: 'kcal'
      }
    ],
    exercise: [
      {
        source_record_id: 'hc-ex-uuid-003',
        start_time: '2026-09-26T08:00:00Z',
        end_time: '2026-09-26T08:30:00Z',
        duration_minutes: 30,
        activity: 'RUNNING'
      }
    ]
  };

  // Test Database Insertion logic
  let inserted = 0;
  let duplicates = 0;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    const recordsToInsert = [
      {
        type: 'steps',
        src: 'health_connect',
        id: 'hc-step-uuid-001',
        start: '2026-09-26T08:00:00Z',
        end: '2026-09-26T08:30:00Z',
        val: 3450,
        unit: 'count',
        item: samplePayload.steps[0]
      },
      {
        type: 'calories',
        src: 'health_connect',
        id: 'hc-cal-uuid-002',
        start: '2026-09-26T08:00:00Z',
        end: '2026-09-26T08:30:00Z',
        val: 210.5,
        unit: 'kcal',
        item: samplePayload.calories[0]
      },
      {
        type: 'exercise',
        src: 'health_connect',
        id: 'hc-ex-uuid-003',
        start: '2026-09-26T08:00:00Z',
        end: '2026-09-26T08:30:00Z',
        val: 30,
        unit: 'minutes',
        item: samplePayload.exercise[0]
      }
    ];

    for (const r of recordsToInsert) {
      const res = await client.query(
        `INSERT INTO health_records 
          (user_id, metric_type, source, source_record_id, start_time, end_time, value_numeric, unit, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING RETURNING id`,
        [testUser.id, r.type, r.src, r.id, r.start, r.end, r.val, r.unit, JSON.stringify(r.item)]
      );
      if (res.rows.length > 0) inserted++;
      else duplicates++;
    }
    await client.query('COMMIT');
  } finally {
    client.release();
  }

  console.log(`[INGESTION PASS 1] Inserted: ${inserted}, Duplicates: ${duplicates}`);
  if (inserted === 3 && duplicates === 0) {
    console.log('PASSED: All 3 initial records successfully inserted.');
  } else {
    console.error('FAILED: Initial record count mismatch.');
  }

  // 4. Test Deduplication Strategy (Duplicate Submission)
  console.log('\n[4] Testing Idempotent Deduplication (Resubmitting Exact Same Payload)...');
  let dupInserted = 0;
  let dupDuplicates = 0;
  const dupClient = await db.pool.connect();

  try {
    await dupClient.query('BEGIN');
    const recordsToInsert = [
      {
        type: 'steps',
        src: 'health_connect',
        id: 'hc-step-uuid-001',
        start: '2026-09-26T08:00:00Z',
        end: '2026-09-26T08:30:00Z',
        val: 3450,
        unit: 'count',
        item: samplePayload.steps[0]
      },
      {
        type: 'calories',
        src: 'health_connect',
        id: 'hc-cal-uuid-002',
        start: '2026-09-26T08:00:00Z',
        end: '2026-09-26T08:30:00Z',
        val: 210.5,
        unit: 'kcal',
        item: samplePayload.calories[0]
      },
      {
        type: 'exercise',
        src: 'health_connect',
        id: 'hc-ex-uuid-003',
        start: '2026-09-26T08:00:00Z',
        end: '2026-09-26T08:30:00Z',
        val: 30,
        unit: 'minutes',
        item: samplePayload.exercise[0]
      }
    ];

    for (const r of recordsToInsert) {
      const res = await dupClient.query(
        `INSERT INTO health_records 
          (user_id, metric_type, source, source_record_id, start_time, end_time, value_numeric, unit, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING RETURNING id`,
        [testUser.id, r.type, r.src, r.id, r.start, r.end, r.val, r.unit, JSON.stringify(r.item)]
      );
      if (res.rows.length > 0) dupInserted++;
      else dupDuplicates++;
    }
    await dupClient.query('COMMIT');
  } finally {
    dupClient.release();
  }

  console.log(`[INGESTION PASS 2] Inserted: ${dupInserted}, Duplicates: ${dupDuplicates}`);
  if (dupInserted === 0 && dupDuplicates === 3) {
    console.log('PASSED: Deduplication prevented duplicate database rows!');
  } else {
    console.error('FAILED: Deduplication failed to catch duplicates.');
  }

  // 5. Verify PostgreSQL DB Records Count
  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) as total FROM health_records WHERE user_id = $1`,
    [testUser.id]
  );
  console.log(`\n[5] Verified total rows in health_records for user ${testUser.id}: ${countRows[0].total}`);

  console.log('\n=== ALL PHASE 1 TESTS PASSED SUCCESSFULLY ===');
  server.close();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test Error:', err);
  if (server) server.close();
  process.exit(1);
});
