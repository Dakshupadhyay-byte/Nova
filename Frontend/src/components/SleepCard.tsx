import React from 'react';
import { Moon } from 'lucide-react';
import { MetricOverview } from '../types';

interface SleepCardProps {
  metrics: MetricOverview;
  onOpenDetails?: () => void;
}

export const SleepCard: React.FC<SleepCardProps> = ({ metrics, onOpenDetails }) => {
  const hasSleepData = metrics?.sleepHours != null && !isNaN(Number(metrics.sleepHours));
  const formattedSleepHours = hasSleepData ? Number(metrics.sleepHours).toFixed(1) : '--';

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

        {/* Big number & Status pill */}
        <div className="flex items-baseline gap-2.5">
          <span className={`text-3xl font-extrabold tracking-tight tabular-nums ${
            hasSleepData ? 'text-[#131b2e]' : 'text-[#94a3b8]'
          }`}>
            {formattedSleepHours}
          </span>
          <span className={`text-[14px] font-semibold ${
            hasSleepData ? 'text-[#6d7a77]' : 'text-[#94a3b8]'
          }`}>
            hrs
          </span>
          <div className="ml-auto flex flex-col items-end">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
              hasSleepData ? 'bg-[#e6f7f4] text-[#00685f]' : 'bg-[#f1f5f9] text-[#64748b]'
            }`}>
              {hasSleepData ? 'Logged' : 'Not Available'}
            </span>
          </div>
        </div>

        {/* Status explanation */}
        <div className="text-[12px] text-[#64748b] mt-2">
          Sleep stage telemetry is not currently synced from Health Connect.
        </div>
      </div>

      {/* Segmented Stages Track - Neutral Track */}
      <div className="mt-4">
        <div className="w-full h-2 rounded-full bg-[#f1f5f9] overflow-hidden flex">
          <div style={{ width: '100%' }} className="h-full bg-slate-200" title="Stage breakdown unavailable" />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#94a3b8] mt-2">
          <span>Sleep Stages: <strong className="text-[#64748b]">N/A</strong></span>
          <span>Sync Status: <strong className="text-[#64748b]">Pending</strong></span>
        </div>
      </div>
    </div>
  );
};

