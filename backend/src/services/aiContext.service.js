// =============================================================================
// src/services/aiContext.service.js — AI Context Builder
// =============================================================================
//
// This module is the single source of truth for what user data is sent to Gemini.
// It implements three functions that form a pipeline:
//
//   buildDbContext(userId)
//       ↓ (real PostgreSQL data only)
//   mergeHealthContext(dbContext, healthJson)
//       ↓ (future: adds relevant canonical NOVA Health JSON fields)
//   selectRelevantContext(fullContext, userMessage)
//       ↓ (allowlisted fields only, selected by message relevance)
//   Gemini service
//
// DESIGN PRINCIPLES
// ──────────────────
// 1. DATA MINIMIZATION — Only the minimum data needed for the current request
//    is sent to Gemini. The full context object is never sent wholesale.
//
// 2. NO FABRICATION — If a value does not exist in the database (NULL, no rows),
//    it is omitted from the context object. It is never replaced with a default,
//    zero, or placeholder value.
//
// 3. GEMINI AGNOSTICISM — The Gemini service never knows whether context came
//    from PostgreSQL or a future canonical Health JSON. That distinction lives
//    only in this file.
//
// 4. HEALTH JSON READINESS — mergeHealthContext() is a deliberate integration
//    point for a future canonical NOVA Health JSON (from Samsung Health /
//    Google Health Connect). In Phase 1 it is a structural placeholder only —
//    it returns dbContext unchanged when healthJson is null. When the canonical
//    Health JSON schema is defined, only this function needs to be updated.
//    The Gemini service, controller, and routes remain unchanged.
//
// 5. RELEVANCE ISOLATION — selectRelevantContext() is isolated so that its
//    logic can be extended or replaced independently when the Health JSON
//    schema adds new context dimensions (e.g., activity, HRV, VO2max).
//
// PHASE 1 DATA SOURCES (PostgreSQL only)
// ────────────────────────────────────────
// • users.name                            → userName
// • wellness_logs (today)                 → today.sleepHours, today.energyLevel
// • focus_sessions (last 7 days)          → recentFocus.*
//
// NOTE: No demo, mock, fake, seed, or sample data is created or inserted
// anywhere in this file or by any function in this file.
// =============================================================================

'use strict';

const db = require('../config/db');

// ─── Constants ────────────────────────────────────────────────────────────────

// The lookback window for recent focus sessions.
// "Last 7 days" = the 7 calendar days preceding and including today.
const RECENT_DAYS = 7;

// ─── buildDbContext ───────────────────────────────────────────────────────────

/**
 * Queries PostgreSQL for the user's current data and returns a structured
 * context object containing only fields that actually exist in the database.
 *
 * Missing values (NULL, no rows) are represented as absent keys in the returned
 * object — never as zeros, nulls, or invented defaults.
 *
 * @param {number} userId - The authenticated PostgreSQL user ID (from req.user.id).
 * @returns {Promise<Object>} The raw full context from PostgreSQL.
 */
