// =============================================================================
// src/controllers/checkin.controller.js — Daily Wellness Check-in
// =============================================================================
//
// API Contract
// ─────────────
// POST /api/checkin
//
// Request body:
//   {
//     "userId":      1,           // positive integer, must reference an existing user
//     "sleepHours":  6.5,         // numeric, 0–24 inclusive
//     "energyLevel": 7,           // integer, 1–10 inclusive
//     "logDate":     "2026-09-23" // YYYY-MM-DD, the user's local calendar date
//   }
//
// 201 Created — new check-in for this user/date:
//   { "success": true, "data": { "logId": <id>, "logDate": "...", "message": "Check-in logged successfully" }, "error": null }
//
// 200 OK — existing check-in for this user/date was updated:
//   { "success": true, "data": { "logId": <id>, "logDate": "...", "message": "Check-in updated for today" }, "error": null }
//
// 400 Bad Request — validation failure:
//   { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "field": "..." } }
//
// 404 Not Found — userId does not reference an existing user:
//   { "success": false, "error": { "code": "USER_NOT_FOUND", "message": "No user exists with the given ID." } }
//
// DATABASE BEHAVIOR
// ──────────────────
// A user can have exactly one wellness check-in per calendar date, enforced by
// the UNIQUE constraint uq_wellness_user_date(user_id, log_date) in schema.sql.
//
// We use INSERT … ON CONFLICT (user_id, log_date) DO UPDATE so that:
//   • First submission for a date  → INSERT → 201 Created
//   • Repeat submission for a date → UPDATE → 200 OK
// This is a single atomic round-trip with no separate SELECT needed.
//
// The (xmax = 0) AS is_inserted trick distinguishes insert from update:
//   • xmax is a Postgres system column, 0 on fresh inserts, non-zero on updates.
//   • No extra query needed; the distinction comes back in RETURNING.
//
// USER EXISTENCE
// ───────────────
// We rely on the PostgreSQL foreign key constraint (user_id → users.id) to
// detect non-existent users. A missing user causes Postgres to raise error
// code 23503 (foreign_key_violation), which we catch and convert to a 404.
// This avoids a separate existence-check SELECT round-trip.
// =============================================================================

'use strict';

const db = require('../config/db');

// ─── PostgreSQL error codes handled explicitly ────────────────────────────────
const PG_FK_VIOLATION = '23503'; // foreign_key_violation — user_id not in users table

// ─── Date format validation ───────────────────────────────────────────────────
// Validates that a string is a well-formed YYYY-MM-DD date with a calendar-valid
// day value (e.g., rejects "2026-02-30" which JS would silently roll over to Mar 2).
//
// Strategy: parse the components manually and re-format them, then compare the
// result to the original string. If they differ, the original date doesn't exist
// on the calendar (or has leading-zero issues, etc.).
const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateString = (str) => {
  if (typeof str !== 'string' || !YYYY_MM_DD.test(str)) return false;

  // Split into parts and reconstruct via Date UTC to avoid timezone shifting.
  const [year, month, day] = str.split('-').map(Number);

  // Month in Date constructor is 0-indexed.
  const d = new Date(Date.UTC(year, month - 1, day));

  // Round-trip: if the date rolled over (e.g., Feb 30 → Mar 2), the
  // reconstructed values won't match the originals.
  return (
    d.getUTCFullYear()  === year  &&
    d.getUTCMonth() + 1 === month &&
    d.getUTCDate()      === day
  );
};

// ─── Validation helpers ───────────────────────────────────────────────────────
// Returns a 400 response with the structured validation error envelope.
// Using a helper avoids repeating the same res.status(400).json(...) shape
// in every validation branch.
const sendValidationError = (res, field, message) =>
  res.status(400).json({
    success: false,
    error: {
      code:    'VALIDATION_ERROR',
      message,
      field,
    },
  });

