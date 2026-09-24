import React from 'react';
import { X, Sparkles, TrendingUp, Moon, Clock, CheckCircle2 } from 'lucide-react';

interface PatternDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetReminder: () => void;
  isReminderSet: boolean;
}

export const PatternDetailsModal: React.FC<PatternDetailsModalProps> = ({
  isOpen,
  onClose,
  onSetReminder,
  isReminderSet,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-[#dae2fd] shadow-2xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#eaedff]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f4effe] text-[#712ae2] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#131b2e]">Nova Neural Pattern Discovery</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#f4effe] text-[#712ae2] text-[10px] font-bold">
                  98% Confidence
                </span>
              </div>
              <p className="text-[12px] text-[#6d7a77]">Biometric Correlation Analysis (Last 30 Days)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f0f3fd] hover:bg-[#eaedff] flex items-center justify-center text-[#3d4947] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-5">
          {/* Key Metric Headline */}
          <div className="p-4 rounded-2xl bg-[#faf8ff] border border-[#dae2fd]">
            <div className="text-[12px] font-bold text-[#712ae2] uppercase tracking-wider font-mono">
              Pattern Observation #409
            </div>
            <p className="text-[15px] font-bold text-[#131b2e] mt-1.5 leading-snug">
              When sleep duration crosses 7.0 hours, next-day uninterrupted flow blocks increase by <span className="text-[#00685f]">+24%</span> with 48% fewer context switches.
            </p>
          </div>

          {/* Comparison Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-[#e2e7ff] text-left">
              <div className="text-[11px] font-bold text-[#6d7a77] uppercase flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-rose-500" />
                <span>&lt; 7.0 Hours Sleep</span>
              </div>
              <div className="text-2xl font-bold text-[#131b2e] mt-2 tabular-nums">48 min</div>
              <div className="text-[11.5px] text-[#6d7a77] mt-0.5">Avg daily deep flow</div>
              <div className="text-[11px] text-rose-600 font-semibold mt-1">2.4 context switches / block</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f0faf7] border border-[#a2e3d9] text-left">
              <div className="text-[11px] font-bold text-[#00685f] uppercase flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#00685f]" />
                <span>&ge; 7.0 Hours Sleep</span>
              </div>
              <div className="text-2xl font-bold text-[#00685f] mt-2 tabular-nums">75 min</div>
              <div className="text-[11.5px] text-[#3d4947] mt-0.5">Avg daily deep flow (+24%)</div>
              <div className="text-[11px] text-[#00685f] font-semibold mt-1">0.6 context switches / block</div>
            </div>
          </div>

          {/* Recommended Wind-Down Protocol */}
          <div className="p-4 rounded-2xl bg-[#faf8ff] border border-[#dae2fd]">
            <div className="text-[13px] font-bold text-[#131b2e] mb-2">Recommended Tonight:</div>
            <ul className="space-y-2 text-[12.5px] text-[#3d4947]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00685f] shrink-0 mt-0.5" />
                <span><strong>10:15 PM Wind-Down:</strong> Dim screens and switch to warm 2700K ambient illumination.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00685f] shrink-0 mt-0.5" />
                <span><strong>Theta Soundscape:</strong> Enable 6.0 Hz binaural drift 15 minutes before bed.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00685f] shrink-0 mt-0.5" />
                <span><strong>Target Sleep Duration:</strong> 7h 45m to fully eliminate the 1.5h accumulated debt.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-[#eaedff] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#3d4947] hover:bg-[#f0f3fd]"
          >
            Close
          </button>
          <button
            onClick={() => {
              onSetReminder();
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-[13px] font-bold text-white bg-[#712ae2] hover:bg-[#5f1ec2] transition-colors shadow-xs"
          >
            {isReminderSet ? 'Reminder Already Set' : 'Set 10:15 PM Wind-down'}
          </button>
        </div>
      </div>
    </div>
  );
};
