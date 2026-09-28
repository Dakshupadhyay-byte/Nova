// =============================================================================
// src/controllers/blueprints.controller.js — Blueprint Roadmap Endpoints
// =============================================================================

'use strict';

const blueprintService = require('../services/blueprint.service');

const MAX_OUTCOME_LENGTH = 500;

// Sends a 400 Bad Request with the standard VALIDATION_ERROR envelope
const sendValidationError = (res, field, message) =>
  res.status(400).json({
    success: false,
    data: null,
    error: {
      code: 'VALIDATION_ERROR',
      message,
      field,
    },
  });

/**
 * POST /api/blueprints
 *
 * Authenticated endpoint to generate and store a personalized multi-day blueprint.
 */
const createBlueprint = async (req, res, next) => {
  try {
    // ── Feature flag check ────────────────────────────────────────────────────
    if (process.env.AI_ENABLED !== 'true') {
      return res.status(503).json({
        success: false,
        data: null,
        error: {
          code: 'FEATURE_DISABLED',
          message: 'The AI blueprint feature is not currently available.',
        },
      });
    }

    // ── Authenticated user identity ──────────────────────────────────────────
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required.',
        },
      });
    }

    // Reject client attempts to override user_id
    if (req.body?.userId !== undefined && req.body?.userId !== null && Number(req.body.userId) !== Number(userId)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot create blueprint for a different user ID.',
        },
      });
    }

    const { outcome, durationDays } = req.body || {};

    // ── Input Validation: outcome ─────────────────────────────────────────────
    if (outcome === undefined || outcome === null || outcome === '') {
      return sendValidationError(res, 'outcome', 'outcome is required.');
    }
    if (typeof outcome !== 'string') {
      return sendValidationError(res, 'outcome', 'outcome must be a string.');
    }
    const trimmedOutcome = outcome.trim();
    if (trimmedOutcome.length === 0) {
      return sendValidationError(res, 'outcome', 'outcome must not be empty or whitespace only.');
    }
    if (trimmedOutcome.length > MAX_OUTCOME_LENGTH) {
      return sendValidationError(res, 'outcome', `outcome must not exceed ${MAX_OUTCOME_LENGTH} characters.`);
    }

    // ── Input Validation: durationDays ────────────────────────────────────────
    if (durationDays === undefined || durationDays === null || durationDays === '') {
      return sendValidationError(res, 'durationDays', 'durationDays is required.');
    }
    const parsedDuration = Number(durationDays);
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 90) {
      return sendValidationError(res, 'durationDays', 'durationDays must be an integer between 1 and 90.');
    }

    // ── Delegate to blueprint service ─────────────────────────────────────────
    const blueprintData = await blueprintService.createBlueprint(userId, trimmedOutcome, parsedDuration);

    return res.status(201).json({
      success: true,
      data: { blueprint: blueprintData },
      error: null,
    });

  } catch (err) {
    // ── 409 Conflict: User already has an active blueprint ───────────────────
    if (err.code === 'ACTIVE_BLUEPRINT_EXISTS') {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'ACTIVE_BLUEPRINT_EXISTS',
          message: err.message,
        },
      });
    }

    // ── 500 Internal Error: Gemini Key Not Configured ────────────────────────
    if (err.code === 'GEMINI_NOT_CONFIGURED') {
      console.error('[BLUEPRINT] Gemini API key is not configured.');
      return res.status(500).json({
        success: false,
        data: null,
        error: {
          code: 'AI_UNAVAILABLE',
          message: 'The AI blueprint generator is not configured. Please contact support.',
        },
      });
    }

    // ── 429 Too Many Requests: Gemini Rate Limited ───────────────────────────
    if (err.code === 'GEMINI_RATE_LIMITED') {
      return res.status(429).json({
        success: false,
        data: null,
        error: {
          code: 'AI_RATE_LIMITED',
          message: 'The AI blueprint generator is temporarily busy. Please try again in a moment.',
        },
      });
    }

    // ── 502 Bad Gateway: Gemini API / Generation / Validation Failure ────────
    if (
      err.code === 'GEMINI_REQUEST_FAILED' ||
      err.code === 'GEMINI_EMPTY_RESPONSE' ||
      err.code === 'GEMINI_MALFORMED_RESPONSE'
    ) {
      console.error('[BLUEPRINT] Gemini generation/validation failed:', err.message);
      return res.status(502).json({
        success: false,
        data: null,
        error: {
          code: 'AI_UNAVAILABLE',
          message: 'The AI blueprint generator is temporarily unavailable. Please try again.',
        },
      });
    }

    next(err);
  }
};

/**
 * GET /api/blueprints
 *
 * Authenticated endpoint to retrieve all blueprints and nested days for the current user.
 * Identity is derived strictly from req.user.id — query params (e.g. ?user_id=X) are ignored.
 */
const getBlueprints = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required.',
        },
      });
    }

    const blueprints = await blueprintService.getUserBlueprints(userId);

    return res.status(200).json({
      success: true,
      data: { blueprints },
      error: null,
    });

  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/blueprints/days/:dayId/reschedule
 *
 * Authenticated endpoint to manually reschedule a pending roadmap mission to another date.
 */
const rescheduleBlueprintDay = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required.',
        },
      });
    }

    const { dayId } = req.params;
    const parsedDayId = Number(dayId);
    if (!Number.isInteger(parsedDayId) || parsedDayId <= 0) {
      return sendValidationError(res, 'dayId', 'dayId must be a valid positive integer.');
    }

    const { newDate } = req.body || {};

    if (!newDate || typeof newDate !== 'string') {
      return sendValidationError(res, 'newDate', 'newDate is required and must be a string.');
    }

    const trimmedDate = newDate.trim();
    // Validate strict YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(trimmedDate)) {
      return sendValidationError(res, 'newDate', 'newDate must be in YYYY-MM-DD format.');
    }

    const [y, m, d] = trimmedDate.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(y, m - 1, d));
    if (
      isNaN(parsedDate.getTime()) ||
      parsedDate.getUTCFullYear() !== y ||
      parsedDate.getUTCMonth() !== m - 1 ||
      parsedDate.getUTCDate() !== d
    ) {
      return sendValidationError(res, 'newDate', 'newDate must be a valid calendar date.');
    }

    const updatedDay = await blueprintService.rescheduleBlueprintDay(userId, parsedDayId, trimmedDate);

    return res.status(200).json({
      success: true,
      data: { day: updatedDay },
      error: null,
    });

  } catch (err) {
    if (err.code === 'DAY_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'DAY_NOT_FOUND',
          message: err.message,
        },
      });
    }

    if (err.code === 'MISSION_NOT_PENDING') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'MISSION_NOT_PENDING',
          message: err.message,
        },
      });
    }

    if (err.code === 'DATE_OCCUPIED') {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'DATE_OCCUPIED',
          message: err.message,
        },
      });
    }

    next(err);
  }
};

module.exports = { createBlueprint, getBlueprints, rescheduleBlueprintDay };


