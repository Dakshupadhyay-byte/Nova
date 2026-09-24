import React from 'react';
import { Moon } from 'lucide-react';
import { MetricOverview } from '../types';

interface SleepCardProps {
  metrics: MetricOverview;
  onOpenDetails?: () => void;
}

export const SleepCard: React.FC<SleepCardProps> = ({ metrics, onOpenDetails }) => {
  return (
    <div 
      onClick={onOpenDetails}
      className="bg-white rounded-3xl p-5 border border-[#e2e7ff]/80 shadow-xs flex flex-col justify-between hover:border-[#c4b5fd] transition-all cursor-pointer group"
    >
      <div>
        <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-[#6d7a77] uppercase font-mono mb-2">
          <span>SLEEP RHYTHM</span>
          <Moon className="w-4 h-4 text-[#712ae2]" />
        </div>

        {/* Big number & Goal pill */}
        <div className="flex items-baseline gap-2.5">
          <span className="text-3xl font-extrabold text-[#131b2e] tracking-tight tabular-nums">
            {metrics.sleepHours}
          </span>
          <span className="text-[14px] font-semibold text-[#6d7a77]">hrs</span>
          <div className="ml-auto flex flex-col items-end">
            <span className="px-2.5 py-0.5 rounded-full bg-[#f4effe] text-[#712ae2] text-[11px] font-bold tracking-wide">
              Goal {metrics.sleepGoalHours.toFixed(1)}h
            </span>
          </div>
        </div>

        {/* Deficit explanation */}
        <div className="text-[12px] text-[#3d4947] mt-2">
          Below target — <span className="font-semibold text-rose-600">{metrics.sleepDeficitHours}h sleep deficit</span> accumulated.
        </div>
      </div>

      {/* Segmented Stages Track */}
      <div className="mt-4">
        {/* Color segments: Deep (indigo/violet), Light (purple), REM (cyan/teal), Awake (coral/pink) */}
        <div className="w-full h-2 rounded-full bg-[#f0f3fd] overflow-hidden flex gap-0.5">
          <div style={{ width: '22%' }} className="h-full bg-[#712ae2] rounded-l-full" title="Deep: 1h 24m" />
          <div style={{ width: '45%' }} className="h-full bg-[#9f7aea]" title="Light: 3h 14m" />
          <div style={{ width: '21%' }} className="h-full bg-[#008378]" title="REM: 1h 10m" />
          <div style={{ width: '12%' }} className="h-full bg-[#f43f5e] rounded-r-full" title="Awake: 42m" />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#6d7a77] mt-2">
          <span>Deep: <strong className="text-[#131b2e]">{metrics.deepSleep}</strong></span>
          <span>Awake: <strong className="text-rose-600">{metrics.awakeSleep}</strong></span>
        </div>
      </div>
    </div>
  );
};
