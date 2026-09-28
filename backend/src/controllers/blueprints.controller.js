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

module.exports = { createBlueprint };
