// =============================================================================
// src/controllers/dashboard.controller.js — Personalized Focus & Wellness Dashboard
// =============================================================================

'use strict';

const db = require('../config/db');

const MIN_INSIGHT_SESSIONS = 5;

/**
 * Calculates a 0–100 focus score from focus session metrics.
 */
const calcFocusScore = (total, completed, avgInterruptions) => {
  if (!total || total <= 0) return null;

  const completionRate = completed / total;
  const avgInt = avgInterruptions !== null && avgInterruptions !== undefined ? Number(avgInterruptions) : 0;
  const interruptionPenalty = 1 / (1 + avgInt);

  const raw = (completionRate * 0.6 + interruptionPenalty * 0.4) * 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
};

/**
 * Generates a data-based insight string.
 */
const buildInsight = (correlationRows) => {
  const NEUTRAL = 'Keep logging your sleep, energy, and focus sessions to discover your personal patterns.';

  if (!correlationRows || correlationRows.length < MIN_INSIGHT_SESSIONS) {
    return NEUTRAL;
  }

  const highSleep = correlationRows.filter((r) => parseFloat(r.sleep_hours) >= 7);
  const lowSleep = correlationRows.filter((r) => parseFloat(r.sleep_hours) < 7);

  if (highSleep.length < 2 || lowSleep.length < 2) {
    return NEUTRAL;
  }

  const avgCompletionHigh =
    highSleep.reduce((acc, r) => acc + Number(r.completed_sessions) / Number(r.total_sessions), 0) / highSleep.length;

  const avgCompletionLow =
    lowSleep.reduce((acc, r) => acc + Number(r.completed_sessions) / Number(r.total_sessions), 0) / lowSleep.length;

  const diff = avgCompletionHigh - avgCompletionLow;

  if (diff >= 0.1) {
    return 'Your completed focus sessions tend to be higher on days with more sleep (7h+).';
  }
  if (diff <= -0.1) {
    return 'Interestingly, your focus session completion appears similar on lower-sleep days.';
  }

  return 'Your focus session completion appears consistent regardless of sleep hours so far.';
};

/**
 * GET /api/dashboard / GET /api/dashboard/:userId
 *
 * Returns aggregated wellness and focus session stats for authenticated user.
 *
 * @type {import('express').RequestHandler}
 */
const getDashboard = async (req, res, next) => {
  try {
    let rawUserId = req.params.userId;
    if ((!rawUserId || rawUserId === 'me') && req.user) {
      rawUserId = req.user.id;
    }
    const targetUserId = req.user ? req.user.id : rawUserId;

    if (rawUserId && req.user && Number(rawUserId) !== Number(req.user.id) && req.params.userId !== 'me') {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access dashboard data of another user.',
        },
      });
    }

    const parsedUserId = Number(targetUserId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user ID.',
          field: 'userId',
        },
      });
    }

    // 1. Verify user exists
    const { rows: existRows } = await db.query('SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) AS "exists"', [
      parsedUserId,
    ]);

    if (!existRows[0].exists) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'No user exists with the given ID.',
        },
      });
    }

    // 2. Parallel data queries
    const [todayResult, recentResult, focusResult, correlationResult] = await Promise.all([
      // Q1: Today's wellness check-in
      db.query(
        `SELECT sleep_hours,
                energy_level,
                log_date
         FROM   wellness_logs
         WHERE  user_id  = $1
           AND  log_date = CURRENT_DATE
         LIMIT  1`,
        [parsedUserId]
      ),

      // Q2: Recent 7 wellness logs
      db.query(
        `SELECT log_date,
                sleep_hours,
                energy_level
         FROM   wellness_logs
         WHERE  user_id = $1
         ORDER  BY log_date DESC
         LIMIT  7`,
        [parsedUserId]
      ),

      // Q3: All-time focus session summary
      db.query(
        `SELECT COUNT(*)                                             AS total_sessions,
                COUNT(*) FILTER (WHERE completed = TRUE)            AS completed_sessions,
                COALESCE(SUM(duration_minutes), 0)                  AS total_focus_minutes,
                AVG(duration_minutes)                               AS avg_session_minutes,
                AVG(interruptions)                                  AS avg_interruptions
         FROM   focus_sessions
         WHERE  user_id = $1`,
        [parsedUserId]
      ),

      // Q4: Per-day correlation
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

    // 3. Extract values
    const todayRow = todayResult.rows[0];
    const today = {
      sleepHours: todayRow ? (todayRow.sleep_hours !== null ? Number(todayRow.sleep_hours) : null) : null,
      energyLevel: todayRow ? (todayRow.energy_level !== null ? Number(todayRow.energy_level) : null) : null,
      logDate: todayRow ? String(todayRow.log_date) : null,
    };

    const recentWellness = recentResult.rows.map((r) => ({
      logDate: String(r.log_date),
      sleepHours: r.sleep_hours !== null ? Number(r.sleep_hours) : null,
      energyLevel: r.energy_level !== null ? Number(r.energy_level) : null,
    }));

    const fRow = focusResult.rows[0] || {};
    const totalSessions = Number(fRow.total_sessions) || 0;
    const completedSessions = Number(fRow.completed_sessions) || 0;
    const totalFocusMinutes = Number(fRow.total_focus_minutes) || 0;

    const averageSessionMinutes =
      fRow.avg_session_minutes !== null && fRow.avg_session_minutes !== undefined
        ? Math.round(Number(fRow.avg_session_minutes) * 10) / 10
        : null;

    const averageInterruptions =
      fRow.avg_interruptions !== null && fRow.avg_interruptions !== undefined
        ? Math.round(Number(fRow.avg_interruptions) * 10) / 10
        : null;

    const focus = {
      totalSessions,
      completedSessions,
      totalFocusMinutes,
      averageSessionMinutes,
      averageInterruptions,
    };

    const focusScore = calcFocusScore(totalSessions, completedSessions, fRow.avg_interruptions);
    const recentInsight = buildInsight(correlationResult.rows);

    return res.status(200).json({
      success: true,
      data: {
        focusScore,
        todayEnergy: today.energyLevel,
        todaySleep: today.sleepHours,
        recentInsight,
        today,
        recentWellness,
        focus,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
