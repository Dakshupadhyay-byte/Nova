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

'use strict';

const { buildDbContext, mergeHealthContext, selectRelevantContext } = require('../services/aiContext.service');
const geminiService = require('../services/gemini.service');

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
    const userId = req.user.id;

    // ── Context pipeline ────────────────────────────────────────────────────
    const dbContext = await buildDbContext(userId);
    const fullContext = mergeHealthContext(dbContext, null);
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

    next(err);
  }
};

module.exports = { aiChat, chat: aiChat };
