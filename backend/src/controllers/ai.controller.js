// =============================================================================
// src/controllers/ai.controller.js — NOVA AI Chat Controller
// =============================================================================
//
// Receives authenticated user's message, fetches their NOVA data from the DB,
// builds a Gemini prompt with that context, and returns the AI response.
//
// POST /api/ai/chat
// Request:  { message: string }
// Response: { reply: string }
// =============================================================================

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ─── System prompt that defines NOVA AI's persona ────────────────────────────
const SYSTEM_PROMPT = `You are NOVA AI, a personal focus and wellness companion built into the NOVA productivity platform.

Your personality:
- Calm, supportive, and concise
- Analytical but human and warm
- Non-judgmental — never shame the user for low scores
- Evidence-based — only reference data you have been given
- Avoid excessive emojis, clichés, or over-long responses

Your role:
- Help users understand their focus sessions, sleep, energy, and productivity patterns
- Provide concise, personalized insights based on their actual NOVA data
- Offer gentle, practical suggestions when asked
- Be honest when you don't have enough data to draw a conclusion

Data format you will receive:
- Focus sessions: count, total minutes, completion rate, average interruptions
- Wellness logs: sleep hours and energy level for recent days
- A pre-computed focus score (0–100) and an insight string

Rules:
- NEVER make up data or statistics you haven't been given
- If data is insufficient, say so honestly and encourage the user to keep logging
- Keep responses under 200 words unless the user asks for detail
- Speak in plain English — not bullet-heavy, not robotic`;

// ─── Fetch the authenticated user's NOVA context from the database ────────────
async function getUserContext(userId) {
  const [focusResult, wellnessResult] = await Promise.all([
    db.query(
      `SELECT COUNT(*)                                          AS total_sessions,
              COUNT(*) FILTER (WHERE completed = TRUE)         AS completed_sessions,
              COALESCE(SUM(duration_minutes), 0)               AS total_focus_minutes,
              ROUND(AVG(duration_minutes)::numeric, 1)         AS avg_session_minutes,
              ROUND(AVG(interruptions)::numeric, 1)            AS avg_interruptions
       FROM   focus_sessions
       WHERE  user_id = $1`,
      [userId]
    ),
    db.query(
      `SELECT log_date,
              sleep_hours,
              energy_level
       FROM   wellness_logs
       WHERE  user_id = $1
       ORDER  BY log_date DESC
       LIMIT  14`,
      [userId]
    ),
  ]);

  const fRow = focusResult.rows[0] || {};
  const totalSessions      = Number(fRow.total_sessions) || 0;
  const completedSessions  = Number(fRow.completed_sessions) || 0;
  const totalFocusMinutes  = Number(fRow.total_focus_minutes) || 0;
  const avgSessionMinutes  = fRow.avg_session_minutes !== null ? Number(fRow.avg_session_minutes) : null;
  const avgInterruptions   = fRow.avg_interruptions !== null ? Number(fRow.avg_interruptions) : null;

  // Compute a 0-100 focus score matching dashboard logic
  let focusScore = null;
  if (totalSessions > 0) {
    const completionRate      = completedSessions / totalSessions;
    const interruptionPenalty = 1 / (1 + (avgInterruptions || 0));
    focusScore = Math.min(100, Math.max(0, Math.round((completionRate * 0.6 + interruptionPenalty * 0.4) * 100)));
  }

  const wellnessLogs = wellnessResult.rows.map((r) => ({
    date:        String(r.log_date),
    sleepHours:  r.sleep_hours  !== null ? Number(r.sleep_hours)  : null,
    energyLevel: r.energy_level !== null ? Number(r.energy_level) : null,
  }));

  const todayLog = wellnessLogs[0] || null;

  return {
    focusScore,
    totalSessions,
    completedSessions,
    totalFocusMinutes,
    avgSessionMinutes,
    avgInterruptions,
    todaySleep:  todayLog?.sleepHours  ?? null,
    todayEnergy: todayLog?.energyLevel ?? null,
    wellnessLogs,
  };
}

// ─── Build a human-readable context string for the AI prompt ─────────────────
function buildContextString(ctx) {
  const lines = [];

  if (ctx.totalSessions === 0) {
    lines.push('The user has not logged any focus sessions yet.');
  } else {
    lines.push(`Focus sessions (all-time): ${ctx.totalSessions} total, ${ctx.completedSessions} completed.`);
    lines.push(`Total focus time: ${ctx.totalFocusMinutes} minutes.`);
    if (ctx.avgSessionMinutes !== null) lines.push(`Average session length: ${ctx.avgSessionMinutes} minutes.`);
    if (ctx.avgInterruptions  !== null) lines.push(`Average interruptions per session: ${ctx.avgInterruptions}.`);
    if (ctx.focusScore        !== null) lines.push(`Overall focus score: ${ctx.focusScore}/100.`);
  }

  if (ctx.wellnessLogs.length === 0) {
    lines.push('The user has not logged any wellness check-ins yet.');
  } else {
    lines.push('\nRecent wellness logs (most recent first):');
    ctx.wellnessLogs.forEach((log) => {
      const sleep  = log.sleepHours  !== null ? `${log.sleepHours}h sleep`   : 'sleep not logged';
      const energy = log.energyLevel !== null ? `energy ${log.energyLevel}/10` : 'energy not logged';
      lines.push(`  ${log.date}: ${sleep}, ${energy}.`);
    });
  }

  return lines.join('\n');
}

// ─── Main handler ──────────────────────────────────────────────────────────────
const chat = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'message is required and must be a non-empty string.' },
      });
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'message must be 1000 characters or fewer.' },
      });
    }

    if (!GEMINI_API_KEY) {
      console.error('[NOVA AI] GEMINI_API_KEY is not set in environment.');
      return res.status(503).json({
        success: false,
        data: null,
        error: { code: 'AI_UNAVAILABLE', message: 'NOVA AI is not configured. Please contact the administrator.' },
      });
    }

    // Fetch the authenticated user's data
    const userId = req.user.id;
    const context = await getUserContext(userId);
    const contextString = buildContextString(context);

    // Build the full prompt
    const fullPrompt = `${SYSTEM_PROMPT}

---
USER DATA CONTEXT:
${contextString}
---

User's message: "${message.trim()}"

Respond as NOVA AI. Be concise, warm, and grounded in the data above.`;

    // Call Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(fullPrompt);
    const reply  = result.response.text().trim();

    return res.status(200).json({
      success: true,
      data: { reply },
      error: null,
    });

  } catch (err) {
    console.error('[NOVA AI] Error:', err?.message || err);
    next(err);
  }
};

module.exports = { chat };
