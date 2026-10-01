/**
 * SimulatorScreen.tsx
 *
 * The What-If Simulator screen. Lets the authenticated user explore how
 * different sleep durations are historically associated with their energy levels.
 *
 * All data comes from the user's real PostgreSQL wellness_logs via the backend.
 * No fake/demo data is ever shown. If insufficient data, a helpful notice is shown.
 *
 * Gemini narrates results if available; a deterministic fallback is shown if not.
 */

import React, { useState, useCallback } from 'react';
import {
  Moon, Zap, BarChart2, AlertCircle, ChevronLeft,
  Sparkles, Info, TrendingUp, TrendingDown, Minus,
  RefreshCw, BrainCircuit
} from 'lucide-react';
import { SimulationResult } from '../types';
import { runWhatIfSimulation } from '../services/api';
import { getIdToken } from '../services/auth';

interface SimulatorScreenProps {
  onBack: () => void;
}

// ─── Sleep presets ─────────────────────────────────────────────────────────────
const SLEEP_PRESETS = [6, 6.5, 7, 7.5, 8, 8.5, 9];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatSleep = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const energyColor = (energy: number | null) => {
  if (energy === null) return '#94a3b8';
  if (energy >= 8) return '#00685f';
  if (energy >= 6) return '#0284c7';
  if (energy >= 4) return '#f59e0b';
  return '#ef4444';
};

const confidenceBadgeStyle = (c: 'low' | 'moderate' | 'high') => {
  if (c === 'high')     return 'bg-[#e6f7f4] text-[#00685f] border-[#99dfd5]/50';
  if (c === 'moderate') return 'bg-[#eff6ff] text-[#0284c7] border-[#bae6fd]/50';
  return 'bg-[#fef9c3] text-[#854d0e] border-[#fde68a]/50';
};