const buildDbContext = async (userId) => {
  // Run all queries in parallel — they are independent of each other.
  const [userResult, todayWellnessResult, recentFocusResult] = await Promise.all([

    // Q1: User name — used to personalize NOVA's responses.
    // We select only name. We do NOT select email, google_id, or created_at.
    db.query(
      'SELECT name FROM users WHERE id = $1 LIMIT 1',
      [userId]
    ),

    // Q2: Today's wellness check-in.
    // log_date = CURRENT_DATE uses the database server's date, which is consistent
    // with how Feature 2 (POST /api/checkin) stores check-ins. We compare against
    // the same anchor point to avoid any timezone mismatch.
    db.query(
      `SELECT sleep_hours, energy_level
       FROM   wellness_logs
       WHERE  user_id  = $1
         AND  log_date = CURRENT_DATE
       LIMIT  1`,
      [userId]
    ),

    // Q3: Focus session summary for the last RECENT_DAYS calendar days.
    // We count total sessions, completed sessions, and total minutes.
    // Using started_at >= CURRENT_DATE - INTERVAL places the window on the DB
    // server's calendar, consistent with Q2.
    // COALESCE(SUM(...), 0) is intentional: if there are rows but all have zero
    // minutes (which the schema CHECK prevents), we still get 0 not NULL.
    // However, if COUNT(*) is 0 (no rows), SUM returns NULL — COALESCE handles that.
    db.query(
      `SELECT COUNT(*)                                          AS total_sessions,
              COUNT(*) FILTER (WHERE completed = TRUE)          AS completed_sessions,
              COALESCE(SUM(duration_minutes), 0)                AS total_minutes
       FROM   focus_sessions
       WHERE  user_id    = $1
         AND  started_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [userId, RECENT_DAYS]
    ),
  ]);

  // ── Assemble the context object ─────────────────────────────────────────────
  // Only include keys whose underlying data actually exists.
  // Absent keys signal "data not available" more accurately than null values
  // and make the downstream omission logic in selectRelevantContext simpler.

  const context = {};

  // User name — should always exist for an authenticated user, but we guard anyway.
  const userRow = userResult.rows[0];
  if (userRow && userRow.name) {
    context.userName = userRow.name;
  }

  // Today's wellness — only set if a check-in exists for today.
  const wellnessRow = todayWellnessResult.rows[0];
  if (wellnessRow) {
    context.today = {};
    // sleep_hours: NUMERIC(4,1) comes back as a string from pg — coerce to number.
    if (wellnessRow.sleep_hours != null) {
      context.today.sleepHours = Number(wellnessRow.sleep_hours);
    }
    if (wellnessRow.energy_level != null) {
      context.today.energyLevel = Number(wellnessRow.energy_level);
    }
    // If the row exists but both fields are NULL (schema allows it), omit the key.
    if (Object.keys(context.today).length === 0) {
      delete context.today;
    }
  }

  // Recent focus summary — include only if at least one session exists.
  const focusRow = recentFocusResult.rows[0];
  const totalSessions = Number(focusRow.total_sessions) || 0;
  if (totalSessions > 0) {
    context.recentFocus = {
      totalSessionsLast7Days: totalSessions,
      completedLast7Days:     Number(focusRow.completed_sessions) || 0,
      totalMinutesLast7Days:  Number(focusRow.total_minutes)      || 0,
    };
  }

  return context;
};

// ─── mergeHealthContext ───────────────────────────────────────────────────────

/**
 * Future integration point for the canonical NOVA Health JSON.
 *
 * In Phase 1 this function is a structural placeholder:
 *   • When healthJson is null (always in Phase 1), it returns dbContext unchanged.
 *   • No health data is fabricated, defaulted, or invented.
 *
 * Future behavior (Phase 2+ — once the canonical Health JSON schema is defined):
 *   • Extract only allowlisted fields from healthJson (e.g., sleep metrics,
 *     activity metrics, HRV) using an explicit allowlist.
 *   • Merge those fields into a copy of dbContext under a new `health` key.
 *   • Never send the complete Health JSON to Gemini — only selected fields pass
 *     through to selectRelevantContext().
 *
 * CONTRACT (invariants that must hold in all phases):
 *   • Gemini service must not know this function exists.
 *   • When healthJson is null, return value === dbContext (no mutation, no copy needed).
 *   • When healthJson is present, return a new object — do not mutate dbContext.
 *   • Never fabricate missing health values.
 *
 * @param {Object}      dbContext  - The context object from buildDbContext().
 * @param {Object|null} healthJson - The canonical NOVA Health JSON, or null.
 * @returns {Object} The merged context (or dbContext unchanged if healthJson is null).
 */
const mergeHealthContext = (dbContext, healthJson = null) => {
  if (!healthJson) {
    // Phase 1: no health data available — return the DB context unchanged.
    return dbContext;
  }

  // Phase 2+: This block will be implemented when the canonical Health JSON
  // schema is defined. At that point:
  //   1. Define an explicit allowlist of health fields relevant to NOVA.
  //   2. Extract only those fields from healthJson.
  //   3. Return { ...dbContext, health: { ...allowlistedFields } }.
  //
  // For now, treat a non-null healthJson as not-yet-supported and return dbContext.
  console.warn('[AI Context] mergeHealthContext received a non-null healthJson, ' +
    'but Health JSON integration is not yet implemented. Returning DB context only.');
  return dbContext;
};

// ─── selectRelevantContext ────────────────────────────────────────────────────

/**
 * Selects only the context fields relevant to the user's current message.
 *
 * This is the enforcement point for the rule:
 *   "The complete context must NOT automatically be sent to Gemini."
 *
 * Relevance is determined by matching the user's message against specific
 * topic patterns. Each pattern is tied to a concrete set of context fields —
 * not to a broad keyword that might inadvertently select unrelated data.
 *
 * DESIGN NOTES
 * ─────────────
 * • userMessage is treated as untrusted input — it is used only for pattern
 *   matching, never interpolated into queries or evaluated.
 * • Patterns are conservative: they must match the specific domain (sleep,
 *   energy, focus) to which the context field belongs.
 * • If no domain-specific pattern matches, a minimal general summary is
 *   returned (today's wellness + user name) — only if that data exists.
 * • Fields that do not exist in fullContext are never fabricated or defaulted.
 * • This function is isolated so its logic can be extended when Health JSON
 *   adds new context dimensions without touching the Gemini service.
 *
 * @param {Object} fullContext  - The merged context from mergeHealthContext().
 * @param {string} userMessage  - The user's raw message (already length-validated).
 * @returns {Object}              The minimal, allowlisted context to send to Gemini.
 */
const selectRelevantContext = (fullContext, userMessage) => {
  // Lowercase for matching only — never used in queries or stored.
  const msg = userMessage.toLowerCase();

  const selected = {};

  // Always include the user's name if available — used for personalization.
  if (fullContext.userName) {
    selected.userName = fullContext.userName;
  }

  // ── Topic: Sleep ──────────────────────────────────────────────────────────
  // Patterns: words directly about sleep quality, duration, or rest.
  // "hours" alone is intentionally NOT a trigger — it is too broad and would
  // match unrelated phrases like "been working for hours".
  const sleepPattern = /\b(sleep|slept|sleeping|insomnia|rest|rested|restless|bedtime|woke|awake)\b/;
  const sleepMatched = sleepPattern.test(msg);
  if (sleepMatched && fullContext.today?.sleepHours != null) {
    selected.todaySleepHours = fullContext.today.sleepHours;
  }

  // ── Topic: Energy / Mood ─────────────────────────────────────────────────
  // Patterns: subjective energy state or fatigue.
  const energyPattern = /\b(energy|energized|tired|fatigue|fatigued|exhausted|mood|feeling|feel)\b/;
  const energyMatched = energyPattern.test(msg);
  if (energyMatched && fullContext.today?.energyLevel != null) {
    selected.todayEnergyLevel = fullContext.today.energyLevel;
  }

  // ── Topic: Focus / Sessions / Productivity ────────────────────────────────
  // Patterns: focus sessions, work concentration, or productivity.
  const focusPattern = /\b(focus|focused|focusing|session|sessions|work|working|productivity|productive|concentrate|concentrated|concentrating|distracted|distraction)\b/;
  const focusMatched = focusPattern.test(msg);
  if (focusMatched && fullContext.recentFocus) {
    selected.recentFocus = fullContext.recentFocus;
  }

  // ── General fallback ─────────────────────────────────────────────────────
  // If the message didn't match any specific domain, include today's wellness
  // summary (sleep + energy) if available. This covers general questions like
  // "How am I doing?" without exposing focus data that wasn't asked about.
  // Only fields that actually exist are included.
  const anySpecificMatch = sleepMatched || energyMatched || focusMatched;
  if (!anySpecificMatch) {
    if (fullContext.today?.sleepHours != null) {
      selected.todaySleepHours = fullContext.today.sleepHours;
    }
    if (fullContext.today?.energyLevel != null) {
      selected.todayEnergyLevel = fullContext.today.energyLevel;
    }
  }

  return selected;
};

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = {
  buildDbContext,
  mergeHealthContext,
  selectRelevantContext,
};
