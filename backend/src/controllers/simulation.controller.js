// =============================================================================
// src/controllers/simulation.controller.js — What-If Simulator Endpoint
// =============================================================================
//
// API Contract
// ─────────────
// POST /api/simulation/what-if
// Header: Authorization: Bearer <Firebase ID Token>
//
// Request body:
//   {
//     "variable": "sleep",   // only "sleep" is supported in MVP
//     "value":    8          // sleep duration in hours, range 1–24
//   }
//
// 200 OK (result available):
//   {
//     "success": true,
//     "data": {
//       "simulation": {
//         "available": true,
//         "variable": "sleep",
//         "value": 8,
//         "baselineAvgSleep": 6.8,
//         "baselineAvgEnergy": 6.2,
//         "simulatedAvgEnergy": 7.4,
//         "energyDelta": 1.2,
//         "sampleSize": 8,
//         "totalRecords": 24,
//         "sleepRangeLow": 7.5,
//         "sleepRangeHigh": 8.5,
//         "confidence": "moderate",
//         "distribution": [...],
//         "insight": "Your historical data shows an association..."
//       }
//     }
//   }
//
// 200 OK (insufficient data):
//   { "success": true, "data": { "simulation": { "available": false, ... } } }
//
// SECURITY:
//   • User ID is ALWAYS taken from req.user.id (set by authMiddleware)
//   • The request body MUST NOT contain a userId — it is rejected if present
//   • Only the authenticated user's own data is ever queried
//
// GEMINI:
//   • Gemini is OPTIONAL — it narrates already-computed statistics only
//   • If Gemini is unavailable, a deterministic fallback insight is returned
//   • The simulation result is always structurally complete regardless of Gemini
// =============================================================================

'use strict';

const { runSleepEnergySimulation } = require('../services/simulation.service');
const geminiService = require('../services/gemini.service');

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_VARIABLES = ['sleep'];

const SLEEP_MIN = 1;
const SLEEP_MAX = 24;

// ─── Insight generation ───────────────────────────────────────────────────────

/**
 * Build a deterministic fallback insight from simulation statistics.
 * Used when Gemini is unavailable or returns an error.
 *
 * @param {Object} result - The simulation result from the service
 * @param {number} targetSleep
 * @returns {string}
 */
const buildFallbackInsight = (result, targetSleep) => {
  if (!result.available) {
    return `Your historical data does not yet contain enough check-ins to simulate ${targetSleep}h of sleep. Keep logging your daily wellness check-ins to unlock this feature.`;
  }

  const { energyDelta, simulatedAvgEnergy, sampleSize, confidence, sleepRangeLow, sleepRangeHigh } = result;
  const direction = energyDelta > 0 ? 'higher' : energyDelta < 0 ? 'lower' : 'similar';
  const deltaAbs = Math.abs(energyDelta).toFixed(1);
  const rangeStr = `${sleepRangeLow}–${sleepRangeHigh}h`;

  let insight =
    `Your historical data shows an association between sleeping ${rangeStr} and a reported energy level of ${simulatedAvgEnergy}/10, ` +
    `which is ${deltaAbs > 0 ? deltaAbs + ' points ' + direction : 'similar'} compared to your overall average. ` +
    `This is based on ${sampleSize} recorded day${sampleSize !== 1 ? 's' : ''} (${confidence} confidence). ` +
    `This reflects an observational association in your own data and does not establish causation.`;

  return insight;
};

/**
 * Ask Gemini to narrate the already-calculated simulation statistics.
 * Gemini is only given the numbers — it does not re-calculate anything.
 * Returns null if Gemini is unavailable.
 *
 * @param {Object} result
 * @param {number} targetSleep
 * @returns {Promise<string|null>}
 */
