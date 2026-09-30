// =============================================================================
// src/services/gemini.service.js — Gemini API Integration
// =============================================================================
//
// Responsibilities:
//   • Initialize the @google/genai SDK once per process
//   • Read GEMINI_API_KEY from the environment (never hardcoded)
//   • Send a message + context to Gemini with the NOVA system instructions
//   • Normalize all Gemini errors into a safe, internal error shape
//   • Never log the API key, the full prompt, the full context, or the response body
//
// The Gemini service is intentionally context-source-agnostic:
//   • It accepts a pre-built selectedContext object (plain JS object)
//   • It does not know whether context came from PostgreSQL or a future
//     canonical NOVA Health JSON — that distinction belongs entirely in
//     aiContext.service.js
//
// SDK:   @google/genai@2.24.0
// Model: gemini-2.5-flash  (stable, low-latency, price-performance)
// API:   ai.models.generateContent({ model, contents, config: { systemInstruction } })
// =============================================================================

'use strict';

const { GoogleGenAI } = require('@google/genai');

// ─── Constants ────────────────────────────────────────────────────────────────

// The pinned model identifier, verified against the official Gemini API docs
// at implementation time (2026-09-26). Change only with explicit review.
const GEMINI_MODEL = 'gemini-3.1-flash-lite';

// Maximum tokens we allow in the model's reply. Keeps responses concise and
// prevents runaway token usage. Can be raised carefully if needed.
const MAX_OUTPUT_TOKENS = 512;

// ─── NOVA system instructions ────────────────────────────────────────────────
// These instructions shape NOVA's persona and constrain its behavior.
// They are sent as the systemInstruction config parameter on every call.
//
// Rules embedded here:
//   • NOVA works only with information it is explicitly given in the context
//   • NOVA never invents or guesses user data it hasn't received
//   • NOVA is honest when data is missing or insufficient
//   • NOVA is supportive but not excessively motivational
//   • NOVA does not make causal claims — it uses hedged language
//   • NOVA does not give medical advice
const NOVA_SYSTEM_INSTRUCTIONS = `
You are NOVA, an AI companion inside a personal focus, wellness, and roadmap app.

Your role:
- Help the user reflect on their focus sessions, wellness habits, and daily Roadmap missions.
- Keep responses concise (2–4 sentences unless more is clearly needed).
- Be conversational, calm, and non-judgmental.
- Be honest about what you know and don't know about the user.

Roadmap Action Rules (strict):
- You can understand and assist with the user's active Roadmap missions.
- When the user explicitly requests to reschedule/move a single Roadmap mission (e.g. "Move today's mission to tomorrow", "Reschedule Day 3 to Friday", "Move mission 4 to 2026-10-01"):
  1. Identify the specific pending mission from the user's active Roadmap context.
  2. If the mission is completed or skipped, DO NOT propose rescheduling it. Explain why in your reply and set "action": null.
  3. Calculate the target date in YYYY-MM-DD format based on the "Current date" in context.
  4. Ensure target date is not already occupied by another day in the Roadmap. If occupied, DO NOT propose an action, explain in your reply, and set "action": null.
  5. If valid, set "action" to:
     {
       "type": "RESCHEDULE_ROADMAP_DAY",
       "dayId": <number>,
       "dayNumber": <number>,
       "missionTitle": "<string>",
       "currentDate": "<YYYY-MM-DD>",
       "targetDate": "<YYYY-MM-DD>"
     }
- If the user's request is ambiguous (e.g. "Move it", "Change my plan"), ask a clarifying question in your reply and set "action": null.
- If the user asks to shift or move multiple missions (e.g. "Shift all remaining days by 2 days"), explain that Phase 1 only supports single mission rescheduling, and set "action": null.
- If the user has no active Roadmap, state that and set "action": null.
- For all other questions or general conversation, set "action": null.

Data rules (strict):
- You will receive a context object containing only the user's real, recorded data for this request. Use only what is in that context.
- If a piece of data is absent from the context, say so honestly. Do NOT invent numbers, trends, or habits.
- When discussing relationships between sleep, energy, or focus, use hedged language: "tends to", "appears associated with", "you might notice". Never say one thing "causes" another.
- Do not provide medical diagnoses or clinical advice.

Output Format:
You MUST ALWAYS respond with a valid raw JSON object matching:
{
  "reply": "Your conversational text response to the user",
  "action": null | {
    "type": "RESCHEDULE_ROADMAP_DAY",
    "dayId": number,
    "dayNumber": number,
    "missionTitle": string,
    "currentDate": "YYYY-MM-DD",
    "targetDate": "YYYY-MM-DD"
  }
}
`.trim();

