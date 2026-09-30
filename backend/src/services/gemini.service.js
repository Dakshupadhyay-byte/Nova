// =============================================================================
// src/services/gemini.service.js — Gemini API & Ollama Fallback Integration
// =============================================================================
//
// Responsibilities:
//   • Initialize the @google/genai SDK once per process
//   • Read GEMINI_API_KEY from the environment (never hardcoded)
//   • Send a message + context to Gemini with the NOVA system instructions
//   • Automatic 3-tier fallback chain:
//       Tier 1: Gemini 3.1 Flash-Lite (Primary)
//       Tier 2: Gemini 2.5 Flash (Fallback 1)
//       Tier 3: Ollama / Llama 3.2 (Fallback 2)
//   • Normalize all AI errors into a safe, internal error shape
//   • Never log the API key, the full prompt, the full context, or the response body
//
// SDK:            @google/genai@2.24.0
// Primary Model:  gemini-3.1-flash-lite (default or GEMINI_PRIMARY_MODEL)
// Fallback 1:     gemini-2.5-flash      (default or GEMINI_FALLBACK_MODEL)
// Fallback 2:     llama3.2:latest       (default or OLLAMA_MODEL via OLLAMA_BASE_URL)
// =============================================================================

'use strict';

const { GoogleGenAI } = require('@google/genai');

// ─── Constants & Configuration ────────────────────────────────────────────────

const GEMINI_PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://10.77.76.101:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 8000;

// Maximum tokens we allow in the model's reply.
const MAX_OUTPUT_TOKENS = 512;

// ─── NOVA system instructions ────────────────────────────────────────────────
const NOVA_SYSTEM_INSTRUCTIONS = `
You are NOVA, an AI companion inside a personal focus, wellness, and roadmap app.

Your role:
- Help the user reflect on their focus sessions, wellness habits, and daily Roadmap missions.
- Keep responses concise (2–4 sentences unless more is clearly needed).
- Be conversational, calm, and non-judgmental.
- Be honest about what you know and don't know about the user.

Roadmap Action Rules (strict):
- You can understand and assist with the user's active Roadmap missions.
- Two Structured Action Types:
  1. RESCHEDULE_ROADMAP_DAY (Single Mission Rescheduling):
     - When the user explicitly requests to reschedule/move a single Roadmap mission (e.g. "Move today's mission to tomorrow", "Reschedule Day 3 to Friday", "Move mission 4 to 2026-10-01"):
       * Identify the specific pending mission from the user's active Roadmap context.
       * If the mission is completed or skipped, DO NOT propose rescheduling it. Explain why in your reply and set "action": null.
       * When the user asks to move to a SPECIFIC date (e.g. "tomorrow", "Friday", "2026-10-02"):
         - Check if that specific date is in "Occupied dates in Roadmap".
         - If it IS occupied:
           * DO NOT propose an action (MUST set "action": null).
           * NEVER say "Please confirm" or ask for confirmation.
           * In your reply, clearly explain that the date is already occupied by Day X ("Title"), and suggest the earliest unoccupied date(s) from "Earliest available (unoccupied) dates".
         - If it is NOT occupied:
           * Propose the action:
             {
               "type": "RESCHEDULE_ROADMAP_DAY",
               "dayId": <number>,
               "dayNumber": <number>,
               "missionTitle": "<string>",
               "currentDate": "<YYYY-MM-DD>",
               "targetDate": "<YYYY-MM-DD>"
             }
           * In your reply, propose the change and ask the user to confirm below.
       * When the user asks to move to the "next available day", "next free day", "whenever you want", or "next available day after tomorrow":
         - Find the earliest unoccupied date on or after the requested timeframe from "Earliest available (unoccupied) dates" or context.
         - Propose the action with that unoccupied targetDate.
         - In your reply, propose the change and ask the user to confirm below.

  2. SHIFT_ROADMAP (Whole / Remaining Roadmap Shift):
     - When the user explicitly requests to push, shift, delay, or move the entire REMAINING active Roadmap forward by a number of days (e.g. "Push my whole Roadmap by 2 days", "Move my remaining Roadmap forward by 3 days", "Shift the rest of my schedule by 1 day", "Start my remaining Roadmap from tomorrow"):
       * Calculate dayCount as a positive integer (number of calendar days forward, between 1 and 30).
       * If user says "start my remaining roadmap from tomorrow" or "start my roadmap from Friday", determine how many days forward from the current earliest pending mission that represents (e.g. if today is 2026-09-30 and the earliest pending mission is scheduled today, starting tomorrow means dayCount = 1).
       * If user has no active roadmap or no pending missions, state that and set "action": null.
       * Propose the action:
         {
           "type": "SHIFT_ROADMAP",
           "dayCount": <number>,
           "direction": "forward"
         }
       * In your reply, propose the shift (e.g. "I can shift your remaining Roadmap forward by 2 days. This will move your pending missions. Please review the proposed changes below and confirm.") and explicitly ask the user to confirm via the confirmation button below.
       * NEVER claim or imply that the change has already occurred.
       * Do not output individual date arrays; the backend calculates the resulting dates.
     - If the user's request is vague (e.g. "change my whole schedule"), ask a clarifying question in your reply and set "action": null.
     - Do not use SHIFT_ROADMAP for single-mission moves, mission swapping, or mission deletion.

- Conversational reply wording rule (CRITICAL):
  * ONLY ask for confirmation (e.g., "Please confirm the reschedule below." or "Please review the proposed changes below and confirm.") when "action" is NOT null.
  * When "action" is null, NEVER ask for confirmation and NEVER say "Please confirm".
  * NEVER claim or imply that the change has already occurred (e.g., do NOT say "I've rescheduled Day X", "Day X has been moved", or "The shift is complete").
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
  } | {
    "type": "SHIFT_ROADMAP",
    "dayCount": number,
    "direction": "forward"
  }
}
`.trim();

