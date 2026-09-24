// =============================================================================
// src/controllers/dashboard.controller.js — Dashboard Aggregation
// src/controllers/dashboard.controller.js — Personalized Focus & Wellness Dashboard
// =============================================================================
//
// API Contract
// ─────────────
// GET /api/dashboard/:userId
//
// 200 OK
//   { success: true,  data: { focusScore, todayEnergy, todaySleep, recentInsight } }
// 200 OK — user exists (data may be empty if they have no logs yet):
//   {
//     "success": true,
//     "data": {
//       "today":         { "sleepHours": number|null, "energyLevel": number|null, "logDate": string|null },
//       "recentWellness": [ { "logDate": "YYYY-MM-DD", "sleepHours": number, "energyLevel": number }, … ],
//       "focus":         { "totalSessions": 0, "completedSessions": 0, "totalFocusMinutes": 0,
//                          "averageSessionMinutes": null, "averageInterruptions": null },
//       "focusScore":    number|null,
//       "recentInsight": string
//     },
//     "error": null
//   }
//
// 404 (user not found)
//   { success: false, error: { code: "USER_NOT_FOUND", message: "No user exists with the given ID." } }
// 400 — invalid userId format
// 404 — userId is a valid integer but no user exists with that ID
//
// When there is no data for today, focusScore / todayEnergy / todaySleep are null.
// =============================================================================
//
// DATA SOURCES (all from the existing schema, no new tables)
// ──────────────────────────────────────────────────────────
//   users          → existence check
//   wellness_logs  → today's check-in + last-7-days history + correlation data
//   focus_sessions → all-time session summary + correlation data
//
// QUERIES OVERVIEW
// ─────────────────
// We run four queries in parallel after the user-existence check:
//   Q1  Today's wellness log (wellness_logs WHERE log_date = CURRENT_DATE)
//   Q2  Last 7 wellness records (wellness_logs ORDER BY log_date DESC LIMIT 7)
//   Q3  All-time focus summary  (COUNT, SUM, AVG from focus_sessions)
//   Q4  Per-date correlation    (join wellness_logs ↔ focus_sessions by calendar date)
//
// FOCUS SCORE FORMULA
// ────────────────────
// Calculated from all recorded sessions — not just today's.
// Requires at least 1 session; returns null otherwise.
//
// completionRate   = completedSessions / totalSessions               → 0–1
// avgInterruptions = average interruptions across all sessions       → 0–∞
// interruptionPenalty = 1 / (1 + avgInterruptions)                  → 0–1
//   (approaches 1 when interruptions → 0; approaches 0 when interruptions → ∞)
//
// focusScore = round( completionRate * 0.6 + interruptionPenalty * 0.4 ) * 100
//   clamped to [0, 100]
//
// Weights (60 / 40) are deliberately simple and readable. Adjust as the product
// definition of "focus quality" evolves. The score has no scientific basis — it
// is an application metric to orient users relative to their own history.
//
// INSIGHT LOGIC
// ──────────────
// We compare average completion rates on high-sleep days (>= 7h) vs low-sleep
// days (< 7h) using the joined wellness+session data.
//   • Requires at least MIN_INSIGHT_SESSIONS (5) data points with a wellness log
//     to avoid drawing conclusions from noise.
//   • If not enough data: returns the neutral "keep logging" message.
//   • If high-sleep completionRate > low-sleep completionRate by ≥ 10pp: surfaces
//     the sleep-focus association insight.
//   • Otherwise surfaces the "more sleep data" insight.
//
// =============================================================================

'use strict';

const db = require('../config/db');

// ─── focusScore calculation ────────────────────────────────────────────────────
// Maps total focused minutes today → a 0–100 score.
// Formula: min(totalMinutes / MAX_DAILY_MINUTES, 1) * 100, rounded to nearest int.
// MAX_DAILY_MINUTES = 240 means 4 hours of focused work = a perfect 100.
// Adjust this constant as the product definition of "great focus day" evolves.
const MAX_DAILY_FOCUS_MINUTES = 240;
// ─── Constants ────────────────────────────────────────────────────────────────

// Minimum number of sessions that share a wellness log date before we attempt
// to derive a personalized insight. Drawing correlations from 1–2 points would
// be misleading.
const MIN_INSIGHT_SESSIONS = 5;

