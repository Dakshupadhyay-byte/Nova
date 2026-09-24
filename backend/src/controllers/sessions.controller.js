// =============================================================================
// src/controllers/sessions.controller.js — Focus Session Tracking
// =============================================================================
//
// API Contract
// ─────────────
// POST /api/sessions
//
// Request body:
//   {
//     "userId":          1,                       // positive integer, must exist
//     "durationMinutes": 25,                      // positive integer > 0
//     "interruptions":   2,                       // integer >= 0
//     "completed":       true,                    // strict boolean
//     "startedAt":       "2026-09-23T14:32:00Z"  // ISO-8601 timestamp, required
//   }
//
// 201 Created — session recorded:
//   {
//     "success": true,
//     "data": { "sessionId": <id>, "message": "Focus session logged successfully" },
//     "error": null
//   }
//
// 400 Bad Request — validation failure:
//   {
//     "success": false,
//     "error": { "code": "VALIDATION_ERROR", "message": "...", "field": "..." }
//   }
//
// 404 Not Found — userId does not reference an existing user:
//   {
//     "success": false,
//     "error": { "code": "USER_NOT_FOUND", "message": "No user exists with the given ID." }
//   }
//
// DATABASE BEHAVIOR
// ──────────────────
// Inserts one row into focus_sessions and returns the generated BIGSERIAL id
// via RETURNING id — a single atomic round-trip, no second SELECT needed.
//
// The schema (schema.sql) already has CHECK constraints that reinforce the
// application-layer validations below:
//   • duration_minutes > 0
//   • interruptions >= 0
//   • completed is BOOLEAN (Postgres will reject non-boolean values)
//   • started_at IS TIMESTAMPTZ (Postgres will reject non-timestamp strings)
//
// Application-layer validation runs first so the client receives a structured
// { code, message, field } error rather than a raw PostgreSQL error string.
//
// USER EXISTENCE
// ───────────────
// Handled via the PostgreSQL FK constraint (user_id → users.id).
// A missing user causes error code 23503 (foreign_key_violation), which we
// convert to a semantic 404. No extra SELECT round-trip is needed.
// =============================================================================

'use strict';

const db = require('../config/db');

// ─── PostgreSQL error codes ───────────────────────────────────────────────────
const PG_FK_VIOLATION = '23503'; // foreign_key_violation — user_id not in users

// ─── Validation helpers ───────────────────────────────────────────────────────
// Sends a 400 with the structured VALIDATION_ERROR envelope used project-wide.
const sendValidationError = (res, field, message) =>
  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message,
      field,
    },
  });

// Checks that a value is a finite integer (rejects floats, NaN, Infinity).
const isFiniteInteger = (v) => Number.isInteger(v) && isFinite(v);

// Validates an ISO-8601 timestamp by attempting to parse it.
// We verify:
//   1. The value is a non-empty string.
//   2. new Date() produces a valid (non-NaN) date from it.
//   3. The string contains a 'T' separator — distinguishes ISO-8601 datetime
//      strings from bare date strings like "2026-09-23" which are not timestamps.
// We do NOT silently accept bare date strings because they would be stored
// without a time component, which is semantically wrong for a session start.
const isValidIsoTimestamp = (v) => {
  if (typeof v !== 'string' || !v.includes('T')) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
};

/**
 * POST /api/sessions
 *
 * Records a new focus session. All five fields are required with strict types.
 * The session start timestamp is taken from the client — not the server clock —
 * so that offline/backdated sessions can be submitted accurately.
 *
 * @type {import('express').RequestHandler}
 */