// ─── Lazy initialization ──────────────────────────────────────────────────────
let _client = null;
let _ollamaCaller = null;

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

  _client = new GoogleGenAI({ vertexai: false, apiKey });
  return _client;
};

/**
 * Testing hook to inject a mock SDK client.
 *
 * @param {any} mockClient
 */
const _setClientForTesting = (mockClient) => {
  _client = mockClient;
};

/**
 * Testing hook to inject a mock Ollama caller.
 *
 * @param {Function|null} mockCaller
 */
const _setOllamaCallerForTesting = (mockCaller) => {
  _ollamaCaller = mockCaller;
};

// ─── Error Classification & Normalization ─────────────────────────────────────

/**
 * Determines whether an error is transient (temporary availability, rate limit, server/network error)
 * and eligible for automatic fallback retry.
 * Permanent errors (such as invalid API key, bad request, not found, or unauthenticated) return false.
 *
 * @param {any} err
 * @returns {boolean}
 */
const isTransientError = (err) => {
  if (!err) return false;
  if (err.code === 'GEMINI_NOT_CONFIGURED') return false;

  const status = Number(err.status || err.statusCode || err.response?.status);

  // Client permanent errors (4xx except 429)
  if (status >= 400 && status < 500 && status !== 429) {
    return false;
  }

  // Transient HTTP statuses (429 or 5xx)
  if (status === 429 || (status >= 500 && status <= 599)) {
    return true;
  }

  const msg = String(err.message || '').toUpperCase();
  const code = String(err.code || '').toUpperCase();
  const combined = `${msg} ${code}`;

  // Permanent patterns (auth, permissions, bad arguments)
  if (
    combined.includes('API_KEY_INVALID') ||
    combined.includes('API KEY NOT VALID') ||
    combined.includes('INVALID_ARGUMENT') ||
    combined.includes('PERMISSION_DENIED') ||
    combined.includes('UNAUTHENTICATED') ||
    combined.includes('NOT_FOUND') ||
    combined.includes('BAD REQUEST')
  ) {
    return false;
  }

  // Transient patterns
  if (
    combined.includes('503') ||
    combined.includes('UNAVAILABLE') ||
    combined.includes('RESOURCE_EXHAUSTED') ||
    combined.includes('RATE_LIMIT') ||
    combined.includes('RATE LIMIT') ||
    combined.includes('429') ||
    combined.includes('OVERLOADED') ||
    combined.includes('DEADLINE_EXCEEDED') ||
    combined.includes('500') ||
    combined.includes('502') ||
    combined.includes('504') ||
    combined.includes('INTERNAL') ||
    combined.includes('ECONNRESET') ||
    combined.includes('ETIMEDOUT') ||
    combined.includes('FETCH FAILED') ||
    combined.includes('SOCKET HANG UP') ||
    combined.includes('NETWORK ERROR') ||
    combined.includes('ECONNREFUSED') ||
    combined.includes('TIMED OUT')
  ) {
    return true;
  }

  return false;
};

