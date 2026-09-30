// =============================================================================
// src/services/aiContext.service.js — AI Context Builder
// =============================================================================
//
// This module is the single source of truth for what user data is sent to Gemini.
// Phase 1 implementation aggregates holistic personal context from PostgreSQL:
//   • User profile (name)
//   • Focus session statistics (today & 7-day summaries, completion rate, interruptions, most recent session)
//   • Wellness check-ins (today & 7-day averages for sleep and energy)
//   • Health daily aggregates (today & 7-day step, exercise, and distance totals)
//   • Temporal context (current database date)
//
// All queries remain strictly scoped to the authenticated user ID (`userId`).
// No credential fields, raw telemetry JSON payloads, or fake data are used.
// =============================================================================

'use strict';

const db = require('../config/db');

// The lookback window for recent metrics (7 days preceding and including today).
const RECENT_DAYS = 7;

/**
 * Queries PostgreSQL for the user's current data and returns a structured
 * personal context object containing only fields that actually exist in the DB.
 *
 * Scoped strictly to `userId`. Missing values (NULL, no rows) are omitted or
 * represented as absent/null rather than fabricated.
 *
 * @param {number} userId - The authenticated PostgreSQL user ID (from req.user.id).
 * @returns {Promise<Object>} Personal context object.
 */