// ─── Focus score ─────────────────────────────────────────────────────────────

/**
 * Converts total focused minutes to a 0–100 score.
 * Returns null when there are no sessions for today (minutes is null/0).
 * Calculates a 0–100 focus score from all-time session data.
 * Returns null if there are no sessions.
 *
 * @param {number|null} totalMinutes
 * Formula:
 *   completionRate      = completedSessions / totalSessions
 *   interruptionPenalty = 1 / (1 + avgInterruptions)
 *   score               = round((completionRate * 0.6 + interruptionPenalty * 0.4) * 100)
 *
 * @param {number} total      - total sessions
 * @param {number} completed  - completed sessions
 * @param {number|null} avgInterruptions - average interruptions per session
 * @returns {number|null}
 */
const calcFocusScore = (totalMinutes) => {
  // Guard: no sessions logged today → no score
  if (!totalMinutes || totalMinutes <= 0) return null;
  return Math.min(Math.round((totalMinutes / MAX_DAILY_FOCUS_MINUTES) * 100), 100);
const calcFocusScore = (total, completed, avgInterruptions) => {
  if (!total || total <= 0) return null;

  const completionRate      = completed / total;
  const avgInt              = avgInterruptions !== null ? Number(avgInterruptions) : 0;
  const interruptionPenalty = 1 / (1 + avgInt);

  const raw = (completionRate * 0.6 + interruptionPenalty * 0.4) * 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
};

// ─── recentInsight copy ────────────────────────────────────────────────────────
// Static insight string for the MVP. In production this would be derived from
// the user's rolling data (e.g., correlate sleep_hours < 7 with low focusScore).
const INSIGHT_LOW_SLEEP = 'Your focus drops when sleep is under 7h.';
const INSIGHT_DEFAULT   = 'Consistency is the key to long-term focus.';
// ─── Insight generator ────────────────────────────────────────────────────────

/**
 * Generates a deterministic, data-based insight string.
 * Uses joined wellness+session data to find sleep→completion associations.
 * Returns a neutral fallback message when data is insufficient.
 *
 * @param {Array} correlationRows - rows with { sleep_hours, total_sessions, completed_sessions }
 * @returns {string}
 */
const buildInsight = (correlationRows) => {
  // correlationRows: one row per (user, log_date) where BOTH a wellness log
  // and at least one focus session exist. Shape:
  //   { sleep_hours: "6.5", total_sessions: "3", completed_sessions: "2" }

  const NEUTRAL = 'Keep logging your sleep, energy, and focus sessions to discover your personal patterns.';

  if (!correlationRows || correlationRows.length < MIN_INSIGHT_SESSIONS) {
    return NEUTRAL;
  }

  // Split into high-sleep (>= 7h) and low-sleep (< 7h) days.
  const highSleep = correlationRows.filter(r => parseFloat(r.sleep_hours) >= 7);
  const lowSleep  = correlationRows.filter(r => parseFloat(r.sleep_hours) < 7);

  // Need observations on BOTH sides to compare.
  if (highSleep.length < 2 || lowSleep.length < 2) {
    return NEUTRAL;
  }

  // Average completion rate on high-sleep days.
  const avgCompletionHigh = highSleep.reduce((acc, r) => {
    return acc + (Number(r.completed_sessions) / Number(r.total_sessions));
  }, 0) / highSleep.length;

  // Average completion rate on low-sleep days.
  const avgCompletionLow = lowSleep.reduce((acc, r) => {
    return acc + (Number(r.completed_sessions) / Number(r.total_sessions));
  }, 0) / lowSleep.length;

  // Only surface the pattern if the difference is meaningful (>= 10 percentage points).
  const diff = avgCompletionHigh - avgCompletionLow;

  if (diff >= 0.10) {
    return 'Your completed focus sessions tend to be higher on days with more sleep (7h+).';
  }

  if (diff <= -0.10) {
    return 'Interestingly, your focus session completion appears similar on lower-sleep days. Keep tracking to see if this pattern holds.';
  }

  // Difference is < 10pp — not enough signal to report a directional pattern.
  return 'Your focus session completion appears consistent regardless of sleep hours so far. Keep logging to see if patterns emerge.';
};

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * GET /api/dashboard/:userId
 *
 * Runs two SELECT queries in parallel (Promise.all) to minimise latency:
 *   1. wellness_logs → today's sleep_hours and energy_level for this user
 *   2. focus_sessions → sum of duration_minutes for all of today's sessions
 * Returns a personalized wellness + focus dashboard for the given user.
 * All values are derived from real PostgreSQL data — nothing is hardcoded.
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
    // parseInt('5abc') returns 5 — we check the full string with Number() to
    // reject partial numbers and non-numeric strings alike.
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: 'Invalid user ID.',
          field:   'userId',
        },
      });
    }

    // ── 1. Verify the user exists ─────────────────────────────────────────────
    // A single EXISTS query is the cheapest possible existence check — Postgres
    // stops scanning the moment it finds one matching row (no full table scan).
    // EXISTS stops scanning as soon as one matching row is found — cheapest
    // possible presence check.
    const { rows: existRows } = await db.query(
      'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) AS exists',
      'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) AS "exists"',
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
    // All four queries are independent — none depends on another's result.
    // Running them in parallel via Promise.all means total latency ≈ max of the
    // four individual query times rather than their sum.
    const [todayResult, recentResult, focusResult, correlationResult] = await Promise.all([

      // Query A: today's wellness check-in for this user.
      // We use LIMIT 1 defensively, though the UNIQUE constraint on
      // (user_id, log_date) guarantees at most one row per day.
      // Q1: Today's wellness check-in for this user.
      // The UNIQUE constraint uq_wellness_user_date guarantees at most one row
      // per (user_id, log_date), so LIMIT 1 is defensive rather than necessary.
      // log_date is compared to CURRENT_DATE (server timezone). Feature 2 also
      // compares against CURRENT_DATE, so behavior is consistent.
      db.query(
        `SELECT sleep_hours, energy_level
        `SELECT sleep_hours,
                energy_level,
                log_date::TEXT AS log_date
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
      // Q2: Most recent 7 wellness logs (including today if it exists).
      // ORDER BY log_date DESC puts the newest first; the frontend can reverse
      // if it wants chronological display.
      db.query(
        `SELECT SUM(duration_minutes) AS total_minutes
        `SELECT log_date::TEXT AS log_date,
                sleep_hours,
                energy_level
         FROM   wellness_logs
         WHERE  user_id = $1
         ORDER  BY log_date DESC
         LIMIT  7`,
        [parsedUserId]
      ),

      // Q3: All-time focus session summary.
      // COUNT(*) total rows, COUNT(CASE … END) for completed sessions,
      // SUM/AVG for time and interruptions. All aggregate functions return a
      // single row even with no matching records (NULLs for SUM/AVG, 0 for COUNT).
      db.query(
        `SELECT COUNT(*)                                             AS total_sessions,
                COUNT(*) FILTER (WHERE completed = TRUE)            AS completed_sessions,
                COALESCE(SUM(duration_minutes), 0)                  AS total_focus_minutes,
                AVG(duration_minutes)                               AS avg_session_minutes,
                AVG(interruptions)                                  AS avg_interruptions
         FROM   focus_sessions
         WHERE  user_id    = $1
           AND  started_at >= CURRENT_DATE
           AND  started_at <  CURRENT_DATE + INTERVAL '1 day'
           AND  completed  = TRUE`,
         WHERE  user_id = $1`,
        [parsedUserId]
      ),

      // Q4: Per-day correlation between wellness and focus sessions.
      // Joins wellness_logs with focus_sessions on calendar date so we can
      // compare completion rates on high-sleep vs low-sleep days.
      //
      // CAST(started_at AS DATE) converts the TIMESTAMPTZ to a plain date in
      // the DB server's local timezone. This is consistent with how wellness logs
      // store their log_date (which the client supplies as a local date).
      //
      // Only rows where BOTH a wellness log AND at least one focus session exist
      // on the same date are included — we never fill gaps with zeros.
      db.query(
        `SELECT wl.sleep_hours,
                COUNT(fs.id)                                        AS total_sessions,
                COUNT(fs.id) FILTER (WHERE fs.completed = TRUE)    AS completed_sessions
         FROM   wellness_logs wl
         JOIN   focus_sessions fs
           ON   fs.user_id = wl.user_id
          AND   CAST(fs.started_at AS DATE) = wl.log_date
         WHERE  wl.user_id = $1
           AND  wl.sleep_hours IS NOT NULL
         GROUP  BY wl.log_date, wl.sleep_hours
         ORDER  BY wl.log_date DESC`,
        [parsedUserId]
      ),
    ]);

    // ── 3. Extract values — handle no-data-today case ─────────────────────────
    // wellnessResult.rows[0] is undefined if no check-in exists for today.
    // Optional chaining (?.) safely returns undefined rather than throwing.
    const wellnessRow    = wellnessResult.rows[0];
    const todaySleep     = wellnessRow?.sleep_hours   ?? null;
    const todayEnergy    = wellnessRow?.energy_level  ?? null;
    // ── 3. Extract today's wellness ───────────────────────────────────────────
    const todayRow    = todayResult.rows[0];
    const today = {
      sleepHours:  todayRow ? Number(todayRow.sleep_hours) : null,
      energyLevel: todayRow ? Number(todayRow.energy_level) : null,
      logDate:     todayRow ? todayRow.log_date : null,
    };

    // focusResult always returns exactly one row (SUM returns a row even for
    // no matches, but total_minutes will be null). Parse to int; SUM returns
    // a string in some pg versions.
    const rawMinutes     = focusResult.rows[0]?.total_minutes;
    const totalMinutes   = rawMinutes !== null ? parseInt(rawMinutes, 10) : null;
    // ── 4. Build recent wellness array ────────────────────────────────────────
    // Only includes records that actually exist in the DB.
    // Numeric columns come back as strings from some pg configurations;
    // Number() coerces safely (Number(null) → 0, so we guard with ternary).
    const recentWellness = recentResult.rows.map(r => ({
      logDate:     r.log_date,
      sleepHours:  r.sleep_hours  !== null ? Number(r.sleep_hours)  : null,
      energyLevel: r.energy_level !== null ? Number(r.energy_level) : null,
    }));

    // ── 4. Calculate focusScore ───────────────────────────────────────────────
    const focusScore = calcFocusScore(totalMinutes);
    // ── 5. Extract focus summary ──────────────────────────────────────────────
    const fRow              = focusResult.rows[0];
    const totalSessions     = Number(fRow.total_sessions)     || 0;
    const completedSessions = Number(fRow.completed_sessions) || 0;
    const totalFocusMinutes = Number(fRow.total_focus_minutes) || 0;

    // ── 5. Select insight copy ────────────────────────────────────────────────
    // A simple heuristic: if today's sleep is below 7h, surface the sleep-focus
    // correlation insight. Otherwise use the default motivational copy.
    const recentInsight =
      todaySleep !== null && todaySleep < 7
        ? INSIGHT_LOW_SLEEP
        : INSIGHT_DEFAULT;
    // AVG returns NULL when COUNT is 0 (no sessions). We propagate null rather
    // than defaulting to 0, so the frontend can distinguish "no data" from "zero".
    const averageSessionMinutes =
      fRow.avg_session_minutes !== null
        ? Math.round(Number(fRow.avg_session_minutes) * 10) / 10
        : null;

    // ── 6. Respond ────────────────────────────────────────────────────────────
    const averageInterruptions =
      fRow.avg_interruptions !== null
        ? Math.round(Number(fRow.avg_interruptions) * 10) / 10
        : null;

    const focus = {
      totalSessions,
      completedSessions,
      totalFocusMinutes,
      averageSessionMinutes,
      averageInterruptions,
    };

    // ── 6. Calculate focus score ──────────────────────────────────────────────
    const focusScore = calcFocusScore(
      totalSessions,
      completedSessions,
      fRow.avg_interruptions // null → handled inside calcFocusScore
    );

    // ── 7. Generate insight ───────────────────────────────────────────────────
    const recentInsight = buildInsight(correlationResult.rows);

    // ── 8. Respond ────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        focusScore,    // number 0–100, or null if no sessions today
        todayEnergy,   // number 1–10, or null if no check-in today
        todaySleep,    // decimal hours, or null if no check-in today
        recentInsight, // string — static copy selected by heuristic
        today,
        recentWellness,
        focus,
        focusScore,
        recentInsight,
      },
      error: null,
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
