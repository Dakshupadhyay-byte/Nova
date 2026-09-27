// =============================================================================
// src/routes/healthWebhook.routes.js — Health Webhook Ingestion & Daily Metrics Routes
// =============================================================================
// Mounted in app.js as: app.use('/api/health', healthWebhookRouter)
// - POST /api/health/webhook -> Authenticated via Webhook API Key
// - GET  /api/health/daily   -> Authenticated via Firebase ID Token
// =============================================================================

'use strict';

const { Router } = require('express');
const { pool } = require('../config/db');
const healthWebhookAuthMiddleware = require('../middleware/healthWebhookAuthMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { rebuildHealthDailyAggregates } = require('../services/healthAggregation.service');

const router = Router();

/**
 * Normalizes incoming HC Webhook health metrics into structured records.
 */
function extractHealthRecords(body) {
  const records = [];
  const sourceName = body.data_origin || body.source || body.packageName || 'health_connect';

  const mappings = [
    { key: 'steps', type: 'steps', defaultUnit: 'count' },
    { key: 'step_count', type: 'steps', defaultUnit: 'count' },
    { key: 'sleep', type: 'sleep', defaultUnit: 'hours' },
    { key: 'sleep_session', type: 'sleep', defaultUnit: 'hours' },
    { key: 'heart_rate', type: 'heart_rate', defaultUnit: 'bpm' },
    { key: 'heartRate', type: 'heart_rate', defaultUnit: 'bpm' },
    { key: 'calories', type: 'calories', defaultUnit: 'kcal' },
    { key: 'active_calories', type: 'calories', defaultUnit: 'kcal' },
    { key: 'exercise', type: 'exercise', defaultUnit: 'minutes' },
    { key: 'workouts', type: 'exercise', defaultUnit: 'minutes' },
  ];

  for (const mapping of mappings) {
    const arr = body[mapping.key];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (!item || typeof item !== 'object') continue;

        const startTimeStr = item.start_time || item.startTime || item.start || item.timestamp || body.timestamp || new Date().toISOString();
        const endTimeStr = item.end_time || item.endTime || item.end || startTimeStr;
        const sourceRecordId = item.source_record_id || item.sourceRecordId || item.id || item.uuid || null;

        let val = null;
        if (mapping.type === 'steps') val = item.count ?? item.steps ?? item.value ?? null;
        else if (mapping.type === 'sleep') val = item.hours ?? item.duration_hours ?? item.value ?? null;
        else if (mapping.type === 'heart_rate') val = item.bpm ?? item.avg_bpm ?? item.value ?? null;
        else if (mapping.type === 'calories') val = item.calories ?? item.total_calories ?? item.active_calories ?? item.value ?? null;
        else if (mapping.type === 'exercise') val = item.duration_minutes ?? item.minutes ?? item.calories ?? item.value ?? null;

        const unit = item.unit || mapping.defaultUnit;

        records.push({
          metricType: mapping.type,
          source: sourceName,
          sourceRecordId: sourceRecordId ? String(sourceRecordId) : null,
          startTime: new Date(startTimeStr).toISOString(),
          endTime: new Date(endTimeStr).toISOString(),
          valueNumeric: val !== null && !isNaN(Number(val)) ? Number(val) : null,
          unit,
          payload: item,
        });
      }
    }
  }

  if (Array.isArray(body.records)) {
    for (const item of body.records) {
      if (!item || typeof item !== 'object') continue;

      const metricType = item.metric_type || item.metricType || item.type || 'unknown';
      const startTimeStr = item.start_time || item.startTime || item.start || new Date().toISOString();
      const endTimeStr = item.end_time || item.endTime || item.end || new Date().toISOString();
      const sourceRecordId = item.source_record_id || item.sourceRecordId || item.id || null;
      const val = item.value_numeric ?? item.value ?? item.count ?? null;
      const unit = item.unit || 'unknown';

      records.push({
        metricType: String(metricType).toLowerCase(),
        source: sourceName,
        sourceRecordId: sourceRecordId ? String(sourceRecordId) : null,
        startTime: new Date(startTimeStr).toISOString(),
        endTime: new Date(endTimeStr).toISOString(),
        valueNumeric: val !== null && !isNaN(Number(val)) ? Number(val) : null,
        unit,
        payload: item,
      });
    }
  }

  return records;
}

