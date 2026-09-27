// =============================================================================
// src/controllers/ai.controller.js — AI Companion Chat Endpoint
// =============================================================================
//
// API Contract
// ─────────────
// POST /api/ai/chat
// Header: Authorization: Bearer <Firebase ID Token>
//
// Request body:
//   { "message": "string, 1–1000 characters" }
//
// 200 OK:
//   { "success": true, "data": { "reply": "..." }, "error": null }
//
// 400 — validation failure:
//   { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "field": "message" } }
//
// 401 — missing or invalid auth token (handled by authMiddleware before this runs)
//
// 503 — AI feature is disabled (AI_ENABLED !== "true"):
//   { "success": false, "error": { "code": "FEATURE_DISABLED", "message": "..." } }
//
// 500/502 — Gemini or database error (safe, no internals exposed):
//   { "success": false, "error": { "code": "AI_UNAVAILABLE", "message": "..." } }
//
// =============================================================================
//
// FLOW
// ─────
// 1. authMiddleware (in route) → verified req.user.id available
// 2. Feature flag check        → AI_ENABLED must be "true"
// 3. Input validation          → message: string, 1–1000 chars
// 4. buildDbContext(userId)    → PostgreSQL context (real data only)
// 5. mergeHealthContext(...)   → Phase 1: no-op; future: adds Health JSON fields
// 6. selectRelevantContext(...)→ allowlisted fields for this message
// 7. gemini.sendMessage(...)   → Gemini API call
// 8. Return safe response      → { success, data: { reply }, error: null }
//
// req.user.id is the ONLY source of userId used for database context.
// No client-supplied userId is accepted for personalization — ever.
// =============================================================================

'use strict';

const { buildDbContext, mergeHealthContext, selectRelevantContext } = require('../services/aiContext.service');
const geminiService = require('../services/gemini.service');

// Maximum message length accepted from the client.
// Keeps prompt size bounded and prevents abuse. Validated at application layer
// rather than relying solely on the body-parser 100kb limit.
const MAX_MESSAGE_LENGTH = 1000;

/**
 * POST /api/ai/chat
 *
 * Orchestrates the AI context pipeline and returns NOVA's response.
 * Authentication is enforced by authMiddleware before this function is called.
 *
 * @type {import('express').RequestHandler}
 */
const aiChat = async (req, res, next) => {
  try {
    // ── Feature flag ────────────────────────────────────────────────────────
    // Check at request time (not module load time) so the flag can be toggled
    // by changing the environment variable and restarting the process.
    // AI is DISABLED unless AI_ENABLED is explicitly set to the string "true".
    if (process.env.AI_ENABLED !== 'true') {
      return res.status(503).json({
        success: false,
        error: {
          code:    'FEATURE_DISABLED',
          message: 'The AI companion feature is not currently available.',
        },
      });
    }

    // ── Input validation ────────────────────────────────────────────────────
    const { message } = req.body;

    if (message === undefined || message === null || message === '') {
      return res.status(400).json({
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: 'message is required.',
          field:   'message',
        },
      });
    }

    if (typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: 'message must be a string.',
          field:   'message',
        },
      });
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: 'message must not be empty or whitespace only.',
          field:   'message',
        },
      });
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: `message must not exceed ${MAX_MESSAGE_LENGTH} characters.`,
          field:   'message',
        },
      });
    }

    // ── Authenticated user ──────────────────────────────────────────────────
    // req.user is populated by authMiddleware. We use req.user.id exclusively
    // for all database queries — never a client-supplied userId.
    const userId = req.user.id;

    // ── Context pipeline ────────────────────────────────────────────────────
    // Step 1: Query PostgreSQL for real user data.
    const dbContext = await buildDbContext(userId);

    // Step 2: Merge future Health JSON context (Phase 1: no-op, healthJson=null).
    // The controller passes null explicitly — no health data is fabricated.
    const fullContext = mergeHealthContext(dbContext, null);

    // Step 3: Select only fields relevant to the user's current message.
    const selectedContext = selectRelevantContext(fullContext, trimmed);

    // ── Gemini call ─────────────────────────────────────────────────────────
    const reply = await geminiService.sendMessage(trimmed, selectedContext);

    // ── Success response ────────────────────────────────────────────────────
    console.log('[AI] AI chat request handled, userId=%d, status=200', userId);
    return res.status(200).json({
      success: true,
      data:    { reply },
      error:   null,
    });

  } catch (err) {
    // ── Gemini-specific errors → safe 502/500 responses ─────────────────────
    // We catch known Gemini error codes and return a safe client-facing message.
    // Internal error details (API key, quota, raw SDK message) are never exposed.
    if (err.code === 'GEMINI_NOT_CONFIGURED') {
      console.error('[AI] Gemini API key is not configured.');
      return res.status(500).json({
        success: false,
        error: {
          code:    'AI_UNAVAILABLE',
          message: 'The AI companion is not configured. Please contact support.',
        },
      });
    }

    if (err.code === 'GEMINI_RATE_LIMITED') {
      return res.status(429).json({
        success: false,
        error: {
          code:    'AI_RATE_LIMITED',
          message: 'The AI companion is temporarily busy. Please try again in a moment.',
        },
      });
    }

    if (err.code === 'GEMINI_REQUEST_FAILED' || err.code === 'GEMINI_EMPTY_RESPONSE') {
      return res.status(502).json({
        success: false,
        error: {
          code:    'AI_UNAVAILABLE',
          message: 'The AI companion is temporarily unavailable. Please try again.',
        },
      });
    }

    // All other unexpected errors (database errors, etc.) go to the centralized
    // errorHandler in app.js, which logs the full error server-side and returns
    // a safe generic message to the client.
    next(err);
  }
};

module.exports = { aiChat };
