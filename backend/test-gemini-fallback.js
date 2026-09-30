// =============================================================================
// test-gemini-fallback.js — Focused Unit & Integration Tests for Gemini Fallback
// =============================================================================

'use strict';

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const geminiService = require('./src/services/gemini.service');

async function runGeminiFallbackTests() {
  console.log('=== STARTING GEMINI MODEL FALLBACK TEST SUITE ===\n');

  // Test suite tracking
  let passedCount = 0;
  let totalTests = 0;

  function recordPass(testName) {
    passedCount++;
    console.log(`[PASS] ${testName}`);
  }

  function recordFail(testName, err) {
    console.error(`[FAIL] ${testName}:`, err);
    process.exitCode = 1;
  }

  // ---------------------------------------------------------------------------
  // TEST A: Primary succeeds → Fallback is NOT called
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const calls = [];
    const mockClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          calls.push({ model, contents, config });
          return {
            text: JSON.stringify({
              reply: 'Primary model response',
              action: null,
            }),
          };
        },
      },
    };

    geminiService._setClientForTesting(mockClient);

    const result = await geminiService.sendMessage('Hello NOVA', { userName: 'Alex' });

    assert.strictEqual(calls.length, 1, 'GenerateContent should be called exactly once');
    assert.strictEqual(calls[0].model, geminiService.GEMINI_PRIMARY_MODEL, 'Should call primary model');
    assert.strictEqual(result.reply, 'Primary model response', 'Reply should match primary response');
    assert.strictEqual(result.action, null, 'Action should be null');

    recordPass('A. Primary succeeds → Fallback is NOT called');
  } catch (err) {
    recordFail('A. Primary succeeds → Fallback is NOT called', err);
  }

  // ---------------------------------------------------------------------------
  // TEST B: Primary returns 503 → Fallback is called
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const calls = [];
    const mockClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          calls.push({ model, contents, config });
          if (model === geminiService.GEMINI_PRIMARY_MODEL) {
            const err = new Error('503 Service Unavailable');
            err.status = 503;
            throw err;
          }
          return {
            text: JSON.stringify({
              reply: 'Fallback model response on 503',
              action: null,
            }),
          };
        },
      },
    };

    geminiService._setClientForTesting(mockClient);

    const result = await geminiService.sendMessage('Reschedule mission', { userName: 'Alex' });

    assert.strictEqual(calls.length, 2, 'GenerateContent should be called exactly twice');
    assert.strictEqual(calls[0].model, geminiService.GEMINI_PRIMARY_MODEL, 'First call must be primary model');
    assert.strictEqual(calls[1].model, geminiService.GEMINI_FALLBACK_MODEL, 'Second call must be fallback model');
    assert.strictEqual(calls[0].contents, calls[1].contents, 'Both calls must receive the exact same contents');
    assert.deepStrictEqual(calls[0].config, calls[1].config, 'Both calls must receive the exact same config');
    assert.strictEqual(result.reply, 'Fallback model response on 503', 'Reply should match fallback response');

    recordPass('B. Primary returns 503 → Fallback is called');
  } catch (err) {
    recordFail('B. Primary returns 503 → Fallback is called', err);
  }

  // ---------------------------------------------------------------------------
  // TEST C: Primary returns transient failure (e.g. 429 / RESOURCE_EXHAUSTED) → Fallback succeeds
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const calls = [];
    const mockClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          calls.push({ model, contents, config });
          if (model === geminiService.GEMINI_PRIMARY_MODEL) {
            const err = new Error('Resource has been exhausted (e.g. check quota).');
            err.status = 429;
            throw err;
          }
          return {
            text: JSON.stringify({
              reply: 'Rescheduled day 2 to 2026-11-01',
              action: {
                type: 'RESCHEDULE_ROADMAP_DAY',
                dayId: 42,
                dayNumber: 2,
                missionTitle: 'Read chapter 2',
                currentDate: '2026-10-31',
                targetDate: '2026-11-01',
              },
            }),
          };
        },
      },
    };

    geminiService._setClientForTesting(mockClient);

    const result = await geminiService.sendMessage('Move Day 2 to Nov 1', {
      roadmap: {
        id: 1,
        title: 'Book Reading',
        outcome: 'Read book',
        durationDays: 7,
        startDate: '2026-10-30',
        endDate: '2026-11-05',
        days: [
          { id: 41, dayNumber: 1, date: '2026-10-30', status: 'completed', title: 'Day 1', mission: 'Read chapter 1' },
          { id: 42, dayNumber: 2, date: '2026-10-31', status: 'pending', title: 'Day 2', mission: 'Read chapter 2' },
        ],
      },
    });

    assert.strictEqual(calls.length, 2, 'Should retry with fallback on rate limit');
    assert.strictEqual(calls[0].model, geminiService.GEMINI_PRIMARY_MODEL);
    assert.strictEqual(calls[1].model, geminiService.GEMINI_FALLBACK_MODEL);
    assert.strictEqual(result.reply, 'Rescheduled day 2 to 2026-11-01');
    assert.ok(result.action, 'Action should be present');
    assert.strictEqual(result.action.type, 'RESCHEDULE_ROADMAP_DAY');
    assert.strictEqual(result.action.dayId, 42);
    assert.strictEqual(result.action.targetDate, '2026-11-01');

    recordPass('C. Primary returns transient failure (429 / RESOURCE_EXHAUSTED) → Fallback succeeds with action');
  } catch (err) {
    recordFail('C. Primary returns transient failure → Fallback succeeds', err);
  }

  // ---------------------------------------------------------------------------
  // TEST D: Primary returns permanent/configuration error (e.g. 400 API_KEY_INVALID) → Fallback is NOT called
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const calls = [];
    const mockClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          calls.push({ model, contents, config });
          const err = new Error('API key not valid. Please pass a valid API key.');
          err.status = 400;
          throw err;
        },
      },
    };

    geminiService._setClientForTesting(mockClient);

    let caughtErr = null;
    try {
      await geminiService.sendMessage('Hello', {});
    } catch (e) {
      caughtErr = e;
    }

    assert.ok(caughtErr, 'Should throw an error');
    assert.strictEqual(calls.length, 1, 'GenerateContent should NOT be called again for permanent client errors');
    assert.strictEqual(caughtErr.code, 'GEMINI_REQUEST_FAILED', 'Normalized code should be GEMINI_REQUEST_FAILED');

    recordPass('D. Primary returns permanent/configuration error → Fallback is NOT called');
  } catch (err) {
    recordFail('D. Primary returns permanent/configuration error → Fallback is NOT called', err);
  }

  // ---------------------------------------------------------------------------
  // TEST E: Primary and fallback both fail → Existing error handling is preserved
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const calls = [];
    const mockClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          calls.push({ model, contents, config });
          if (model === geminiService.GEMINI_PRIMARY_MODEL) {
            const err = new Error('503 Service Unavailable');
            err.status = 503;
            throw err;
          } else {
            const err = new Error('Resource has been exhausted (quota limit).');
            err.status = 429;
            throw err;
          }
        },
      },
    };

    geminiService._setClientForTesting(mockClient);

    let caughtErr = null;
    try {
      await geminiService.sendMessage('Hello NOVA', {});
    } catch (e) {
      caughtErr = e;
    }

    assert.ok(caughtErr, 'Should throw an error when both fail');
    assert.strictEqual(calls.length, 2, 'Should attempt primary and fallback exactly once each');
    assert.strictEqual(calls[0].model, geminiService.GEMINI_PRIMARY_MODEL);
    assert.strictEqual(calls[1].model, geminiService.GEMINI_FALLBACK_MODEL);
    assert.strictEqual(caughtErr.code, 'GEMINI_RATE_LIMITED', 'Error should reflect the fallback failure normalized code');

    recordPass('E. Primary and fallback both fail → Existing error handling preserved');
  } catch (err) {
    recordFail('E. Primary and fallback both fail → Existing error handling preserved', err);
  }

  // ---------------------------------------------------------------------------
  // TEST F: Error classification unit checks (isTransientError)
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    // Transient
    assert.strictEqual(geminiService.isTransientError({ status: 503 }), true, '503 is transient');
    assert.strictEqual(geminiService.isTransientError({ status: 500 }), true, '500 is transient');
    assert.strictEqual(geminiService.isTransientError({ status: 502 }), true, '502 is transient');
    assert.strictEqual(geminiService.isTransientError({ status: 504 }), true, '504 is transient');
    assert.strictEqual(geminiService.isTransientError({ status: 429 }), true, '429 is transient');
    assert.strictEqual(geminiService.isTransientError({ message: 'UNAVAILABLE' }), true, 'UNAVAILABLE is transient');
    assert.strictEqual(geminiService.isTransientError({ message: 'RESOURCE_EXHAUSTED' }), true, 'RESOURCE_EXHAUSTED is transient');
    assert.strictEqual(geminiService.isTransientError({ message: 'fetch failed' }), true, 'fetch failed is transient');

    // Permanent
    assert.strictEqual(geminiService.isTransientError({ status: 400 }), false, '400 is permanent');
    assert.strictEqual(geminiService.isTransientError({ status: 401 }), false, '401 is permanent');
    assert.strictEqual(geminiService.isTransientError({ status: 403 }), false, '403 is permanent');
    assert.strictEqual(geminiService.isTransientError({ status: 404 }), false, '404 is permanent');
    assert.strictEqual(geminiService.isTransientError({ message: 'API_KEY_INVALID' }), false, 'API_KEY_INVALID is permanent');
    assert.strictEqual(geminiService.isTransientError({ message: 'INVALID_ARGUMENT' }), false, 'INVALID_ARGUMENT is permanent');
    assert.strictEqual(geminiService.isTransientError({ code: 'GEMINI_NOT_CONFIGURED' }), false, 'GEMINI_NOT_CONFIGURED is permanent');

    recordPass('F. isTransientError classification checks');
  } catch (err) {
    recordFail('F. isTransientError classification checks', err);
  }

  console.log(`\n==================================================`);
  console.log(`GEMINI FALLBACK TESTS: ${passedCount}/${totalTests} PASSED`);
  console.log(`==================================================\n`);

  if (passedCount !== totalTests) {
    process.exit(1);
  }
}

runGeminiFallbackTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
