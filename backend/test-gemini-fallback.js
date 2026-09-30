// =============================================================================
// test-gemini-fallback.js — Comprehensive Tests for Multi-Tier AI Fallback Chain
// =============================================================================
//
// Scenarios Tested:
//   A. Gemini primary succeeds → Gemini 2.5 NOT called, Ollama NOT called
//   B. Gemini primary transient failure → Gemini 2.5 succeeds, Ollama NOT called
//   C. Gemini primary transient failure → Gemini 2.5 transient failure → Ollama succeeds
//   D. Gemini primary transient failure → Gemini 2.5 transient failure → Ollama fails → Safe final error
//   E. Permanent Gemini error → No unnecessary fallback
//   F. Ollama returns valid informational JSON → { reply, action: null }
//   G. Ollama returns valid RESCHEDULE_ROADMAP_DAY JSON → action preserved
//   H. Ollama returns malformed JSON → action: null, request does not crash
//   I. Ollama unavailable / timeout → Safe error behavior
//   J. Error classification & defaults validation
// =============================================================================

'use strict';

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const geminiService = require('./src/services/gemini.service');

async function runGeminiFallbackTests() {
  console.log('=== STARTING 3-TIER AI FALLBACK TEST SUITE (Gemini 3.1 -> Gemini 2.5 -> Ollama) ===\n');

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
  // TEST A: Gemini primary succeeds → Gemini 2.5 NOT called, Ollama NOT called
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const geminiCalls = [];
    const ollamaCalls = [];

    const mockClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          geminiCalls.push({ model, contents, config });
          return {
            text: JSON.stringify({
              reply: 'Primary Gemini 3.1 response',
              action: null,
            }),
          };
        },
      },
    };

    geminiService._setClientForTesting(mockClient);
    geminiService._setOllamaCallerForTesting(async (params) => {
      ollamaCalls.push(params);
      return { response: 'Ollama response' };
    });

    const result = await geminiService.sendMessage('Hello NOVA', { userName: 'Alex' });

    assert.strictEqual(geminiCalls.length, 1, 'Gemini should be called once');
    assert.strictEqual(geminiCalls[0].model, geminiService.GEMINI_PRIMARY_MODEL, 'Should call primary model');
    assert.strictEqual(ollamaCalls.length, 0, 'Ollama should NOT be called');
    assert.strictEqual(result.reply, 'Primary Gemini 3.1 response');
    assert.strictEqual(result.action, null);

    recordPass('A. Gemini primary succeeds → Gemini 2.5 NOT called, Ollama NOT called');
  } catch (err) {
    recordFail('A. Gemini primary succeeds → Gemini 2.5 NOT called, Ollama NOT called', err);
  }

  // ---------------------------------------------------------------------------
  // TEST B: Gemini primary transient failure → Gemini 2.5 succeeds, Ollama NOT called
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const geminiCalls = [];
    const ollamaCalls = [];

    const mockClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          geminiCalls.push({ model, contents, config });
          if (model === geminiService.GEMINI_PRIMARY_MODEL) {
            const err = new Error('503 Service Unavailable');
            err.status = 503;
            throw err;
          }
          return {
            text: JSON.stringify({
              reply: 'Gemini 2.5 Fallback response',
              action: null,
            }),
          };
        },
      },
    };

    geminiService._setClientForTesting(mockClient);
    geminiService._setOllamaCallerForTesting(async (params) => {
      ollamaCalls.push(params);
      return { response: 'Ollama response' };
    });

    const result = await geminiService.sendMessage('Reschedule mission', { userName: 'Alex' });

    assert.strictEqual(geminiCalls.length, 2, 'Gemini primary and fallback should be called');
    assert.strictEqual(geminiCalls[0].model, geminiService.GEMINI_PRIMARY_MODEL);
    assert.strictEqual(geminiCalls[1].model, geminiService.GEMINI_FALLBACK_MODEL);
    assert.strictEqual(ollamaCalls.length, 0, 'Ollama should NOT be called when Gemini 2.5 succeeds');
    assert.strictEqual(result.reply, 'Gemini 2.5 Fallback response');

    recordPass('B. Gemini primary transient failure → Gemini 2.5 succeeds, Ollama NOT called');
  } catch (err) {
    recordFail('B. Gemini primary transient failure → Gemini 2.5 succeeds, Ollama NOT called', err);
  }

  // ---------------------------------------------------------------------------
  // TEST C: Gemini primary transient failure → Gemini 2.5 transient failure → Ollama succeeds
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const geminiCalls = [];
    const ollamaCalls = [];

    const mockClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          geminiCalls.push({ model, contents, config });
          const err = new Error(`${model} transient failure`);
          err.status = 503;
          throw err;
        },
      },
    };

    geminiService._setClientForTesting(mockClient);
    geminiService._setOllamaCallerForTesting(async (params) => {
      ollamaCalls.push(params);
      return {
        model: params.model,
        response: JSON.stringify({
          reply: 'Response generated by Ollama/Llama 3.2',
          action: null,
        }),
        done: true,
      };
    });

    const result = await geminiService.sendMessage('Help me focus', { userName: 'Alex' });

    assert.strictEqual(geminiCalls.length, 2, 'Both Gemini models attempted');
    assert.strictEqual(geminiCalls[0].model, geminiService.GEMINI_PRIMARY_MODEL);
    assert.strictEqual(geminiCalls[1].model, geminiService.GEMINI_FALLBACK_MODEL);
    assert.strictEqual(ollamaCalls.length, 1, 'Ollama should be called once');
    assert.strictEqual(ollamaCalls[0].model, geminiService.OLLAMA_MODEL);
    assert.strictEqual(result.reply, 'Response generated by Ollama/Llama 3.2');
    assert.strictEqual(result.action, null);

    recordPass('C. Gemini primary transient failure → Gemini 2.5 transient failure → Ollama succeeds');
  } catch (err) {
    recordFail('C. Gemini primary transient failure → Gemini 2.5 transient failure → Ollama succeeds', err);
  }

  // ---------------------------------------------------------------------------
  // TEST D: Gemini primary & fallback transient failures → Ollama fails → Safe final error
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const geminiCalls = [];
    const ollamaCalls = [];

    const mockClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          geminiCalls.push({ model, contents, config });
          const err = new Error('503 Service Unavailable');
          err.status = 503;
          throw err;
        },
      },
    };

    geminiService._setClientForTesting(mockClient);
    geminiService._setOllamaCallerForTesting(async (params) => {
      ollamaCalls.push(params);
      const err = new Error('Ollama connection refused');
      err.code = 'ECONNREFUSED';
      throw err;
    });

    let caughtErr = null;
    try {
      await geminiService.sendMessage('Hello', {});
    } catch (e) {
      caughtErr = e;
    }

    assert.ok(caughtErr, 'Should throw error when all tiers fail');
    assert.strictEqual(geminiCalls.length, 2, 'Primary and Gemini fallback called');
    assert.strictEqual(ollamaCalls.length, 1, 'Ollama attempted');
    assert.strictEqual(caughtErr.code, 'GEMINI_REQUEST_FAILED', 'Normalized error code preserved');

    recordPass('D. Gemini primary & fallback transient failures → Ollama fails → Safe final error');
  } catch (err) {
    recordFail('D. Gemini primary & fallback transient failures → Ollama fails → Safe final error', err);
  }

  // ---------------------------------------------------------------------------
  // TEST E: Permanent Gemini error → No unnecessary fallback
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const geminiCalls = [];
    const ollamaCalls = [];

    const mockClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          geminiCalls.push({ model, contents, config });
          const err = new Error('API key not valid. Please pass a valid API key.');
          err.status = 400;
          throw err;
        },
      },
    };

    geminiService._setClientForTesting(mockClient);
    geminiService._setOllamaCallerForTesting(async (params) => {
      ollamaCalls.push(params);
      return { response: 'Should not run' };
    });

    let caughtErr = null;
    try {
      await geminiService.sendMessage('Hello', {});
    } catch (e) {
      caughtErr = e;
    }

    assert.ok(caughtErr, 'Should throw permanent error');
    assert.strictEqual(geminiCalls.length, 1, 'Only primary Gemini called');
    assert.strictEqual(ollamaCalls.length, 0, 'Ollama should NOT be called on permanent error');
    assert.strictEqual(caughtErr.code, 'GEMINI_REQUEST_FAILED');

    recordPass('E. Permanent Gemini error → No unnecessary fallback');
  } catch (err) {
    recordFail('E. Permanent Gemini error → No unnecessary fallback', err);
  }

  // ---------------------------------------------------------------------------
  // TEST F: Ollama returns valid informational JSON → Converted to { reply, action: null }
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const mockClient = {
      models: {
        generateContent: async () => {
          const err = new Error('Resource exhausted');
          err.status = 429;
          throw err;
        },
      },
    };

    geminiService._setClientForTesting(mockClient);
    geminiService._setOllamaCallerForTesting(async () => ({
      model: 'llama3.2:latest',
      response: '```json\n{\n  "reply": "You completed 2 focus sessions today totaling 50 minutes.",\n  "action": null\n}\n```',
      done: true,
    }));

    const result = await geminiService.sendMessage('How was my focus today?', {});

    assert.strictEqual(result.reply, 'You completed 2 focus sessions today totaling 50 minutes.');
    assert.strictEqual(result.action, null);

    recordPass('F. Ollama returns valid informational JSON → Converted to { reply, action: null }');
  } catch (err) {
    recordFail('F. Ollama returns valid informational JSON → Converted to { reply, action: null }', err);
  }

  // ---------------------------------------------------------------------------
  // TEST G: Ollama returns valid RESCHEDULE_ROADMAP_DAY JSON → action preserved
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const mockClient = {
      models: {
        generateContent: async () => {
          const err = new Error('503 Service Unavailable');
          err.status = 503;
          throw err;
        },
      },
    };

    geminiService._setClientForTesting(mockClient);
    geminiService._setOllamaCallerForTesting(async () => ({
      model: 'llama3.2:latest',
      response: JSON.stringify({
        reply: 'I can help you move Day 3 to 2026-11-15.',
        action: {
          type: 'RESCHEDULE_ROADMAP_DAY',
          dayId: 88,
          dayNumber: 3,
          missionTitle: 'Practice focus blocks',
          currentDate: '2026-10-01',
          targetDate: '2026-11-15',
        },
      }),
      done: true,
    }));

    const result = await geminiService.sendMessage('Move Day 3 to Nov 15', {
      roadmap: { id: 10, title: 'Roadmap' },
    });

    assert.strictEqual(result.reply, 'I can help you move Day 3 to 2026-11-15.');
    assert.ok(result.action, 'Action should be present');
    assert.strictEqual(result.action.type, 'RESCHEDULE_ROADMAP_DAY');
    assert.strictEqual(result.action.dayId, 88);
    assert.strictEqual(result.action.targetDate, '2026-11-15');

    recordPass('G. Ollama returns valid RESCHEDULE_ROADMAP_DAY JSON → Action preserved');
  } catch (err) {
    recordFail('G. Ollama returns valid RESCHEDULE_ROADMAP_DAY JSON → Action preserved', err);
  }

  // ---------------------------------------------------------------------------
  // TEST H: Ollama returns malformed JSON → Action becomes null, request does not crash
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const mockClient = {
      models: {
        generateContent: async () => {
          const err = new Error('503 Service Unavailable');
          err.status = 503;
          throw err;
        },
      },
    };

    geminiService._setClientForTesting(mockClient);
    geminiService._setOllamaCallerForTesting(async () => ({
      model: 'llama3.2:latest',
      response: 'Sure! Here is some non-JSON plain text advice about getting better sleep.',
      done: true,
    }));

    const result = await geminiService.sendMessage('Give me advice on sleep', {});

    assert.strictEqual(result.reply, 'Sure! Here is some non-JSON plain text advice about getting better sleep.');
    assert.strictEqual(result.action, null, 'Action must be null when JSON is missing or malformed');

    recordPass('H. Ollama returns malformed JSON → Action becomes null, request does not crash');
  } catch (err) {
    recordFail('H. Ollama returns malformed JSON → Action becomes null, request does not crash', err);
  }

  // ---------------------------------------------------------------------------
  // TEST I: Ollama unavailable / timeout → Safe error behavior
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    const mockClient = {
      models: {
        generateContent: async () => {
          const err = new Error('504 Gateway Timeout');
          err.status = 504;
          throw err;
        },
      },
    };

    geminiService._setClientForTesting(mockClient);
    geminiService._setOllamaCallerForTesting(async () => {
      const err = new Error('Ollama request timed out after 8000ms');
      err.code = 'ETIMEDOUT';
      throw err;
    });

    let caughtErr = null;
    try {
      await geminiService.sendMessage('Hello', {});
    } catch (e) {
      caughtErr = e;
    }

    assert.ok(caughtErr, 'Should catch error on Ollama timeout');
    assert.strictEqual(caughtErr.code, 'GEMINI_REQUEST_FAILED', 'Normalized safe error');

    recordPass('I. Ollama unavailable / timeout → Safe error behavior');
  } catch (err) {
    recordFail('I. Ollama unavailable / timeout → Safe error behavior', err);
  }

  // ---------------------------------------------------------------------------
  // TEST J: Configuration and error classification checks
  // ---------------------------------------------------------------------------
  totalTests++;
  try {
    assert.strictEqual(geminiService.GEMINI_PRIMARY_MODEL, 'gemini-3.1-flash-lite');
    assert.strictEqual(geminiService.GEMINI_FALLBACK_MODEL, 'gemini-2.5-flash');
    assert.strictEqual(geminiService.OLLAMA_BASE_URL, process.env.OLLAMA_BASE_URL || 'http://10.77.76.101:11434');
    assert.strictEqual(geminiService.OLLAMA_MODEL, process.env.OLLAMA_MODEL || 'llama3.2:latest');

    assert.strictEqual(geminiService.isTransientError({ status: 503 }), true);
    assert.strictEqual(geminiService.isTransientError({ status: 429 }), true);
    assert.strictEqual(geminiService.isTransientError({ code: 'ECONNREFUSED' }), true);
    assert.strictEqual(geminiService.isTransientError({ code: 'ETIMEDOUT' }), true);
    assert.strictEqual(geminiService.isTransientError({ status: 400 }), false);
    assert.strictEqual(geminiService.isTransientError({ status: 401 }), false);

    recordPass('J. Configuration defaults and error classification checks');
  } catch (err) {
    recordFail('J. Configuration defaults and error classification checks', err);
  }

  // ---------------------------------------------------------------------------
  // TEST K (Optional / Live Smoke): Real LAN Ollama End-to-End Fallback Test
  // ---------------------------------------------------------------------------
  if (process.env.REAL_OLLAMA_TEST === 'true') {
    totalTests++;
    try {
      console.log('\n--- EXECUTING LIVE LAN OLLAMA SMOKE TEST (REAL_OLLAMA_TEST=true) ---');
      const geminiAttempts = [];

      // Force Gemini primary & fallback to simulate transient failures
      const mockGeminiClient = {
        models: {
          generateContent: async ({ model, contents, config }) => {
            geminiAttempts.push(model);
            const err = new Error(`Simulated transient 503 for ${model}`);
            err.status = 503;
            throw err;
          },
        },
      };

      geminiService._setClientForTesting(mockGeminiClient);
      // Ensure Ollama caller is reset to null so it performs the REAL fetch call over LAN
      geminiService._setOllamaCallerForTesting(null);

      console.log(`[LIVE OLLAMA] Connecting to real Ollama endpoint: ${geminiService.OLLAMA_BASE_URL} (Model: ${geminiService.OLLAMA_MODEL})`);
      const startTime = Date.now();
      const result = await geminiService.sendMessage('Hello NOVA, tell me one focus tip in 1 sentence.', {
        userName: 'Alex',
      });
      const durationMs = Date.now() - startTime;

      console.log(`[LIVE OLLAMA] Response received in ${durationMs}ms`);
      console.log(`[LIVE OLLAMA] Reply content: "${result?.reply}"`);
      console.log(`[LIVE OLLAMA] Action payload:`, result?.action);

      assert.strictEqual(geminiAttempts.length, 2, 'Both Gemini tiers should fail and trigger Ollama');
      assert.strictEqual(geminiAttempts[0], geminiService.GEMINI_PRIMARY_MODEL);
      assert.strictEqual(geminiAttempts[1], geminiService.GEMINI_FALLBACK_MODEL);
      assert.ok(typeof result.reply === 'string' && result.reply.trim().length > 0, 'Ollama returned non-empty reply');
      assert.ok(result.action === null || (typeof result.action === 'object' && result.action.type === 'RESCHEDULE_ROADMAP_DAY'));

      recordPass('K. Real LAN Ollama End-to-End Fallback Smoke Test (Live Network Request to 10.77.76.101:11434)');
    } catch (err) {
      recordFail('K. Real LAN Ollama End-to-End Fallback Smoke Test', err);
    }
  } else {
    console.log('[INFO] Test K (Real LAN Ollama Smoke Test) skipped. Set REAL_OLLAMA_TEST=true to run.');
  }

  console.log(`\n==================================================`);
  console.log(`AI FALLBACK TESTS: ${passedCount}/${totalTests} PASSED`);
  console.log(`==================================================\n`);

  if (passedCount !== totalTests) {
    process.exit(1);
  }
}

runGeminiFallbackTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

