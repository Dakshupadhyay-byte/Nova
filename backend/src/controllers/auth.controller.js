// =============================================================================
// src/controllers/auth.controller.js — Google Sign-In Authentication
// =============================================================================
//
// ARCHITECTURE OVERVIEW
// ──────────────────────
// This backend does NOT issue its own JWTs and does NOT store passwords.
// Authentication is delegated entirely to Google.
//
// Flow:
//   1. The React frontend uses Google Identity Services (GSI) to prompt the
//      user to sign in with their Google account.
//   2. On success, Google returns a "credential" — a signed JWT called an
//      ID token — directly to the frontend JavaScript.
//   3. The frontend POSTs that raw credential string to POST /api/auth/google.
//   4. THIS controller verifies the credential server-side using
//      google-auth-library's OAuth2Client.verifyIdToken().
//      This call makes an HTTPS request to Google's public key endpoint and
//      cryptographically validates the token signature, expiry, and audience.
//   5. Only after verification does this code trust any identity information
//      (name, email, sub) extracted from the token.
//   6. The verified "sub" (subject) claim is used as the stable, permanent
//      Google identity key — it never changes, even if the user changes their
//      email address.
//   7. We look up the user by google_id. If found, we return their profile.
//      If not found, we INSERT a new user row (first-time sign-in = implicit
//      registration) and return the new profile.
//   8. We return the safe user profile. We do NOT create our own JWT.
//      The frontend can use the Google credential for subsequent requests,
//      or we can protect future routes by re-verifying it. That is a future
//      step decided by the product team.
//
// WHY NOT CREATE AN APPLICATION JWT?
// ─────────────────────────────────────
// The requirements explicitly prohibit it. The Google ID token itself carries
// verified identity. For simple MVP use-cases, the client can hold the Google
// credential and re-submit it on protected requests; authMiddleware.js verifies
// it on each call. This avoids managing token refresh, secret rotation, etc.
// =============================================================================

'use strict';

const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');

// ─── Guard: fail loudly if GOOGLE_CLIENT_ID is not configured ─────────────────
// We check at module load time rather than per-request so a misconfigured
// deployment is discovered immediately on startup, not on the first real request.
if (!process.env.GOOGLE_CLIENT_ID) {
  // In production, this should halt startup. For now we log loudly so the
  // dev notices immediately without crashing other unrelated endpoints.
  console.error(
    '[AUTH] FATAL: GOOGLE_CLIENT_ID environment variable is not set. ' +
    'Google authentication will fail on every request.'
  );
}

// One shared OAuth2Client per process. Instantiating it per request is wasteful
// and unnecessary — the client holds no per-user state.
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── googleAuth ───────────────────────────────────────────────────────────────
/**
 * POST /api/auth/google
 *
 * Verifies a Google ID token (credential) issued by Google Identity Services,
 * then finds or creates the corresponding user in PostgreSQL.
 *
 * Request body:
 *   { "credential": "<Google ID token string>" }
 *
 * The `credential` value is the exact string returned by the Google Identity
 * Services `credential` callback (the `response.credential` field from
 * `google.accounts.id.initialize` in the frontend).
 *
 * Success (200 OK — existing user) or (201 Created — new user):
 *   {
 *     "success": true,
 *     "data": {
 *       "user": { "id": 1, "name": "...", "email": "..." }
 *     },
 *     "error": null
 *   }
 *
 * Failure (401 Unauthorized — invalid/expired/missing credential):
 *   {
 *     "success": false,
 *     "data": null,
 *     "error": { "code": "INVALID_GOOGLE_CREDENTIAL", "message": "..." }
 *   }
 *
 * @type {import('express').RequestHandler}
 */
