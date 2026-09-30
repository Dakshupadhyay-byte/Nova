// =============================================================================
// src/services/aiContext.service.js — AI Data Access & Context Layer
// =============================================================================
//
// Single source of truth for querying authorized user data for AI intelligence:
//   • User Profile: getUserProfile(userId)
//   • Health Summary & History: getHealthSummary(userId, days), getHealthHistory(userId, days), getDetailedHealthRecords(userId, metricType, limit)
//   • Focus Summary & History: getFocusSummary(userId, days), getFocusHistory(userId, days)
//   • Wellness Summary & History: getWellnessSummary(userId, days), getWellnessHistory(userId, days)
//   • Roadmap Active & History: getActiveRoadmap(userId), getRoadmapHistory(userId)
//
// Period-over-Period Comparisons:
//   • Calculates current 7 days vs previous 7 days (days 0..7 vs 8..14) for steps, exercise, focus minutes, completion rates, energy, and sleep.
//   • Flags `hasHistoricalBaseline: false` when insufficient prior historical rows exist.
//
// Security Rules:
//   • Every function receives explicit, authenticated `userId` and uses parameterized queries.
//   • No arbitrary `userId` selection allowed by model or client.
//   • No API keys, passwords, credentials, or raw telemetry tokens exposed.
// =============================================================================

'use strict';

const db = require('../config/db');

const DEFAULT_DAYS = 7;

/**
 * Retrieves user profile information (non-sensitive).
 *
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
const getUserProfile = async (userId) => {
  const res = await db.query(
    'SELECT id, name, created_at FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    createdAt: row.created_at,
  };
};

/**
 * Retrieves daily aggregated health metrics summary + previous 7-day comparison baseline.
 *
 * @param {number} userId
 * @param {number} days
 * @returns {Promise<Object>}
 */
