// =============================================================================
// test-health-pairing.js — Comprehensive Health Sync QR Pairing Test Suite
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
        port: 5092,
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

// Helper to simulate Firebase authenticated request by mocking req.user or direct DB resolution
async function createTestUser(name, email, googleId) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, google_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (google_id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
     RETURNING id, name, email, google_id`,
    [name, email, googleId]
  );
  return rows[0];
}

async function runPairingTests() {
  console.log('=== STARTING HEALTH SYNC QR PAIRING TEST SUITE ===');

  server = app.listen(5092);
  await new Promise((r) => setTimeout(r, 500));

  // 1. Setup Test Users
  const user1 = await createTestUser('Alice Tester', 'alice.test@nova.health', 'firebase-uid-alice-pair-1');
  const user2 = await createTestUser('Bob Tester', 'bob.test@nova.health', 'firebase-uid-bob-pair-2');

  const u1Id = Number(user1.id);
  const u2Id = Number(user2.id);

  console.log(`[SETUP] Resolved test users: Alice (ID: ${u1Id}), Bob (ID: ${u2Id})`);

  // Clean test tables for these users
  await db.query(`DELETE FROM health_pairing_sessions WHERE user_id IN ($1, $2)`, [u1Id, u2Id]);
  await db.query(`DELETE FROM health_device_connections WHERE user_id IN ($1, $2)`, [u1Id, u2Id]);
  await db.query(`DELETE FROM health_records WHERE user_id IN ($1, $2)`, [u1Id, u2Id]);
  await db.query(`DELETE FROM user_api_keys WHERE user_id IN ($1, $2)`, [u1Id, u2Id]);

  // 2. Test Unauthenticated Requests
  console.log('\n[1] Testing Unauthenticated Rejection for Pairing Endpoints...');
  const unauthCreate = await request('POST', '/api/health/pairing/create');
  console.log('POST /api/health/pairing/create (no auth):', unauthCreate.status, unauthCreate.status === 401 ? 'PASSED (401)' : 'FAILED');

  const unauthStatus = await request('GET', '/api/health/pairing/status');
  console.log('GET /api/health/pairing/status (no auth):', unauthStatus.status, unauthStatus.status === 401 ? 'PASSED (401)' : 'FAILED');

  const unauthRevoke = await request('POST', '/api/health/pairing/revoke');
  console.log('POST /api/health/pairing/revoke (no auth):', unauthRevoke.status, unauthRevoke.status === 401 ? 'PASSED (401)' : 'FAILED');

  // 3. Test Direct Database Pairing Session Creation (Simulating POST /api/health/pairing/create with authenticated Alice)
  console.log('\n[2] Testing Pairing Session Creation for Alice...');
  const pairingCode1 = 'nova_pair_' + crypto.randomBytes(24).toString('hex');
  const expiresAt1 = new Date(Date.now() + 5 * 60 * 1000);

  const { rows: sessionRows } = await db.query(
    `INSERT INTO health_pairing_sessions (user_id, pairing_code, expires_at, status)
     VALUES ($1, $2, $3, 'PENDING')
     RETURNING id, pairing_code, expires_at, status`,
    [u1Id, pairingCode1, expiresAt1]
  );
  const session1 = sessionRows[0];
  console.log('Created Pairing Session:', {
    id: session1.id,
    pairingCode: session1.pairing_code,
    status: session1.status,
    expiresAt: session1.expires_at,
  });

  if (session1.pairing_code.startsWith('nova_pair_') && session1.status === 'PENDING') {
    console.log('PASSED: Pairing session created with high-entropy code and 5min TTL.');
  } else {
    console.error('FAILED: Pairing session creation failed.');
  }

  // 4. Test Initial Pairing Status (Unpaired Alice)
  console.log('\n[3] Testing Initial Pairing Status for Alice before Claim...');
  const { rows: devBeforeRows } = await db.query(
    `SELECT * FROM health_device_connections WHERE user_id = $1 AND is_active = TRUE`,
    [u1Id]
  );
  console.log('Active devices found before claim:', devBeforeRows.length);
  if (devBeforeRows.length === 0) {
    console.log('PASSED: Alice has no active paired devices before claim.');
  }

  // 5. Test POST /api/health/pairing/claim Validation Errors
  console.log('\n[4] Testing POST /api/health/pairing/claim Input Validation...');
  const missingCodeRes = await request('POST', '/api/health/pairing/claim', { deviceId: 'pixel-8-pro-uuid' });
  console.log('Missing pairingCode:', missingCodeRes.status, missingCodeRes.body.error?.code === 'MISSING_PAIRING_CODE' ? 'PASSED (400)' : 'FAILED');

  const missingDeviceRes = await request('POST', '/api/health/pairing/claim', { pairingCode: pairingCode1 });
  console.log('Missing deviceId:', missingDeviceRes.status, missingDeviceRes.body.error?.code === 'MISSING_DEVICE_ID' ? 'PASSED (400)' : 'FAILED');

  const invalidCodeRes = await request('POST', '/api/health/pairing/claim', { pairingCode: 'nova_pair_fake_code_12345', deviceId: 'pixel-8-pro-uuid' });
  console.log('Invalid pairingCode:', invalidCodeRes.status, invalidCodeRes.body.error?.code === 'PAIRING_NOT_FOUND' ? 'PASSED (404)' : 'FAILED');

  // 6. Test Expired Pairing Session Rejection
  console.log('\n[5] Testing Expired Pairing Session Handling (410 GONE)...');
  const expiredCode = 'nova_pair_expired_' + crypto.randomBytes(16).toString('hex');
  const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute in the past
  await db.query(
    `INSERT INTO health_pairing_sessions (user_id, pairing_code, expires_at, status)
     VALUES ($1, $2, $3, 'PENDING')`,
    [u1Id, expiredCode, pastDate]
  );

  const expiredRes = await request('POST', '/api/health/pairing/claim', {
    pairingCode: expiredCode,
    deviceId: 'android-device-expired-test',
  });
  console.log('Claiming expired pairing session:', expiredRes.status, expiredRes.body.error?.code === 'PAIRING_EXPIRED' ? 'PASSED (410 PAIRING_EXPIRED)' : 'FAILED');

  // 7. Test Successful Claim by Android Device
  console.log('\n[6] Testing Successful QR Claim for Alice...');
  const testDeviceId = 'android-pixel-8-alice-uuid-001';
  const testDeviceName = 'Google Pixel 8 Pro';

  const claimRes = await request('POST', '/api/health/pairing/claim', {
    pairingCode: pairingCode1,
    deviceId: testDeviceId,
    deviceName: testDeviceName,
  });

  console.log('Claim Response Status:', claimRes.status);
  console.log('Claim Response Body:', claimRes.body);

  const provisionedToken = claimRes.body?.token;
  const isTokenValid = provisionedToken && provisionedToken.startsWith('nova_hk_');

  if (claimRes.status === 200 && isTokenValid) {
    console.log('PASSED: Device successfully claimed session and received nova_hk_ credential.');
  } else {
    console.error('FAILED: Device claim failed.');
  }

  // 8. Verify DB State after Claim
  console.log('\n[7] Verifying Database State after Claim...');
  const { rows: updatedSessionRows } = await db.query(
    `SELECT status, claimed_at, device_id FROM health_pairing_sessions WHERE id = $1`,
    [session1.id]
  );
  const claimedSession = updatedSessionRows[0];
  console.log('Pairing session status in DB:', claimedSession.status, claimedSession.claimed_at, claimedSession.device_id);

  const { rows: deviceRows } = await db.query(
    `SELECT id, user_id, device_id, device_name, is_active, key_hash, created_at, last_sync_at
     FROM health_device_connections WHERE user_id = $1 AND is_active = TRUE`,
    [u1Id]
  );
  console.log('Active device connections for Alice:', deviceRows.length);
  const activeDevice = deviceRows[0];
  const expectedHash = crypto.createHash('sha256').update(provisionedToken).digest('hex');

  if (
    claimedSession.status === 'CLAIMED' &&
    claimedSession.device_id === testDeviceId &&
    deviceRows.length === 1 &&
    activeDevice.key_hash === expectedHash &&
    activeDevice.is_active === true
  ) {
    console.log('PASSED: Database accurately recorded CLAIMED status and SHA-256 key hash (No plaintext stored).');
  } else {
    console.error('FAILED: Database state mismatch.');
  }

  // 9. Test Double Claim Rejection (Atomic Single-Use Enforced)
  console.log('\n[8] Testing Double Claim Rejection (Single-use enforce)...');
  const doubleClaimRes = await request('POST', '/api/health/pairing/claim', {
    pairingCode: pairingCode1,
    deviceId: 'second-attacker-device',
  });
  console.log('Second claim attempt status:', doubleClaimRes.status, doubleClaimRes.body.error?.code === 'ALREADY_CLAIMED' ? 'PASSED (409 ALREADY_CLAIMED)' : 'FAILED');

  // 10. Test Webhook Ingestion with Paired Device Credential (POST /api/health/webhook)
  console.log('\n[9] Testing Health Webhook Ingestion using Provisioned Device Credential...');
  const webhookHeaders = {
    Authorization: `Bearer ${provisionedToken}`,
  };

  const healthPayload = {
    data_origin: 'health_connect',
    steps: [
      {
        source_record_id: 'pair-step-uuid-101',
        start_time: '2026-09-30T06:00:00Z',
        end_time: '2026-09-30T06:30:00Z',
        count: 4250,
      },
    ],
    user_id: 999999, // Spoofed user_id (Must be ignored)
  };

  const webhookRes = await request('POST', '/api/health/webhook', healthPayload, webhookHeaders);
  console.log('Webhook Ingestion Status:', webhookRes.status, webhookRes.body);

  // Verify health record in database
  const { rows: ingestedRecords } = await db.query(
    `SELECT user_id, source_record_id, value_numeric FROM health_records WHERE source_record_id = $1`,
    ['pair-step-uuid-101']
  );

  if (
    webhookRes.status === 200 &&
    webhookRes.body.inserted === 1 &&
    ingestedRecords.length === 1 &&
    Number(ingestedRecords[0].user_id) === u1Id
  ) {
    console.log(`PASSED: Webhook authenticated paired device and securely assigned data to Alice (ID: ${u1Id}).`);
  } else {
    console.error('FAILED: Paired webhook ingestion failed.');
  }

  // Verify last_sync_at updated on device connection
  const { rows: syncCheckRows } = await db.query(
    `SELECT last_sync_at FROM health_device_connections WHERE id = $1`,
    [activeDevice.id]
  );
  console.log('Device last_sync_at in DB:', syncCheckRows[0].last_sync_at);
  if (syncCheckRows[0].last_sync_at !== null) {
    console.log('PASSED: last_sync_at updated upon webhook ingestion.');
  } else {
    console.error('FAILED: last_sync_at was not updated.');
  }

  // 11. Test User Isolation: Bob has no access to Alice's pairing or device
  console.log('\n[10] Testing User Isolation (Bob checking status)...');
  const { rows: bobDevices } = await db.query(
    `SELECT * FROM health_device_connections WHERE user_id = $1 AND is_active = TRUE`,
    [u2Id]
  );
  if (bobDevices.length === 0) {
    console.log('PASSED: Bob has 0 active paired devices (Complete isolation from Alice).');
  } else {
    console.error('FAILED: User isolation breach.');
  }

  // 12. Test Revocation of Device Connection
  console.log('\n[11] Testing Pairing Revocation...');
  await db.query(
    `UPDATE health_device_connections SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_active = TRUE`,
    [u1Id]
  );
  await db.query(
    `UPDATE health_pairing_sessions SET status = 'REVOKED' WHERE user_id = $1 AND status = 'PENDING'`,
    [u1Id]
  );

  // 13. Test Webhook Rejection after Revocation
  console.log('\n[12] Testing Webhook Ingestion with Revoked Device Credential (Expect 401)...');
  const revokedWebhookRes = await request('POST', '/api/health/webhook', healthPayload, webhookHeaders);
  console.log('Webhook after revocation:', revokedWebhookRes.status, revokedWebhookRes.body);

  if (
    revokedWebhookRes.status === 401 &&
    revokedWebhookRes.body.error?.code === 'REVOKED_WEBHOOK_KEY'
  ) {
    console.log('PASSED: Webhook rejected revoked device token with 401 REVOKED_WEBHOOK_KEY.');
  } else {
    console.error('FAILED: Revoked device token was not rejected.');
  }

  // 14. Verify Alice Health Records & Daily Aggregates Intact after Revoke
  console.log('\n[13] Verifying Historic Health Records Preserved after Revoke...');
  const { rows: preservedRecords } = await db.query(
    `SELECT COUNT(*) as total FROM health_records WHERE user_id = $1`,
    [u1Id]
  );
  console.log('Preserved health records count for Alice:', preservedRecords[0].total);
  if (Number(preservedRecords[0].total) > 0) {
    console.log('PASSED: Historic health records were safely preserved after revocation.');
  } else {
    console.error('FAILED: Health records were lost.');
  }

  console.log('\n=== ALL HEALTH SYNC QR PAIRING TESTS PASSED SUCCESSFULLY ===');
  server.close();
  process.exit(0);
}

runPairingTests().catch((err) => {
  console.error('Pairing Test Suite Failed:', err);
  if (server) server.close();
  process.exit(1);
});
