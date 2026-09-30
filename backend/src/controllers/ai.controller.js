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
    const dbContext = await buildDbContext(userId, trimmed);
    const fullContext = mergeHealthContext(dbContext, null);
    const selectedContext = selectRelevantContext(fullContext, trimmed);

    // ── Gemini call ─────────────────────────────────────────────────────────
    const geminiResult = await geminiService.sendMessage(trimmed, selectedContext);
    let reply = typeof geminiResult === 'object' && geminiResult !== null
      ? geminiResult.reply
      : (typeof geminiResult === 'string' ? geminiResult : '');
    const rawAction = typeof geminiResult === 'object' && geminiResult !== null
      ? geminiResult.action
      : null;

    // ── Validate action if proposed ──────────────────────────────────────────
    let validatedAction = null;
    if (
      rawAction &&
      rawAction.type === 'RESCHEDULE_ROADMAP_DAY' &&
      typeof rawAction.dayId === 'number' &&
      typeof rawAction.targetDate === 'string'
    ) {
      const activeRoadmap = dbContext.roadmap;
      if (activeRoadmap && Array.isArray(activeRoadmap.days)) {
        const targetDay = activeRoadmap.days.find((d) => d.id === rawAction.dayId);
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (targetDay && targetDay.status === 'pending' && dateRegex.test(rawAction.targetDate)) {
          // Ensure targetDate is not already occupied by another day in the same roadmap
          const occupyingDay = activeRoadmap.days.find(
            (d) => d.id !== rawAction.dayId && d.date === rawAction.targetDate
          );
          if (!occupyingDay) {
            validatedAction = {
              type: 'RESCHEDULE_ROADMAP_DAY',
              dayId: Number(targetDay.id),
              dayNumber: Number(targetDay.dayNumber),
              missionTitle: targetDay.title,
              currentDate: targetDay.date,
              targetDate: rawAction.targetDate,
            };
          } else {
            // Target date is occupied: override reply so user is never asked to confirm an invalid/null action
            const nextFree = activeRoadmap.earliestAvailableDates?.[0] || 'a date after the roadmap';
            reply = `I cannot move Day ${targetDay.dayNumber} ('${targetDay.title}') to ${rawAction.targetDate} because that date is already occupied by Day ${occupyingDay.dayNumber} ('${occupyingDay.title}'). The earliest available date is ${nextFree}.`;
          }
        } else if (targetDay && targetDay.status !== 'pending') {
          reply = `Day ${targetDay.dayNumber} ('${targetDay.title}') has already been ${targetDay.status} and cannot be rescheduled.`;
        }
      }
    } else if (
      rawAction &&
      rawAction.type === 'SHIFT_ROADMAP' &&
      typeof rawAction.dayCount === 'number' &&
      Number.isInteger(rawAction.dayCount) &&
      rawAction.dayCount >= 1 &&
      rawAction.dayCount <= 30 &&
      (rawAction.direction === undefined || rawAction.direction === 'forward')
    ) {
      const activeRoadmap = dbContext.roadmap;
      if (activeRoadmap && Array.isArray(activeRoadmap.days)) {
        const pendingDays = activeRoadmap.days.filter((d) => d.status === 'pending');
        const fixedDays = activeRoadmap.days.filter((d) => d.status !== 'pending');

        if (pendingDays.length > 0) {
          const fixedDatesSet = new Set(fixedDays.map((d) => d.date));
          let hasConflict = false;
          let conflictingDetail = null;

          const previewDays = [];
          for (const pDay of pendingDays) {
            const [y, m, d] = pDay.date.split('-').map(Number);
            const targetDateObj = new Date(Date.UTC(y, m - 1, d + rawAction.dayCount));
            const targetDate = targetDateObj.toISOString().split('T')[0];

            if (fixedDatesSet.has(targetDate)) {
              hasConflict = true;
              conflictingDetail = { pDay, targetDate };
              break;
            }
            previewDays.push({
              dayId: Number(pDay.id),
              dayNumber: Number(pDay.dayNumber),
              title: pDay.title,
              currentDate: pDay.date,
              targetDate,
            });
          }

          if (!hasConflict) {
            validatedAction = {
              type: 'SHIFT_ROADMAP',
              blueprintId: Number(activeRoadmap.id),
              blueprintTitle: activeRoadmap.title,
              dayCount: Number(rawAction.dayCount),
              direction: 'forward',
              affectedDaysCount: pendingDays.length,
              previewDays,
            };
          } else {
            reply = `Cannot shift roadmap by ${rawAction.dayCount} days because Day ${conflictingDetail.pDay.dayNumber} would move to ${conflictingDetail.targetDate}, which conflicts with an already completed/skipped day.`;
          }
        } else {
          reply = "You don't have any pending missions in your active Roadmap to shift.";
        }
      } else {
        reply = "You don't currently have an active Roadmap to shift.";
      }
    }

    // Safeguard (Invariant): If action is null, ensure reply never contains confirmation prompts
    if (!validatedAction && typeof reply === 'string') {
      if (/\b(?:please\s+confirm|confirm\s+the\s+reschedule|confirm\s+the\s+shift|confirm\s+shift|confirm\s+below|confirm\s+if\s+you\s+would\s+like|confirm\s+to\s+proceed|review\s+and\s+confirm|review\s+the\s+proposed\s+changes)\b/i.test(reply)) {
        reply = reply.replace(/\s*(?:please\s+confirm|please\s+review)[\s\S]*/i, '').trim();
        if (!reply) {
          reply = "I cannot perform that roadmap modification. Please check your schedule and try again.";
        }
      }
    }

    // ── Success response ────────────────────────────────────────────────────
    console.log('[AI] AI chat request handled, userId=%d, status=200, action=%s', userId, validatedAction ? validatedAction.type : 'none');
    return res.status(200).json({
      success: true,
      data: {
        reply,
        action: validatedAction,
      },
      error: null,
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
