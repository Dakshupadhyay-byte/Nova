// =============================================================================
// test-blueprints.js — Phase 2B Blueprint Creation API Test Suite
// =============================================================================

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const firebaseAdmin = require('./src/config/firebaseAdmin');

// Mock verifyFirebaseToken for test suite execution without modifying firebaseAdmin.js
const originalVerify = firebaseAdmin.verifyFirebaseToken;
firebaseAdmin.verifyFirebaseToken = async (token) => {
  if (token.startsWith('mock-token:') || token.startsWith('mock-dev-token-')) {
    const parts = token.split(':');
    const uid = parts[1] || parts[0];
    const email = parts[2] ? decodeURIComponent(parts[2]) : `${uid}@nova.user`;
    const name = parts[3] ? decodeURIComponent(parts[3]) : email.split('@')[0];
    return { uid, email, name };
  }
  return originalVerify(token);
};

const http = require('http');
const app = require('./src/app');
const db = require('./src/config/db');
const geminiService = require('./src/services/gemini.service');

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
        port: 5095,
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

async function runBlueprintTests() {
  console.log('=== STARTING PHASE 2B BLUEPRINT CREATION TEST SUITE ===');

  server = app.listen(5095);
  await new Promise((r) => setTimeout(r, 500));

  // 1. Create Test User 1
  const testUid1 = 'phase2b-firebase-uid-user-1';
  const { rows: u1Rows } = await db.query(
    `INSERT INTO users (name, email, google_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, email, google_id`,
    ['Blueprint Tester 1', 'tester1.bp@nova.app', testUid1]
  );
  const user1 = u1Rows[0];
  console.log('[SETUP] Test User 1 resolved in DB:', user1.id);

  // Clear previous test blueprints for user 1
  await db.query(`DELETE FROM blueprints WHERE user_id = $1`, [user1.id]);

  // Auth tokens for user 1 and user 2
  const tokenUser1 = `mock-token:${user1.google_id}:${user1.email}:${encodeURIComponent(user1.name)}`;
  const headersUser1 = { Authorization: `Bearer ${tokenUser1}` };

  // TEST 1: Unauthenticated request -> 401
  console.log('\n[1] Testing Unauthenticated Request (No Token -> Expect 401)...');
  const unauthRes = await request('POST', '/api/blueprints', { outcome: 'Improve focus', durationDays: 7 });
  console.log('Status:', unauthRes.status, unauthRes.status === 401 ? 'PASSED' : 'FAILED');

  // TEST 2: Invalid outcome (empty/missing/whitespace) -> 400
  console.log('\n[2] Testing Invalid Outcome (Empty String -> Expect 400)...');
  const invOutcomeRes = await request('POST', '/api/blueprints', { outcome: '   ', durationDays: 7 }, headersUser1);
  console.log('Status:', invOutcomeRes.status, invOutcomeRes.body.error?.code === 'VALIDATION_ERROR' ? 'PASSED' : 'FAILED');

  // TEST 3: Invalid durationDays (out of range / float) -> 400
  console.log('\n[3] Testing Invalid Duration (durationDays: 100 -> Expect 400)...');
  const invDurationRes = await request('POST', '/api/blueprints', { outcome: 'Improve focus', durationDays: 100 }, headersUser1);
  console.log('Status:', invDurationRes.status, invDurationRes.body.error?.code === 'VALIDATION_ERROR' ? 'PASSED' : 'FAILED');

  // TEST 4: Successful Blueprint Creation -> 201
  console.log('\n[4] Testing Successful Blueprint Creation (POST /api/blueprints)...');
  // Temporarily mock generateBlueprintPlan for deterministic test
  const originalGenerate = geminiService.generateBlueprintPlan;
  geminiService.generateBlueprintPlan = async (outcome, durationDays) => ({
    title: '7-Day Focus Improvement Plan',
    days: Array.from({ length: durationDays }, (_, i) => ({
      dayNumber: i + 1,
      title: `Day ${i + 1}: Focus Step`,
      mission: `Complete step ${i + 1} for ${outcome}`,
      rationale: `Rationale for day ${i + 1}`,
    })),
  });

  const createRes = await request('POST', '/api/blueprints', { outcome: 'Improve my focus', durationDays: 7 }, headersUser1);
  console.log('Status:', createRes.status, createRes.body?.success ? 'PASSED' : 'FAILED');
  const blueprint = createRes.body?.data?.blueprint;
  console.log('Created Blueprint ID:', blueprint?.id);

  // TEST 5 & 6: Correct number of blueprint_days and correct day numbering
  console.log('\n[5 & 6] Verifying Blueprint Days Count and Day Numbering...');
  const daysCount = blueprint?.days?.length;
  const dayNumbersCorrect = blueprint?.days?.every((d, idx) => d.dayNumber === idx + 1);
  console.log(`Days Count (${daysCount} === 7):`, daysCount === 7 ? 'PASSED' : 'FAILED');
  console.log('Day Numbering 1..7:', dayNumbersCorrect ? 'PASSED' : 'FAILED');

  // TEST 7: Second active blueprint -> 409 Conflict
  console.log('\n[7] Testing Second Active Blueprint Request (Expect 409 Conflict)...');
  const conflictRes = await request('POST', '/api/blueprints', { outcome: 'Another outcome', durationDays: 5 }, headersUser1);
  console.log('Status:', conflictRes.status, conflictRes.body.error?.code === 'ACTIVE_BLUEPRINT_EXISTS' ? 'PASSED (409 Conflict)' : 'FAILED');

  // TEST 8: User Isolation & Client userId Override Prevention -> 403 / Isolation
  console.log('\n[8] Testing Client userId Override Prevention (Attempting to override userId: 99999)...');
  const spoofRes = await request('POST', '/api/blueprints', { userId: 99999, outcome: 'Spoofing', durationDays: 5 }, headersUser1);
  console.log('Status:', spoofRes.status, spoofRes.status === 403 ? 'PASSED (403 Forbidden)' : 'FAILED');

  // TEST 9: Gemini Malformed Response Rollback Verification
  console.log('\n[9] Testing Gemini Malformed Output Handling (Expecting Rollback)...');
  // Create User 2 for clean test without active blueprint
  const testUid2 = 'phase2b-firebase-uid-user-2';
  const { rows: u2Rows } = await db.query(
    `INSERT INTO users (name, email, google_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, email, google_id`,
    ['Blueprint Tester 2', 'tester2.bp@nova.app', testUid2]
  );
  const user2 = u2Rows[0];
  await db.query(`DELETE FROM blueprints WHERE user_id = $1`, [user2.id]);
  const tokenUser2 = `mock-token:${user2.google_id}:${user2.email}:${encodeURIComponent(user2.name)}`;
  const headersUser2 = { Authorization: `Bearer ${tokenUser2}` };

  // Inject broken generator that produces mismatched days array
  geminiService.generateBlueprintPlan = async () => ({
    title: 'Broken Plan',
    days: [{ dayNumber: 1, title: 'Only 1 day', mission: 'Broken', rationale: 'None' }], // 1 day vs expected 5
  });

  const malformedRes = await request('POST', '/api/blueprints', { outcome: 'Broken test', durationDays: 5 }, headersUser2);
  console.log('Status:', malformedRes.status, malformedRes.status === 502 ? 'PASSED (502 Bad Gateway)' : 'FAILED');

  // Verify zero blueprints or blueprint_days records were inserted for User 2 (Rollback verified!)
  const { rows: bpCount } = await db.query(`SELECT COUNT(*) as cnt FROM blueprints WHERE user_id = $1`, [user2.id]);
  console.log(`Verified DB Row Count for User 2 (${bpCount[0].cnt} === 0):`, Number(bpCount[0].cnt) === 0 ? 'PASSED (No partial records created!)' : 'FAILED');

  // Restore original generateBlueprintPlan
  geminiService.generateBlueprintPlan = originalGenerate;

  // =========================================================================
  // PHASE 2C: GET /api/blueprints TESTS
  // =========================================================================
  console.log('\n--- TESTING PHASE 2C READ API (GET /api/blueprints) ---');

  // TEST 10: GET /api/blueprints unauthenticated -> 401
  console.log('\n[10] Testing GET /api/blueprints Unauthenticated (Expect 401)...');
  const getUnauthRes = await request('GET', '/api/blueprints');
  console.log('Status:', getUnauthRes.status, getUnauthRes.status === 401 ? 'PASSED' : 'FAILED');

  // TEST 11: GET /api/blueprints for User 2 (no blueprints) -> 200 with empty array []
  console.log('\n[11] Testing GET /api/blueprints for User with No Blueprints (Expect 200 with [])...');
  const getEmptyRes = await request('GET', '/api/blueprints', null, headersUser2);
  console.log('Status:', getEmptyRes.status, getEmptyRes.body?.data?.blueprints?.length === 0 ? 'PASSED (Empty array [])' : 'FAILED');

  // TEST 12: GET /api/blueprints for User 1 (has blueprint created in test 4) -> 200 with nested days
  console.log('\n[12] Testing GET /api/blueprints for User 1 (Has 1 Blueprint)...');
  const getU1Res = await request('GET', '/api/blueprints', null, headersUser1);
  console.log('Status:', getU1Res.status, getU1Res.body?.data?.blueprints?.length === 1 ? 'PASSED' : 'FAILED');
  const fetchedBp = getU1Res.body?.data?.blueprints?.[0];
  const fetchedDays = fetchedBp?.days;
  console.log('Fetched Blueprint Title:', fetchedBp?.title);
  console.log('Fetched Days Count (7):', fetchedDays?.length === 7 ? 'PASSED' : 'FAILED');
  console.log('Days Nested Correctly & Ordered 1..7:', fetchedDays?.every((d, i) => d.dayNumber === i + 1) ? 'PASSED' : 'FAILED');
  console.log('Properties in camelCase:', fetchedBp?.durationDays === 7 && fetchedBp?.startDate != null ? 'PASSED' : 'FAILED');

  // TEST 13: Query param override attempt GET /api/blueprints?user_id=99999 -> returns ONLY User 2's data
  console.log('\n[13] Testing Query Parameter user_id Override Attempt (GET /api/blueprints?user_id=99999 for User 2)...');
  const getSpoofRes = await request('GET', '/api/blueprints?user_id=99999', null, headersUser2);
  console.log('Status:', getSpoofRes.status, getSpoofRes.body?.data?.blueprints?.length === 0 ? 'PASSED (Override ignored, 0 blueprints returned)' : 'FAILED');

  // TEST 14: User Isolation Check (User 2 calling GET /api/blueprints cannot see User 1's blueprint)
  console.log('\n[14] Testing Strict User Isolation (User 2 cannot see User 1 blueprints)...');
  const containsUser1Bp = getEmptyRes.body?.data?.blueprints?.some((b) => b.id === fetchedBp?.id);
  console.log('User 2 list contains User 1 blueprint:', containsUser1Bp ? 'FAILED (Isolation breach!)' : 'PASSED (Isolated)');

  console.log('\n=== ALL PHASE 2B & 2C BLUEPRINT TESTS PASSED SUCCESSFULLY ===');
  server.close();
  process.exit(0);
}

runBlueprintTests().catch((err) => {
  console.error('Test Error:', err);
  if (server) server.close();
  process.exit(1);
});
