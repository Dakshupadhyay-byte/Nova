// =============================================================================
// src/services/blueprint.service.js — Blueprint Creation Service
// =============================================================================

'use strict';

const db = require('../config/db');
const { buildDbContext, selectRelevantContext } = require('./aiContext.service');
const geminiService = require('./gemini.service');

/**
 * Custom error helper for AI response validation failures.
 */
const createAIValidationError = (msg) => {
  const err = new Error(msg);
  err.code = 'GEMINI_MALFORMED_RESPONSE';
  return err;
};

/**
 * Validates the raw JSON response received from Gemini against strict structural requirements.
 *
 * @param {Object} parsed - Object parsed from Gemini response.
 * @param {number} expectedDurationDays - Target duration in days.
 */
const validateBlueprintOutput = (parsed, expectedDurationDays) => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw createAIValidationError('Generated blueprint response is not an object.');
  }

  if (typeof parsed.title !== 'string' || parsed.title.trim() === '') {
    throw createAIValidationError('Generated blueprint title is missing or empty.');
  }

  if (!Array.isArray(parsed.days)) {
    throw createAIValidationError('Generated blueprint days is not an array.');
  }

  if (parsed.days.length !== expectedDurationDays) {
    throw createAIValidationError(
      `Generated blueprint contains ${parsed.days.length} days, expected ${expectedDurationDays}.`
    );
  }

  const seenDays = new Set();
  for (let i = 0; i < parsed.days.length; i++) {
    const d = parsed.days[i];
    if (!d || typeof d !== 'object') {
      throw createAIValidationError(`Day entry at index ${i} is invalid.`);
    }

    if (!Number.isInteger(d.dayNumber)) {
      throw createAIValidationError(`Day entry at index ${i} has invalid dayNumber.`);
    }

    const expectedDayNum = i + 1;
    if (d.dayNumber !== expectedDayNum) {
      throw createAIValidationError(
        `Day entry at index ${i} has dayNumber ${d.dayNumber}, expected ${expectedDayNum}.`
      );
    }

    if (seenDays.has(d.dayNumber)) {
      throw createAIValidationError(`Duplicate dayNumber ${d.dayNumber} detected.`);
    }
    seenDays.add(d.dayNumber);

    if (typeof d.title !== 'string' || d.title.trim() === '') {
      throw createAIValidationError(`Day ${d.dayNumber} title is missing or empty.`);
    }

    if (typeof d.mission !== 'string' || d.mission.trim() === '') {
      throw createAIValidationError(`Day ${d.dayNumber} mission is missing or empty.`);
    }

    if (d.rationale !== undefined && d.rationale !== null && typeof d.rationale !== 'string') {
      throw createAIValidationError(`Day ${d.dayNumber} rationale must be a string.`);
    }
  }

  return true;
};

/**
 * Creates a personalized multi-day blueprint for an authenticated user.
 *
 * @param {number} userId - Authenticated PostgreSQL user ID (from req.user.id).
 * @param {string} outcome - User's target outcome (already trimmed).
 * @param {number} durationDays - Plan duration (integer 1..90).
 * @returns {Promise<Object>} Created blueprint record with days array.
 */
const createBlueprint = async (userId, outcome, durationDays) => {
  // 1. Pre-check: Active blueprint constraint
  const { rows: activeRows } = await db.query(
    `SELECT id FROM blueprints WHERE user_id = $1 AND status = 'active' LIMIT 1`,
    [userId]
  );

  if (activeRows.length > 0) {
    const err = new Error('You already have an active blueprint. Please complete or cancel it before creating another.');
    err.code = 'ACTIVE_BLUEPRINT_EXISTS';
    throw err;
  }

  // 2. Load personalized context
  const fullContext = await buildDbContext(userId);
  const selectedContext = selectRelevantContext(fullContext, outcome);

  // 3. Ask Gemini to generate structured plan
  const generated = await geminiService.generateBlueprintPlan(outcome, durationDays, selectedContext);

  // 4. Validate AI output strictly BEFORE beginning database transaction
  validateBlueprintOutput(generated, durationDays);

  // 5. Begin Database Transaction for write operations ONLY
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Compute start_date and end_date on backend DB clock
    const { rows: dateRows } = await client.query(
      `SELECT CURRENT_DATE::TEXT AS start_date,
              (CURRENT_DATE + ($1 || ' days')::INTERVAL - INTERVAL '1 day')::DATE::TEXT AS end_date`,
      [durationDays]
    );
    const startDate = dateRows[0].start_date;
    const endDate = dateRows[0].end_date;

    // Insert main blueprint record
    const { rows: bpRows } = await client.query(
      `INSERT INTO blueprints
         (user_id, title, outcome, duration_days, start_date, end_date, status)
       VALUES
         ($1, $2, $3, $4, $5::DATE, $6::DATE, 'active')
       RETURNING id, user_id, title, outcome, duration_days, start_date, end_date, status, created_at`,
      [userId, generated.title.trim(), outcome, durationDays, startDate, endDate]
    );

    const blueprint = bpRows[0];
    const blueprintId = blueprint.id;

    // Insert blueprint_days entries
    const daysInserted = [];
    for (const day of generated.days) {
      const dayNum = day.dayNumber;
      const { rows: dayDateRows } = await client.query(
        `SELECT ($1::DATE + ($2 || ' days')::INTERVAL)::DATE::TEXT AS day_date`,
        [startDate, dayNum - 1]
      );
      const logDate = dayDateRows[0].day_date;

      const { rows: dayRows } = await client.query(
        `INSERT INTO blueprint_days
           (blueprint_id, day_number, log_date, title, mission, rationale, status)
         VALUES
           ($1, $2, $3::DATE, $4, $5, $6, 'pending')
         RETURNING id, blueprint_id, day_number, log_date, title, mission, rationale, status, completed_at`,
        [
          blueprintId,
          dayNum,
          logDate,
          day.title.trim(),
          day.mission.trim(),
          day.rationale ? day.rationale.trim() : null,
        ]
      );

      const dRow = dayRows[0];
      daysInserted.push({
        id: Number(dRow.id),
        dayNumber: Number(dRow.day_number),
        logDate: dRow.log_date,
        title: dRow.title,
        mission: dRow.mission,
        rationale: dRow.rationale,
        status: dRow.status,
        completedAt: dRow.completed_at,
      });
    }

    await client.query('COMMIT');

    return {
      id: Number(blueprint.id),
      userId: Number(blueprint.user_id),
      title: blueprint.title,
      outcome: blueprint.outcome,
      durationDays: Number(blueprint.duration_days),
      startDate: blueprint.start_date,
      endDate: blueprint.end_date,
      status: blueprint.status,
      createdAt: blueprint.created_at,
      days: daysInserted,
    };

  } catch (txErr) {
    await client.query('ROLLBACK');
    throw txErr;
  } finally {
    client.release();
  }
};

module.exports = { createBlueprint };