const getHealthSummary = async (userId, days = DEFAULT_DAYS) => {
  const [todayRes, summaryRes, prevSummaryRes, bestStepRes] = await Promise.all([
    db.query(
      `SELECT total_steps, active_exercise_minutes, exercise_distance_meters
       FROM health_daily_aggregates
       WHERE user_id = $1 AND log_date = CURRENT_DATE
       LIMIT 1`,
      [userId]
    ),
    db.query(
      `SELECT COALESCE(SUM(total_steps), 0)::BIGINT                      AS total_steps_7d,
              COALESCE(AVG(total_steps), 0)::NUMERIC(10,0)               AS avg_steps_7d,
              COALESCE(SUM(active_exercise_minutes), 0)::NUMERIC(10,1)  AS total_exercise_minutes_7d,
              COALESCE(AVG(active_exercise_minutes), 0)::NUMERIC(10,1)  AS avg_exercise_minutes_7d,
              COALESCE(SUM(exercise_distance_meters), 0)::NUMERIC(12,1) AS total_exercise_distance_7d,
              COUNT(*)::INTEGER                                         AS tracked_days
       FROM health_daily_aggregates
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [userId, days]
    ),
    db.query(
      `SELECT COALESCE(SUM(total_steps), 0)::BIGINT                      AS total_steps_prev,
              COALESCE(AVG(total_steps), 0)::NUMERIC(10,0)               AS avg_steps_prev,
              COALESCE(SUM(active_exercise_minutes), 0)::NUMERIC(10,1)  AS total_exercise_minutes_prev,
              COALESCE(AVG(active_exercise_minutes), 0)::NUMERIC(10,1)  AS avg_exercise_minutes_prev,
              COALESCE(SUM(exercise_distance_meters), 0)::NUMERIC(12,1) AS total_exercise_distance_prev,
              COUNT(*)::INTEGER                                         AS tracked_days_prev
       FROM health_daily_aggregates
       WHERE user_id = $1
         AND log_date >= CURRENT_DATE - (($2 * 2) || ' days')::INTERVAL
         AND log_date < CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [userId, days]
    ),
    db.query(
      `SELECT log_date::TEXT AS log_date, total_steps
       FROM health_daily_aggregates
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
       ORDER BY total_steps DESC, log_date DESC
       LIMIT 1`,
      [userId, days]
    ),
  ]);

  const today = todayRes.rows[0];
  const summary = summaryRes.rows[0];
  const prevSummary = prevSummaryRes.rows[0];
  const bestStepRow = bestStepRes.rows[0];

  const obj = {};

  if (today) {
    if (today.total_steps != null) obj.todaySteps = Number(today.total_steps);
    if (today.active_exercise_minutes != null) obj.todayActiveExerciseMinutes = Number(today.active_exercise_minutes);
    if (today.exercise_distance_meters != null) obj.todayExerciseDistanceMeters = Number(today.exercise_distance_meters);
  }

  if (summary) {
    const totalSteps7d = Number(summary.total_steps_7d) || 0;
    if (totalSteps7d > 0) {
      obj.totalSteps7d = totalSteps7d;
      obj.avgSteps7d = Number(summary.avg_steps_7d) || 0;
    }
    const totalExMin = Number(summary.total_exercise_minutes_7d) || 0;
    if (totalExMin > 0) {
      obj.totalExerciseMinutes7d = totalExMin;
      obj.avgExerciseMinutes7d = Number(summary.avg_exercise_minutes_7d) || 0;
    }
    const totalDist = Number(summary.total_exercise_distance_7d) || 0;
    if (totalDist > 0) {
      obj.totalExerciseDistanceMeters7d = totalDist;
    }
    obj.trackedDays = Number(summary.tracked_days) || 0;
  }

  if (bestStepRow && Number(bestStepRow.total_steps) > 0) {
    obj.bestStepDay = {
      date: bestStepRow.log_date,
      steps: Number(bestStepRow.total_steps),
    };
  }

  const prevTrackedDays = Number(prevSummary?.tracked_days_prev) || 0;
  if (prevTrackedDays > 0) {
    const totalStepsPrev = Number(prevSummary.total_steps_prev) || 0;
    const totalExPrev = Number(prevSummary.total_exercise_minutes_prev) || 0;
    obj.comparison = {
      hasHistoricalBaseline: true,
      totalStepsPrev7d: totalStepsPrev,
      avgStepsPrev7d: Number(prevSummary.avg_steps_prev) || 0,
      stepsDelta: (obj.totalSteps7d || 0) - totalStepsPrev,
      totalExerciseMinutesPrev7d: totalExPrev,
      avgExerciseMinutesPrev7d: Number(prevSummary.avg_exercise_minutes_prev) || 0,
      exerciseMinutesDelta: (obj.totalExerciseMinutes7d || 0) - totalExPrev,
    };
  } else {
    obj.comparison = {
      hasHistoricalBaseline: false,
      reason: 'Insufficient historical data in previous period',
    };
  }

  return obj;
};

/**
 * Retrieves daily aggregated health history breakdown.
 *
 * @param {number} userId
 * @param {number} days
 * @returns {Promise<Array<Object>>}
 */
const getHealthHistory = async (userId, days = DEFAULT_DAYS) => {
  const res = await db.query(
    `SELECT log_date::TEXT AS log_date, total_steps, active_exercise_minutes, exercise_distance_meters
     FROM health_daily_aggregates
     WHERE user_id = $1 AND log_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
     ORDER BY log_date DESC`,
    [userId, days]
  );
  return res.rows.map((r) => ({
    date: r.log_date,
    steps: Number(r.total_steps),
    activeExerciseMinutes: Number(r.active_exercise_minutes),
    exerciseDistanceMeters: Number(r.exercise_distance_meters),
  }));
};

/**
 * Retrieves detailed health records strictly scoped to `userId`.
 *
 * @param {number} userId
 * @param {string|null} metricType
 * @param {number} limit
 * @returns {Promise<Array<Object>>}
 */
