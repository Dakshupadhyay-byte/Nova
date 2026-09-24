import React from 'react';
import { 
  ChevronRight, 
  Lightbulb, 
  Terminal, 
  FileText,
  Clock,
  AlertCircle
} from 'lucide-react';
import { FocusBlock } from '../types';

interface FocusActivityListProps {
  blocks: FocusBlock[];
  onViewFullLogbook: () => void;
  onSelectBlock?: (block: FocusBlock) => void;
}

export const FocusActivityList: React.FC<FocusActivityListProps> = ({
  blocks,
  onViewFullLogbook,
  onSelectBlock,
}) => {
  const getTierBadge = (tier: FocusBlock['tier']) => {
    switch (tier) {
      case 'DEEP':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#d8f5ef] text-[#00685f] text-[10px] font-bold tracking-wider">
            DEEP
          </span>
        );
      case 'CORE':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#e0f2fe] text-[#0284c7] text-[10px] font-bold tracking-wider">
            CORE
          </span>
        );
      case 'LIGHT':
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#ede9fe] text-[#712ae2] text-[10px] font-bold tracking-wider">
            LIGHT
          </span>
        );
    }
  };

  const getBlockIcon = (index: number) => {
    if (index === 0) {
      return (
        <div className="w-9 h-9 rounded-xl bg-[#e6f7f4] text-[#00685f] flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4" />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
          <Terminal className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-[#ede9fe] text-[#712ae2] flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4" />
      </div>
    );
  };

  const getInterruptionIndicator = (count: number) => {
    if (count === 0) {
      return (
        <div className="flex items-center gap-1.5 text-[11.5px] text-[#00685f] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#008378]"></span>
          <span>0 interruptions</span>
        </div>
      );
    }
    if (count === 1) {
      return (
        <div className="flex items-center gap-1.5 text-[11.5px] text-amber-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>1 interruption</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-[11.5px] text-rose-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
        <span>{count} interruptions</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff]/80 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00685f]" />
            <h3 className="text-[16px] font-bold text-[#131b2e]">
              Today's Focus Activity
            </h3>
          </div>
          <span className="text-[12px] font-semibold text-[#6d7a77]">
            {blocks.length} Total Blocks
          </span>
        </div>

        {/* List of blocks */}
        <div className="space-y-3">
          {blocks.map((block, idx) => (
            <div
              key={block.id}
              onClick={() => onSelectBlock?.(block)}
              className="p-3 rounded-2xl border border-[#e2e7ff]/70 hover:border-[#99dfd5] hover:bg-[#faf8ff] transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {getBlockIcon(idx)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#131b2e] truncate group-hover:text-[#00685f] transition-colors">
                      {block.title}
                    </span>
                    {getTierBadge(block.tier)}
                  </div>
                  <div className="text-[11px] text-[#6d7a77] mt-0.5">
                    {block.time} • {block.durationMinutes} min flow
                  </div>
                </div>
              </div>

              {/* Status on right */}
              <div className="shrink-0 text-right">
                {getInterruptionIndicator(block.interruptions)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Link */}
      <button
        onClick={onViewFullLogbook}
        className="mt-5 pt-3.5 border-t border-[#e2e7ff]/80 w-full flex items-center justify-center gap-1.5 text-[11.5px] font-bold tracking-wider text-[#00685f] hover:text-[#005048] uppercase transition-colors"
      >
        <span>VIEW FULL 24-HR MULTIMODAL LOGBOOK</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
