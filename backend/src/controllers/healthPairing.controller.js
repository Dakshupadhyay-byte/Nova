// =============================================================================
// src/controllers/healthPairing.controller.js — Health Sync Device Pairing Controller
// =============================================================================

'use strict';

const crypto = require('crypto');
const db = require('../config/db');

/**
 * POST /api/health/pairing/create
 *
 * Initiates a short-lived, single-use pairing session for the authenticated user.
 * Generates a high-entropy pairing code to be encoded as a QR code on the web client.
 *
 * Protected by authMiddleware (Firebase Authentication).
 *
 * @type {import('express').RequestHandler}
 */
const createPairingSession = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Invalidate any existing PENDING pairing sessions for this user
    await db.query(
      `UPDATE health_pairing_sessions
       SET status = 'REVOKED'
       WHERE user_id = $1 AND status = 'PENDING'`,
      [userId]
    );

    // 2. Generate cryptographically secure pairing code (32 bytes = 64 hex chars)
    const pairingCode = 'nova_pair_' + crypto.randomBytes(24).toString('hex');
    const expiryMinutes = 5;
    const expiresInSeconds = expiryMinutes * 60;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // 3. Persist pairing session record
    const { rows } = await db.query(
      `INSERT INTO health_pairing_sessions (user_id, pairing_code, expires_at, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id, pairing_code, expires_at`,
      [userId, pairingCode, expiresAt]
    );

    const session = rows[0];

    return res.status(201).json({
      success: true,
      pairingId: String(session.id),
      pairingCode: session.pairing_code,
      expiresAt: session.expires_at.toISOString(),
      expiresInSeconds,
      data: {
        pairingId: String(session.id),
        pairingCode: session.pairing_code,
        expiresAt: session.expires_at.toISOString(),
        expiresInSeconds,
      },
      error: null,
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/health/pairing/claim
 *
 * Claimed by the Android NOVA Health Sync app after scanning the QR code.
 * Validates the pairing code atomically, associates the device with the NOVA user,
 * and provisions a persistent, revocable webhook credential (stored as SHA-256 hash).
 *
 * Public endpoint authenticated by high-entropy, short-lived pairingCode.
 *
 * @type {import('express').RequestHandler}
 */
const claimPairingSession = async (req, res, next) => {
  const client = await db.pool.connect();

  try {
    const { pairingCode, deviceId, deviceName } = req.body || {};

    // 1. Validate inputs
    if (!pairingCode || typeof pairingCode !== 'string' || pairingCode.trim() === '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'MISSING_PAIRING_CODE',
          message: 'Pairing code is required.',
        },
      });
    }

    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'MISSING_DEVICE_ID',
          message: 'A valid deviceId is required.',
        },
      });
    }

    const trimmedCode = pairingCode.trim();
    const cleanDeviceId = deviceId.trim().slice(0, 255);
    const cleanDeviceName = typeof deviceName === 'string' ? deviceName.trim().slice(0, 150) : null;

    // 2. Begin atomic transaction with row locking
    await client.query('BEGIN');

    const { rows: sessionRows } = await client.query(
      `SELECT id, user_id, pairing_code, status, expires_at
       FROM health_pairing_sessions
       WHERE pairing_code = $1
       FOR UPDATE`,
      [trimmedCode]
    );

    if (sessionRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'PAIRING_NOT_FOUND',
          message: 'Invalid or unrecognized pairing code.',
        },
      });
    }

    const session = sessionRows[0];

    // Check if already claimed
    if (session.status === 'CLAIMED') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'ALREADY_CLAIMED',
          message: 'This pairing session has already been claimed.',
        },
      });
    }

    // Check if revoked or inactive
    if (session.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_PAIRING_STATUS',
          message: `Pairing session is ${session.status.toLowerCase()} and cannot be claimed.`,
        },
      });
    }

    // Check if expired
    const now = new Date();
    if (new Date(session.expires_at) < now) {
      await client.query(
        `UPDATE health_pairing_sessions
         SET status = 'EXPIRED'
         WHERE id = $1`,
        [session.id]
      );
      await client.query('COMMIT');

      return res.status(410).json({
        success: false,
        data: null,
        error: {
          code: 'PAIRING_EXPIRED',
          message: 'Pairing code has expired. Please generate a new QR code on the website.',
        },
      });
    }

    const userId = Number(session.user_id);

    // 3. Mark pairing session as claimed
    await client.query(
      `UPDATE health_pairing_sessions
       SET status = 'CLAIMED',
           claimed_at = NOW(),
           device_id = $2
       WHERE id = $1`,
      [session.id, cleanDeviceId]
    );

    // 4. Generate persistent device webhook token (nova_hk_...)
    const prefix = 'nova_hk_';
    const randomHex = crypto.randomBytes(24).toString('hex');
    const plaintextToken = `${prefix}${randomHex}`;
    const keyHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');

    // 5. Deactivate existing active connections for this user to ensure single active sync device
    await client.query(
      `UPDATE health_device_connections
       SET is_active = FALSE,
           updated_at = NOW()
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    // 6. Insert new active device connection
    await client.query(
      `INSERT INTO health_device_connections (
         user_id, device_id, device_name, key_hash, key_prefix, is_active
       ) VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [userId, cleanDeviceId, cleanDeviceName, keyHash, prefix]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      token: plaintextToken,
      tokenType: 'Bearer',
      deviceId: cleanDeviceId,
      message: 'Health Sync paired successfully.',
      data: {
        token: plaintextToken,
        tokenType: 'Bearer',
        deviceId: cleanDeviceId,
        pairedAt: new Date().toISOString(),
      },
      error: null,
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/health/pairing/status
 *
 * Checks if the currently authenticated user has an active paired Android device.
 * Used by the NOVA web app to toggle between "Connect Health Connect" (QR view)
 * and "Health Connect Connected" status.
 *
 * Protected by authMiddleware (Firebase Authentication).
 *
 * @type {import('express').RequestHandler}
 */
const getPairingStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { rows } = await db.query(
      `SELECT device_id, device_name, created_at, last_sync_at
       FROM health_device_connections
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        connected: false,
        data: {
          connected: false,
        },
        error: null,
      });
    }

    const device = rows[0];

    return res.status(200).json({
      success: true,
      connected: true,
      deviceId: device.device_id,
      deviceName: device.device_name || null,
      connectedAt: device.created_at,
      lastSyncAt: device.last_sync_at || null,
      data: {
        connected: true,
        deviceId: device.device_id,
        deviceName: device.device_name || null,
        connectedAt: device.created_at,
        lastSyncAt: device.last_sync_at || null,
      },
      error: null,
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/health/pairing/revoke
 *
 * Revokes the active Android device connection for the authenticated user.
 * Deactivates the device credential so future webhook requests are rejected with 401.
 * Does NOT delete historic health records, daily aggregates, or the NOVA user account.
 *
 * Protected by authMiddleware (Firebase Authentication).
 *
 * @type {import('express').RequestHandler}
 */
const revokePairing = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Deactivate device connection
    const { rowCount } = await db.query(
      `UPDATE health_device_connections
       SET is_active = FALSE,
           updated_at = NOW()
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    // 2. Invalidate any pending pairing sessions
    await db.query(
      `UPDATE health_pairing_sessions
       SET status = 'REVOKED'
       WHERE user_id = $1 AND status = 'PENDING'`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: rowCount > 0
        ? 'Health Sync device connection revoked successfully.'
        : 'No active Health Sync device connection found to revoke.',
      data: {
        revoked: rowCount > 0,
      },
      error: null,
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPairingSession,
  claimPairingSession,
  getPairingStatus,
  revokePairing,
};