const getDetailedHealthRecords = async (userId, metricType = null, limit = 10) => {
  let query = `SELECT metric_type, source, start_time, end_time, value_numeric, unit
               FROM health_records
               WHERE user_id = $1`;
  const params = [userId];

  if (metricType) {
    params.push(metricType);
    query += ` AND metric_type = $2`;
  }

  query += ` ORDER BY start_time DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const res = await db.query(query, params);
  return res.rows.map((r) => ({
    metricType: r.metric_type,
    source: r.source,
    startTime: r.start_time,
    endTime: r.end_time,
    valueNumeric: r.value_numeric != null ? Number(r.value_numeric) : null,
    unit: r.unit,
  }));
};

/**
 * Retrieves focus sessions summary + previous 7-day comparison baseline.
 *
 * @param {number} userId
 * @param {number} days
 * @returns {Promise<Object>}
 */
const getFocusSummary = async (userId, days = DEFAULT_DAYS) => {
  const [todayRes, summaryRes, prevSummaryRes, recentRes, peakHourRes] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::INTEGER                                  AS today_sessions,
              COUNT(*) FILTER (WHERE completed = TRUE)::INTEGER  AS today_completed,
              COALESCE(SUM(duration_minutes), 0)::INTEGER        AS today_minutes
       FROM focus_sessions
       WHERE user_id = $1 AND started_at >= CURRENT_DATE`,
      [userId]
    ),
    db.query(
      `SELECT COUNT(*)::INTEGER                                  AS total_sessions,
              COUNT(*) FILTER (WHERE completed = TRUE)::INTEGER  AS completed_sessions,
              COALESCE(SUM(duration_minutes), 0)::INTEGER        AS total_minutes,
              COALESCE(AVG(interruptions), 0)::NUMERIC(4,1)     AS avg_interruptions
       FROM focus_sessions
       WHERE user_id = $1 AND started_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [userId, days]
    ),
    db.query(
      `SELECT COUNT(*)::INTEGER                                  AS total_sessions_prev,
              COUNT(*) FILTER (WHERE completed = TRUE)::INTEGER  AS completed_sessions_prev,
              COALESCE(SUM(duration_minutes), 0)::INTEGER        AS total_minutes_prev,
              COALESCE(AVG(interruptions), 0)::NUMERIC(4,1)     AS avg_interruptions_prev
       FROM focus_sessions
       WHERE user_id = $1
         AND started_at >= CURRENT_DATE - (($2 * 2) || ' days')::INTERVAL
         AND started_at < CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [userId, days]
    ),
    db.query(
      `SELECT duration_minutes, interruptions, started_at, completed
       FROM focus_sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    ),
    db.query(
      `SELECT EXTRACT(HOUR FROM started_at AT TIME ZONE 'Asia/Kolkata')::INTEGER AS peak_hour,
              COUNT(*)::INTEGER AS session_count
       FROM focus_sessions
       WHERE user_id = $1 AND completed = TRUE AND started_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL
       GROUP BY peak_hour
       ORDER BY session_count DESC
       LIMIT 1`,
      [userId, days]
    ),
  ]);

  const today = todayRes.rows[0];
  const summary = summaryRes.rows[0];
  const prevSummary = prevSummaryRes.rows[0];
  const recent = recentRes.rows[0];
  const peakHourRow = peakHourRes.rows[0];

  const obj = {};

  if (today) {
    obj.todayMinutes = Number(today.today_minutes) || 0;
    obj.todaySessions = Number(today.today_sessions) || 0;
    obj.todayCompleted = Number(today.today_completed) || 0;
  }

  const totalSessions7d = Number(summary?.total_sessions) || 0;
  if (totalSessions7d > 0) {
    const completed7d = Number(summary.completed_sessions) || 0;
    obj.totalSessionsLast7Days = totalSessions7d;
    obj.completedLast7Days = completed7d;
    obj.totalMinutesLast7Days = Number(summary.total_minutes) || 0;
    obj.completionRatePercent = Number(((completed7d / totalSessions7d) * 100).toFixed(1));
    obj.avgInterruptionsLast7Days = Number(summary.avg_interruptions) || 0;
  }

  if (peakHourRow) {
    obj.peakProductiveHourKolkata = Number(peakHourRow.peak_hour);
  }

  if (recent) {
    obj.mostRecentSession = {
      durationMinutes: Number(recent.duration_minutes),
      interruptions: Number(recent.interruptions),
      startedAt: recent.started_at,
      completed: Boolean(recent.completed),
    };
  }

  const prevTotalSessions = Number(prevSummary?.total_sessions_prev) || 0;
  if (prevTotalSessions > 0) {
    const prevCompleted = Number(prevSummary.completed_sessions_prev) || 0;
    const prevRate = Number(((prevCompleted / prevTotalSessions) * 100).toFixed(1));
    obj.comparison = {
      hasHistoricalBaseline: true,
      totalSessionsPrev7d: prevTotalSessions,
      completedLast7DaysPrev7d: prevCompleted,
      completionRatePercentPrev7d: prevRate,
      totalMinutesPrev7d: Number(prevSummary.total_minutes_prev) || 0,
      sessionsCompletedDelta: (obj.completedLast7Days || 0) - prevCompleted,
      completionRateDeltaPercent: (obj.completionRatePercent || 0) - prevRate,
      focusMinutesDelta: (obj.totalMinutesLast7Days || 0) - (Number(prevSummary.total_minutes_prev) || 0),
    };
  } else {
    obj.comparison = {
      hasHistoricalBaseline: false,
      reason: 'Insufficient focus session data in previous period',
    };
  }

  return obj;
};

/**
 * Retrieves list of recent focus sessions.
 *
 * @param {number} userId
 * @param {number} days
 * @returns {Promise<Array<Object>>}
 */
const getFocusHistory = async (userId, days = DEFAULT_DAYS) => {
  const res = await db.query(
    `SELECT duration_minutes, interruptions, started_at, completed
     FROM focus_sessions
     WHERE user_id = $1 AND started_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL
     ORDER BY started_at DESC`,
    [userId, days]
  );
  return res.rows.map((r) => ({
    durationMinutes: Number(r.duration_minutes),
    interruptions: Number(r.interruptions),
    startedAt: r.started_at,
    completed: Boolean(r.completed),
  }));
};

/**
 * Retrieves wellness summary + previous 7-day comparison baseline.
 *
 * @param {number} userId
 * @param {number} days
 * @returns {Promise<Object>}
 */
const getWellnessSummary = async (userId, days = DEFAULT_DAYS) => {
  const [todayRes, summaryRes, prevSummaryRes] = await Promise.all([
    db.query(
      `SELECT sleep_hours, energy_level
       FROM wellness_logs
       WHERE user_id = $1 AND log_date = CURRENT_DATE
       LIMIT 1`,
      [userId]
    ),
    db.query(
      `SELECT AVG(sleep_hours)::NUMERIC(4,1)  AS avg_sleep,
              AVG(energy_level)::NUMERIC(4,1) AS avg_energy,
              COUNT(*)::INTEGER              AS log_count
       FROM wellness_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [userId, days]
    ),
    db.query(
      `SELECT AVG(sleep_hours)::NUMERIC(4,1)  AS avg_sleep_prev,
              AVG(energy_level)::NUMERIC(4,1) AS avg_energy_prev,
              COUNT(*)::INTEGER              AS log_count_prev
       FROM wellness_logs
       WHERE user_id = $1
         AND log_date >= CURRENT_DATE - (($2 * 2) || ' days')::INTERVAL
         AND log_date < CURRENT_DATE - ($2 || ' days')::INTERVAL`,
      [userId, days]
    ),
  ]);

  const today = todayRes.rows[0];
  const summary = summaryRes.rows[0];
  const prevSummary = prevSummaryRes.rows[0];

  const obj = {};

  if (today) {
    if (today.sleep_hours != null) obj.todaySleepHours = Number(today.sleep_hours);
    if (today.energy_level != null) obj.todayEnergyLevel = Number(today.energy_level);
  }

  if (summary) {
    if (summary.avg_sleep != null) obj.avgSleepHours7d = Number(summary.avg_sleep);
    if (summary.avg_energy != null) obj.avgEnergyLevel7d = Number(summary.avg_energy);
    obj.logCount7d = Number(summary.log_count) || 0;
  }

  const prevLogCount = Number(prevSummary?.log_count_prev) || 0;
  if (prevLogCount > 0) {
    const prevSleep = prevSummary.avg_sleep_prev != null ? Number(prevSummary.avg_sleep_prev) : null;
    const prevEnergy = prevSummary.avg_energy_prev != null ? Number(prevSummary.avg_energy_prev) : null;
    obj.comparison = {
      hasHistoricalBaseline: true,
      avgSleepHoursPrev7d: prevSleep,
      avgEnergyLevelPrev7d: prevEnergy,
      energyDelta: (obj.avgEnergyLevel7d != null && prevEnergy != null) ? Number((obj.avgEnergyLevel7d - prevEnergy).toFixed(1)) : null,
      sleepDelta: (obj.avgSleepHours7d != null && prevSleep != null) ? Number((obj.avgSleepHours7d - prevSleep).toFixed(1)) : null,
    };
  } else {
    obj.comparison = {
      hasHistoricalBaseline: false,
      reason: 'Insufficient wellness logs in previous period',
    };
  }

  return obj;
};

