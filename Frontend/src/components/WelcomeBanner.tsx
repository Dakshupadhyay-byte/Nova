import React from 'react';
import { Target, ArrowRight } from 'lucide-react';

interface WelcomeBannerProps {
  onStartFocus: () => void;
  timeframe: 'today' | '7days' | 'cycles';
  onChangeTimeframe: (tf: 'today' | '7days' | 'cycles') => void;
  syncCycle: number;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  onStartFocus,
  timeframe,
  onChangeTimeframe,
  syncCycle,
}) => {
  return (
    <div className="space-y-6 mb-8">
      {/* Top Header Row with Timeframe Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {/* Greeting */}
          <h1 className="text-3xl lg:text-[34px] font-bold text-[#131b2e] tracking-tight leading-tight">
            Good evening 👋 Here's your focus & wellness overview.
          </h1>
          <p className="text-[14px] text-[#3d4947] max-w-2xl mt-1.5 leading-relaxed">
            See how your focus, sleep, and energy are shaping your day.
          </p>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center p-1 bg-[#eaedff]/70 border border-[#dae2fd]/70 rounded-full shrink-0">
          <button
            onClick={() => onChangeTimeframe('today')}
            className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-150 ${
              timeframe === 'today'
                ? 'bg-[#00685f] text-white shadow-xs'
                : 'text-[#3d4947] hover:text-[#131b2e]'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onChangeTimeframe('7days')}
            className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-150 ${
              timeframe === '7days'
                ? 'bg-[#00685f] text-white shadow-xs'
                : 'text-[#3d4947] hover:text-[#131b2e]'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => onChangeTimeframe('cycles')}
            className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-150 ${
              timeframe === 'cycles'
                ? 'bg-[#00685f] text-white shadow-xs'
                : 'text-[#3d4947] hover:text-[#131b2e]'
            }`}
          >
            Cycles
          </button>
        </div>
      </div>

      {/* "Ready to focus?" Action Banner Card */}
      <div className="bg-[#eefaf8] border border-[#a2e3d9]/70 rounded-2xl p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00685f] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Target className="w-6 h-6 text-[#89f5e7]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[16px] font-bold text-[#131b2e]">
                Ready to focus?
              </span>
            </div>
            <p className="text-[13px] text-[#3d4947] mt-0.5">
              Start a 25-minute focus session and make progress on what matters.
            </p>
          </div>
        </div>

        <button
          onClick={onStartFocus}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-[13.5px] font-bold transition-all duration-150 shadow-sm hover:shadow-md cursor-pointer shrink-0"
        >
          <span>Start Focus Session</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