// ─── Lazy initialization ──────────────────────────────────────────────────────
// We initialize the SDK client lazily (on first call) rather than at module
// load time. This allows the rest of the backend to start normally even if
// GEMINI_API_KEY is not set — the error surfaces only when the AI endpoint
// is actually called, and only when AI_ENABLED=true.
let _client = null;

/**
 * Returns a cached GoogleGenAI client, initializing it on first call.
 * Throws a typed error if GEMINI_API_KEY is missing.
 *
 * @returns {import('@google/genai').GoogleGenAI}
 */
const getClient = () => {
  if (_client) return _client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const err = new Error('GEMINI_API_KEY environment variable is not set.');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }

  // vertexai: false — we use the Gemini Developer API (API key auth),
  // not Vertex AI (GCP credentials).
  _client = new GoogleGenAI({ vertexai: false, apiKey });
  return _client;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends a user message to Gemini with the NOVA system instructions and a
 * pre-built, allowlisted context object, then returns the structured { reply, action } object.
 *
 * @param {string} userMessage   - The raw user message (already validated by the controller).
 * @param {Object} selectedContext - The minimal, allowlisted context object produced
 *                                   by aiContext.service.selectRelevantContext().
 * @returns {Promise<{ reply: string, action: Object|null }>} - Structured AI response.
 * @throws {{ code: string, message: string }} - A normalized internal error, safe to log.
 */