/**
 * Retrieves recent daily wellness logs breakdown.
 *
 * @param {number} userId
 * @param {number} days
 * @returns {Promise<Array<Object>>}
 */
const getWellnessHistory = async (userId, days = DEFAULT_DAYS) => {
  const res = await db.query(
    `SELECT log_date::TEXT AS log_date, sleep_hours, energy_level
     FROM wellness_logs
     WHERE user_id = $1 AND log_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
     ORDER BY log_date DESC`,
    [userId, days]
  );
  return res.rows.map((r) => ({
    date: r.log_date,
    sleepHours: r.sleep_hours != null ? Number(r.sleep_hours) : null,
    energyLevel: r.energy_level != null ? Number(r.energy_level) : null,
  }));
};

/**
 * Retrieves the currently active Roadmap and all its daily missions for `userId`.
 *
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
const getActiveRoadmap = async (userId) => {
  const bpRes = await db.query(
    `SELECT id, title, outcome, duration_days, start_date::TEXT AS start_date,
            end_date::TEXT AS end_date, status
     FROM blueprints
     WHERE user_id = $1 AND status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  const activeBpRow = bpRes.rows[0];
  if (!activeBpRow) return null;

  const currentDateRes = await db.query(`SELECT CURRENT_DATE::TEXT AS current_date`);
  const currentDate = currentDateRes.rows[0]?.current_date;

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

  const completedCount = completedDays.length;
  const totalMissions = days.length;
  const adherenceRatePercent = totalMissions > 0 ? Number(((completedCount / totalMissions) * 100).toFixed(1)) : 0;

  return {
    id: Number(activeBpRow.id),
    title: activeBpRow.title,
    outcome: activeBpRow.outcome,
    durationDays: Number(activeBpRow.duration_days),
    startDate: activeBpRow.start_date,
    endDate: activeBpRow.end_date,
    status: activeBpRow.status,
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
    totalMissions,
    pendingCount: pendingDays.length,
    completedCount,
    skippedCount: skippedDays.length,
    rescheduledCount: rescheduledDays.length,
    adherenceRatePercent,
    isKeepingUp: skippedDays.length === 0,
    occupiedDates,
    earliestAvailableDates,
    days,
  };
};

/**
 * Retrieves past blueprint roadmaps for `userId`.
 *
 * @param {number} userId
 * @param {number} limit
 * @returns {Promise<Array<Object>>}
 */
