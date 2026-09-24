import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Moon, 
  Activity, 
  Zap, 
  Brain,
  Calendar,
  Sparkles
} from 'lucide-react';
import { MetricOverview } from '../types';
import { VELOCITY_DATA } from '../data/mockData';

interface AnalyticsScreenProps {
  metrics: MetricOverview;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ metrics }) => {
  // Hourly focus distribution data (9 AM to 6 PM)
  const hourlyFocus = [
    { hour: '09:00', minutes: 25, intensity: 95 },
    { hour: '10:00', minutes: 15, intensity: 80 },
    { hour: '11:00', minutes: 25, intensity: 90 },
    { hour: '12:00', minutes: 0, intensity: 20 },
    { hour: '13:00', minutes: 10, intensity: 60 },
    { hour: '14:00', minutes: 17, intensity: 75 },
    { hour: '15:00', minutes: 12, intensity: 65 },
    { hour: '16:00', minutes: 0, intensity: 30 },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#00685f] tracking-wide mb-1 font-mono">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>LONGITUDINAL TELEMETRY INSIGHTS</span>
        </div>
        <h1 className="text-3xl font-bold text-[#131b2e] tracking-tight">
          Neuro-Harmonic Analytics
        </h1>
        <p className="text-[14px] text-[#3d4947] mt-1">
          Deep telemetry trends mapping biological recovery rhythms to high-order cognitive execution.
        </p>
      </div>

      {/* Top 3 High-Level Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff] shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#6d7a77] uppercase">
            <span>Weekly Flow Depth</span>
            <Brain className="w-4 h-4 text-[#00685f]" />
          </div>
          <div className="text-3xl font-extrabold text-[#131b2e] mt-2 tabular-nums">
            5.8 hrs
          </div>
          <p className="text-[12px] text-[#00685f] font-semibold mt-1">
            +18% higher than previous 7-day cycle
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff] shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#6d7a77] uppercase">
            <span>Sleep-to-Flow Ratio</span>
            <Moon className="w-4 h-4 text-[#712ae2]" />
          </div>
          <div className="text-3xl font-extrabold text-[#712ae2] mt-2 tabular-nums">
            0.84 r
          </div>
          <p className="text-[12px] text-[#3d4947] mt-1">
            High statistical correlation (+0.84 Pearson)
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff] shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#6d7a77] uppercase">
            <span>Zone 2 Priming Index</span>
            <Zap className="w-4 h-4 text-[#0284c7]" />
          </div>
          <div className="text-3xl font-extrabold text-[#0284c7] mt-2 tabular-nums">
            105%
          </div>
          <p className="text-[12px] text-[#00685f] font-semibold mt-1">
            Mitochondrial clearance target exceeded
          </p>
        </div>
      </div>

      {/* Hourly Focus Distribution Heat-bar */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#e2e7ff] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#131b2e]">Hourly Circadian Focus Velocity</h3>
            <p className="text-[12px] text-[#6d7a77]">Cognitive intensity measured across work intervals</p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#e6f7f4] text-[#00685f] text-[11px] font-bold">
            Alpha Baseline Locked
          </span>
        </div>

        <div className="grid grid-cols-8 gap-3 mt-6">
          {hourlyFocus.map((hf) => (
            <div key={hf.hour} className="flex flex-col items-center gap-2">
              <div className="w-full bg-[#f0f3fd] h-36 rounded-2xl p-1 flex flex-col justify-end">
                <div
                  style={{ height: `${(hf.minutes / 30) * 100}%` }}
                  className={`w-full rounded-xl transition-all ${
                    hf.minutes >= 20
                      ? 'bg-[#00685f]'
                      : hf.minutes > 0
                      ? 'bg-[#0284c7]'
                      : 'bg-transparent'
                  }`}
                  title={`${hf.minutes} min flow`}
                />
              </div>
              <span className="text-[11px] font-bold text-[#131b2e] font-mono tabular-nums">{hf.hour}</span>
              <span className="text-[10px] text-[#6d7a77]">{hf.minutes}m</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sleep vs Focus Correlation Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff] shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#712ae2]" />
            <h3 className="text-base font-bold text-[#131b2e]">Sleep Duration vs Focus Output</h3>
          </div>
          <p className="text-[13px] text-[#3d4947] leading-relaxed mb-4">
            Over 28 consecutive days of biometric sync, nights with ≥ 7 hours sleep produced an average of <strong>75 minutes of deep flow</strong> with 0.6 interruptions, whereas sub-7-hour nights averaged only 48 minutes with 2.4 interruptions.
          </p>
          <div className="p-4 bg-[#faf8ff] rounded-2xl border border-[#dae2fd] text-[12px] space-y-2">
            <div className="flex justify-between">
              <span className="text-[#6d7a77]">Target Sleep tonight:</span>
              <span className="font-bold text-[#712ae2]">7h 45m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6d7a77]">Current Accumulated Deficit:</span>
              <span className="font-bold text-rose-600">1.5 hours</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff] shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#00685f]" />
            <h3 className="text-base font-bold text-[#131b2e]">Autonomic Tone & Heart Rate Variability</h3>
          </div>
          <p className="text-[13px] text-[#3d4947] leading-relaxed mb-4">
            Morning parasympathetic dominance was sustained for 4.2 hours following Zone 2 cardio, suppressing cortisol spikes during the 11:15 AM Protocol Refactor sprint.
          </p>
          <div className="p-4 bg-[#eefaf8] rounded-2xl border border-[#a2e3d9] text-[12px] space-y-2">
            <div className="flex justify-between">
              <span className="text-[#3d4947]">Peak HRV (Morning Plunge):</span>
              <span className="font-bold text-[#00685f]">92 ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#3d4947]">Resting Heart Rate:</span>
              <span className="font-bold text-[#00685f]">54 bpm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