/**
 * Normalizes the raw SDK error into a safe internal error.
 * IMPORTANT: Do NOT forward sdkErr.message to the client — it may contain
 * quota details, project IDs, or other infrastructure information.
 *
 * @param {any} sdkErr
 * @returns {Error}
 */
const normalizeGeminiError = (sdkErr) => {
  console.error('[AI] AI service error (details withheld from client):', sdkErr?.message || sdkErr);

  const normalized = new Error('AI request failed.');
  normalized.code = 'GEMINI_REQUEST_FAILED';

  const status = Number(sdkErr?.status || sdkErr?.statusCode || sdkErr?.response?.status);
  const msg = String(sdkErr?.message || '').toUpperCase();

  // Detect quota/rate-limit errors
  if (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('RATE_LIMIT') ||
    msg.includes('RATE LIMIT')
  ) {
    normalized.code = 'GEMINI_RATE_LIMITED';
  }

  return normalized;
};

// ─── Ollama Caller ────────────────────────────────────────────────────────────

/**
 * Calls Ollama /api/generate with timeout.
 *
 * @param {{ model: string, prompt: string, baseUrl?: string, timeoutMs?: number }} options
 * @returns {Promise<{ response: string, done: boolean, model: string }>}
 */
const callOllama = async ({ model, prompt, baseUrl = OLLAMA_BASE_URL, timeoutMs = OLLAMA_TIMEOUT_MS }) => {
  if (_ollamaCaller) {
    return await _ollamaCaller({ model, prompt, baseUrl, timeoutMs });
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/generate`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = new Error(`Ollama HTTP error ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Ollama request timed out after ${timeoutMs}ms`);
      timeoutErr.code = 'ETIMEDOUT';
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Executes a generateContent call with a 3-tier fallback chain:
 *   1. Primary: Gemini 3.1 Flash-Lite
 *   2. Fallback 1: Gemini 2.5 Flash (on transient error)
 *   3. Fallback 2: Ollama / Llama 3.2 (on transient error)
 *
 * @param {import('@google/genai').GoogleGenAI} client
 * @param {{ contents: string, config: Object }} requestPayload
 * @returns {Promise<{ text: string }>}
 */
const generateContentWithFallback = async (client, { contents, config }) => {
  console.log('[AI] Sending request to Gemini (model: %s)', GEMINI_PRIMARY_MODEL);

  try {
    return await client.models.generateContent({
      model: GEMINI_PRIMARY_MODEL,
      contents,
      config,
    });
  } catch (primaryErr) {
    if (!isTransientError(primaryErr)) {
      throw normalizeGeminiError(primaryErr);
    }

    console.warn('[AI] Gemini primary failed, attempting Gemini fallback');
    console.log('[AI] Using fallback model: %s', GEMINI_FALLBACK_MODEL);

    try {
      return await client.models.generateContent({
        model: GEMINI_FALLBACK_MODEL,
        contents,
        config,
      });
    } catch (geminiFallbackErr) {
      if (!isTransientError(geminiFallbackErr)) {
        throw normalizeGeminiError(geminiFallbackErr);
      }

      console.warn('[AI] Gemini fallback failed, attempting Ollama fallback');
      console.log('[AI] Using Ollama fallback model: %s', OLLAMA_MODEL);

      try {
        const systemText = config?.systemInstruction || NOVA_SYSTEM_INSTRUCTIONS;
        const promptForOllama = `${systemText}\n\n${contents}`;
        const ollamaRes = await callOllama({
          model: OLLAMA_MODEL,
          prompt: promptForOllama,
          baseUrl: OLLAMA_BASE_URL,
          timeoutMs: OLLAMA_TIMEOUT_MS,
        });

        return {
          text: ollamaRes?.response || '',
        };
      } catch (ollamaErr) {
        throw normalizeGeminiError(ollamaErr);
      }
    }
  }
};

/**
 * Builds a structured context preamble from selectedContext.
 *
 * @param {Object} selectedContext
 * @returns {string}
 */
const buildContextPreamble = (selectedContext = {}) => {
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
    if (Array.isArray(rm.occupiedDates) && rm.occupiedDates.length > 0) {
      contextLines.push(`Occupied dates in Roadmap: ${rm.occupiedDates.join(', ')}`);
    }
    if (Array.isArray(rm.earliestAvailableDates) && rm.earliestAvailableDates.length > 0) {
      contextLines.push(`Earliest available (unoccupied) dates: ${rm.earliestAvailableDates.join(', ')}`);
    }
    if (Array.isArray(rm.days) && rm.days.length > 0) {
      const daysSummary = rm.days.map((d) => {
        let desc = `Day ${d.dayNumber} (ID ${d.id}, Date: ${d.date}, Status: ${d.status}): "${d.title}" - "${d.mission}"`;
        if (d.originalDate && d.originalDate !== d.date) {
          desc += ` [Rescheduled from ${d.originalDate}]`;
        }
        return desc;
      });
      contextLines.push(`Roadmap Days List:\n  ${daysSummary.join('\n  ')}`);
    }
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

  return contextLines.length > 0
    ? `[User context]\n${contextLines.join('\n')}\n\n[User message]\n`
    : '[No user context available for this request]\n\n[User message]\n';
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

  const contextPreamble = buildContextPreamble(selectedContext);
  const fullContents = contextPreamble + userMessage;

  const response = await generateContentWithFallback(client, {
    contents: fullContents,
    config: {
      systemInstruction: NOVA_SYSTEM_INSTRUCTIONS,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: 'MINIMAL' },
    },
  });

  // Extract the text from the response.
  const text = response?.text;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.error('[AI] AI provider returned an empty or non-text response.');
    const err = new Error('AI provider returned an empty response.');
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

  const reply = typeof parsed?.reply === 'string' && parsed.reply.trim() !== ''
    ? parsed.reply.trim()
    : text.trim();

  const action = (
    parsed?.action &&
    typeof parsed.action === 'object' &&
    (parsed.action.type === 'RESCHEDULE_ROADMAP_DAY' || parsed.action.type === 'SHIFT_ROADMAP')
  ) ? parsed.action : null;

  console.log('[AI] AI response processed successfully (action=%s).', action ? action.type : 'none');
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
const generateBlueprintPlan = async (outcome, durationDays, selectedContext = {}) => {
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
    if (h.totalExerciseMinutes7d != null && Number(h.totalExerciseMinutes7d) > 0) {
      parts.push(`7-day exercise total: ${h.totalExerciseMinutes7d} mins`);
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

  console.log('[AI] Requesting Blueprint generation from AI service (%d days)', durationDays);

  const response = await generateContentWithFallback(client, {
    contents: prompt,
    config: {
      systemInstruction: NOVA_SYSTEM_INSTRUCTIONS + '\nOutput ONLY valid raw JSON matching the requested structure.',
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const text = response?.text;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.error('[AI] AI provider returned an empty blueprint response.');
    const err = new Error('AI provider returned an empty response.');
    err.code = 'GEMINI_EMPTY_RESPONSE';
    throw err;
  }

  let parsed;
  try {
    const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleanedText);
  } catch (parseErr) {
    console.error('[AI] Failed to parse AI blueprint response as JSON:', parseErr.message);
    const err = new Error('AI provider output invalid JSON.');
    err.code = 'GEMINI_MALFORMED_RESPONSE';
    throw err;
  }

  return parsed;
};

// Export public interface.
module.exports = {
  sendMessage,
  generateBlueprintPlan,
  isTransientError,
  callOllama,
  _setClientForTesting,
  _setOllamaCallerForTesting,
  GEMINI_PRIMARY_MODEL,
  GEMINI_FALLBACK_MODEL,
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
  OLLAMA_TIMEOUT_MS,
};