const createSession = async (req, res, next) => {
  try {
    const { userId, durationMinutes, interruptions, completed, startedAt } = req.body || {};
    const targetUserId = req.user ? req.user.id : userId;

    if (userId !== undefined && userId !== null && req.user && Number(userId) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot record session for a different user ID.',
        },
      });
    }

    if (targetUserId === undefined || targetUserId === null || targetUserId === '') {
      return sendValidationError(res, 'userId', 'userId is required.');
    }
    const parsedUserId = Number(targetUserId);
    if (!isFiniteInteger(parsedUserId) || parsedUserId <= 0) {
      return sendValidationError(res, 'userId', 'userId must be a positive integer.');
    }

    // ── Validate: durationMinutes ─────────────────────────────────────────────
    // Must be a positive integer (> 0). Floats, zero, and negatives are rejected.
    // The schema enforces CHECK (duration_minutes > 0) at the DB level too.
    if (durationMinutes === undefined || durationMinutes === null || durationMinutes === '') {
      return sendValidationError(res, 'durationMinutes', 'durationMinutes is required.');
    }
    const parsedDuration = Number(durationMinutes);
    if (!isFiniteInteger(parsedDuration) || parsedDuration <= 0) {
      return sendValidationError(
        res, 'durationMinutes',
        'durationMinutes must be a positive integer greater than 0.'
      );
    }

    // ── Validate: interruptions ───────────────────────────────────────────────
    // Required. Must be an integer >= 0. Negative values and floats are rejected.
    if (interruptions === undefined || interruptions === null || interruptions === '') {
      return sendValidationError(res, 'interruptions', 'interruptions is required.');
    }
    const parsedInterruptions = Number(interruptions);
    if (!isFiniteInteger(parsedInterruptions) || parsedInterruptions < 0) {
      return sendValidationError(
        res, 'interruptions',
        'interruptions must be an integer greater than or equal to 0.'
      );
    }

    // ── Validate: completed ───────────────────────────────────────────────────
    // Required. Must be a strict boolean (true or false).
    // We do NOT accept the strings "true", "false", "yes", "no", or 1/0.
    // The frontend should send a native JSON boolean, which Express deserialises
    // correctly when Content-Type: application/json is set.
    if (completed === undefined || completed === null || completed === '') {
      return sendValidationError(res, 'completed', 'completed is required.');
    }
    if (typeof completed !== 'boolean') {
      return sendValidationError(
        res, 'completed',
        'completed must be a boolean (true or false).'
      );
    }

    // ── Validate: startedAt ───────────────────────────────────────────────────
    // Required. Must be a valid ISO-8601 timestamp string containing a 'T'.
    // We do NOT fall back to NOW() if absent or invalid — the client must always
    // supply the authoritative session start time. This preserves accuracy for
    // offline and backdated sessions.
    if (startedAt === undefined || startedAt === null || startedAt === '') {
      return sendValidationError(res, 'startedAt', 'startedAt is required.');
    }
    if (!isValidIsoTimestamp(startedAt)) {
      return sendValidationError(
        res, 'startedAt',
        'startedAt must be a valid ISO-8601 timestamp (e.g. "2026-09-23T14:32:00Z").'
      );
    }

    // ── INSERT query ──────────────────────────────────────────────────────────
    // All five fields are now validated. We pass the typed, parsed values to
    // pg — not the raw req.body strings — to ensure the correct JS types are
    // sent over the wire (pg maps JS booleans to Postgres BOOLEAN, JS strings
    // to TIMESTAMPTZ, etc.).
    //
    // RETURNING id — Postgres echoes the generated BIGSERIAL PK back in the
    // same result as the INSERT. Zero extra round-trips.
    const { rows } = await db.query(
      `INSERT INTO focus_sessions
         (user_id, duration_minutes, interruptions, completed, started_at)
       VALUES
         ($1, $2, $3, $4, $5::TIMESTAMPTZ)
       RETURNING id`,
      [parsedUserId, parsedDuration, parsedInterruptions, completed, startedAt]
    );

    return res.status(201).json({
      success: true,
      data: {
        sessionId: rows[0].id,
        message:   'Focus session logged successfully',
      },
      error: null,
    });

  } catch (err) {
    // ── FK violation → user does not exist ────────────────────────────────────
    // Postgres raises 23503 when user_id has no matching row in users(id).
    // We surface this as a clean 404 rather than leaking a raw DB error string.
    if (err.code === PG_FK_VIOLATION) {
      return res.status(404).json({
        success: false,
        error: {
          code:    'USER_NOT_FOUND',
          message: 'No user exists with the given ID.',
        },
      });
    }

    // All other unexpected errors go to the centralized errorHandler in app.js.
    next(err);
  }
};

module.exports = { createSession };
