// =============================================================================
// src/middleware/authMiddleware.js — Google ID Token Verification Middleware
// =============================================================================
//
// PURPOSE
// ────────
// This middleware protects routes that require an authenticated user.
// It re-verifies the Google ID token that the client includes in the
// Authorization header on every protected request.
//
// WHY RE-VERIFY ON EVERY REQUEST?
// ─────────────────────────────────
// Because we issue no application-side JWT, the Google ID token IS the
// credential. Re-verifying it on each protected request means:
//   • We never have to manage our own token revocation
//   • A revoked/expired Google session is automatically rejected
//   • google-auth-library caches Google's public keys locally, so
//     verification is fast (no network round-trip on every request once
//     the keys are cached)
//
// USAGE IN A FUTURE ROUTE
// ─────────────────────────
//   const authMiddleware = require('../middleware/authMiddleware');
//
//   // Protect a single route:
//   router.get('/protected', authMiddleware, someController);
//
//   // Protect all routes in a router:
//   router.use(authMiddleware);
//
// CURRENT SCOPE
// ──────────────
// This middleware is NOT attached to any existing route in this task.
// dashboard, checkin, and sessions routes remain publicly accessible.
// Attaching authMiddleware to those routes is a future step.
//
// EXPECTED HEADER FORMAT
// ───────────────────────
//   Authorization: Bearer <Google ID token>
//
// The token is the same Google credential string that was sent to
// POST /api/auth/google.
// =============================================================================

'use strict';

const { OAuth2Client } = require('google-auth-library');

// Re-use a single OAuth2Client instance for the same reason as in the controller.
// Note: this is a separate instance from the one in auth.controller.js.
// Each file maintains its own, which is fine — OAuth2Client is stateless
// with respect to the client ID configuration.
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Express middleware that verifies a Google ID token from the Authorization header.
 *
 * On success: attaches the verified Google payload to req.user and calls next().
 * On failure: returns 401 without calling next().
 *
 * req.user shape after successful verification:
 *   {
 *     googleId: string,  // Google's stable "sub" identifier
 *     email:    string,
 *     name:     string,
 *   }
 *
 * @type {import('express').RequestHandler}
 */
const authMiddleware = async (req, res, next) => {
  try {
    // ── 1. Read the Authorization header ──────────────────────────────────────
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code:    'MISSING_AUTH_HEADER',
          message: 'Authorization header is required.',
        },
      });
    }

    // ── 2. Validate the "Bearer <token>" format ────────────────────────────────
    // split(' ') produces ['Bearer', '<token>'] for a well-formed header.
    // Anything else (no space, wrong scheme, extra parts) is rejected.
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code:    'MALFORMED_AUTH_HEADER',
          message: 'Authorization header must be in the format: Bearer <token>.',
        },
      });
    }

    const credential = parts[1];

    // ── 3. Guard: GOOGLE_CLIENT_ID must be configured ─────────────────────────
    if (!process.env.GOOGLE_CLIENT_ID) {
      const err = new Error('Server is not configured for Google authentication');
      err.statusCode = 500;
      return next(err);
    }

    // ── 4. Verify the Google ID token ─────────────────────────────────────────
    // Same verification as in auth.controller.js — see that file for detailed
    // comments on what verifyIdToken() checks.
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifyErr) {
      // Log server-side for debugging. Do NOT forward raw error to client.
      console.error('[AUTH MIDDLEWARE] Token verification failed:', verifyErr.message);
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code:    'INVALID_TOKEN',
          message: 'Authentication token is invalid or expired.',
        },
      });
    }

    // ── 5. Attach verified identity to req.user ────────────────────────────────
    // Only trust data from the VERIFIED payload, never from req.body or headers.
    const payload = ticket.getPayload();
    req.user = {
      googleId: payload.sub,
      email:    payload.email,
      name:     payload.name || payload.email,
    };

    // ── 6. Proceed to the route handler ──────────────────────────────────────
    next();

  } catch (err) {
    // Unexpected errors (not verification failures) go to centralized handler.
    next(err);
  }
};

module.exports = authMiddleware;

