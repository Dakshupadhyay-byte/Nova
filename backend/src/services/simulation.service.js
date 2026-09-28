// =============================================================================
// src/services/simulation.service.js — What-If Simulation Service
// =============================================================================
//
// Responsibilities:
//   • Query the authenticated user's real wellness_logs from PostgreSQL
//   • Calculate historical baseline averages (sleep, energy)
//   • Calculate simulated energy for a requested sleep duration (± window)
//   • Return structured statistics — Gemini only narrates these, never calculates
//   • Never accept a user_id from the caller — always use the authenticated id
//
// Sleep → Energy Association MVP
// ────────────────────────────────
// We look at the user's historical daily logs and find all records where
// sleep_hours falls within [targetSleep - window, targetSleep + window].
// The "simulated" energy is the average energy_level on those days.
// We compare that to the overall baseline energy average.
//
// This is an observational association — not causation.
// All response language and Gemini prompts must reflect that.
// =============================================================================

'use strict';

const db = require('../config/db');

// ─── Constants ────────────────────────────────────────────────────────────────

// Minimum number of historical records required before we return any result.
// Below this threshold we return available: false to avoid misleading averages.
const MIN_RECORDS_FOR_RESULT = 3;

// The window around the requested sleep value used to match historical records.
// ± 0.5 hours is a reasonable bin width for sleep tracking.
const SLEEP_WINDOW_HOURS = 0.5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Round a number to N decimal places.
 * @param {number} n
 * @param {number} places
 * @returns {number}
 */
const round = (n, places = 2) =>
  Math.round(n * Math.pow(10, places)) / Math.pow(10, places);

/**
 * Convert a sample size into a qualitative confidence label.
 * @param {number} n
 * @returns {'low'|'moderate'|'high'}
 */
const confidenceLabel = (n) => {
  if (n < 5)  return 'low';
  if (n < 15) return 'moderate';
  return 'high';
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the sleep to energy what-if simulation for an authenticated user.
 *
 * @param {number} userId         - PostgreSQL user ID from req.user.id (NOT from frontend)
 * @param {number} targetSleep    - Requested sleep duration in hours (validated by controller)
 * @returns {Promise<Object>}     - SimulationResult
 */
const runSleepEnergySimulation = async (userId, targetSleep) => {
  const rangeLow  = round(targetSleep - SLEEP_WINDOW_HOURS, 2);
  const rangeHigh = round(targetSleep + SLEEP_WINDOW_HOURS, 2);

  // ── Single round-trip: fetch all relevant rows ───────────────────────────
  // We grab all historical wellness logs for this user that have both
  // sleep_hours and energy_level recorded.
  // We do the aggregations in JS to keep the SQL simple and re-use data.
  const { rows } = await db.query(
    `SELECT
       log_date,
       sleep_hours,
       energy_level
     FROM wellness_logs
     WHERE user_id    = $1
       AND sleep_hours  IS NOT NULL
       AND energy_level IS NOT NULL
     ORDER BY log_date DESC`,
    [userId]
  );

  const totalRecords = rows.length;

  // Insufficient data → return early with available: false
  if (totalRecords < MIN_RECORDS_FOR_RESULT) {
    return {
      available:          false,
      baselineAvgSleep:   null,
      baselineAvgEnergy:  null,
      simulatedAvgEnergy: null,
      energyDelta:        null,
      sampleSize:         0,
      totalRecords,
      sleepRangeLow:      rangeLow,
      sleepRangeHigh:     rangeHigh,
      confidence:         'low',
      distribution:       [],
    };
  }

  // ── Baseline averages (all records) ──────────────────────────────────────
  const baselineAvgSleep = round(
    rows.reduce((sum, r) => sum + Number(r.sleep_hours), 0) / totalRecords,
    2
  );
  const baselineAvgEnergy = round(
    rows.reduce((sum, r) => sum + Number(r.energy_level), 0) / totalRecords,
    2
  );

  // ── Matching records for the requested sleep range ────────────────────────
  const matchingRows = rows.filter((r) => {
    const sh = Number(r.sleep_hours);
    return sh >= rangeLow && sh <= rangeHigh;
  });

  const sampleSize = matchingRows.length;

  // If no records match the range, return with available: false
  if (sampleSize === 0) {
    return {
      available:          false,
      baselineAvgSleep,
      baselineAvgEnergy,
      simulatedAvgEnergy: null,
      energyDelta:        null,
      sampleSize:         0,
      totalRecords,
      sleepRangeLow:      rangeLow,
      sleepRangeHigh:     rangeHigh,
      confidence:         'low',
      distribution:       rows.slice(0, 30).map((r) => ({
        sleepHours:  Number(r.sleep_hours),
        energyLevel: Number(r.energy_level),
        logDate:     String(r.log_date),
      })),
    };
  }

  const simulatedAvgEnergy = round(
    matchingRows.reduce((sum, r) => sum + Number(r.energy_level), 0) / sampleSize,
    2
  );

  const energyDelta = round(simulatedAvgEnergy - baselineAvgEnergy, 2);

  // ── Historical distribution (up to 30 most-recent records) ───────────────
  // Sent to the frontend so it can show context around the simulation result.
  const distribution = rows.slice(0, 30).map((r) => ({
    sleepHours:  Number(r.sleep_hours),
    energyLevel: Number(r.energy_level),
    logDate:     String(r.log_date),
  }));

  return {
    available:          true,
    baselineAvgSleep,
    baselineAvgEnergy,
    simulatedAvgEnergy,
    energyDelta,
    sampleSize,
    totalRecords,
    sleepRangeLow:  rangeLow,
    sleepRangeHigh: rangeHigh,
    confidence:     confidenceLabel(sampleSize),
    distribution,
  };
};

module.exports = { runSleepEnergySimulation };
