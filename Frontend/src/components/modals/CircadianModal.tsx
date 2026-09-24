import React, { useState } from 'react';
import { X, Moon, Flame, Utensils, Target, ShieldCheck, Filter } from 'lucide-react';
import { CIRCADIAN_TIMELINE } from '../../data/mockData';
import { CircadianEvent } from '../../types';

interface CircadianModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CircadianModal: React.FC<CircadianModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'focus' | 'workout' | 'sleep' | 'nutrition'>('all');

  if (!isOpen) return null;

  const filteredEvents = filter === 'all'
    ? CIRCADIAN_TIMELINE
    : CIRCADIAN_TIMELINE.filter((e) => e.category === filter);

  const getCategoryIcon = (category: CircadianEvent['category']) => {
    switch (category) {
      case 'sleep':
        return <Moon className="w-4 h-4 text-[#712ae2]" />;
      case 'workout':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'focus':
        return <Target className="w-4 h-4 text-[#00685f]" />;
      case 'nutrition':
        return <Utensils className="w-4 h-4 text-emerald-600" />;
      case 'recovery':
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
    }
  };

  const getCategoryBadgeClass = (category: CircadianEvent['category']) => {
    switch (category) {
      case 'sleep':
        return 'bg-[#f4effe] text-[#712ae2] border-[#e9d8fd]';
      case 'workout':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'focus':
        return 'bg-[#e6f7f4] text-[#00685f] border-[#a2e3d9]';
      case 'nutrition':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'recovery':
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-[#dae2fd] shadow-2xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#eaedff]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-[#131b2e]">24-Hour Multi-Modal Circadian Matrix</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e6f7f4] text-[#00685f] text-[11px] font-bold">
                Today's Progression
              </span>
            </div>
            <p className="text-[12.5px] text-[#6d7a77] mt-0.5">
              Harmonized synchronization of Sleep, Metabolic Output, Nutrition timing, and Deep Focus Blocks
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f0f3fd] hover:bg-[#eaedff] flex items-center justify-center text-[#3d4947] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-4 p-1 bg-[#eaedff]/60 rounded-xl w-fit">
          {(['all', 'focus', 'workout', 'sleep', 'nutrition'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all capitalize ${
                filter === cat
                  ? 'bg-white text-[#131b2e] shadow-2xs'
                  : 'text-[#6d7a77] hover:text-[#131b2e]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Timeline Events List */}
        <div className="mt-6 space-y-4 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#dae2fd]">
          {filteredEvents.map((event) => (
            <div key={event.id} className="relative flex items-start gap-4 pl-1">
              {/* Node Dot */}
              <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[#dae2fd] flex items-center justify-center shadow-xs shrink-0 z-10">
                {getCategoryIcon(event.category)}
              </div>

              {/* Event Content Card */}
              <div className="flex-1 p-4 rounded-2xl bg-[#faf8ff] border border-[#eaedff] hover:border-[#b2e7df] transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-mono font-bold text-[#6d7a77] tabular-nums">
                      {event.time}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getCategoryBadgeClass(event.category)}`}>
                      {event.category}
                    </span>
                  </div>
                  {event.impactScore && (
                    <span className="text-[11.5px] font-semibold text-[#00685f]">
                      {event.impactScore}
                    </span>
                  )}
                </div>
                <h4 className="text-[14.5px] font-bold text-[#131b2e] mt-1.5">{event.title}</h4>
                <p className="text-[12.5px] text-[#3d4947] mt-1 leading-relaxed">{event.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#eaedff] flex items-center justify-between">
          <div className="text-[12px] text-[#6d7a77]">
            Showing {filteredEvents.length} circadian touchpoints
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-[13px] font-bold text-white bg-[#00685f] hover:bg-[#005049] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
