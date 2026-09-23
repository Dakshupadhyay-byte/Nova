// =============================================================================
// src/controllers/checkin.controller.js — Wellness Check-in
// =============================================================================
//
// API Contract
// ─────────────
// POST /api/checkin
// Request body: { userId, sleepHours, energyLevel, logDate }
//
// 201 Created  → new row was inserted
//   { success: true,  data: { logId, logDate, message: "Check-in logged successfully" } }
//
// 200 OK       → existing row for that date was updated
//   { success: true,  data: { logId, logDate, message: "Check-in updated for today" } }
//
// 404          → userId references a user that does not exist (PG error 23503)
//   { success: false, error: { code: "USER_NOT_FOUND", message: "No user exists with the given ID." } }
// =============================================================================

'use strict';

const db = require('../config/db');

// ─── Postgres error codes we handle explicitly ────────────────────────────────
// 23503 = foreign_key_violation
// Thrown when user_id references a users(id) that does not exist.
// Catching it here lets us return a clean 404 rather than leaking a raw PG error.
const PG_FK_VIOLATION = '23503';

/**
 * POST /api/checkin
 *
 * Upserts a wellness check-in for a given user + date.
 *
 * The upsert strategy uses:
 *   INSERT … ON CONFLICT (user_id, log_date) DO UPDATE
 *
 * This relies on the UNIQUE constraint uq_wellness_user_date defined in schema.sql.
 * When the (user_id, log_date) pair already exists, Postgres skips the INSERT
 * and runs the DO UPDATE SET … clause instead — a single, atomic round-trip.
 *
 * Detecting insert vs update — the xmax trick:
 * ─────────────────────────────────────────────
 * `xmax` is a Postgres system column. For a freshly inserted row its value is 0.
 * For an updated row, `xmax` holds the transaction ID of the transaction that
 * last locked/updated it (non-zero). So:
 *   (xmax = 0) AS is_inserted → TRUE on INSERT, FALSE on UPDATE
 *
 * This is the idiomatic, zero-extra-round-trip way to distinguish the two
 * outcomes of an ON CONFLICT upsert without a second SELECT.
 *
 * @type {import('express').RequestHandler}
 */
const createCheckin = async (req, res, next) => {
  try {
    const { userId, sleepHours, energyLevel, logDate } = req.body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!userId || !logDate) {
      const err = new Error('userId and logDate are required');
      err.statusCode = 400;
      return next(err);
    }

    if (energyLevel !== undefined && (energyLevel < 1 || energyLevel > 10)) {
      const err = new Error('energyLevel must be between 1 and 10');
      err.statusCode = 422;
      return next(err);
    }

    // ── Upsert query ──────────────────────────────────────────────────────────
    // ON CONFLICT targets the UNIQUE constraint on (user_id, log_date).
    // DO UPDATE SET re-writes both columns so a re-submitted check-in always
    // reflects the latest values the user entered, not the first ones.
    //
    // RETURNING id, (xmax = 0) AS is_inserted:
    //   • id          → the row's PK (same whether inserted or updated)
    //   • is_inserted → boolean: TRUE for new rows, FALSE for updated rows
    //
    // EXCLUDED is the Postgres alias for the row that *would have been* inserted
    // but was blocked by the conflict — we use it to reference the incoming values.
    const { rows } = await db.query(
      `INSERT INTO wellness_logs (user_id, log_date, sleep_hours, energy_level)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET
         sleep_hours  = EXCLUDED.sleep_hours,
         energy_level = EXCLUDED.energy_level
       RETURNING
         id,
         log_date,
         (xmax = 0) AS is_inserted`,
      [userId, logDate, sleepHours ?? null, energyLevel ?? null]
    );

    const row = rows[0];

    // ── Status code decision based on xmax ────────────────────────────────────
    // row.is_inserted comes back as a JS boolean (pg casts Postgres bool → boolean).
    const isInsert = row.is_inserted;

    return res.status(isInsert ? 201 : 200).json({
      success: true,
      data: {
        logId:   row.id,
        logDate: row.log_date,
        message: isInsert
          ? 'Check-in logged successfully'
          : 'Check-in updated for today',
      },
    });
  } catch (err) {
    // ── Foreign key violation → user does not exist ───────────────────────────
    // Postgres raises error code 23503 (foreign_key_violation) when user_id
    // references a users(id) row that doesn't exist.
    // We intercept it here to return a semantic 404 instead of a 500.
    if (err.code === PG_FK_VIOLATION) {
      return res.status(404).json({
        success: false,
        error: {
          code:    'USER_NOT_FOUND',
          message: 'No user exists with the given ID.',
        },
      });
    }

    // All other errors bubble to the centralized errorHandler in app.js.
    next(err);
  }
};

module.exports = { createCheckin };