/**
 * POST /api/checkin
 *
 * Upserts a daily wellness check-in for an existing user.
 * Creates the record (201) if none exists for that date, updates it (200) if one does.
 *
 * @type {import('express').RequestHandler}
 */
const createCheckin = async (req, res, next) => {
  try {
    const { userId, sleepHours, energyLevel, logDate } = req.body;

    // ── Validate: userId ──────────────────────────────────────────────────────
    // Must be present and a positive integer. We coerce with Number() so that
    // the string "3" (common in JSON) is accepted alongside the number 3.
    if (userId === undefined || userId === null || userId === '') {
      return sendValidationError(res, 'userId', 'userId is required.');
    }
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return sendValidationError(res, 'userId', 'userId must be a positive integer.');
    }

    // ── Validate: sleepHours ─────────────────────────────────────────────────
    // Required. Must be a finite number in [0, 24].
    // We allow 0 (no sleep reported) and up to 24 (full day).
    if (sleepHours === undefined || sleepHours === null || sleepHours === '') {
      return sendValidationError(res, 'sleepHours', 'sleepHours is required.');
    }
    const parsedSleep = Number(sleepHours);
    if (isNaN(parsedSleep) || !isFinite(parsedSleep) || parsedSleep < 0 || parsedSleep > 24) {
      return sendValidationError(res, 'sleepHours', 'sleepHours must be a number between 0 and 24.');
    }

    // ── Validate: energyLevel ─────────────────────────────────────────────────
    // Required. Must be an integer from 1 to 10 inclusive.
    if (energyLevel === undefined || energyLevel === null || energyLevel === '') {
      return sendValidationError(res, 'energyLevel', 'energyLevel is required.');
    }
    const parsedEnergy = Number(energyLevel);
    if (!Number.isInteger(parsedEnergy) || parsedEnergy < 1 || parsedEnergy > 10) {
      return sendValidationError(res, 'energyLevel', 'energyLevel must be an integer between 1 and 10.');
    }

    // ── Validate: logDate ─────────────────────────────────────────────────────
    // Required. Must be a valid YYYY-MM-DD string.
    // We do NOT replace the client date with the server date — the client's
    // local date is the authoritative calendar date for the check-in.
    if (logDate === undefined || logDate === null || logDate === '') {
      return sendValidationError(res, 'logDate', 'logDate is required.');
    }
    if (!isValidDateString(logDate)) {
      return sendValidationError(res, 'logDate', 'logDate must be a valid date in YYYY-MM-DD format.');
    }

    // ── Upsert query ──────────────────────────────────────────────────────────
    // ON CONFLICT targets the UNIQUE constraint uq_wellness_user_date.
    // EXCLUDED references the values of the blocked INSERT row so we can use
    // them in the DO UPDATE SET clause.
    //
    // RETURNING id, log_date, (xmax = 0) AS is_inserted:
    //   • id          → the row PK, same value whether inserted or updated
    //   • log_date    → echo the stored date back to the client
    //   • is_inserted → TRUE on INSERT, FALSE on UPDATE (xmax system column)
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
      [parsedUserId, logDate, parsedSleep, parsedEnergy]
    );

    const row      = rows[0];
    const isInsert = row.is_inserted; // boolean from pg

    return res.status(isInsert ? 201 : 200).json({
      success: true,
      data: {
        logId:   row.id,
        logDate: row.log_date,
        message: isInsert
          ? 'Check-in logged successfully'
          : 'Check-in updated for today',
      },
      error: null,
    });

  } catch (err) {
    // ── Foreign key violation → user does not exist ───────────────────────────
    // Postgres raises 23503 when user_id has no matching row in users(id).
    // We convert this to a semantic 404 instead of leaking a raw DB error.
    if (err.code === PG_FK_VIOLATION) {
      return res.status(404).json({
        success: false,
        error: {
          code:    'USER_NOT_FOUND',
          message: 'No user exists with the given ID.',
        },
      });
    }

    // All other unexpected errors forward to the centralized errorHandler.
    next(err);
  }
};

module.exports = { createCheckin };
