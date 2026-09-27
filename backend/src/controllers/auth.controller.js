// =============================================================================
// src/controllers/auth.controller.js — Firebase Auth & Webhook Key Management
// =============================================================================

'use strict';

const crypto = require('crypto');
const { verifyFirebaseToken } = require('../config/firebaseAdmin');
const db = require('../config/db');

/**
 * POST /api/auth/google (also aliased as POST /api/auth/sync)
 *
 * Verifies a Firebase ID token (passed in Authorization header or body credential),
 * finds or creates the corresponding user in PostgreSQL, and returns the DB user profile.
 *
 * Request Header: Authorization: Bearer <Firebase ID Token>
 * Or Request Body: { "credential": "<Firebase ID Token>" }
 *
 * @type {import('express').RequestHandler}
 */
const googleAuth = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header first
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.body && typeof req.body.credential === 'string') {
      token = req.body.credential;
    }

    if (!token || token.trim() === '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'MISSING_CREDENTIAL',
          message: 'A valid Firebase ID token is required.',
        },
      });
    }

    // Verify Firebase ID Token via Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(token);
    } catch (verifyErr) {
      console.error('[AUTH] Firebase token verification failed:', verifyErr.message);
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIAL',
          message: 'Firebase ID token verification failed.',
        },
      });
    }

    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email || `${firebaseUid}@nova.user`;
    const name = decodedToken.name || email.split('@')[0];

    // Upsert into PostgreSQL users table
    const { rows } = await db.query(
      `INSERT INTO users (name, email, google_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (google_id) DO UPDATE SET
         name  = EXCLUDED.name,
         email = EXCLUDED.email
       RETURNING id, name, email`,
      [name, email, firebaseUid]
    );

    const user = rows[0];

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      error: null,
    });

  } catch (err) {
    if (err.code === '23505' && err.constraint === 'users_email_key') {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'EMAIL_CONFLICT',
          message: 'This email address is already associated with a different account.',
        },
      });
    }
    next(err);
  }
};

/**
 * POST /api/auth/webhook-token
 * Generates a long-lived Webhook API Key for the authenticated Firebase user.
 * Hashes the key with SHA-256 before persisting, returning the plaintext key exactly once.
 *
 * Protected by authMiddleware (Firebase Authentication).
 *
 * @type {import('express').RequestHandler}
 */
const generateWebhookToken = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Revoke any existing active keys for this user
    await db.query(
      `UPDATE user_api_keys
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    // 2. Generate secure random token with prefix "nova_hk_"
    const prefix = 'nova_hk_';
    const randomHex = crypto.randomBytes(24).toString('hex');
    const plaintextToken = `${prefix}${randomHex}`;

    // 3. Compute SHA-256 hash
    const keyHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');

    // 4. Store only the hash in user_api_keys
    await db.query(
      `INSERT INTO user_api_keys (user_id, key_hash, key_prefix)
       VALUES ($1, $2, $3)`,
      [userId, keyHash, prefix]
    );

    // Return plaintext token in response envelope
    return res.status(200).json({
      success: true,
      token: plaintextToken,
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/webhook-token/revoke
 * Revokes all active Webhook API Keys for the authenticated Firebase user.
 *
 * Protected by authMiddleware (Firebase Authentication).
 *
 * @type {import('express').RequestHandler}
 */
const revokeWebhookTokens = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { rowCount } = await db.query(
      `UPDATE user_api_keys
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: `${rowCount} webhook token(s) revoked successfully.`,
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  googleAuth,
  syncUser: googleAuth,
  generateWebhookToken,
  revokeWebhookTokens,
};