const getRoadmapHistory = async (userId, limit = 5) => {
  const res = await db.query(
    `SELECT id, title, outcome, duration_days, start_date::TEXT AS start_date,
            end_date::TEXT AS end_date, status, created_at
     FROM blueprints
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return res.rows.map((r) => ({
    id: Number(r.id),
    title: r.title,
    outcome: r.outcome,
    durationDays: Number(r.duration_days),
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    createdAt: r.created_at,
  }));
};

/**
 * Determines internal intent category & target data domains for context routing.
 * Categories: READ_DATA, ANALYZE_DATA, RECOMMEND, ROADMAP_ACTION, OTHER
 *
 * @param {string} userMessage
 * @returns {{ category: string, domains: Array<string> }}
 */
const detectIntent = (userMessage = '') => {
  const msg = userMessage.toLowerCase();

  const isRoadmapAction = /\b(move|reschedule|shift|push|delay|start.*from|start.*tomorrow|start.*friday)\b/i.test(msg) &&
                          /\b(mission|day|roadmap|schedule)\b/i.test(msg);

  const isRecommend = /\b(recommend|suggestion|suggest|routine|workout|yoga|mobility|exercise to do|how (can|to) improve|what should i (do|focus|improve)|one concrete|action|next step)\b/i.test(msg);

  const isAnalyze = /\b(why|relationship|correlation|trend|productive|overall|progress|compare|affect|impact|lower|higher|insight|insights|change|changed|improving|patterns|strongest|weakest|keeping up|falling behind|going well)\b/i.test(msg);

  const isRead = /\b(how many|what is|what was|show me|my data|status|mission|history|summary|list|view|delete)\b/i.test(msg);

  let category = 'OTHER';
  if (isRoadmapAction) category = 'ROADMAP_ACTION';
  else if (isRecommend) category = 'RECOMMEND';
  else if (isAnalyze) category = 'ANALYZE_DATA';
  else if (isRead) category = 'READ_DATA';

  const domains = new Set();

  if (/\b(step|exercise|workout|distance|walk|run|activity|health)\b/i.test(msg)) domains.add('health');
  if (/\b(focus|session|deep work|pomodoro|interrupt|completion|rate|productive|productivity)\b/i.test(msg)) domains.add('focus');
  if (/\b(wellness|sleep|energy|feeling|check-in|mood)\b/i.test(msg)) domains.add('wellness');
  if (/\b(roadmap|mission|blueprint|day|schedule)\b/i.test(msg)) domains.add('roadmap');

  // Insights, recommendations, and overall performance default to all domains
  if (isAnalyze || isRecommend || domains.size === 0 || /\b(overall|week|everything|all|doing|today|right now|insights|progress)\b/i.test(msg)) {
    domains.add('health');
    domains.add('focus');
    domains.add('wellness');
    domains.add('roadmap');
  }

  return {
    category,
    domains: Array.from(domains),
  };
};

/**
 * Builds intent-based personal AI context by querying PostgreSQL for `userId`.
 *
 * @param {number} userId - Authenticated user ID.
 * @param {string} userMessage - User query string.
 * @returns {Promise<Object>} Personal context object.
 */
const buildDbContext = async (userId, userMessage = '') => {
  const { category, domains } = detectIntent(userMessage);

  // Fetch core profile and current database date
  const [profile, currentDateRes] = await Promise.all([
    getUserProfile(userId),
    db.query(`SELECT CURRENT_DATE::TEXT AS current_date`),
  ]);

  const currentDate = currentDateRes.rows[0]?.current_date;

  const context = {
    user: profile ? { name: profile.name } : null,
    userName: profile?.name || null,
    currentDate: currentDate || null,
    temporalContext: { currentDate: currentDate || null },
    intentCategory: category,
  };

  const domainPromises = [];

  if (domains.includes('health')) {
    domainPromises.push(getHealthSummary(userId).then((h) => { context.health = h; }));
  }
  if (domains.includes('focus')) {
    domainPromises.push(getFocusSummary(userId).then((f) => {
      context.focus = f;
      if (f.totalSessionsLast7Days > 0) {
        context.recentFocus = {
          totalSessionsLast7Days: f.totalSessionsLast7Days,
          completedLast7Days: f.completedLast7Days,
          totalMinutesLast7Days: f.totalMinutesLast7Days,
        };
      }
    }));
  }
  if (domains.includes('wellness')) {
    domainPromises.push(getWellnessSummary(userId).then((w) => {
      context.wellness = w;
      if (w.todaySleepHours != null) context.todaySleepHours = w.todaySleepHours;
      if (w.todayEnergyLevel != null) context.todayEnergyLevel = w.todayEnergyLevel;
    }));
  }
  if (domains.includes('roadmap')) {
    domainPromises.push(getActiveRoadmap(userId).then((r) => {
      if (r) context.roadmap = r;
    }));
  }

  // If detailed health records requested
  if (/\b(exercise session|workout detail|health record)\b/i.test(userMessage)) {
    domainPromises.push(getDetailedHealthRecords(userId, 'exercise', 5).then((records) => {
      context.detailedHealthRecords = records;
    }));
  }

  await Promise.all(domainPromises);

  return context;
};

/**
 * Merges health JSON.
 */
const mergeHealthContext = (dbContext, healthJson = null) => {
  if (!healthJson) return dbContext;
  return dbContext;
};

/**
 * Selects relevant context to pass to Gemini.
 */
const selectRelevantContext = (fullContext, userMessage) => {
  return fullContext;
};

module.exports = {
  getUserProfile,
  getHealthSummary,
  getHealthHistory,
  getDetailedHealthRecords,
  getFocusSummary,
  getFocusHistory,
  getWellnessSummary,
  getWellnessHistory,
  getActiveRoadmap,
  getRoadmapHistory,
  detectIntent,
  buildDbContext,
  mergeHealthContext,
  selectRelevantContext,
};


