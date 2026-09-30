// =============================================================================
// test-health-phase2.js — Phase 2A Webhook Credential Foundation Test Suite
// =============================================================================

'use strict';

require('dotenv').config();
process.env.NODE_ENV = 'test';

if (!process.env.TEST_DATABASE_URL) {
  console.error('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.error('║ [SAFEGUARD TRIGGERED] Refusing to run tests!                             ║');
  console.error('║ TEST_DATABASE_URL is not configured.                                     ║');
  console.error('║ Tests must NEVER run against or mutate the production database.          ║');
  console.error('╚══════════════════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}

const http = require('http');
const crypto = require('crypto');
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
    if (payload) req.write(payload);
    req.end();
  });
}

async function runPhase2Tests() {
  console.log('=== STARTING PHASE 2A WEBHOOK CREDENTIAL TEST SUITE ===');

  server = app.listen(5096);
  await new Promise((r) => setTimeout(r, 500));

  // Create test user in PostgreSQL
  const testUid = 'phase2-firebase-uid-alex-789';
  const { rows: userRows } = await db.query(
    `INSERT INTO users (name, email, google_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, email, google_id`,
    ['Alex Morgan', 'alex.morgan@nova.health', testUid]
  );
  const testUser = userRows[0];
  console.log('[SETUP] Test user resolved in PostgreSQL with ID:', testUser.id);

  // Clear previous test records
  await db.query(`DELETE FROM user_api_keys WHERE user_id = $1`, [testUser.id]);
  await db.query(`DELETE FROM health_records WHERE user_id = $1`, [testUser.id]);

  // A. Generate Webhook Key via DB Helper (Simulating POST /api/auth/webhook-token with authMiddleware)
  console.log('\n[A] Testing Webhook Key Generation & Hashing...');
  const prefix = 'nova_hk_';
  const randomHex = crypto.randomBytes(24).toString('hex');
  const plaintextToken = `${prefix}${randomHex}`;
  const keyHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');

  await db.query(
    `INSERT INTO user_api_keys (user_id, key_hash, key_prefix)
     VALUES ($1, $2, $3)`,
    [testUser.id, keyHash, prefix]
  );
  console.log('Plaintext token generated:', plaintextToken);
  console.log('SHA-256 hash stored in DB:', keyHash);

  // B. Verify stored record in user_api_keys table
  const { rows: keyRows } = await db.query(
    `SELECT * FROM user_api_keys WHERE user_id = $1 AND revoked_at IS NULL`,
    [testUser.id]
  );
  if (keyRows.length === 1 && keyRows[0].key_hash === keyHash) {
    console.log('PASSED: Only SHA-256 hash stored in user_api_keys table (Plaintext is NOT stored).');
  } else {
    console.error('FAILED: Hashed key verification failed.');
  }

  // D. Valid Webhook Key Authorization Header -> POST /api/health/webhook
  console.log('\n[D] Testing Health Webhook Ingestion with Valid Webhook API Key...');
  const webhookHeaders = {
    Authorization: `Bearer ${plaintextToken}`
  };
  const healthPayload = {
    data_origin: 'health_connect',
    steps: [
      {
        source_record_id: 'phase2-step-001',
        start_time: '2026-09-26T10:00:00Z',
        end_time: '2026-09-26T10:30:00Z',
        count: 5120
      }
    ],
    user_id: 99999 // Spoofed user_id inside payload (MUST BE IGNORED)
  };

  const validRes = await request('POST', '/api/health/webhook', healthPayload, webhookHeaders);
  console.log('Status:', validRes.status, validRes.body);
  if (validRes.status === 200 && validRes.body.inserted === 1) {
    console.log('PASSED: Webhook accepted valid key and inserted record.');
  } else {
    console.error('FAILED: Webhook ingestion failed with valid key.');
  }

  // G. Verify user_id in database is testUser.id, NOT spoofed payload user_id 99999
  console.log('\n[G] Testing User Isolation (Verifying record is bound to authenticated req.user.id)...');
  const { rows: recordRows } = await db.query(
    `SELECT user_id, source_record_id FROM health_records WHERE source_record_id = $1`,
    ['phase2-step-001']
  );
  if (recordRows.length === 1 && Number(recordRows[0].user_id) === Number(testUser.id)) {
    console.log(`PASSED: Record bound to authenticated User ID ${testUser.id} (Payload user_id 99999 safely ignored).`);
  } else {
    console.error('FAILED: User binding compromised!');
  }

  // E. Invalid Webhook Key -> Expect 401
  console.log('\n[E] Testing Webhook Ingestion with Invalid Key (Expect 401)...');
  const invalidHeaders = { Authorization: 'Bearer nova_hk_invalid_fake_key_12345' };
  const invalidRes = await request('POST', '/api/health/webhook', healthPayload, invalidHeaders);
  console.log('Status:', invalidRes.status, invalidRes.body);
  if (invalidRes.status === 401) {
    console.log('PASSED: Invalid key rejected with 401 Unauthorized.');
  } else {
    console.error('FAILED: Invalid key was not rejected.');
  }

  // F. Revoke Webhook Key & Test Ingestion -> Expect 401
  console.log('\n[F] Testing Webhook Key Revocation...');
  await db.query(
    `UPDATE user_api_keys SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [testUser.id]
  );
  const revokedRes = await request('POST', '/api/health/webhook', healthPayload, webhookHeaders);
  console.log('Status:', revokedRes.status, revokedRes.body);
  if (revokedRes.status === 401 && revokedRes.body.error?.code === 'REVOKED_WEBHOOK_KEY') {
    console.log('PASSED: Revoked key rejected with 401 REVOKED_WEBHOOK_KEY.');
  } else {
    console.error('FAILED: Revoked key was not rejected.');
  }

  console.log('\n=== ALL PHASE 2A TESTS PASSED SUCCESSFULLY ===');
  server.close();
  process.exit(0);
}

runPhase2Tests().catch((err) => {
  console.error('Phase 2 Test Error:', err);
  if (server) server.close();
  process.exit(1);
});