const sendMessage = async (userMessage, selectedContext) => {
  const client = getClient(); // throws GEMINI_NOT_CONFIGURED if key missing

  // Build a structured context preamble.
  // Only fields that actually exist in selectedContext are included.
  // The preamble is human-readable so it is easy to inspect during debugging.
  const contextLines = [];

  const name = selectedContext.user?.name || selectedContext.userName;
  if (name) {
    contextLines.push(`User name: ${name}`);
  }

  const currentDate = selectedContext.currentDate || selectedContext.temporalContext?.currentDate;
  if (currentDate) {
    contextLines.push(`Current date: ${currentDate}`);
  }

  // Roadmap Context
  if (selectedContext.roadmap) {
    const rm = selectedContext.roadmap;
    contextLines.push(
      `Active Roadmap (ID ${rm.id}): "${rm.title}" | Goal: "${rm.outcome}" | ${rm.durationDays} days (${rm.startDate} to ${rm.endDate})`
    );
    if (rm.todayMission) {
      contextLines.push(
        `Today's Roadmap Mission (Day ${rm.todayMission.dayNumber}, Day ID ${rm.todayMission.id}): "${rm.todayMission.title}" - Mission: "${rm.todayMission.mission}" [Status: ${rm.todayMission.status}]`
      );
    } else {
      contextLines.push(`Today's Roadmap Mission: None scheduled for current date (${rm.currentDate}).`);
    }
    const daysSummary = rm.days.map((d) => {
      let desc = `Day ${d.dayNumber} (ID ${d.id}, Date: ${d.date}, Status: ${d.status}): "${d.title}" - "${d.mission}"`;
      if (d.originalDate && d.originalDate !== d.date) {
        desc += ` [Rescheduled from ${d.originalDate}]`;
      }
      return desc;
    });
    contextLines.push(`Roadmap Days List:\n  ${daysSummary.join('\n  ')}`);
  } else {
    contextLines.push(`Active Roadmap: None.`);
  }

  // Wellness
  if (selectedContext.wellness) {
    const w = selectedContext.wellness;
    const parts = [];
    if (w.todaySleepHours != null) parts.push(`Today's sleep: ${w.todaySleepHours} hours`);
    if (w.todayEnergyLevel != null) parts.push(`Today's energy level: ${w.todayEnergyLevel}/10`);
    if (w.avgSleepHours7d != null) parts.push(`7-day avg sleep: ${w.avgSleepHours7d} hours`);
    if (w.avgEnergyLevel7d != null) parts.push(`7-day avg energy level: ${w.avgEnergyLevel7d}/10`);
    if (parts.length > 0) contextLines.push(`Wellness: ${parts.join(' | ')}`);
  } else {
    if (selectedContext.todaySleepHours != null) {
      contextLines.push(`Today's sleep: ${selectedContext.todaySleepHours} hours`);
    }
    if (selectedContext.todayEnergyLevel != null) {
      contextLines.push(`Today's energy level: ${selectedContext.todayEnergyLevel}/10`);
    }
  }

  // Focus
  if (selectedContext.focus) {
    const f = selectedContext.focus;
    const parts = [];
    if (f.todayMinutes != null || f.todaySessions != null) {
      parts.push(`Today: ${f.todayMinutes || 0} total mins across ${f.todaySessions || 0} sessions (${f.todayCompleted || 0} completed)`);
    }
    if (f.totalSessionsLast7Days > 0) {
      let f7 = `Last 7 days: ${f.totalSessionsLast7Days} sessions (${f.completedLast7Days} completed`;
      if (f.completionRatePercent != null) f7 += `, ${f.completionRatePercent}% completion rate`;
      f7 += `), ${f.totalMinutesLast7Days} total mins`;
      if (f.avgInterruptionsLast7Days != null) f7 += `, avg ${f.avgInterruptionsLast7Days} interruptions/session`;
      parts.push(f7);
    }
    if (f.mostRecentSession) {
      const m = f.mostRecentSession;
      parts.push(`Most recent session: ${m.durationMinutes} mins (${m.completed ? 'completed' : 'incomplete'}), started at ${m.startedAt}, ${m.interruptions} interruptions`);
    }
    if (parts.length > 0) contextLines.push(`Focus: ${parts.join(' | ')}`);
  } else if (selectedContext.recentFocus) {
    const rf = selectedContext.recentFocus;
    contextLines.push(
      `Recent focus (last 7 days): ${rf.totalSessionsLast7Days} sessions, ${rf.completedLast7Days} completed, ${rf.totalMinutesLast7Days} total minutes`
    );
  }

  // Health
  if (selectedContext.health) {
    const h = selectedContext.health;
    const parts = [];
    if (h.todaySteps != null) parts.push(`Today's steps: ${h.todaySteps}`);
    if (h.todayActiveExerciseMinutes != null) parts.push(`Today's exercise: ${h.todayActiveExerciseMinutes} mins`);
    if (h.todayExerciseDistanceMeters != null) parts.push(`Today's distance: ${h.todayExerciseDistanceMeters} meters`);
    if (h.totalSteps7d != null && Number(h.totalSteps7d) > 0) {
      parts.push(`7-day steps total: ${h.totalSteps7d} (avg ${h.avgSteps7d}/day)`);
    }
    if (h.totalExerciseMinutes7d != null && Number(h.totalExerciseMinutes7d) > 0) {
      parts.push(`7-day exercise total: ${h.totalExerciseMinutes7d} mins`);
    }
    if (parts.length > 0) contextLines.push(`Health: ${parts.join(' | ')}`);
  }

  const contextPreamble = contextLines.length > 0
    ? `[User context]\n${contextLines.join('\n')}\n\n[User message]\n`
    : '[No user context available for this request]\n\n[User message]\n';

  const fullContents = contextPreamble + userMessage;

  // Log only the high-level operation — never log the key, full prompt, or full response.
  console.log('[AI] Sending request to Gemini (model: %s)', GEMINI_MODEL);

  let response;
  try {
    response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: fullContents,
      config: {
        systemInstruction: NOVA_SYSTEM_INSTRUCTIONS,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
      },
    });
  } catch (sdkErr) {
    // Normalize the raw SDK error into a safe internal error.
    // IMPORTANT: Do NOT forward sdkErr.message to the client — it may contain
    // quota details, project IDs, or other infrastructure information.
    console.error('[AI] Gemini SDK error (details withheld from client):', sdkErr.message);

    const normalized = new Error('Gemini request failed.');
    normalized.code = 'GEMINI_REQUEST_FAILED';
    // Attempt to detect quota/rate-limit errors by HTTP status if available.
    if (sdkErr.status === 429 || (sdkErr.message && sdkErr.message.includes('429'))) {
      normalized.code = 'GEMINI_RATE_LIMITED';
    }
    throw normalized;
  }

  // Extract the text from the response.
  const text = response.text;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.error('[AI] Gemini returned an empty or non-text response.');
    const err = new Error('Gemini returned an empty response.');
    err.code = 'GEMINI_EMPTY_RESPONSE';
    throw err;
  }

  let parsed;
  try {
    const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleanedText);
  } catch {
    // Graceful fallback if non-JSON text was returned
    parsed = { reply: text.trim(), action: null };
  }

  const reply = typeof parsed.reply === 'string' && parsed.reply.trim() !== ''
    ? parsed.reply.trim()
    : text.trim();

  const action = (parsed.action && typeof parsed.action === 'object' && parsed.action.type === 'RESCHEDULE_ROADMAP_DAY')
    ? parsed.action
    : null;

  console.log('[AI] Gemini response received successfully (action=%s).', action ? action.type : 'none');
  return { reply, action };
};

