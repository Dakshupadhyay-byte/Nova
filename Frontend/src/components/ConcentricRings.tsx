import React, { useState } from 'react';
import { RefreshCw, Info, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { MetricOverview } from '../types';

interface ConcentricRingsProps {
  metrics: MetricOverview;
  onInspectBioData: () => void;
  onRefresh?: () => void;
}

export const ConcentricRings: React.FC<ConcentricRingsProps> = ({
  metrics,
  onInspectBioData,
  onRefresh,
}) => {
  const [hoveredRing, setHoveredRing] = useState<'outer' | 'mid' | 'inner' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Concentric circle SVG properties
  const size = 260;
  const center = size / 2;
  const strokeWidth = 11;

  // Radii for the 3 concentric rings
  const outerRadius = 104;
  const midRadius = 88;
  const innerRadius = 72;

  const outerCircumference = 2 * Math.PI * outerRadius;
  const midCircumference = 2 * Math.PI * midRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  // Percentage values
  const outerPct = metrics.sleepAlignmentPercent; // 81%
  const midPct = metrics.exerciseBurnPercent;      // 84%
  const innerPct = metrics.focusFlowPercent;       // 76%

  const outerDash = (outerPct / 100) * outerCircumference;
  const midDash = (midPct / 100) * midCircumference;
  const innerDash = (innerPct / 100) * innerCircumference;

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff]/80 shadow-xs relative overflow-hidden transition-all duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold tracking-wider text-[#6d7a77] uppercase font-mono">
            COMPOSITE EQUILIBRIUM
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e6f7f4] border border-[#a2e3d9]/70 text-[#00685f] text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#008378] animate-pulse"></span>
            <span>Live Interactive</span>
          </div>
        </div>

        <button
          onClick={handleRefreshClick}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium text-[#00685f] bg-[#eefaf8] hover:bg-[#e2f5f1] border border-[#b2e7df]/80 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Updated 3m ago</span>
        </button>
      </div>

      <h2 className="text-[22px] font-bold tracking-tight text-[#131b2e] mb-4">
        Focus & Neuro Balance
      </h2>

      {/* Sub-notice pill banner */}
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#f4f7ff] border border-[#dae2fd]/70 text-[#3d4947] text-[12px] mb-6">
        <Info className="w-4 h-4 text-[#712ae2] shrink-0" />
        <span>Hover or click rings & legend items for deep granular telemetry breakdown</span>
      </div>

      {/* Main Rings & Legend Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* SVG Concentric Rings */}
        <div className="lg:col-span-5 flex justify-center relative select-none">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            <defs>
              {/* Outer Ring Gradient (Sleep - Violet) */}
              <linearGradient id="outerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8a4cfc" />
                <stop offset="100%" stopColor="#712ae2" />
              </linearGradient>

              {/* Mid Ring Gradient (Burn - Cyan/Blue) */}
              <linearGradient id="midGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>

              {/* Inner Ring Gradient (Focus - Teal) */}
              <linearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00a394" />
                <stop offset="100%" stopColor="#00685f" />
              </linearGradient>
            </defs>

            {/* Background Tracks */}
            <circle
              cx={center}
              cy={center}
              r={outerRadius}
              fill="none"
              stroke="#eaedff"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={center}
              cy={center}
              r={midRadius}
              fill="none"
              stroke="#eaedff"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={center}
              cy={center}
              r={innerRadius}
              fill="none"
              stroke="#eaedff"
              strokeWidth={strokeWidth}
            />

            {/* Active Outer Ring (Sleep) */}
            <circle
              cx={center}
              cy={center}
              r={outerRadius}
              fill="none"
              stroke="url(#outerGradient)"
              strokeWidth={hoveredRing === 'outer' ? strokeWidth + 2 : strokeWidth}
              strokeDasharray={outerCircumference}
              strokeDashoffset={outerCircumference - outerDash}
              strokeLinecap="round"
              className="transition-all duration-300 cursor-pointer"
              onMouseEnter={() => setHoveredRing('outer')}
              onMouseLeave={() => setHoveredRing(null)}
              opacity={hoveredRing && hoveredRing !== 'outer' ? 0.35 : 1}
            />

            {/* Active Mid Ring (Exercise) */}
            <circle
              cx={center}
              cy={center}
              r={midRadius}
              fill="none"
              stroke="url(#midGradient)"
              strokeWidth={hoveredRing === 'mid' ? strokeWidth + 2 : strokeWidth}
              strokeDasharray={midCircumference}
              strokeDashoffset={midCircumference - midDash}
              strokeLinecap="round"
              className="transition-all duration-300 cursor-pointer"
              onMouseEnter={() => setHoveredRing('mid')}
              onMouseLeave={() => setHoveredRing(null)}
              opacity={hoveredRing && hoveredRing !== 'mid' ? 0.35 : 1}
            />

            {/* Active Inner Ring (Focus Flow) */}
            <circle
              cx={center}
              cy={center}
              r={innerRadius}
              fill="none"
              stroke="url(#innerGradient)"
              strokeWidth={hoveredRing === 'inner' ? strokeWidth + 2 : strokeWidth}
              strokeDasharray={innerCircumference}
              strokeDashoffset={innerCircumference - innerDash}
              strokeLinecap="round"
              className="transition-all duration-300 cursor-pointer"
              onMouseEnter={() => setHoveredRing('inner')}
              onMouseLeave={() => setHoveredRing(null)}
              opacity={hoveredRing && hoveredRing !== 'inner' ? 0.35 : 1}
            />
          </svg>

          {/* Center Text Badge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-extrabold text-[#00685f] tracking-tight tabular-nums leading-none">
              {hoveredRing === 'outer'
                ? metrics.sleepAlignmentPercent
                : hoveredRing === 'mid'
                ? metrics.exerciseBurnPercent
                : hoveredRing === 'inner'
                ? metrics.focusFlowPercent
                : metrics.focusIndex}
            </span>
            <span className="text-[10px] font-bold text-[#131b2e] tracking-wider mt-1 uppercase">
              {hoveredRing === 'outer'
                ? 'SLEEP ALIGNMENT'
                : hoveredRing === 'mid'
                ? 'BURN EFFICIENCY'
                : hoveredRing === 'inner'
                ? 'FLOW DURATION'
                : 'FOCUS INDEX'}
            </span>
            <span className="text-[9px] font-semibold text-[#6d7a77] tracking-widest uppercase">
              BIO-INDEX
            </span>
          </div>
        </div>

        {/* Legend Cards (3 items) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Item 1: Focus Flow */}
          <div
            onMouseEnter={() => setHoveredRing('inner')}
            onMouseLeave={() => setHoveredRing(null)}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
              hoveredRing === 'inner'
                ? 'bg-[#eefaf8] border-[#99dfd5] shadow-xs'
                : 'bg-[#faf8ff] border-[#e2e7ff]/80 hover:bg-[#f4f7ff]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00685f]"></span>
                <span className="text-[13.5px] font-bold text-[#131b2e]">Focus Flow</span>
                <span className="px-2 py-0.5 rounded-md bg-[#d8f5ef] text-[#00685f] text-[10px] font-bold tracking-wider">
                  INNER RING
                </span>
              </div>
              <span className="text-lg font-bold text-[#00685f] tabular-nums">
                {metrics.focusFlowPercent}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-[#3d4947]">
              <span>{metrics.focusSessionsCount} sessions completed</span>
              <span className="font-semibold text-[#131b2e]">{metrics.focusMinutesTotal} min total</span>
            </div>
          </div>

          {/* Item 2: Exercise & Active Burn */}
          <div
            onMouseEnter={() => setHoveredRing('mid')}
            onMouseLeave={() => setHoveredRing(null)}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
              hoveredRing === 'mid'
                ? 'bg-[#f0f9ff] border-[#7dd3fc] shadow-xs'
                : 'bg-[#faf8ff] border-[#e2e7ff]/80 hover:bg-[#f4f7ff]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]"></span>
                <span className="text-[13.5px] font-bold text-[#131b2e]">Exercise & Active Burn</span>
                <span className="px-2 py-0.5 rounded-md bg-[#e0f2fe] text-[#0284c7] text-[10px] font-bold tracking-wider">
                  MID RING
                </span>
              </div>
              <span className="text-lg font-bold text-[#0284c7] tabular-nums">
                {metrics.exerciseBurnPercent}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-[#3d4947]">
              <span>{metrics.exerciseMinutes} min · {metrics.exerciseCalories} kcal</span>
              <span className="font-semibold text-[#131b2e]">105% of target</span>
            </div>
          </div>

          {/* Item 3: Sleep Alignment */}
          <div
            onMouseEnter={() => setHoveredRing('outer')}
            onMouseLeave={() => setHoveredRing(null)}
            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
              hoveredRing === 'outer'
                ? 'bg-[#f8f5ff] border-[#c4b5fd] shadow-xs'
                : 'bg-[#faf8ff] border-[#e2e7ff]/80 hover:bg-[#f4f7ff]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#712ae2]"></span>
                <span className="text-[13.5px] font-bold text-[#131b2e]">Sleep Alignment</span>
                <span className="px-2 py-0.5 rounded-md bg-[#ede9fe] text-[#712ae2] text-[10px] font-bold tracking-wider">
                  OUTER RING
                </span>
              </div>
              <span className="text-lg font-bold text-[#712ae2] tabular-nums">
                {metrics.sleepAlignmentPercent}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-[#3d4947]">
              <span>{metrics.sleepHours}h recorded</span>
              <span className="font-semibold text-[#131b2e]">Target {metrics.sleepGoalHours.toFixed(1)}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Alert / Resonance Link */}
      <div className="mt-6 pt-4 border-t border-[#e2e7ff]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-[#3d4947]">
          <ShieldCheck className="w-4 h-4 text-[#00685f] shrink-0" />
          <span>
            Neuro-harmonic resonance in alpha rhythm range (<strong className="font-semibold text-[#131b2e]">{metrics.alphaFrequencyHz} Hz</strong>)
          </span>
        </div>
        <button
          onClick={onInspectBioData}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-bold tracking-wider text-[#00685f] hover:text-[#005048] uppercase transition-colors self-start sm:self-auto"
        >
          <span>INSPECT BIO-DATA</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
