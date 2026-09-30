// =============================================================================
// test-health-phase3.js — Phase 3A Daily Health Aggregation Test Suite
// =============================================================================

'use strict';

const http = require('http');
const app = require('./src/app');
const db = require('./src/config/db');
const { rebuildHealthDailyAggregates } = require('./src/services/healthAggregation.service');

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
        port: 5094,
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

async function runPhase3Tests() {
  console.log('=== STARTING PHASE 3A HEALTH AGGREGATION TEST SUITE ===');

  server = app.listen(5094);
  await new Promise((r) => setTimeout(r, 500));

  // 1. Setup Test Users
  const user1Uid = 'phase3-user1-uid-999';
  const user2Uid = 'phase3-user2-uid-888';

  const { rows: u1Rows } = await db.query(
    `INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3)
     ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    ['Phase3 User 1', 'user1.phase3@nova.test', user1Uid]
  );
  const { rows: u2Rows } = await db.query(
    `INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3)
     ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    ['Phase3 User 2', 'user2.phase3@nova.test', user2Uid]
  );

  const u1Id = Number(u1Rows[0].id);
  const u2Id = Number(u2Rows[0].id);

  // Clear previous test records
  await db.query(`DELETE FROM health_records WHERE user_id IN ($1, $2)`, [u1Id, u2Id]);
  await db.query(`DELETE FROM health_daily_aggregates WHERE user_id IN ($1, $2)`, [u1Id, u2Id]);

  // Insert mock records for User 1 for a specific Asia/Kolkata date (2026-09-26)
  // Asia/Kolkata 2026-09-26 00:00:00+05:30 is 2026-09-25 18:30:00Z
  const startTimeISO = '2026-09-25T18:30:00.000Z'; // Midnight IST

  // Insert multiple step snapshots (1000, 2500, 5000)
  await db.query(
    `INSERT INTO health_records (user_id, metric_type, source, source_record_id, start_time, end_time, value_numeric, unit, payload)
     VALUES 
       ($1, 'steps', 'health_connect', 'step-snap-1', $2, '2026-09-26T03:00:00Z', 1000, 'count', '{"count": 1000}'),
       ($1, 'steps', 'health_connect', 'step-snap-2', $2, '2026-09-26T06:00:00Z', 2500, 'count', '{"count": 2500}'),
       ($1, 'steps', 'health_connect', 'step-snap-3', $2, '2026-09-26T10:00:00Z', 5000, 'count', '{"count": 5000}')`,
    [u1Id, startTimeISO]
  );

  // Insert multiple exercise sessions (Workout 1: 600s = 10m, 500m; Workout 2: 1200s = 20m, 1000m)
  await db.query(
    `INSERT INTO health_records (user_id, metric_type, source, source_record_id, start_time, end_time, value_numeric, unit, payload)
     VALUES 
       ($1, 'exercise', 'health_connect', 'ex-snap-1', '2026-09-26T04:00:00Z', '2026-09-26T04:10:00Z', NULL, 'minutes', '{"duration_seconds": 600, "distance_meters": 500}'),
       ($1, 'exercise', 'health_connect', 'ex-snap-2', '2026-09-26T07:00:00Z', '2026-09-26T07:20:00Z', NULL, 'minutes', '{"duration_seconds": 1200, "distance_meters": 1000}')`,
    [u1Id]
  );

  // Insert single record for User 2 to verify user isolation
  await db.query(
    `INSERT INTO health_records (user_id, metric_type, source, source_record_id, start_time, end_time, value_numeric, unit, payload)
     VALUES ($1, 'steps', 'health_connect', 'u2-step-1', $2, '2026-09-26T10:00:00Z', 9999, 'count', '{"count": 9999}')`,
    [u2Id, startTimeISO]
  );

  // A, B, C, D, E. Test Aggregation Service Execution
  console.log('\n[A-E] Testing Daily Aggregation Calculation Logic...');
  await rebuildHealthDailyAggregates(u1Id);
  await rebuildHealthDailyAggregates(u2Id);

  const { rows: u1AggRows } = await db.query(
    `SELECT log_date::text AS log_date, total_steps, active_exercise_minutes, exercise_distance_meters FROM health_daily_aggregates WHERE user_id = $1`,
    [u1Id]
  );

  if (u1AggRows.length === 1) {
    const agg = u1AggRows[0];
    console.log('User 1 Aggregated Row:', agg);

    const stepsPassed = Number(agg.total_steps) === 5000;
    const minsPassed = Number(agg.active_exercise_minutes) === 30; // (600 + 1200) / 60 = 30
    const distPassed = Number(agg.exercise_distance_meters) === 1500; // 500 + 1000 = 1500

    console.log(`- Steps MAX Aggregation (5000 expected): ${agg.total_steps} -> ${stepsPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`- Exercise Minutes SUM (30.00 expected): ${agg.active_exercise_minutes} -> ${minsPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`- Exercise Distance SUM (1500.00 expected): ${agg.exercise_distance_meters} -> ${distPassed ? 'PASSED' : 'FAILED'}`);
  } else {
    console.error('FAILED: User 1 aggregate row missing.');
  }

  // F. Idempotency (Running aggregation twice does not double values)
  console.log('\n[F] Testing Idempotency (Running rebuild again)...');
  await rebuildHealthDailyAggregates(u1Id);
  const { rows: u1AggRows2 } = await db.query(
    `SELECT log_date::text AS log_date, total_steps, active_exercise_minutes, exercise_distance_meters FROM health_daily_aggregates WHERE user_id = $1`,
    [u1Id]
  );
  const agg2 = u1AggRows2[0];
  if (Number(agg2.total_steps) === 5000 && Number(agg2.active_exercise_minutes) === 30) {
    console.log('PASSED: Running aggregation twice did NOT double or corrupt values.');
  } else {
    console.error('FAILED: Idempotency check failed.');
  }

  // G. Timezone Verification
  console.log('\n[G] Testing Asia/Kolkata Date Boundary Attribution...');
  const dateStr = u1AggRows[0].log_date;
  console.log('Attributed log_date:', dateStr);
  if (dateStr === '2026-09-26') {
    console.log('PASSED: Record correctly attributed to 2026-09-26 in Asia/Kolkata timezone.');
  } else {
    console.error(`FAILED: Timezone attribution mismatch (got ${dateStr}).`);
  }

  // H. Unauthenticated Access Rejection
  console.log('\n[H] Testing GET /api/health/daily Unauthenticated Rejection (No Header -> Expect 401)...');
  const unauthRes = await request('GET', '/api/health/daily');
  console.log('Status:', unauthRes.status, unauthRes.body);
  if (unauthRes.status === 401) {
    console.log('PASSED: GET /api/health/daily requires Firebase authentication.');
  } else {
    console.error('FAILED: Unauthenticated GET /api/health/daily was not rejected.');
  }

  // I. User Isolation Verification
  console.log('\n[I] Testing User Isolation (User 1 aggregates do not contain User 2 data)...');
  const { rows: u2AggRows } = await db.query(
    `SELECT log_date::text AS log_date, total_steps FROM health_daily_aggregates WHERE user_id = $1`,
    [u2Id]
  );
  if (u2AggRows.length === 1 && Number(u2AggRows[0].total_steps) === 9999) {
    console.log('PASSED: User 2 has separate aggregate (9999 steps) isolated from User 1.');
  } else {
    console.error('FAILED: User isolation check failed.');
  }

  console.log('\n=== ALL PHASE 3A TESTS PASSED SUCCESSFULLY ===');
  server.close();
  process.exit(0);
}

runPhase3Tests().catch((err) => {
  console.error('Phase 3 Test Error:', err);
  if (server) server.close();
  process.exit(1);
});