const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;

    // ── Validate presence ─────────────────────────────────────────────────────
    if (!credential || typeof credential !== 'string' || credential.trim() === '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'MISSING_CREDENTIAL',
          message: 'A Google credential (ID token) is required.',
        },
      });
    }

    // ── Guard: GOOGLE_CLIENT_ID must be present to verify ─────────────────────
    if (!process.env.GOOGLE_CLIENT_ID) {
      // This is a server misconfiguration — 500, not 401.
      const err = new Error('Server is not configured for Google authentication');
      err.statusCode = 500;
      return next(err);
    }

    // ── Verify the Google ID token ────────────────────────────────────────────
    // verifyIdToken() does ALL of the following automatically:
    //   • Fetches Google's public keys from https://www.googleapis.com/oauth2/v3/certs
    //   • Validates the RSA signature
    //   • Checks token expiry (exp claim)
    //   • Checks the audience (aud) matches GOOGLE_CLIENT_ID — prevents token
    //     theft from another app being replayed against our backend
    //
    // If any of these checks fail, verifyIdToken() throws. We catch that below.
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifyErr) {
      // verifyIdToken throws on any verification failure (expired, wrong
      // audience, bad signature, etc.). We intentionally do NOT forward the
      // raw Google error message to the client — it may leak implementation
      // details. We log it server-side for debugging.
      console.error('[AUTH] Google token verification failed:', verifyErr.message);
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_GOOGLE_CREDENTIAL',
          message: 'Google credential verification failed. The token may be expired or invalid.',
        },
      });
    }

    // ── Extract verified identity from the payload ────────────────────────────
    // ONLY use data from the VERIFIED payload — never from req.body directly.
    const payload = ticket.getPayload();

    // `sub` is Google's stable, permanent, unique identifier for this Google
    // account. It never changes even if the user changes their email or name.
    // This is what we use as the DB lookup key, not the email.
    const googleId = payload.sub;
    const email    = payload.email;
    const name     = payload.name || payload.email; // fallback if name absent

    // ── Find or create the user in PostgreSQL ─────────────────────────────────
    // We use INSERT … ON CONFLICT (google_id) DO UPDATE to handle the upsert
    // atomically in a single round-trip:
    //   • If google_id is new → INSERT creates the row (first Google sign-in)
    //   • If google_id exists → DO UPDATE refreshes name/email in case they
    //     changed in the user's Google account
    //
    // We use (xmax = 0) AS is_new to distinguish insert from update, so we
    // can return 201 vs 200 accurately — the same pattern used in
    // checkin.controller.js.
    //
    // NOTE: ON CONFLICT targets the UNIQUE constraint on google_id. The
    // UNIQUE constraint on email is handled separately: if a user's Google
    // email changed AND another account already owns that email in our DB,
    // the DO UPDATE would fail with a unique_violation (23505). In that
    // edge case the catch block below handles it clearly.
    const { rows } = await db.query(
      `INSERT INTO users (name, email, google_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (google_id) DO UPDATE SET
         name  = EXCLUDED.name,
         email = EXCLUDED.email
       RETURNING
         id,
         name,
         email,
         (xmax = 0) AS is_new`,
      [name, email, googleId]
    );

    const user  = rows[0];
    const isNew = user.is_new; // true = first-ever sign-in, false = returning user

    // ── Build the safe response ───────────────────────────────────────────────
    // We return only id, name, email. We do NOT return:
    //   • google_id (internal implementation detail)
    //   • created_at
    //   • The raw Google credential or any Google token
    //   • Any application-issued JWT
    return res.status(isNew ? 201 : 200).json({
      success: true,
      data: {
        user: {
          id:    user.id,
          name:  user.name,
          email: user.email,
        },
      },
      error: null,
    });

  } catch (err) {
    // ── Handle PostgreSQL unique_violation on email (23505) ───────────────────
    // This can happen if a user's Google-verified email already exists in the
    // users table under a DIFFERENT google_id (e.g., same person used a different
    // Google account previously). Rather than silently merging accounts (unsafe),
    // we surface a clear error.
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

    // All other unexpected errors go to the centralized errorHandler.
    next(err);
  }
};

module.exports = { googleAuth };