// ─── Mini distribution scatter (energy vs sleep) ──────────────────────────────
const DistributionChart: React.FC<{
  distribution: SimulationResult['distribution'];
  highlightLow: number;
  highlightHigh: number;
  targetSleep: number;
}> = ({ distribution, highlightLow, highlightHigh, targetSleep }) => {
  if (!distribution || distribution.length === 0) return null;

  // Chart dimensions
  const W = 300;
  const H = 120;
  const PAD_L = 28;
  const PAD_B = 24;
  const PAD_T = 8;
  const PAD_R = 8;

  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Axis ranges
  const sleepVals = distribution.map((d) => d.sleepHours);
  const minSleep = Math.max(0, Math.floor(Math.min(...sleepVals)) - 0.5);
  const maxSleep = Math.ceil(Math.max(...sleepVals)) + 0.5;
  const minEnergy = 1;
  const maxEnergy = 10;

  const xScale = (s: number) => PAD_L + ((s - minSleep) / (maxSleep - minSleep)) * chartW;
  const yScale = (e: number) => PAD_T + chartH - ((e - minEnergy) / (maxEnergy - minEnergy)) * chartH;

  const hlX1 = xScale(highlightLow);
  const hlX2 = xScale(highlightHigh);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 130 }}>
      {/* Highlight band */}
      <rect
        x={hlX1}
        y={PAD_T}
        width={Math.max(0, hlX2 - hlX1)}
        height={chartH}
        fill="#7C5CFC"
        fillOpacity={0.08}
        rx={3}
      />

      {/* Y-axis ticks */}
      {[2, 5, 8].map((v) => (
        <g key={v}>
          <line
            x1={PAD_L} y1={yScale(v)}
            x2={W - PAD_R} y2={yScale(v)}
            stroke="#e2e7ff" strokeWidth={1}
          />
          <text x={PAD_L - 4} y={yScale(v) + 4} textAnchor="end" fontSize={8} fill="#94a3b8">
            {v}
          </text>
        </g>
      ))}

      {/* X-axis ticks */}
      {[Math.ceil(minSleep), targetSleep, Math.floor(maxSleep)].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
        <g key={v}>
          <text x={xScale(v)} y={H - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">
            {v}h
          </text>
        </g>
      ))}

      {/* Data points */}
      {distribution.map((d, i) => {
        const inRange = d.sleepHours >= highlightLow && d.sleepHours <= highlightHigh;
        return (
          <circle
            key={i}
            cx={xScale(d.sleepHours)}
            cy={yScale(d.energyLevel)}
            r={inRange ? 4 : 2.5}
            fill={inRange ? '#7C5CFC' : '#94a3b8'}
            fillOpacity={inRange ? 0.85 : 0.45}
          />
        );
      })}

      {/* Target vertical line */}
      <line
        x1={xScale(targetSleep)} y1={PAD_T}
        x2={xScale(targetSleep)} y2={H - PAD_B}
        stroke="#7C5CFC" strokeWidth={1.5} strokeDasharray="4 2"
        strokeOpacity={0.7}
      />
    </svg>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const SimulatorScreen: React.FC<SimulatorScreenProps> = ({ onBack }) => {
  const [sleepValue, setSleepValue] = useState<number>(8);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const runSimulation = useCallback(async (sleep: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        setError('Authentication required. Please sign in and try again.');
        setIsLoading(false);
        return;
      }

      const response = await runWhatIfSimulation(token, 'sleep', sleep);

      if (!response) {
        setError('The simulation request failed. Please check your connection and try again.');
        setIsLoading(false);
        return;
      }

      setResult(response.simulation);
      setHasRun(true);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePreset = (val: number) => {
    setSleepValue(val);
    setResult(null);
    setHasRun(false);
    setError(null);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSleepValue(val);
    setResult(null);
    setHasRun(false);
    setError(null);
  };

  const deltaIcon = (delta: number | null) => {
    if (delta === null) return <Minus className="w-4 h-4 text-[#94a3b8]" />;
    if (delta > 0.1) return <TrendingUp className="w-4 h-4 text-[#00685f]" />;
    if (delta < -0.1) return <TrendingDown className="w-4 h-4 text-[#ef4444]" />;
    return <Minus className="w-4 h-4 text-[#94a3b8]" />;
  };

  const deltaText = (delta: number | null) => {
    if (delta === null) return '—';
    const abs = Math.abs(delta).toFixed(1);
    if (delta > 0.1) return `+${abs} pts`;
    if (delta < -0.1) return `−${abs} pts`;
    return 'Similar';
  };

  const deltaColor = (delta: number | null) => {
    if (delta === null) return '#94a3b8';
    if (delta > 0.1) return '#00685f';
    if (delta < -0.1) return '#ef4444';
    return '#64748b';
  };

  return (
    <div className="max-w-[840px] mx-auto px-6 py-7 space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-[#6d7a77] hover:text-[#131b2e] dark:text-slate-300 dark:hover:text-white transition-colors"
          aria-label="Back to Overview"
        >
          <ChevronLeft className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {/* Page title */}
      <div>
        <div className="flex items-center gap-2 text-[12px] font-bold text-[#7C5CFC] tracking-wide mb-1 font-mono">
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>WHAT-IF SIMULATOR</span>
        </div>
        <h1 className="text-2xl font-bold text-[#131b2e] tracking-tight">
          Sleep & Energy Simulator
        </h1>
        <p className="text-[13.5px] text-[#3d4947] mt-1 leading-relaxed max-w-xl">
          Explore how different sleep durations are associated with your reported energy levels — using only your own historical check-in data.
        </p>
      </div>

      {/* Sleep duration selector */}
      <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff] shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-[#712ae2]" />
          <h2 className="text-[15px] font-bold text-[#131b2e]">Select Sleep Duration</h2>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {SLEEP_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold border transition-all duration-100 ${
                sleepValue === preset
                  ? 'bg-[#7C5CFC] text-white border-[#7C5CFC] shadow-sm'
                  : 'bg-[#faf8ff] text-[#3d4947] border-[#e2e7ff] hover:border-[#7C5CFC]/40 hover:bg-[#f5f0ff] dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:text-white dark:hover:bg-purple-900/30'
              }`}
              aria-pressed={sleepValue === preset}
            >
              {formatSleep(preset)}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[12px] text-[#6d7a77] font-semibold">
            <span>1h</span>
            <span className="text-[16px] font-extrabold text-[#131b2e]">{formatSleep(sleepValue)}</span>
            <span>12h</span>
          </div>
          <input
            type="range"
            min={1}
            max={12}
            step={0.5}
            value={sleepValue}
            onChange={handleSliderChange}
            className="w-full accent-[#7C5CFC] cursor-pointer"
            aria-label="Sleep duration slider"
          />
        </div>

        {/* Run button */}
        <button
          onClick={() => runSimulation(sleepValue)}
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22C7E8] text-white text-[14px] font-bold shadow-sm hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
          id="run-simulation-button"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analysing your data…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Simulate {formatSleep(sleepValue)} of Sleep
            </>
          )}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-200 text-[13px] text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {hasRun && result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Insufficient data */}
          {!result.available && (
            <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff] shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#7C5CFC] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-[14px] font-bold text-[#131b2e] mb-1">
                    Not Enough Data Yet
                  </h3>
                  <p className="text-[13px] text-[#3d4947] leading-relaxed">
                    {result.totalRecords < 3
                      ? `You have ${result.totalRecords} wellness check-in${result.totalRecords !== 1 ? 's' : ''} recorded. Log at least 3 to unlock the simulator.`
                      : `No recorded days match the ${result.sleepRangeLow}–${result.sleepRangeHigh}h sleep range. Try a different value, or log more check-ins over time.`
                    }
                  </p>
                  <p className="text-[12px] text-[#6d7a77] mt-2">
                    Use the Daily Check-In to log your sleep and energy each day. The more data you log, the more accurate your simulations will be.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Full result */}
          {result.available && (
            <>
              {/* Key metrics row */}
              <div className="grid grid-cols-3 gap-4">
                {/* Baseline energy */}
                <div className="bg-white rounded-2xl p-4 border border-[#e2e7ff] shadow-xs text-center">
                  <div className="text-[10px] font-bold text-[#6d7a77] uppercase tracking-wider mb-1 font-mono">
                    Your Avg Energy
                  </div>
                  <div
                    className="text-2xl font-extrabold tabular-nums"
                    style={{ color: energyColor(result.baselineAvgEnergy) }}
                  >
                    {result.baselineAvgEnergy?.toFixed(1) ?? '—'}
                    <span className="text-[13px] font-semibold text-[#94a3b8] ml-0.5">/10</span>
                  </div>
                  <div className="text-[11px] text-[#6d7a77] mt-0.5">
                    {result.totalRecords} day{result.totalRecords !== 1 ? 's' : ''} recorded
                  </div>
                </div>

                {/* Simulated energy */}
                <div className="bg-gradient-to-br from-[#f5f0ff] to-[#eef5ff] rounded-2xl p-4 border border-[#ddd6fe]/60 shadow-xs text-center">
                  <div className="text-[10px] font-bold text-[#7C5CFC] uppercase tracking-wider mb-1 font-mono">
                    At {formatSleep(result.value)} Sleep
                  </div>
                  <div
                    className="text-2xl font-extrabold tabular-nums"
                    style={{ color: energyColor(result.simulatedAvgEnergy) }}
                  >
                    {result.simulatedAvgEnergy?.toFixed(1) ?? '—'}
                    <span className="text-[13px] font-semibold text-[#94a3b8] ml-0.5">/10</span>
                  </div>
                  <div className="text-[11px] text-[#6d7a77] mt-0.5">
                    {result.sampleSize} matching day{result.sampleSize !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Delta */}
                <div className="bg-white rounded-2xl p-4 border border-[#e2e7ff] shadow-xs text-center">
                  <div className="text-[10px] font-bold text-[#6d7a77] uppercase tracking-wider mb-1 font-mono">
                    Difference
                  </div>
                  <div
                    className="text-2xl font-extrabold tabular-nums flex items-center justify-center gap-1.5"
                    style={{ color: deltaColor(result.energyDelta) }}
                  >
                    {deltaIcon(result.energyDelta)}
                    <span>{deltaText(result.energyDelta)}</span>
                  </div>
                  <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${confidenceBadgeStyle(result.confidence)}`}>
                    {result.confidence} confidence
                  </div>
                </div>
              </div>

              {/* Sleep range used */}
              <div className="bg-white rounded-2xl px-5 py-3 border border-[#e2e7ff] flex items-center gap-2 text-[12.5px] text-[#3d4947]">
                <Zap className="w-4 h-4 text-[#7C5CFC] shrink-0" />
                <span>
                  Sleep range used: <strong className="text-[#131b2e]">{result.sleepRangeLow}h – {result.sleepRangeHigh}h</strong>
                  &nbsp;({result.sampleSize} recorded day{result.sampleSize !== 1 ? 's' : ''} match this range out of {result.totalRecords} total)
                </span>
              </div>

              {/* Distribution chart */}
              {result.distribution && result.distribution.length > 0 && (
                <div className="bg-white rounded-3xl p-5 border border-[#e2e7ff] shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="w-4 h-4 text-[#7C5CFC]" />
                    <h3 className="text-[13px] font-bold text-[#131b2e]">Historical Distribution</h3>
                    <span className="text-[11px] text-[#6d7a77]">— sleep (x) vs energy (y)</span>
                  </div>
                  <DistributionChart
                    distribution={result.distribution}
                    highlightLow={result.sleepRangeLow}
                    highlightHigh={result.sleepRangeHigh}
                    targetSleep={result.value}
                  />
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-[#6d7a77]">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#7C5CFC] inline-block opacity-80" />
                      Matching range
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8] inline-block opacity-50" />
                      Other days
                    </span>
                  </div>
                </div>
              )}

              {/* NOVA Insight */}
              {result.insight && (() => {
                // Defensive: if insight is unexpectedly an object (e.g. { reply, action }),
                // extract the reply string. This prevents React error #31.
                const raw = result.insight as unknown;
                const insightText: string =
                  typeof raw === 'string'
                    ? raw
                    : typeof (raw as any)?.reply === 'string'
                    ? (raw as any).reply
                    : '';
                return insightText ? (
                  <div className="bg-gradient-to-br from-[#f5f0ff] via-white to-[#e8f8f5] rounded-3xl p-5 border border-[#ddd6fe]/60 shadow-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-[#7C5CFC]" />
                      <span className="text-[11px] font-bold tracking-wider text-[#7C5CFC] uppercase font-mono">
                        NOVA INSIGHT
                      </span>
                    </div>
                    <p className="text-[13.5px] text-[#3d4947] leading-relaxed">
                      {insightText}
                    </p>
                  </div>
                ) : null;
              })()}
            </>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2.5 p-4 bg-[#f8fafc] rounded-2xl border border-[#e2e7ff] text-[11.5px] text-[#64748b] leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#94a3b8]" />
            <span>
              <strong className="text-[#475569]">Observational data only.</strong>{' '}
              This simulation is based on associations in your historical check-in data and does not establish causation. It is not medical advice. Individual results may vary.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