const buildGeminiInsight = async (result, targetSleep) => {
  // Only call Gemini if AI is enabled in the environment
  if (process.env.AI_ENABLED !== 'true') return null;

  const stats = {
    targetSleepHours:   targetSleep,
    sleepRange:         `${result.sleepRangeLow}–${result.sleepRangeHigh}h`,
    baselineAvgSleep:   result.baselineAvgSleep,
    baselineAvgEnergy:  result.baselineAvgEnergy,
    simulatedAvgEnergy: result.simulatedAvgEnergy,
    energyDelta:        result.energyDelta,
    sampleSize:         result.sampleSize,
    totalRecords:       result.totalRecords,
    confidence:         result.confidence,
  };

  const prompt =
    `The user asked a what-if simulation: "What if I slept ${targetSleep} hours?"\n` +
    `Based on their historical data, here are the pre-calculated statistics:\n` +
    `${JSON.stringify(stats, null, 2)}\n\n` +
    `Please write a concise, calm, 2–3 sentence insight for the user that:\n` +
    `1. Describes the association found in their data (use hedged language like "tends to" or "appears associated with")\n` +
    `2. Mentions the confidence level and sample size\n` +
    `3. Clearly states this is an observational association, not a causal claim\n` +
    `Do NOT invent any numbers or trends beyond what is in the statistics above.`;

  try {
    // We pass an empty context object because the stats are in the prompt itself
    const text = await geminiService.sendMessage(prompt, {});
    return text;
  } catch (err) {
    // Log and fall back — never surface Gemini errors to the client
    console.warn('[SIMULATION] Gemini insight unavailable, using fallback. Code:', err.code || err.message);
    return null;
  }
};

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * POST /api/simulation/what-if
 *
 * @type {import('express').RequestHandler}
 */
const whatIfSimulation = async (req, res, next) => {
  try {
    // ── Security: reject any userId in the body ──────────────────────────────
    if (req.body && (req.body.userId !== undefined || req.body.user_id !== undefined)) {
      return res.status(400).json({
        success: false,
        data:    null,
        error: {
          code:    'VALIDATION_ERROR',
          message: 'userId must not be supplied in the request body. The authenticated user is determined server-side.',
          field:   'userId',
        },
      });
    }

    // ── Read authenticated user ID from middleware ────────────────────────────
    const userId = req.user.id;

    // ── Validate: variable ───────────────────────────────────────────────────
    const { variable, value } = req.body || {};

    if (!variable || typeof variable !== 'string') {
      return res.status(400).json({
        success: false,
        data:    null,
        error: {
          code:    'VALIDATION_ERROR',
          message: 'variable is required and must be a string.',
          field:   'variable',
        },
      });
    }

    if (!SUPPORTED_VARIABLES.includes(variable)) {
      return res.status(400).json({
        success: false,
        data:    null,
        error: {
          code:    'VALIDATION_ERROR',
          message: `Unsupported variable "${variable}". Supported: ${SUPPORTED_VARIABLES.join(', ')}.`,
          field:   'variable',
        },
      });
    }

    // ── Validate: value (sleep hours) ────────────────────────────────────────
    if (value === undefined || value === null || value === '') {
      return res.status(400).json({
        success: false,
        data:    null,
        error: {
          code:    'VALIDATION_ERROR',
          message: 'value is required.',
          field:   'value',
        },
      });
    }

    const parsedValue = Number(value);
    if (isNaN(parsedValue) || !isFinite(parsedValue) || parsedValue < SLEEP_MIN || parsedValue > SLEEP_MAX) {
      return res.status(400).json({
        success: false,
        data:    null,
        error: {
          code:    'VALIDATION_ERROR',
          message: `Sleep duration must be a number between ${SLEEP_MIN} and ${SLEEP_MAX} hours.`,
          field:   'value',
        },
      });
    }

    // ── Run simulation ───────────────────────────────────────────────────────
    const result = await runSleepEnergySimulation(userId, parsedValue);

    // ── Generate insight ─────────────────────────────────────────────────────
    // Try Gemini first; fall back to deterministic insight if unavailable.
    let insight;
    if (result.available) {
      insight = await buildGeminiInsight(result, parsedValue);
      if (!insight) {
        insight = buildFallbackInsight(result, parsedValue);
      }
    } else {
      insight = buildFallbackInsight(result, parsedValue);
    }

    // ── Success response ─────────────────────────────────────────────────────
    console.log(
      '[SIMULATION] what-if completed: userId=%d variable=%s value=%s available=%s sampleSize=%d',
      userId, variable, parsedValue, result.available, result.sampleSize
    );

    return res.status(200).json({
      success: true,
      data: {
        simulation: {
          ...result,
          variable,
          value: parsedValue,
          insight,
        },
      },
      error: null,
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { whatIfSimulation };
