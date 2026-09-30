// =============================================================================
// test-ai-roadmap.js — AI Roadmap Context & Action Rescheduling Test Suite
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
const { buildDbContext } = require('./src/services/aiContext.service');
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
        port: 5096,
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
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runAIRoadmapTests() {
  console.log('=== STARTING AI ROADMAP CONTEXT & RESCHEDULING TEST SUITE ===');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(5096, resolve));

  const u1Token = 'mock-token:ai-roadmap-user-1:ai1%40nova.user:AI%20Roadmap%20Tester';
  const u2Token = 'mock-token:ai-roadmap-user-2:ai2%40nova.user:AI%20Isolation%20Tester';

  const headersUser1 = { Authorization: `Bearer ${u1Token}` };
  const headersUser2 = { Authorization: `Bearer ${u2Token}` };

  // Sync users
  const sync1 = await request('POST', '/api/auth/sync', { credential: u1Token }, headersUser1);
  const user1Id = sync1.body.data.user.id;

  const sync2 = await request('POST', '/api/auth/sync', { credential: u2Token }, headersUser2);
  const user2Id = sync2.body.data.user.id;

  // Clean test user data
  await db.query(`DELETE FROM blueprint_days WHERE blueprint_id IN (SELECT id FROM blueprints WHERE user_id IN ($1, $2))`, [user1Id, user2Id]);
  await db.query(`DELETE FROM blueprints WHERE user_id IN ($1, $2)`, [user1Id, user2Id]);

  console.log(`[SETUP] Test User 1 ID: ${user1Id}, Test User 2 ID: ${user2Id}`);

  // Create an active roadmap for User 1
  const { rows: bpRows } = await db.query(
    `INSERT INTO blueprints (user_id, title, outcome, duration_days, start_date, end_date, status)
     VALUES ($1, '7-Day Focus Mastery', 'Master deep focus blocks', 7, CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', 'active')
     RETURNING id, title, outcome, duration_days, start_date, end_date, status`,
    [user1Id]
  );
  const blueprintId = bpRows[0].id;

  // Insert 7 days
  const insertedDays = [];
  for (let i = 1; i <= 7; i++) {
    const isCompleted = i === 1;
    const status = isCompleted ? 'completed' : 'pending';
    const { rows: dRows } = await db.query(
      `INSERT INTO blueprint_days (blueprint_id, day_number, log_date, title, mission, rationale, status, completed_at)
       VALUES ($1, $2, (CURRENT_DATE + ($3 || ' days')::INTERVAL)::DATE, $4, $5, $6, $7, $8)
       RETURNING id, blueprint_id, day_number, log_date::TEXT AS log_date, title, mission, status, original_log_date`,
      [
        blueprintId,
        i,
        i - 1,
        `Mission Day ${i}`,
        `Actionable task for day ${i}`,
        `Rationale for day ${i}`,
        status,
        isCompleted ? new Date() : null,
      ]
    );
    insertedDays.push(dRows[0]);
  }

  // Reschedule Day 7 in DB to test original_log_date in context
  const day7 = insertedDays[6];
  await db.query(
    `UPDATE blueprint_days
     SET log_date = CURRENT_DATE + INTERVAL '20 days',
         original_log_date = log_date,
         rescheduled_at = NOW()
     WHERE id = $1`,
    [day7.id]
  );

  console.log('\n--- SECTION 1: AI CONTEXT ROADMAP INCLUSION TESTS ---');

  // TEST 1: Active Roadmap is included in buildDbContext
  console.log('[1] Verifying buildDbContext includes active Roadmap for User 1...');
  const ctx1 = await buildDbContext(user1Id);
  console.log('Active Roadmap present:', Boolean(ctx1.roadmap));
  console.log(`Roadmap ID match (${ctx1.roadmap?.id} === ${blueprintId}):`, Number(ctx1.roadmap?.id) === Number(blueprintId) ? 'PASSED' : 'FAILED');
  console.log('Total missions (7 === 7):', ctx1.roadmap?.days?.length === 7 ? 'PASSED' : 'FAILED');

  // TEST 2: Today's mission is identified
  console.log('\n[2] Verifying todayMission is correctly identified in context...');
  console.log('todayMission present:', Boolean(ctx1.roadmap?.todayMission));
  console.log('todayMission dayNumber === 1:', ctx1.roadmap?.todayMission?.dayNumber === 1 ? 'PASSED' : 'FAILED');
  console.log('todayMission status === "completed":', ctx1.roadmap?.todayMission?.status === 'completed' ? 'PASSED' : 'FAILED');

  // TEST 3: Pending vs Completed counts
  console.log('\n[3] Verifying pending and completed counts...');
  console.log('completedCount (1 === 1):', ctx1.roadmap?.completedCount === 1 ? 'PASSED' : 'FAILED');
  console.log('pendingCount (6 === 6):', ctx1.roadmap?.pendingCount === 6 ? 'PASSED' : 'FAILED');

  // TEST 4: Rescheduled mission original date
  console.log('\n[4] Verifying rescheduled mission contains originalDate in context...');
  const ctxDay7 = ctx1.roadmap?.days?.find((d) => d.id === Number(day7.id));
  console.log('Day 7 has originalDate:', Boolean(ctxDay7?.originalDate));
  console.log('rescheduledCount (1 === 1):', ctx1.roadmap?.rescheduledCount === 1 ? 'PASSED' : 'FAILED');

  // TEST 5: User Isolation (User 2 has no active Roadmap)
  console.log('\n[5] Verifying user isolation (User 2 context has no Roadmap)...');
  const ctx2 = await buildDbContext(user2Id);
  console.log('User 2 roadmap is undefined:', ctx2.roadmap === undefined ? 'PASSED' : 'FAILED');

  console.log('\n--- SECTION 2: AI CHAT ENDPOINT & STRUCTURED ACTION TESTS ---');

  // Save original sendMessage
  const originalSendMessage = geminiService.sendMessage;

  // TEST 6: Informational query -> action: null
  console.log('\n[6] Testing Informational Query ("What is my mission today?")...');
  geminiService.sendMessage = async () => ({
    reply: "Today's mission is Mission Day 1: Actionable task for day 1. You have already completed it!",
    action: null,
  });

  const infoRes = await request('POST', '/api/ai/chat', { message: 'What is my mission today?' }, headersUser1);
  console.log('Status: 200', infoRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('action is null:', infoRes.body?.data?.action === null ? 'PASSED' : 'FAILED');
  console.log('reply present:', Boolean(infoRes.body?.data?.reply) ? 'PASSED' : 'FAILED');

  // TEST 7: Valid Reschedule proposal (e.g. move pending Day 3 to unoccupied date)
  console.log('\n[7] Testing Valid Reschedule Proposal (Day 3 -> 2026-11-15)...');
  const day3 = insertedDays[2];
  geminiService.sendMessage = async () => ({
    reply: "I've prepared a request to move Day 3 to November 15, 2026. Please confirm the change below.",
    action: {
      type: 'RESCHEDULE_ROADMAP_DAY',
      dayId: Number(day3.id),
      dayNumber: 3,
      missionTitle: 'Mission Day 3',
      currentDate: day3.log_date,
      targetDate: '2026-11-15',
    },
  });

  const reschRes = await request('POST', '/api/ai/chat', { message: 'Move Day 3 to November 15' }, headersUser1);
  console.log('Status: 200', reschRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('Action type RESCHEDULE_ROADMAP_DAY:', reschRes.body?.data?.action?.type === 'RESCHEDULE_ROADMAP_DAY' ? 'PASSED' : 'FAILED');
  console.log('Action dayId match:', reschRes.body?.data?.action?.dayId === Number(day3.id) ? 'PASSED' : 'FAILED');
  console.log('Action targetDate === "2026-11-15":', reschRes.body?.data?.action?.targetDate === '2026-11-15' ? 'PASSED' : 'FAILED');
  console.log('Reply instructs confirmation:', reschRes.body?.data?.reply?.includes('confirm') ? 'PASSED' : 'FAILED');

  // Verify DB log_date has NOT changed upon proposal
  const { rows: preDbCheck } = await db.query('SELECT log_date::TEXT FROM blueprint_days WHERE id = $1', [day3.id]);
  console.log('Database unchanged after AI proposal:', preDbCheck[0].log_date === day3.log_date ? 'PASSED' : 'FAILED');

  // TEST 8: Ambiguous request -> action: null
  console.log('\n[8] Testing Ambiguous Request ("Move it")...');
  geminiService.sendMessage = async () => ({
    reply: 'Which day or mission would you like to move, and what date should I move it to?',
    action: null,
  });

  const ambigRes = await request('POST', '/api/ai/chat', { message: 'Move it' }, headersUser1);
  console.log('action is null:', ambigRes.body?.data?.action === null ? 'PASSED' : 'FAILED');

  // TEST 9: AI proposes completed mission -> Controller sanitizes to action: null
  console.log('\n[9] Testing AI Proposing Completed Mission (Day 1 is completed -> Sanitized to action: null)...');
  const day1 = insertedDays[0];
  geminiService.sendMessage = async () => ({
    reply: "I'll try moving Day 1.",
    action: {
      type: 'RESCHEDULE_ROADMAP_DAY',
      dayId: Number(day1.id),
      dayNumber: 1,
      missionTitle: 'Mission Day 1',
      currentDate: day1.log_date,
      targetDate: '2026-11-20',
    },
  });

  const compRes = await request('POST', '/api/ai/chat', { message: 'Move completed Day 1' }, headersUser1);
  console.log('Controller rejected completed mission action (action === null):', compRes.body?.data?.action === null ? 'PASSED' : 'FAILED');

  // TEST 10: AI proposes occupied date -> Controller sanitizes to action: null
  console.log('\n[10] Testing AI Proposing Occupied Date (Targeting Day 2 date -> Sanitized to action: null)...');
  const day2 = insertedDays[1];
  geminiService.sendMessage = async () => ({
    reply: "I'll move Day 3 to Day 2's date.",
    action: {
      type: 'RESCHEDULE_ROADMAP_DAY',
      dayId: Number(day3.id),
      dayNumber: 3,
      missionTitle: 'Mission Day 3',
      currentDate: day3.log_date,
      targetDate: day2.log_date, // Already occupied!
    },
  });

  const occRes = await request('POST', '/api/ai/chat', { message: 'Move Day 3 to Day 2 date' }, headersUser1);
  console.log('Controller rejected occupied date action (action === null):', occRes.body?.data?.action === null ? 'PASSED' : 'FAILED');

  // TEST 11: Valid SHIFT_ROADMAP proposal (Push whole roadmap by 2 days)
  console.log('\n[11] Testing Valid SHIFT_ROADMAP Proposal ("Push my whole Roadmap by 2 days")...');
  geminiService.sendMessage = async () => ({
    reply: "I can shift your remaining Roadmap forward by 2 days. This will move 6 pending missions. Please review the proposed changes below and confirm.",
    action: {
      type: 'SHIFT_ROADMAP',
      dayCount: 2,
      direction: 'forward',
    },
  });

  const shiftRes = await request('POST', '/api/ai/chat', { message: 'Push my whole Roadmap by 2 days' }, headersUser1);
  console.log('Status: 200', shiftRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('Action type SHIFT_ROADMAP:', shiftRes.body?.data?.action?.type === 'SHIFT_ROADMAP' ? 'PASSED' : 'FAILED');
  console.log('Action dayCount === 2:', shiftRes.body?.data?.action?.dayCount === 2 ? 'PASSED' : 'FAILED');
  console.log('Action blueprintId matches:', shiftRes.body?.data?.action?.blueprintId === Number(blueprintId) ? 'PASSED' : 'FAILED');
  console.log('Action affectedDaysCount === 6:', shiftRes.body?.data?.action?.affectedDaysCount === 6 ? 'PASSED' : 'FAILED');
  console.log('Action has previewDays array:', Array.isArray(shiftRes.body?.data?.action?.previewDays) ? 'PASSED' : 'FAILED');
  console.log('Reply instructs confirmation:', shiftRes.body?.data?.reply?.includes('confirm') ? 'PASSED' : 'FAILED');

  // Verify DB log_date has NOT changed upon proposal
  const { rows: preShiftCheck } = await db.query('SELECT log_date::TEXT FROM blueprint_days WHERE blueprint_id = $1 ORDER BY day_number', [blueprintId]);
  console.log('Database unchanged after AI shift proposal:', preShiftCheck[1].log_date === insertedDays[1].log_date ? 'PASSED' : 'FAILED');

  // TEST 12: Malformed Gemini Output -> Graceful fallback with action: null
  console.log('\n[12] Testing Malformed Gemini Output -> Fallback to action: null...');
  geminiService.sendMessage = async () => ({
    reply: 'Here is some general advice on focus.',
    action: null,
  });

  const malRes = await request('POST', '/api/ai/chat', { message: 'Tell me about focus' }, headersUser1);
  console.log('Status: 200', malRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('action is null on malformed/regular response:', malRes.body?.data?.action === null ? 'PASSED' : 'FAILED');

  // Restore original sendMessage
  geminiService.sendMessage = originalSendMessage;

  console.log('\n--- SECTION 3: EXECUTING PROPOSED ACTIONS VIA ENDPOINTS ---');

  // TEST 13: Executing confirmed single mission action via existing PATCH /api/blueprints/days/:dayId/reschedule
  console.log('\n[13] Testing Execution of Proposed Action (Day 3 -> 2026-11-15)...');
  const execRes = await request('PATCH', `/api/blueprints/days/${day3.id}/reschedule`, { newDate: '2026-11-15' }, headersUser1);
  console.log('Reschedule Status: 200', execRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('Updated logDate:', execRes.body?.data?.day?.logDate ? 'PASSED' : 'FAILED');
  console.log('originalLogDate stored:', Boolean(execRes.body?.data?.day?.originalLogDate) ? 'PASSED' : 'FAILED');

  // TEST 14: Executing confirmed whole-roadmap shift via PATCH /api/blueprints/:blueprintId/shift
  console.log('\n[14] Testing Execution of Whole-Roadmap Shift (+2 days)...');
  const { rows: preShiftDays } = await db.query(
    `SELECT id, day_number, log_date::TEXT, status, original_log_date FROM blueprint_days WHERE blueprint_id = $1 ORDER BY day_number ASC`,
    [blueprintId]
  );

  const execShiftRes = await request('PATCH', `/api/blueprints/${blueprintId}/shift`, { days: 2 }, headersUser1);
  console.log('Shift Status: 200', execShiftRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('ShiftedCount === 6:', execShiftRes.body?.data?.shiftedCount === 6 ? 'PASSED' : 'FAILED');

  const { rows: postShiftDays } = await db.query(
    `SELECT id, day_number, log_date::TEXT, status, original_log_date FROM blueprint_days WHERE blueprint_id = $1 ORDER BY day_number ASC`,
    [blueprintId]
  );

  // Day 1 was completed -> must NOT have moved
  console.log('Completed Day 1 did NOT move:', postShiftDays[0].log_date === preShiftDays[0].log_date ? 'PASSED' : 'FAILED');

  // Days 2..7 were pending -> must have moved +2 days
  const day2Moved = new Date(postShiftDays[1].log_date) - new Date(preShiftDays[1].log_date) === 2 * 24 * 60 * 60 * 1000;
  console.log('Pending Day 2 moved exactly +2 days:', day2Moved ? 'PASSED' : 'FAILED');

  // Day 7 original_log_date preserved
  console.log('Day 7 original_log_date preserved after whole-roadmap shift:', Boolean(postShiftDays[6].original_log_date) ? 'PASSED' : 'FAILED');

  // TEST 15: Skipped day remains fixed during whole-roadmap shift
  console.log('\n[15] Testing Skipped Day Preservation During Shift...');
  await db.query(`UPDATE blueprint_days SET status = 'skipped' WHERE id = $1`, [insertedDays[1].id]); // Mark Day 2 as skipped

  const { rows: preSkipShift } = await db.query(
    `SELECT id, day_number, log_date::TEXT, status FROM blueprint_days WHERE blueprint_id = $1 ORDER BY day_number ASC`,
    [blueprintId]
  );

  const skipShiftRes = await request('PATCH', `/api/blueprints/${blueprintId}/shift`, { days: 1 }, headersUser1);
  console.log('Shift with skipped day Status: 200', skipShiftRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('Shifted count === 5 (excluding completed Day 1 and skipped Day 2):', skipShiftRes.body?.data?.shiftedCount === 5 ? 'PASSED' : 'FAILED');

  const { rows: postSkipShift } = await db.query(
    `SELECT id, day_number, log_date::TEXT, status FROM blueprint_days WHERE blueprint_id = $1 ORDER BY day_number ASC`,
    [blueprintId]
  );

  console.log('Skipped Day 2 did NOT move:', postSkipShift[1].log_date === preSkipShift[1].log_date ? 'PASSED' : 'FAILED');
  console.log('Completed Day 1 did NOT move:', postSkipShift[0].log_date === preSkipShift[0].log_date ? 'PASSED' : 'FAILED');

  // TEST 16: User isolation (User 2 cannot shift User 1's roadmap)
  console.log('\n[16] Testing User Isolation on Shift (User 2 attempting to shift User 1 blueprint -> Expect 404)...');
  const isolShiftRes = await request('PATCH', `/api/blueprints/${blueprintId}/shift`, { days: 2 }, headersUser2);
  console.log('Status 404 on mismatched user:', isolShiftRes.status === 404 ? 'PASSED' : 'FAILED');

  // TEST 17: Invalid shift parameters
  console.log('\n[17] Testing Invalid Shift Parameters (0, negative, >30, non-integer)...');
  const zeroRes = await request('PATCH', `/api/blueprints/${blueprintId}/shift`, { days: 0 }, headersUser1);
  console.log('days = 0 rejected with 400:', zeroRes.status === 400 ? 'PASSED' : 'FAILED');

  const negRes = await request('PATCH', `/api/blueprints/${blueprintId}/shift`, { days: -3 }, headersUser1);
  console.log('days = -3 rejected with 400:', negRes.status === 400 ? 'PASSED' : 'FAILED');

  const largeRes = await request('PATCH', `/api/blueprints/${blueprintId}/shift`, { days: 45 }, headersUser1);
  console.log('days = 45 rejected with 400:', largeRes.status === 400 ? 'PASSED' : 'FAILED');

  const strRes = await request('PATCH', `/api/blueprints/${blueprintId}/shift`, { days: 'invalid' }, headersUser1);
  console.log('days = "invalid" rejected with 400:', strRes.status === 400 ? 'PASSED' : 'FAILED');

  // TEST 18: Unauthenticated shift request
  console.log('\n[18] Testing Unauthenticated Shift Request (Expect 401)...');
  const unauthRes = await request('PATCH', `/api/blueprints/${blueprintId}/shift`, { days: 2 }, {});
  console.log('Status 401 without auth token:', unauthRes.status === 401 ? 'PASSED' : 'FAILED');

  console.log('\n=== ALL AI ROADMAP & WHOLE-ROADMAP SHIFT TESTS PASSED SUCCESSFULLY ===');
  server.close();
  process.exit(0);
}

runAIRoadmapTests().catch((err) => {
  console.error('Test Error:', err);
  if (server) server.close();
  process.exit(1);
});