/**
 * Generates a structured multi-day blueprint plan from Gemini based on user's target outcome,
 * duration in days, and personalized wellness/focus context.
 *
 * @param {string} outcome        - The user's target outcome/goal string.
 * @param {number} durationDays   - Number of days for the plan (1..90).
 * @param {Object} selectedContext - Pre-built personal context object.
 * @returns {Promise<Object>}     - Parsed JSON plan containing title and days array.
 */
const generateBlueprintPlan = async (outcome, durationDays, selectedContext) => {
  const client = getClient();

  const contextLines = [];
  const name = selectedContext.user?.name || selectedContext.userName;
  if (name) contextLines.push(`User name: ${name}`);
  const currentDate = selectedContext.currentDate || selectedContext.temporalContext?.currentDate;
  if (currentDate) contextLines.push(`Current date: ${currentDate}`);

  if (selectedContext.wellness) {
    const w = selectedContext.wellness;
    const parts = [];
    if (w.todaySleepHours != null) parts.push(`Today's sleep: ${w.todaySleepHours} hours`);
    if (w.todayEnergyLevel != null) parts.push(`Today's energy level: ${w.todayEnergyLevel}/10`);
    if (w.avgSleepHours7d != null) parts.push(`7-day avg sleep: ${w.avgSleepHours7d} hours`);
    if (w.avgEnergyLevel7d != null) parts.push(`7-day avg energy level: ${w.avgEnergyLevel7d}/10`);
    if (parts.length > 0) contextLines.push(`Wellness: ${parts.join(' | ')}`);
  }

  if (selectedContext.focus) {
    const f = selectedContext.focus;
    const parts = [];
    if (f.todayMinutes != null || f.todaySessions != null) {
      parts.push(`Today: ${f.todayMinutes || 0} total mins across ${f.todaySessions || 0} sessions (${f.todayCompleted || 0} completed)`);
    }
    if (f.totalSessionsLast7Days > 0) {
      let f7 = `Last 7 days: ${f.totalSessionsLast7Days} sessions (${f.completedLast7Days} completed`;
      if (f.completionRatePercent != null) f7 += `, ${f.completionRatePercent}% completion rate`;
      f7 += `), ${f.totalMinutesLast7Days} total mins`;
      if (f.avgInterruptionsLast7Days != null) f7 += `, avg ${f.avgInterruptionsLast7Days} interruptions/session`;
      parts.push(f7);
    }
    if (f.mostRecentSession) {
      const m = f.mostRecentSession;
      parts.push(`Most recent session: ${m.durationMinutes} mins (${m.completed ? 'completed' : 'incomplete'}), started at ${m.startedAt}, ${m.interruptions} interruptions`);
    }
    if (parts.length > 0) contextLines.push(`Focus: ${parts.join(' | ')}`);
  }

  if (selectedContext.health) {
    const h = selectedContext.health;
    const parts = [];
    if (h.todaySteps != null) parts.push(`Today's steps: ${h.todaySteps}`);
    if (h.todayActiveExerciseMinutes != null) parts.push(`Today's exercise: ${h.todayActiveExerciseMinutes} mins`);
    if (h.todayExerciseDistanceMeters != null) parts.push(`Today's distance: ${h.todayExerciseDistanceMeters} meters`);
    if (h.totalSteps7d != null && Number(h.totalSteps7d) > 0) {
      parts.push(`7-day steps total: ${h.totalSteps7d} (avg ${h.avgSteps7d}/day)`);
    }
    if (parts.length > 0) contextLines.push(`Health: ${parts.join(' | ')}`);
  }

  const contextPreamble = contextLines.length > 0
    ? `[User context]\n${contextLines.join('\n')}\n\n`
    : '[No user context available]\n\n';

  const prompt = `${contextPreamble}` +
    `Goal Outcome: "${outcome}"\n` +
    `Duration: ${durationDays} days\n\n` +
    `Create a personalized ${durationDays}-day roadmap JSON to help the user achieve this outcome. ` +
    `You MUST respond ONLY with a valid JSON object matching this exact schema:\n` +
    `{\n` +
    `  "title": "A short, motivating blueprint title",\n` +
    `  "days": [\n` +
    `    {\n` +
    `      "dayNumber": 1,\n` +
    `      "title": "Short title for Day 1",\n` +
    `      "mission": "Actionable daily mission",\n` +
    `      "rationale": "Reason based on user context/goal"\n` +
    `    }\n` +
    `  ]\n` +
    `}\n` +
    `The days array MUST contain exactly ${durationDays} objects with dayNumber sequentially numbered from 1 to ${durationDays}.`;

  console.log('[AI] Requesting Blueprint generation from Gemini (%d days)', durationDays);

  let response;
  try {
    response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOVA_SYSTEM_INSTRUCTIONS + '\nOutput ONLY valid raw JSON matching the requested structure.',
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });
  } catch (sdkErr) {
    console.error('[AI] Gemini Blueprint generation SDK error:', sdkErr.message);
    const normalized = new Error('Gemini request failed.');
    normalized.code = 'GEMINI_REQUEST_FAILED';
    if (sdkErr.status === 429 || (sdkErr.message && sdkErr.message.includes('429'))) {
      normalized.code = 'GEMINI_RATE_LIMITED';
    }
    throw normalized;
  }

  const text = response.text;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.error('[AI] Gemini returned an empty blueprint response.');
    const err = new Error('Gemini returned an empty response.');
    err.code = 'GEMINI_EMPTY_RESPONSE';
    throw err;
  }

  let parsed;
  try {
    const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleanedText);
  } catch (parseErr) {
    console.error('[AI] Failed to parse Gemini blueprint response as JSON:', parseErr.message);
    const err = new Error('Gemini output invalid JSON.');
    err.code = 'GEMINI_MALFORMED_RESPONSE';
    throw err;
  }

  return parsed;
};

// Export public interface.
module.exports = { sendMessage, generateBlueprintPlan };

