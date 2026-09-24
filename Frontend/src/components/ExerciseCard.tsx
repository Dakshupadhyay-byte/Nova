import React from 'react';
import { Flame, Zap } from 'lucide-react';
import { MetricOverview } from '../types';

interface ExerciseCardProps {
  metrics: MetricOverview;
  onOpenDetails?: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ metrics, onOpenDetails }) => {
  return (
    <div 
      onClick={onOpenDetails}
      className="bg-white rounded-3xl p-5 border border-[#e2e7ff]/80 shadow-xs flex flex-col justify-between hover:border-[#b2e7df] transition-all cursor-pointer group"
    >
      <div>
        <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-[#6d7a77] uppercase font-mono mb-2">
          <span>TODAY'S EXERCISE</span>
          <Flame className="w-4 h-4 text-orange-500" />
        </div>

        {/* Big number & active pill */}
        <div className="flex items-baseline gap-2.5">
          <span className="text-3xl font-extrabold text-[#131b2e] tracking-tight tabular-nums">
            {metrics.exerciseMinutes}
          </span>
          <span className="text-[14px] font-semibold text-[#6d7a77]">min</span>
          <span className="ml-auto px-2.5 py-0.5 rounded-full bg-[#e6f7f4] text-[#00685f] text-[11px] font-bold tracking-wide">
            Active
          </span>
        </div>

        {/* Calories and Target */}
        <div className="flex items-center justify-between text-[12px] mt-2 text-[#3d4947]">
          <div className="flex items-center gap-1 text-[#00685f] font-semibold">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{metrics.exerciseCalories} kcal burned</span>
          </div>
          <span className="text-[#6d7a77]">Target {metrics.exerciseTargetCalories} kcal</span>
        </div>
      </div>

      {/* Progress Track & Zones */}
      <div className="mt-4">
        {/* Progress bar with teal gradient */}
        <div className="w-full h-2 rounded-full bg-[#f0f3fd] overflow-hidden flex">
          {/* Zone 2 segment */}
          <div 
            style={{ width: `${(metrics.zone2Minutes / metrics.exerciseMinutes) * 100}%` }} 
            className="h-full bg-gradient-to-r from-[#00685f] to-[#0ea5e9] rounded-l-full"
          />
          {/* HIIT segment */}
          <div 
            style={{ width: `${(metrics.hiitMinutes / metrics.exerciseMinutes) * 100}%` }} 
            className="h-full bg-[#38bdf8] rounded-r-full"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#6d7a77] mt-2">
          <span>Zone 2: {metrics.zone2Minutes}m · {metrics.zone2Calories} kcal</span>
          <span>HIIT: {metrics.hiitMinutes}m · {metrics.hiitCalories} kcal</span>
        </div>
      </div>
    </div>
  );
};
