// =============================================================================
// src/middleware/healthWebhookAuthMiddleware.js — Webhook API Key Auth Middleware
// =============================================================================

'use strict';

const crypto = require('crypto');
const db = require('../config/db');

/**
 * Express middleware that authenticates health webhook requests using a long-lived,
 * revocable Webhook API Key (e.g. "Authorization: Bearer nova_hk_...").
 *
 * It hashes the incoming plaintext token with SHA-256 and verifies it against
 * non-revoked records in PostgreSQL user_api_keys.
 *
 * Attached req.user shape:
 *   {
 *     id: number // PostgreSQL user_id
 *   }
 *
 * @type {import('express').RequestHandler}
 */
const healthWebhookAuthMiddleware = async (req, res, next) => {
  try {
    // 1. Read Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'MISSING_AUTH_HEADER',
          message: 'Authorization header is required for health webhook ingestion.',
        },
      });
    }

    // 2. Validate format "Bearer nova_hk_..."
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'MALFORMED_AUTH_HEADER',
          message: 'Authorization header must be in format: Bearer <webhook_token>.',
        },
      });
    }

    const token = parts[1].trim();

    // 3. Verify prefix
    if (!token.startsWith('nova_hk_')) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_WEBHOOK_PREFIX',
          message: 'Webhook token must start with the valid prefix (nova_hk_).',
        },
      });
    }

    // 4. Compute SHA-256 hash of plaintext token
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');

    // 5. Query active matching key in PostgreSQL
    const { rows } = await db.query(
      `SELECT user_id, revoked_at
       FROM user_api_keys
       WHERE key_hash = $1`,
      [keyHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED_WEBHOOK_KEY',
          message: 'Invalid or unrecognized webhook API key.',
        },
      });
    }

    const keyRecord = rows[0];
    if (keyRecord.revoked_at !== null) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'REVOKED_WEBHOOK_KEY',
          message: 'This webhook API key has been revoked.',
        },
      });
    }

    // 6. Attach resolved user identity to req.user
    req.user = {
      id: Number(keyRecord.user_id),
    };

    next();

  } catch (err) {
    next(err);
  }
};

module.exports = healthWebhookAuthMiddleware;
