import React from 'react';
import { Sparkles, BellRing } from 'lucide-react';

interface NovaNoticedCardProps {
  onViewPatternDetails: () => void;
  onSetWindDownReminder: () => void;
  isReminderSet?: boolean;
}

export const NovaNoticedCard: React.FC<NovaNoticedCardProps> = ({
  onViewPatternDetails,
  onSetWindDownReminder,
  isReminderSet = false,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e2e7ff]/80 shadow-xs relative overflow-hidden transition-all duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#712ae2] flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-[12px] font-bold tracking-wider text-[#712ae2] uppercase font-mono">
            NOVA NOTICED
          </span>
        </div>
        <span className="text-[11px] font-medium text-[#6d7a77]">
          98% confidence
        </span>
      </div>

      {/* Insight Quote */}
      <blockquote className="text-[14px] leading-relaxed text-[#131b2e] font-medium mb-5">
        &ldquo;Your focus tends to be <strong className="text-[#00685f] font-bold">24% longer and deeper</strong> after nights with 7+ hours of sleep. Try an earlier wind-down tonight to restore executive stamina.&rdquo;
      </blockquote>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          onClick={onViewPatternDetails}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#712ae2] hover:bg-[#5f1ec2] text-white text-[13px] font-semibold transition-all duration-150 shadow-xs hover:shadow-md cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>View Pattern Details</span>
        </button>

        <button
          onClick={onSetWindDownReminder}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all duration-150 cursor-pointer ${
            isReminderSet
              ? 'bg-[#eefaf8] border-[#00685f] text-[#00685f]'
              : 'bg-white hover:bg-[#faf8ff] border-[#dae2fd] text-[#131b2e]'
          }`}
        >
          <BellRing className={`w-3.5 h-3.5 ${isReminderSet ? 'text-[#00685f]' : 'text-[#6d7a77]'}`} />
          <span>{isReminderSet ? 'Reminder Set for 10:15 PM' : 'Set Wind-down Reminder'}</span>
        </button>
      </div>
    </div>
  );
};
