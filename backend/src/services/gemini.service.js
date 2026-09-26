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
// Model: gemini-3.1-flash-lite  (cost-efficient, low-latency, high-throughput)
// API:   ai.models.generateContent({ model, contents, config: { systemInstruction } })
// =============================================================================

'use strict';

const { GoogleGenAI } = require('@google/genai');

// ─── Constants ────────────────────────────────────────────────────────────────

// The pinned model identifier, verified against the official Gemini API docs
// at implementation time. Change only with explicit review.
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
You are NOVA, an AI companion inside a personal focus and wellness app.

Your role:
- Help the user reflect on their focus sessions and wellness habits.
- Keep responses concise (2–4 sentences unless more is clearly needed).
- Be conversational, calm, and non-judgmental.
- Be honest about what you know and don't know about the user.

Data rules (strict):
- You will receive a small context object containing only the user's real,
  recorded data for this request. Use only what is in that context.
- If a piece of data is absent from the context, say so honestly.
  Do NOT invent numbers, trends, or habits.
- When discussing relationships between sleep, energy, or focus, use hedged
  language: "tends to", "appears associated with", "you might notice".
  Never say one thing "causes" another.
- Do not provide medical diagnoses or clinical advice.
- Do not reference any data that is not present in the context you received.

Tone rules:
- Supportive and pragmatic — not overly enthusiastic.
- Brief. Do not over-explain.
- Do not use excessive emojis or exclamation marks.
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
 * pre-built, allowlisted context object, then returns the response text.
 *
 * The context object is serialized into a structured preamble that is prepended
 * to the user's message. This keeps the user message and context clearly
 * separated in the prompt.
 *
 * @param {string} userMessage   - The raw user message (already validated by the controller).
 * @param {Object} selectedContext - The minimal, allowlisted context object produced
 *                                   by aiContext.service.selectRelevantContext().
 *                                   This function is intentionally unaware of its source.
 * @returns {Promise<string>}      - The response text from Gemini.
 * @throws {{ code: string, message: string }} - A normalized internal error, safe to log.
 */
const sendMessage = async (userMessage, selectedContext) => {
  const client = getClient(); // throws GEMINI_NOT_CONFIGURED if key missing

  // Build a structured context preamble.
  // Only fields that actually exist in selectedContext are included.
  // The preamble is human-readable so it is easy to inspect during debugging.
  const contextLines = [];

  if (selectedContext.userName) {
    contextLines.push(`User name: ${selectedContext.userName}`);
  }
  if (selectedContext.todaySleepHours != null) {
    contextLines.push(`Today's sleep: ${selectedContext.todaySleepHours} hours`);
  }
  if (selectedContext.todayEnergyLevel != null) {
    contextLines.push(`Today's energy level: ${selectedContext.todayEnergyLevel}/10`);
  }
  if (selectedContext.recentFocus) {
    const f = selectedContext.recentFocus;
    contextLines.push(
      `Recent focus (last 7 days): ` +
      `${f.totalSessionsLast7Days} sessions, ` +
      `${f.completedLast7Days} completed, ` +
      `${f.totalMinutesLast7Days} total minutes`
    );
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
        // thinkingLevel: 'MINIMAL' — minimize thinking tokens for low-latency conversational use on Gemini 3.
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
  // response.text is the convenience accessor documented in @google/genai.
  const text = response.text;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.error('[AI] Gemini returned an empty or non-text response.');
    const err = new Error('Gemini returned an empty response.');
    err.code = 'GEMINI_EMPTY_RESPONSE';
    throw err;
  }

  console.log('[AI] Gemini response received successfully.');
  return text.trim();
};

// Export only the public interface. Internal helpers (_client, getClient) are
// not exported — they are module-private.
module.exports = { sendMessage };
