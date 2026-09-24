// =============================================================================
// src/middleware/authMiddleware.js — Firebase Admin ID Token Verification Middleware
// =============================================================================

'use strict';

const { verifyFirebaseToken } = require('../config/firebaseAdmin');
const db = require('../config/db');

/**
 * Express middleware that verifies a Firebase ID token from the Authorization header,
 * resolves/creates the corresponding PostgreSQL database user, and attaches it to req.user.
 *
 * Header: Authorization: Bearer <Firebase_ID_Token>
 *
 * Attached req.user shape:
 *   {
 *     id: number,          // PostgreSQL primary key BIGINT id
 *     firebaseUid: string, // Firebase permanent UID
 *     email: string,
 *     name: string
 *   }
 *
 * @type {import('express').RequestHandler}
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 1. Read Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'MISSING_AUTH_HEADER',
          message: 'Authorization header is required.',
        },
      });
    }

    // 2. Format validation: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'MALFORMED_AUTH_HEADER',
          message: 'Authorization header must be in format: Bearer <token>.',
        },
      });
    }

    const token = parts[1];

    // 3. Verify Firebase ID Token via Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(token);
    } catch (verifyErr) {
      console.error('[AUTH MIDDLEWARE] Token verification failed:', verifyErr.message);
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Authentication token is invalid or expired.',
        },
      });
    }

    // 4. Resolve/Upsert corresponding user in PostgreSQL
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email || `${firebaseUid}@nova.user`;
    const name = decodedToken.name || email.split('@')[0];

    const { rows } = await db.query(
      `INSERT INTO users (name, email, google_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (google_id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email
       RETURNING id, name, email`,
      [name, email, firebaseUid]
    );

    const dbUser = rows[0];

    // 5. Attach verified identity and DB user ID to req.user
    req.user = {
      id: Number(dbUser.id),
      firebaseUid,
      email: dbUser.email,
      name: dbUser.name,
    };

    next();

  } catch (err) {
    next(err);
  }
};

module.exports = authMiddleware;
