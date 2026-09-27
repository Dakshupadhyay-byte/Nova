// =============================================================================
// src/services/healthAggregation.service.js — Daily Health Metrics Aggregator
// =============================================================================

'use strict';

const db = require('../config/db');

/**
 * Rebuilds health_daily_aggregates for a specified user across local Asia/Kolkata dates.
 *
 * Rules:
 * 1. Timezone: All timestamps evaluated in 'Asia/Kolkata'.
 * 2. Steps: Take MAX(value_numeric) cumulative snapshot for each local date.
 * 3. Exercise: SUM(payload.duration_seconds / 60.0) & SUM(payload.distance_meters).
 * 4. Idempotency: Uses INSERT ... ON CONFLICT (user_id, log_date) DO UPDATE.
 *
 * @param {number|string} userId - PostgreSQL user_id
 * @param {string} [startDate] - Optional YYYY-MM-DD
 * @param {string} [endDate] - Optional YYYY-MM-DD
 */
async function rebuildHealthDailyAggregates(userId, startDate = null, endDate = null) {
  let dateFilter = '';
  const params = [userId];

  if (startDate && endDate) {
    params.push(startDate, endDate);
    dateFilter = `AND (start_time AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $2 AND $3`;
  } else if (startDate) {
    params.push(startDate);
    dateFilter = `AND (start_time AT TIME ZONE 'Asia/Kolkata')::date >= $2`;
  }

  // 1. Compute daily steps: MAX(value_numeric) per local date string
  const stepsQuery = `
    SELECT
      ((start_time AT TIME ZONE 'Asia/Kolkata')::date)::text AS local_date,
      MAX(value_numeric) AS max_steps
    FROM health_records
    WHERE user_id = $1
      AND metric_type = 'steps'
      ${dateFilter}
    GROUP BY ((start_time AT TIME ZONE 'Asia/Kolkata')::date)::text
  `;

  const { rows: stepRows } = await db.query(stepsQuery, params);

  // 2. Compute daily exercise: SUM(duration_seconds / 60.0) & SUM(distance_meters) per local date string
  const exerciseQuery = `
    SELECT
      ((start_time AT TIME ZONE 'Asia/Kolkata')::date)::text AS local_date,
      ROUND(SUM(COALESCE(value_numeric, (payload->>'duration_seconds')::numeric / 60.0)), 2) AS active_minutes,
      ROUND(SUM(COALESCE((payload->>'distance_meters')::numeric, 0)), 2) AS total_distance
    FROM health_records
    WHERE user_id = $1
      AND metric_type = 'exercise'
      ${dateFilter}
    GROUP BY ((start_time AT TIME ZONE 'Asia/Kolkata')::date)::text
  `;

  const { rows: exerciseRows } = await db.query(exerciseQuery, params);

  // 3. Map all affected dates
  const datesMap = new Map();

  for (const r of stepRows) {
    datesMap.set(r.local_date, {
      steps: Number(r.max_steps || 0),
      exerciseMinutes: 0,
      exerciseDistance: 0,
    });
  }

  for (const r of exerciseRows) {
    const existing = datesMap.get(r.local_date) || { steps: 0, exerciseMinutes: 0, exerciseDistance: 0 };
    existing.exerciseMinutes = Number(r.active_minutes || 0);
    existing.exerciseDistance = Number(r.total_distance || 0);
    datesMap.set(r.local_date, existing);
  }

  // 4. Idempotently upsert into health_daily_aggregates inside transaction
  const client = await db.pool.connect();
  let updatedCount = 0;

  try {
    await client.query('BEGIN');

    for (const [dateStr, metrics] of datesMap.entries()) {
      const upsertQuery = `
        INSERT INTO health_daily_aggregates (
          user_id, log_date, total_steps, active_exercise_minutes, exercise_distance_meters
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, log_date) DO UPDATE SET
          total_steps = EXCLUDED.total_steps,
          active_exercise_minutes = EXCLUDED.active_exercise_minutes,
          exercise_distance_meters = EXCLUDED.exercise_distance_meters,
          updated_at = NOW();
      `;

      await client.query(upsertQuery, [
        userId,
        dateStr,
        metrics.steps,
        metrics.exerciseMinutes,
        metrics.exerciseDistance,
      ]);
      updatedCount++;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { datesCount: updatedCount, dates: Array.from(datesMap.keys()) };
}

module.exports = {
  rebuildHealthDailyAggregates,
};