/**
 * POST /api/health/webhook
 * Authenticated health webhook endpoint.
 * Ingests health connect records into health_records table idempotently inside a transaction.
 * Authenticated via Webhook API Key (healthWebhookAuthMiddleware).
 */
router.post('/webhook', healthWebhookAuthMiddleware, async (req, res, next) => {
  try {
    // 1. Validate payload
    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body) ||
      Object.keys(req.body).length === 0
    ) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Request body must be a non-empty JSON object.',
        },
      });
    }

    // 2. Derived authenticated user ID (never trust payload user_id)
    const userId = req.user.id;

    // 3. Extract normalized records
    const records = extractHealthRecords(req.body);

    if (records.length === 0) {
      return res.status(200).json({
        success: true,
        inserted: 0,
        duplicates: 0,
      });
    }

    // 4. Ingest in transaction
    const client = await pool.connect();
    let inserted = 0;
    let duplicates = 0;

    try {
      await client.query('BEGIN');

      for (const rec of records) {
        const queryText = `
          INSERT INTO health_records (
            user_id, metric_type, source, source_record_id,
            start_time, end_time, value_numeric, unit, payload
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT DO NOTHING
          RETURNING id;
        `;

        const values = [
          userId,
          rec.metricType,
          rec.source,
          rec.sourceRecordId,
          rec.startTime,
          rec.endTime,
          rec.valueNumeric,
          rec.unit,
          JSON.stringify(rec.payload),
        ];

        const result = await client.query(queryText, values);
        if (result.rows.length > 0) {
          inserted++;
        } else {
          duplicates++;
        }
      }

      await client.query('COMMIT');

      // Trigger background aggregation rebuild for the user
      rebuildHealthDailyAggregates(userId).catch(err => {
        console.error('[HEALTH AGGREGATION] Auto-rebuild error:', err.message);
      });

    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

    console.log(`[HEALTH WEBHOOK] Ingested ${inserted} new records, ${duplicates} duplicates for User ID ${userId}`);

    return res.status(200).json({
      success: true,
      inserted,
      duplicates,
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/health/daily
 * Retrieves daily aggregated health metrics for the authenticated user.
 * Protected by Firebase Authentication (authMiddleware).
 * Supports optional date query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get('/daily', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    // Trigger on-demand aggregation rebuild for user
    await rebuildHealthDailyAggregates(userId, from || null, to || null);

    let queryText = `
      SELECT log_date::text AS log_date, total_steps, active_exercise_minutes, exercise_distance_meters
      FROM health_daily_aggregates
      WHERE user_id = $1
    `;
    const params = [userId];

    if (from && to) {
      params.push(from, to);
      queryText += ` AND log_date BETWEEN $2 AND $3`;
    } else if (from) {
      params.push(from);
      queryText += ` AND log_date >= $2`;
    } else {
      queryText += ` AND log_date >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    queryText += ` ORDER BY log_date ASC`;

    const { rows } = await pool.query(queryText, params);

    const formattedData = rows.map((r) => ({
      date: r.log_date,
      steps: Number(r.total_steps),
      exercise_minutes: Number(r.active_exercise_minutes),
      exercise_distance_meters: Number(r.exercise_distance_meters),
    }));

    return res.status(200).json({
      success: true,
      data: formattedData,
    });

  } catch (err) {
    next(err);
  }
});

// Reject non-POST requests on /webhook with 405 Method Not Allowed
router.all('/webhook', (req, res) => {
  res.setHeader('Allow', 'POST');
  return res.status(405).json({
    success: false,
    data: null,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${req.method} is not allowed on /api/health/webhook. Only POST is accepted.`,
    },
  });
});

module.exports = router;