const buildDbContext = async (userId) => {
  const [
    userResult,
    todayWellnessResult,
    wellness7dResult,
    todayFocusResult,
    focus7dResult,
    recentFocusSessionResult,
    todayHealthResult,
    health7dResult,
    currentDateResult,
    activeRoadmapResult,
  ] = await Promise.all([
    // Q1: User name (select only name, omit email/google_id/timestamps)
    db.query(
      'SELECT name FROM users WHERE id = $1 LIMIT 1',
      [userId]
    ),

    // Q2: Today's wellness check-in
    db.query(
      `SELECT sleep_hours, energy_level
       FROM   wellness_logs
       WHERE  user_id  = $1
         AND  log_date = CURRENT_DATE
       LIMIT  1`,
      [userId]
    ),

    // Q3: 7-day average wellness
    db.query(
      `SELECT AVG(sleep_hours)::NUMERIC(4,1)  AS avg_sleep,
              AVG(energy_level)::NUMERIC(4,1) AS avg_energy
       FROM   wellness_logs
       WHERE  user_id  = $1
         AND  log_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [userId, RECENT_DAYS]
    ),

    // Q4: Today's focus sessions
    db.query(
      `SELECT COUNT(*)::INTEGER                                  AS today_sessions,
              COUNT(*) FILTER (WHERE completed = TRUE)::INTEGER  AS today_completed,
              COALESCE(SUM(duration_minutes), 0)::INTEGER        AS today_minutes
       FROM   focus_sessions
       WHERE  user_id    = $1
         AND  started_at >= CURRENT_DATE`,
      [userId]
    ),

    // Q5: Last 7 days focus sessions summary
    db.query(
      `SELECT COUNT(*)::INTEGER                                  AS total_sessions,
              COUNT(*) FILTER (WHERE completed = TRUE)::INTEGER  AS completed_sessions,
              COALESCE(SUM(duration_minutes), 0)::INTEGER        AS total_minutes,
              COALESCE(AVG(interruptions), 0)::NUMERIC(4,1)     AS avg_interruptions
       FROM   focus_sessions
       WHERE  user_id    = $1
         AND  started_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [userId, RECENT_DAYS]
    ),

    // Q6: Most recent focus session
    db.query(
      `SELECT duration_minutes, interruptions, started_at, completed
       FROM   focus_sessions
       WHERE  user_id = $1
       ORDER  BY started_at DESC
       LIMIT  1`,
      [userId]
    ),

    // Q7: Today's health daily aggregate
    db.query(
      `SELECT total_steps, active_exercise_minutes, exercise_distance_meters
       FROM   health_daily_aggregates
       WHERE  user_id  = $1
         AND  log_date = CURRENT_DATE
       LIMIT  1`,
      [userId]
    ),

    // Q8: Last 7 days health summary from health_daily_aggregates
    db.query(
      `SELECT COALESCE(SUM(total_steps), 0)::BIGINT                      AS total_steps_7d,
              COALESCE(AVG(total_steps), 0)::NUMERIC(10,0)               AS avg_steps_7d,
              COALESCE(SUM(active_exercise_minutes), 0)::NUMERIC(10,1)  AS total_exercise_minutes_7d,
              COALESCE(SUM(exercise_distance_meters), 0)::NUMERIC(12,1) AS total_exercise_distance_7d
       FROM   health_daily_aggregates
       WHERE  user_id  = $1
         AND  log_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [userId, RECENT_DAYS]
    ),

    // Q9: Current database date
    db.query(`SELECT CURRENT_DATE::TEXT AS current_date`),

    // Q10: Active Roadmap for user
    db.query(
      `SELECT id, title, outcome, duration_days, start_date::TEXT AS start_date,
              end_date::TEXT AS end_date, status
       FROM blueprints
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    ),
  ]);

  const context = {};

  // 1. User
  const userRow = userResult.rows[0];
  if (userRow && userRow.name) {
    context.userName = userRow.name;
    context.user = { name: userRow.name };
  }

  // 2. Temporal context
  const currentDate = currentDateResult.rows[0]?.current_date;
  if (currentDate) {
    context.currentDate = currentDate;
    context.temporalContext = { currentDate };
  }

  // 3. Roadmap context
  const activeBpRow = activeRoadmapResult?.rows[0];
  if (activeBpRow) {
    const { rows: bpDayRows } = await db.query(
      `SELECT id, blueprint_id, day_number, log_date::TEXT AS log_date, title, mission, rationale,
              status, completed_at, original_log_date::TEXT AS original_log_date, rescheduled_at
       FROM blueprint_days
       WHERE blueprint_id = $1
       ORDER BY day_number ASC`,
      [activeBpRow.id]
    );

    const days = bpDayRows.map((d) => ({
      id: Number(d.id),
      dayNumber: Number(d.day_number),
      date: d.log_date,
      title: d.title,
      mission: d.mission,
      rationale: d.rationale,
      status: d.status,
      originalDate: d.original_log_date || null,
      rescheduledAt: d.rescheduled_at || null,
    }));

    const todayMission = days.find((d) => d.date === currentDate) || null;
    const pendingDays = days.filter((d) => d.status === 'pending');
    const completedDays = days.filter((d) => d.status === 'completed');
    const skippedDays = days.filter((d) => d.status === 'skipped');
    const rescheduledDays = days.filter((d) => d.originalDate && d.originalDate !== d.date);

    const occupiedDates = Array.from(new Set(days.map((d) => d.date))).sort();
    
    // Helper to calculate earliest unoccupied dates after current date
    const earliestAvailableDates = [];
    if (currentDate) {
      const occupiedSet = new Set(occupiedDates);
      let offset = 1;
      while (earliestAvailableDates.length < 5 && offset <= 365) {
        const [y, m, d] = currentDate.split('-').map(Number);
        const candDate = new Date(Date.UTC(y, m - 1, d + offset));
        const candStr = candDate.toISOString().split('T')[0];
        if (!occupiedSet.has(candStr)) {
          earliestAvailableDates.push(candStr);
        }
        offset++;
      }
    }

    context.roadmap = {
      id: Number(activeBpRow.id),
      title: activeBpRow.title,
      outcome: activeBpRow.outcome,
      durationDays: Number(activeBpRow.duration_days),
      startDate: activeBpRow.start_date,
      endDate: activeBpRow.end_date,
      currentDate: currentDate || null,
      todayMission: todayMission
        ? {
            id: todayMission.id,
            dayNumber: todayMission.dayNumber,
            title: todayMission.title,
            mission: todayMission.mission,
            status: todayMission.status,
            date: todayMission.date,
          }
        : null,
      totalMissions: days.length,
      pendingCount: pendingDays.length,
      completedCount: completedDays.length,
      skippedCount: skippedDays.length,
      rescheduledCount: rescheduledDays.length,
      occupiedDates,
      earliestAvailableDates,
      days,
    };
  }

  // 4. Wellness
  const wellnessRow = todayWellnessResult.rows[0];
  const wellness7dRow = wellness7dResult.rows[0];
  const wellnessObj = {};

  if (wellnessRow) {
    if (wellnessRow.sleep_hours != null) {
      wellnessObj.todaySleepHours = Number(wellnessRow.sleep_hours);
      context.todaySleepHours = Number(wellnessRow.sleep_hours);
    }
    if (wellnessRow.energy_level != null) {
      wellnessObj.todayEnergyLevel = Number(wellnessRow.energy_level);
      context.todayEnergyLevel = Number(wellnessRow.energy_level);
    }
  }

  if (wellness7dRow) {
    if (wellness7dRow.avg_sleep != null) {
      wellnessObj.avgSleepHours7d = Number(wellness7dRow.avg_sleep);
    }
    if (wellness7dRow.avg_energy != null) {
      wellnessObj.avgEnergyLevel7d = Number(wellness7dRow.avg_energy);
    }
  }

  if (Object.keys(wellnessObj).length > 0) {
    context.wellness = wellnessObj;
  }

  // 4. Focus
  const todayFocusRow = todayFocusResult.rows[0];
  const focus7dRow = focus7dResult.rows[0];
  const mostRecentSessionRow = recentFocusSessionResult.rows[0];
  const focusObj = {};

  if (todayFocusRow) {
    focusObj.todayMinutes = Number(todayFocusRow.today_minutes) || 0;
    focusObj.todaySessions = Number(todayFocusRow.today_sessions) || 0;
    focusObj.todayCompleted = Number(todayFocusRow.today_completed) || 0;
  }

  const totalSessions7d = Number(focus7dRow?.total_sessions) || 0;
  if (totalSessions7d > 0) {
    const completed7d = Number(focus7dRow.completed_sessions) || 0;
    focusObj.totalSessionsLast7Days = totalSessions7d;
    focusObj.completedLast7Days = completed7d;
    focusObj.totalMinutesLast7Days = Number(focus7dRow.total_minutes) || 0;
    focusObj.completionRatePercent = Number(((completed7d / totalSessions7d) * 100).toFixed(1));
    focusObj.avgInterruptionsLast7Days = Number(focus7dRow.avg_interruptions) || 0;

    // Backward-compatibility key
    context.recentFocus = {
      totalSessionsLast7Days: focusObj.totalSessionsLast7Days,
      completedLast7Days: focusObj.completedLast7Days,
      totalMinutesLast7Days: focusObj.totalMinutesLast7Days,
    };
  }

  if (mostRecentSessionRow) {
    focusObj.mostRecentSession = {
      durationMinutes: Number(mostRecentSessionRow.duration_minutes),
      interruptions: Number(mostRecentSessionRow.interruptions),
      startedAt: mostRecentSessionRow.started_at,
      completed: Boolean(mostRecentSessionRow.completed),
    };
  }

  if (Object.keys(focusObj).length > 0) {
    context.focus = focusObj;
  }

  // 5. Health
  const todayHealthRow = todayHealthResult.rows[0];
  const health7dRow = health7dResult.rows[0];
  const healthObj = {};

  if (todayHealthRow) {
    if (todayHealthRow.total_steps != null) {
      healthObj.todaySteps = Number(todayHealthRow.total_steps);
    }
    if (todayHealthRow.active_exercise_minutes != null) {
      healthObj.todayActiveExerciseMinutes = Number(todayHealthRow.active_exercise_minutes);
    }
    if (todayHealthRow.exercise_distance_meters != null) {
      healthObj.todayExerciseDistanceMeters = Number(todayHealthRow.exercise_distance_meters);
    }
  }

  if (health7dRow) {
    const totalSteps7d = Number(health7dRow.total_steps_7d) || 0;
    if (totalSteps7d > 0) {
      healthObj.totalSteps7d = totalSteps7d;
      healthObj.avgSteps7d = Number(health7dRow.avg_steps_7d) || 0;
    }
    const totalExerciseMin = Number(health7dRow.total_exercise_minutes_7d) || 0;
    if (totalExerciseMin > 0) {
      healthObj.totalExerciseMinutes7d = totalExerciseMin;
    }
    const totalDist = Number(health7dRow.total_exercise_distance_7d) || 0;
    if (totalDist > 0) {
      healthObj.totalExerciseDistanceMeters7d = totalDist;
    }
  }

  if (Object.keys(healthObj).length > 0) {
    context.health = healthObj;
  }

  return context;
};

/**
 * Structural placeholder for future canonical Health JSON merging.
 *
 * @param {Object} dbContext
 * @param {Object|null} healthJson
 * @returns {Object}
 */
const mergeHealthContext = (dbContext, healthJson = null) => {
  if (!healthJson) {
    return dbContext;
  }
  return dbContext;
};

/**
 * Passes through the full personal context so Gemini receives all available metrics
 * regardless of specific keyword triggers in userMessage.
 *
 * @param {Object} fullContext  - The merged context from mergeHealthContext().
 * @param {string} userMessage  - The user's raw message.
 * @returns {Object}              The personal context to send to Gemini.
 */
const selectRelevantContext = (fullContext, userMessage) => {
  // Always return the full personal context so Gemini is fully personalized
  return fullContext;
};

module.exports = {
  buildDbContext,
  mergeHealthContext,
  selectRelevantContext,
};

