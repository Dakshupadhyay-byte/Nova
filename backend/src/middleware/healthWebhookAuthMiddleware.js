// =============================================================================
// src/middleware/healthWebhookAuthMiddleware.js — Webhook API Key & Device Auth Middleware
// =============================================================================

'use strict';

const crypto = require('crypto');
const db = require('../config/db');

/**
 * Express middleware that authenticates health webhook requests using either:
 *  1. A manual Webhook API Key from user_api_keys ("Authorization: Bearer nova_hk_...")
 *  2. A paired Android Health Sync device credential from health_device_connections
 *
 * Hashes incoming plaintext token with SHA-256 and securely resolves the associated user_id.
 *
 * Attached req.user shape:
 *   {
 *     id: number,                  // PostgreSQL user_id
 *     authType: 'api_key'|'device',
 *     deviceConnectionId?: number
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

    // 5. Check user_api_keys first (manual webhook token)
    const { rows: apiKeyRows } = await db.query(
      `SELECT user_id, revoked_at
       FROM user_api_keys
       WHERE key_hash = $1`,
      [keyHash]
    );

    if (apiKeyRows.length > 0) {
      const keyRecord = apiKeyRows[0];
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

      req.user = {
        id: Number(keyRecord.user_id),
        authType: 'api_key',
      };

      return next();
    }

    // 6. Check health_device_connections (paired Android Health Sync device)
    const { rows: deviceRows } = await db.query(
      `SELECT id, user_id, is_active
       FROM health_device_connections
       WHERE key_hash = $1`,
      [keyHash]
    );

    if (deviceRows.length > 0) {
      const deviceRecord = deviceRows[0];
      if (!deviceRecord.is_active) {
        return res.status(401).json({
          success: false,
          data: null,
          error: {
            code: 'REVOKED_WEBHOOK_KEY',
            message: 'This health device connection has been revoked.',
          },
        });
      }

      // Update last_sync_at asynchronously (fail-safe)
      db.query(
        `UPDATE health_device_connections SET last_sync_at = NOW() WHERE id = $1`,
        [deviceRecord.id]
      ).catch((err) => {
        console.error('[HEALTH AUTH] Failed to update last_sync_at:', err.message);
      });

      req.user = {
        id: Number(deviceRecord.user_id),
        authType: 'device',
        deviceConnectionId: Number(deviceRecord.id),
      };

      return next();
    }

    // 7. Neither table matched
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED_WEBHOOK_KEY',
        message: 'Invalid or unrecognized webhook API key.',
      },
    });

  } catch (err) {
    next(err);
  }
};

module.exports = healthWebhookAuthMiddleware;

