// =============================================================================
// src/controllers/dashboard.controller.js — Dashboard Aggregation
// =============================================================================
//
// API Contract
// ─────────────
// GET /api/dashboard/:userId
//
// 200 OK
//   { success: true,  data: { focusScore, todayEnergy, todaySleep, recentInsight } }
//
// 404 (user not found)
//   { success: false, error: { code: "USER_NOT_FOUND", message: "No user exists with the given ID." } }
//
// When there is no data for today, focusScore / todayEnergy / todaySleep are null.
// =============================================================================

'use strict';

const db = require('../config/db');

// ─── focusScore calculation ────────────────────────────────────────────────────
// Maps total focused minutes today → a 0–100 score.
// Formula: min(totalMinutes / MAX_DAILY_MINUTES, 1) * 100, rounded to nearest int.
// MAX_DAILY_MINUTES = 240 means 4 hours of focused work = a perfect 100.
// Adjust this constant as the product definition of "great focus day" evolves.
const MAX_DAILY_FOCUS_MINUTES = 240;

/**
 * Converts total focused minutes to a 0–100 score.
 * Returns null when there are no sessions for today (minutes is null/0).
 *
 * @param {number|null} totalMinutes
 * @returns {number|null}
 */
const calcFocusScore = (totalMinutes) => {
  // Guard: no sessions logged today → no score
  if (!totalMinutes || totalMinutes <= 0) return null;
  return Math.min(Math.round((totalMinutes / MAX_DAILY_FOCUS_MINUTES) * 100), 100);
};

// ─── recentInsight copy ────────────────────────────────────────────────────────
// Static insight string for the MVP. In production this would be derived from
// the user's rolling data (e.g., correlate sleep_hours < 7 with low focusScore).
const INSIGHT_LOW_SLEEP = 'Your focus drops when sleep is under 7h.';
const INSIGHT_DEFAULT   = 'Consistency is the key to long-term focus.';

/**
 * GET /api/dashboard/:userId
 *
 * Runs two SELECT queries in parallel (Promise.all) to minimise latency:
 *   1. wellness_logs → today's sleep_hours and energy_level for this user
 *   2. focus_sessions → sum of duration_minutes for all of today's sessions
 *
 * WHY Promise.all?
 * ─────────────────
 * Both queries are independent — neither result depends on the other. Running
 * them sequentially would waste time (total latency = query1 + query2).
 * Promise.all fires both against the pool simultaneously; the pool assigns each
 * to a free connection. Total latency collapses to max(query1, query2).
 *
 * WHY verify the user exists first?
 * ────────────────────────────────────
 * The SELECT queries return empty sets for any userId — including IDs that don't
 * exist in the users table. Without an existence check, a request for userId=99999
 * would silently return { focusScore: null, todayEnergy: null, todaySleep: null }
 * instead of the correct 404. We do a lightweight EXISTS query upfront to
 * distinguish "user exists but has no data today" from "user does not exist".
 *
 * @type {import('express').RequestHandler}
 */
const getDashboard = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // ── Validate userId ───────────────────────────────────────────────────────
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      const err = new Error(`Invalid userId: "${userId}" is not a valid integer`);
      err.statusCode = 400;
      return next(err);
    }

    // ── 1. Verify the user exists ─────────────────────────────────────────────
    // A single EXISTS query is the cheapest possible existence check — Postgres
    // stops scanning the moment it finds one matching row (no full table scan).
    const { rows: existRows } = await db.query(
      'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) AS exists',
      [parsedUserId]
    );

    if (!existRows[0].exists) {
      return res.status(404).json({
        success: false,
        error: {
          code:    'USER_NOT_FOUND',
          message: 'No user exists with the given ID.',
        },
      });
    }

    // ── 2. Parallel data queries ──────────────────────────────────────────────
    // Both queries filter by CURRENT_DATE so they are scoped to today in the
    // database server's local timezone. If your users span timezones, consider
    // accepting a `date` param from the client and using it here instead.
    const [wellnessResult, focusResult] = await Promise.all([

      // Query A: today's wellness check-in for this user.
      // We use LIMIT 1 defensively, though the UNIQUE constraint on
      // (user_id, log_date) guarantees at most one row per day.
      db.query(
        `SELECT sleep_hours, energy_level
         FROM   wellness_logs
         WHERE  user_id  = $1
           AND  log_date = CURRENT_DATE
         LIMIT  1`,
        [parsedUserId]
      ),

      // Query B: total focused minutes across all sessions today.
      // SUM() returns NULL when there are no matching rows — we handle that below.
      // We count only completed sessions so an in-progress session doesn't inflate
      // the score prematurely.
      db.query(
        `SELECT SUM(duration_minutes) AS total_minutes
         FROM   focus_sessions
         WHERE  user_id    = $1
           AND  started_at >= CURRENT_DATE
           AND  started_at <  CURRENT_DATE + INTERVAL '1 day'
           AND  completed  = TRUE`,
        [parsedUserId]
      ),
    ]);

    // ── 3. Extract values — handle no-data-today case ─────────────────────────
    // wellnessResult.rows[0] is undefined if no check-in exists for today.
    // Optional chaining (?.) safely returns undefined rather than throwing.
    const wellnessRow    = wellnessResult.rows[0];
    const todaySleep     = wellnessRow?.sleep_hours   ?? null;
    const todayEnergy    = wellnessRow?.energy_level  ?? null;

    // focusResult always returns exactly one row (SUM returns a row even for
    // no matches, but total_minutes will be null). Parse to int; SUM returns
    // a string in some pg versions.
    const rawMinutes     = focusResult.rows[0]?.total_minutes;
    const totalMinutes   = rawMinutes !== null ? parseInt(rawMinutes, 10) : null;

    // ── 4. Calculate focusScore ───────────────────────────────────────────────
    const focusScore = calcFocusScore(totalMinutes);

    // ── 5. Select insight copy ────────────────────────────────────────────────
    // A simple heuristic: if today's sleep is below 7h, surface the sleep-focus
    // correlation insight. Otherwise use the default motivational copy.
    const recentInsight =
      todaySleep !== null && todaySleep < 7
        ? INSIGHT_LOW_SLEEP
        : INSIGHT_DEFAULT;

    // ── 6. Respond ────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        focusScore,    // number 0–100, or null if no sessions today
        todayEnergy,   // number 1–10, or null if no check-in today
        todaySleep,    // decimal hours, or null if no check-in today
        recentInsight, // string — static copy selected by heuristic
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
