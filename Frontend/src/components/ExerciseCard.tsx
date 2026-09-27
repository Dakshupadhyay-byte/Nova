import React from 'react';
import { Flame, Footprints, Navigation } from 'lucide-react';
import { MetricOverview, DailyHealthMetric } from '../types';

interface ExerciseCardProps {
  metrics: MetricOverview;
  todayHealth?: DailyHealthMetric | null;
  isLoadingHealth?: boolean;
  onOpenDetails?: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  metrics,
  todayHealth,
  isLoadingHealth,
  onOpenDetails,
}) => {
  const hasRealData = todayHealth !== undefined && todayHealth !== null;

  const exerciseMins = hasRealData ? todayHealth.exercise_minutes : metrics.exerciseMinutes;
  const stepsCount = hasRealData ? todayHealth.steps : null;
  const distanceKm = hasRealData && todayHealth.exercise_distance_meters > 0
    ? (todayHealth.exercise_distance_meters / 1000).toFixed(2)
    : null;

  return (
    <div 
      onClick={onOpenDetails}
      className="bg-white rounded-3xl p-5 border border-[#e2e7ff]/80 shadow-xs flex flex-col justify-between hover:border-[#b2e7df] transition-all cursor-pointer group"
    >
      <div>
        <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-[#6d7a77] uppercase font-mono mb-2">
          <span>TODAY'S EXERCISE & STEPS</span>
          <Flame className="w-4 h-4 text-orange-500" />
        </div>

        {isLoadingHealth ? (
          <div className="py-3 text-[13px] text-[#6d7a77] animate-pulse">
            Loading health telemetry...
          </div>
        ) : hasRealData ? (
          <div>
            {/* Exercise Minutes & Active Pill */}
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-[#131b2e] tracking-tight tabular-nums">
                {exerciseMins}
              </span>
              <span className="text-[14px] font-semibold text-[#6d7a77]">min exercise</span>
              <span className="ml-auto px-2.5 py-0.5 rounded-full bg-[#e6f7f4] text-[#00685f] text-[11px] font-bold tracking-wide">
                Synced
              </span>
            </div>

            {/* Real Steps & Real Distance */}
            <div className="flex items-center justify-between text-[12.5px] mt-2.5 text-[#3d4947]">
              <div className="flex items-center gap-1.5 text-[#00685f] font-bold">
                <Footprints className="w-4 h-4 text-[#00685f]" />
                <span className="tabular-nums">{stepsCount !== null ? stepsCount.toLocaleString() : 0} steps</span>
              </div>
              {distanceKm && (
                <div className="flex items-center gap-1 text-[#6d7a77] font-semibold">
                  <Navigation className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>{distanceKm} km</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="text-[13.5px] font-semibold text-[#6d7a77]">
              No health data recorded today.
            </div>
            <div className="text-[11.5px] text-[#94a3b8] mt-1">
              Sync Health Connect to ingest step & exercise telemetry.
            </div>
          </div>
        )}
      </div>

      {/* Progress Track */}
      <div className="mt-4">
        <div className="w-full h-2 rounded-full bg-[#f0f3fd] overflow-hidden flex">
          <div 
            style={{ width: `${hasRealData ? Math.min(100, (exerciseMins / 30) * 100) : (metrics.exerciseMinutes / 30) * 100}%` }} 
            className="h-full bg-gradient-to-r from-[#00685f] to-[#0ea5e9] rounded-full"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#6d7a77] mt-2">
          <span>{hasRealData ? `Target: 30 min daily` : `Target: ${metrics.exerciseMinutes} min`}</span>
          <span>{hasRealData ? (stepsCount !== null ? `${stepsCount} steps total` : '0 steps') : `${metrics.exerciseCalories} kcal`}</span>
        </div>
      </div>
    </div>
  );
};

