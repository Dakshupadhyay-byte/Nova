/**
 * WhatIfSimulatorCard.tsx
 *
 * Dashboard card that introduces the What-If Simulator feature.
 * Appears on the main Overview dashboard.
 * Clicking "Try a What-If" navigates to the SimulatorScreen.
 */

import React from 'react';
import { Sparkles, BrainCircuit, ArrowRight, Moon, Zap } from 'lucide-react';

interface WhatIfSimulatorCardProps {
  onOpenSimulator: () => void;
}

export const WhatIfSimulatorCard: React.FC<WhatIfSimulatorCardProps> = ({ onOpenSimulator }) => {
  return (
    <div className="bg-gradient-to-br from-[#f5f0ff] via-[#eef5ff] to-[#e8f8f5] rounded-3xl p-6 border border-[#ddd6fe]/60 shadow-xs overflow-hidden relative">
      {/* Decorative glow orbs */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#7C5CFC]/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full bg-[#00685f]/10 blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#22C7E8] flex items-center justify-center shadow-sm">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-[#7C5CFC] uppercase font-mono">
                WHAT-IF SIMULATOR
              </span>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-[#7C5CFC]/60" />
        </div>

        {/* Title & description */}
        <h3 className="text-[15px] font-bold text-[#131b2e] leading-snug mt-1">
          Explore Your Sleep & Energy Patterns
        </h3>
        <p className="text-[12.5px] text-[#3d4947] mt-1.5 leading-relaxed">
          See how different sleep durations are associated with your energy levels — based on your own historical check-in data.
        </p>

        {/* Mini stat pills */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/70 rounded-full border border-[#ddd6fe]/50 text-[11px] font-semibold text-[#712ae2]">
            <Moon className="w-3 h-3" />
            <span>Sleep Duration</span>
          </div>
          <span className="text-[#adb5bd] text-[12px]">→</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/70 rounded-full border border-[#99dfd5]/50 text-[11px] font-semibold text-[#00685f]">
            <Zap className="w-3 h-3" />
            <span>Energy Level</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onOpenSimulator}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22C7E8] text-white text-[13px] font-bold shadow-sm hover:shadow-md hover:opacity-95 active:scale-[0.98] transition-all duration-150"
          id="what-if-simulator-cta"
          aria-label="Open What-If Simulator"
        >
          Try a What-If
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
