// =============================================================================
// src/controllers/sessions.controller.js — Focus Session
// =============================================================================
//
// API Contract
// ─────────────
// POST /api/sessions
// Request body: { userId, durationMinutes, interruptions, completed, startedAt }
//
// 201 Created
//   { success: true,  data: { sessionId, message: "Session saved" } }
//
// 404 (FK violation — user does not exist)
//   { success: false, error: { code: "USER_NOT_FOUND", message: "No user exists with the given ID." } }
// =============================================================================

'use strict';

const db = require('../config/db');

// Postgres error code for foreign_key_violation.
// Reusing the same constant pattern as checkin.controller.js for consistency.
const PG_FK_VIOLATION = '23503';

/**
 * POST /api/sessions
 *
 * Inserts a new focus session row and returns the generated PK as `sessionId`.
 *
 * RETURNING id after INSERT:
 * ───────────────────────────
 * Rather than inserting and then doing a second SELECT to retrieve the new row's
 * id, we append RETURNING id to the INSERT statement. Postgres executes both
 * operations atomically and sends back the generated BIGSERIAL value in the same
 * result set — zero extra round-trips.
 *
 * @type {import('express').RequestHandler}
 */
const createSession = async (req, res, next) => {
  try {
    const {
      userId,
      durationMinutes,
      interruptions = 0,  // default to 0 if omitted — matches column DEFAULT
      completed     = false,
      startedAt,          // ISO 8601 string from client; pg casts to TIMESTAMPTZ
    } = req.body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!userId || !durationMinutes) {
      const err = new Error('userId and durationMinutes are required');
      err.statusCode = 400;
      return next(err);
    }

    if (durationMinutes <= 0) {
      const err = new Error('durationMinutes must be a positive integer');
      err.statusCode = 422;
      return next(err);
    }

    // ── INSERT query ──────────────────────────────────────────────────────────
    // started_at: we use the client-supplied startedAt if provided, falling back
    // to DEFAULT NOW() (handled by passing null and letting Postgres use its default).
    // This allows the frontend to submit backdated or offline sessions accurately.
    const { rows } = await db.query(
      `INSERT INTO focus_sessions
         (user_id, duration_minutes, interruptions, completed, started_at)
       VALUES
         ($1, $2, $3, $4, COALESCE($5::TIMESTAMPTZ, NOW()))
       RETURNING id`,
      [userId, durationMinutes, interruptions, completed, startedAt ?? null]
    );

    // RETURNING id gives us exactly one row. rows[0].id is the new BIGSERIAL value.
    return res.status(201).json({
      success: true,
      data: {
        sessionId: rows[0].id,
        message:   'Session saved',
      },
    });
  } catch (err) {
    // ── FK violation → user does not exist ────────────────────────────────────
    if (err.code === PG_FK_VIOLATION) {
      return res.status(404).json({
        success: false,
        error: {
          code:    'USER_NOT_FOUND',
          message: 'No user exists with the given ID.',
        },
      });
    }

    next(err);
  }
};

module.exports = { createSession };
