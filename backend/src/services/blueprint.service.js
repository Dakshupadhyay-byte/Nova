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

/**
 * Retrieves all blueprints and nested days for an authenticated user, newest blueprints first.
 *
 * @param {number} userId - Authenticated PostgreSQL user ID (from req.user.id).
 * @returns {Promise<Array<Object>>} Array of blueprint objects with nested days.
 */
const getUserBlueprints = async (userId) => {
  // Query 1: Fetch blueprints for user (newest first)
  const { rows: bpRows } = await db.query(
    `SELECT id, title, outcome, duration_days, start_date, end_date, status, created_at, updated_at
     FROM blueprints
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  if (bpRows.length === 0) {
    return [];
  }

  // Query 2: Fetch blueprint days for user's blueprints (ordered by day_number ASC)
  const { rows: dayRows } = await db.query(
    `SELECT d.id, d.blueprint_id, d.day_number, d.log_date, d.title, d.mission, d.rationale,
            d.status, d.completed_at, d.original_log_date, d.rescheduled_at, d.created_at, d.updated_at
     FROM blueprint_days d
     JOIN blueprints b ON d.blueprint_id = b.id
     WHERE b.user_id = $1
     ORDER BY d.blueprint_id, d.day_number ASC`,
    [userId]
  );

  // Group days by blueprint_id
  const daysByBlueprint = new Map();
  for (const d of dayRows) {
    const bpId = String(d.blueprint_id);
    if (!daysByBlueprint.has(bpId)) {
      daysByBlueprint.set(bpId, []);
    }
    daysByBlueprint.get(bpId).push({
      id: Number(d.id),
      dayNumber: Number(d.day_number),
      logDate: d.log_date,
      title: d.title,
      mission: d.mission,
      rationale: d.rationale,
      status: d.status,
      completedAt: d.completed_at,
      originalLogDate: d.original_log_date,
      rescheduledAt: d.rescheduled_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    });
  }

  // Format blueprint objects
  return bpRows.map((bp) => {
    const bpId = String(bp.id);
    return {
      id: Number(bp.id),
      title: bp.title,
      outcome: bp.outcome,
      durationDays: Number(bp.duration_days),
      startDate: bp.start_date,
      endDate: bp.end_date,
      status: bp.status,
      createdAt: bp.created_at,
      updatedAt: bp.updated_at,
      days: daysByBlueprint.get(bpId) || [],
    };
  });
};

/**
 * Reschedules a pending blueprint mission to a new calendar date.
 *
 * @param {number} userId - Authenticated user ID (from req.user.id).
 * @param {number} dayId - ID of the blueprint_day to reschedule.
 * @param {string} newDate - Target date string in YYYY-MM-DD format.
 * @returns {Promise<Object>} Updated blueprint day object.
 */
const rescheduleBlueprintDay = async (userId, dayId, newDate) => {
  // 1. Verify day exists and belongs to a blueprint owned by the user
  const { rows: dayRows } = await db.query(
    `SELECT d.id, d.blueprint_id, d.day_number, d.log_date, d.title, d.mission, d.rationale,
            d.status, d.completed_at, d.original_log_date, d.rescheduled_at, d.created_at, d.updated_at
     FROM blueprint_days d
     JOIN blueprints b ON d.blueprint_id = b.id
     WHERE d.id = $1 AND b.user_id = $2`,
    [dayId, userId]
  );

  if (dayRows.length === 0) {
    const err = new Error('Roadmap mission not found or access denied.');
    err.code = 'DAY_NOT_FOUND';
    throw err;
  }

  const day = dayRows[0];

  // 2. Only pending missions may be rescheduled
  if (day.status !== 'pending') {
    const err = new Error(`Only pending missions can be rescheduled. Current status: ${day.status}`);
    err.code = 'MISSION_NOT_PENDING';
    throw err;
  }

  // 3. Reject if date is already occupied by another mission in the same blueprint
  const { rows: occupiedRows } = await db.query(
    `SELECT id FROM blueprint_days
     WHERE blueprint_id = $1 AND log_date = $2::DATE AND id != $3
     LIMIT 1`,
    [day.blueprint_id, newDate, dayId]
  );

  if (occupiedRows.length > 0) {
    const err = new Error('A mission is already scheduled for this date in your roadmap.');
    err.code = 'DATE_OCCUPIED';
    throw err;
  }

  // 4. Update the day: preserve original_log_date on first reschedule, set new log_date
  const { rows: updatedRows } = await db.query(
    `UPDATE blueprint_days
     SET log_date = $1::DATE,
         original_log_date = COALESCE(original_log_date, log_date),
         rescheduled_at = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, blueprint_id, day_number, log_date, title, mission, rationale,
               status, completed_at, original_log_date, rescheduled_at, created_at, updated_at`,
    [newDate, dayId]
  );

  const updated = updatedRows[0];

  return {
    id: Number(updated.id),
    blueprintId: Number(updated.blueprint_id),
    dayNumber: Number(updated.day_number),
    logDate: updated.log_date,
    title: updated.title,
    mission: updated.mission,
    rationale: updated.rationale,
    status: updated.status,
    completedAt: updated.completed_at,
    originalLogDate: updated.original_log_date,
    rescheduledAt: updated.rescheduled_at,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
};

/**
 * Shifts all pending days in an active blueprint forward by an integer number of days.
 * Completed and skipped days remain fixed in place.
 * Executed in a single PostgreSQL transaction with row locks.
 *
 * @param {number} userId - Authenticated user ID (from req.user.id).
 * @param {number} blueprintId - ID of the blueprint to shift.
 * @param {number} daysToShift - Positive integer number of days to shift forward.
 * @returns {Promise<Object>} Summary of shifted days and updated blueprint info.
 */
const shiftBlueprint = async (userId, blueprintId, daysToShift) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock and verify blueprint ownership and active status
    const { rows: bpRows } = await client.query(
      `SELECT id, user_id, title, outcome, duration_days, start_date, end_date, status
       FROM blueprints
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [blueprintId, userId]
    );

    if (bpRows.length === 0) {
      const err = new Error('Roadmap blueprint not found or access denied.');
      err.code = 'BLUEPRINT_NOT_FOUND';
      throw err;
    }

    const blueprint = bpRows[0];
    if (blueprint.status !== 'active') {
      const err = new Error(`Only active roadmaps can be shifted. Current status: ${blueprint.status}`);
      err.code = 'BLUEPRINT_NOT_ACTIVE';
      throw err;
    }

    // 2. Fetch and lock all blueprint days for this roadmap
    const { rows: allDayRows } = await client.query(
      `SELECT id, blueprint_id, day_number, log_date::TEXT AS log_date, title, mission, rationale,
              status, completed_at, original_log_date::TEXT AS original_log_date, rescheduled_at, created_at, updated_at
       FROM blueprint_days
       WHERE blueprint_id = $1
       ORDER BY day_number ASC
       FOR UPDATE`,
      [blueprintId]
    );

    const pendingDays = allDayRows.filter((d) => d.status === 'pending');
    const fixedDays = allDayRows.filter((d) => d.status !== 'pending');

    if (pendingDays.length === 0) {
      const err = new Error('There are no pending missions to shift in this roadmap.');
      err.code = 'NO_PENDING_MISSIONS';
      throw err;
    }

    // 3. Validate no collisions with fixed (completed/skipped) days
    const fixedDatesSet = new Set(fixedDays.map((d) => d.log_date));
    for (const pDay of pendingDays) {
      const [y, m, d] = pDay.log_date.split('-').map(Number);
      const targetDateObj = new Date(Date.UTC(y, m - 1, d + daysToShift));
      const targetDateStr = targetDateObj.toISOString().split('T')[0];

      if (fixedDatesSet.has(targetDateStr)) {
        const conflictingDay = fixedDays.find((f) => f.log_date === targetDateStr);
        const err = new Error(
          `Cannot shift roadmap: Target date ${targetDateStr} for Day ${pDay.day_number} conflicts with completed/skipped Day ${conflictingDay?.day_number || ''}.`
        );
        err.code = 'DATE_OCCUPIED';
        throw err;
      }
    }

    // 4. Update all pending days by shifting log_date forward by daysToShift
    // Use a two-step shift inside the transaction to avoid transient per-row unique constraint collisions
    // Step A: move pending days to a far-future buffer
    await client.query(
      `UPDATE blueprint_days
       SET log_date = (log_date + INTERVAL '500 years')::DATE
       WHERE blueprint_id = $1 AND status = 'pending'`,
      [blueprintId]
    );

    // Step B: move from buffer to final target dates (log_date - 500 years + daysToShift)
    // IMPORTANT: Do NOT touch original_log_date or rescheduled_at (preserves history of individual reschedules)
    const { rows: updatedDayRows } = await client.query(
      `UPDATE blueprint_days
       SET log_date = (log_date - INTERVAL '500 years' + ($1 || ' days')::INTERVAL)::DATE,
           updated_at = NOW()
       WHERE blueprint_id = $2 AND status = 'pending'
       RETURNING id, blueprint_id, day_number, log_date::TEXT AS log_date, title, mission, rationale,
                 status, completed_at, original_log_date, rescheduled_at, created_at, updated_at`,
      [daysToShift, blueprintId]
    );

    // 5. Update the blueprint's end_date to match the maximum log_date among all days
    const { rows: updatedBpRows } = await client.query(
      `UPDATE blueprints
       SET end_date = (SELECT MAX(log_date) FROM blueprint_days WHERE blueprint_id = $1),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, title, outcome, duration_days, start_date, end_date, status, created_at, updated_at`,
      [blueprintId]
    );

    await client.query('COMMIT');

    const updatedBlueprint = updatedBpRows[0];

    return {
      blueprintId: Number(blueprint.id),
      blueprintTitle: blueprint.title,
      shiftedCount: updatedDayRows.length,
      daysShifted: daysToShift,
      newEndDate: updatedBlueprint.end_date,
      days: updatedDayRows.map((d) => ({
        id: Number(d.id),
        blueprintId: Number(d.blueprint_id),
        dayNumber: Number(d.day_number),
        logDate: d.log_date,
        title: d.title,
        mission: d.mission,
        rationale: d.rationale,
        status: d.status,
        completedAt: d.completed_at,
        originalLogDate: d.original_log_date,
        rescheduledAt: d.rescheduled_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })),
    };
  } catch (txErr) {
    await client.query('ROLLBACK');
    throw txErr;
  } finally {
    client.release();
  }
};

module.exports = { createBlueprint, getUserBlueprints, rescheduleBlueprintDay, shiftBlueprint };


