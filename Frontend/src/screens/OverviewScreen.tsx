import React, { useState } from 'react';
import { WelcomeBanner } from '../components/WelcomeBanner';
import { ConcentricRings } from '../components/ConcentricRings';
import { WeeklyVelocityChart } from '../components/WeeklyVelocityChart';
import { ExerciseCard } from '../components/ExerciseCard';
import { SleepCard } from '../components/SleepCard';
import { NovaNoticedCard } from '../components/NovaNoticedCard';
import { FocusActivityList } from '../components/FocusActivityList';
import { BioDataModal } from '../components/modals/BioDataModal';
import { PatternDetailsModal } from '../components/modals/PatternDetailsModal';
import { CircadianModal } from '../components/modals/CircadianModal';
import { MetricOverview, FocusBlock } from '../types';

interface OverviewScreenProps {
  metrics: MetricOverview;
  focusBlocks: FocusBlock[];
  onStartFocus: () => void;
  onViewFullLogbook: () => void;
  searchQuery: string;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  metrics,
  focusBlocks,
  onStartFocus,
  onViewFullLogbook,
  searchQuery,
}) => {
  const [timeframe, setTimeframe] = useState<'today' | '7days' | 'cycles'>('today');
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [isCircadianModalOpen, setIsCircadianModalOpen] = useState(false);
  const [isReminderSet, setIsReminderSet] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<FocusBlock | null>(null);

  // Filter blocks by search query if user types in search bar
  const filteredBlocks = searchQuery.trim()
    ? focusBlocks.filter(
        (b) =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.tier.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : focusBlocks;

  const handleSetWindDownReminder = () => {
    setIsReminderSet(true);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-7">
      {/* Welcome Banner & Action Bar */}
      <WelcomeBanner
        onStartFocus={onStartFocus}
        timeframe={timeframe}
        onChangeTimeframe={setTimeframe}
        syncCycle={metrics.syncCycle}
      />

      {/* Main Grid: Left Column (7 cols) + Right Column (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Concentric Rings + Weekly Focus Velocity */}
        <div className="lg:col-span-7 space-y-6">
          <ConcentricRings
            metrics={metrics}
            onInspectBioData={() => setIsBioModalOpen(true)}
            onRefresh={() => {}}
          />

          <WeeklyVelocityChart
            onOpenTimelineModal={() => setIsCircadianModalOpen(true)}
          />
        </div>

        {/* Right Column: Today's Exercise & Sleep, Nova Noticed, Today's Focus Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* 2-column cards side-by-side: Exercise and Sleep */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ExerciseCard
              metrics={metrics}
              onOpenDetails={() => setIsCircadianModalOpen(true)}
            />
            <SleepCard
              metrics={metrics}
              onOpenDetails={() => setIsPatternModalOpen(true)}
            />
          </div>

          {/* NOVA NOTICED Card */}
          <NovaNoticedCard
            onViewPatternDetails={() => setIsPatternModalOpen(true)}
            onSetWindDownReminder={handleSetWindDownReminder}
            isReminderSet={isReminderSet}
          />

          {/* Today's Focus Activity Card */}
          <FocusActivityList
            blocks={filteredBlocks}
            onViewFullLogbook={onViewFullLogbook}
            onSelectBlock={(block) => setSelectedBlock(block)}
          />
        </div>
      </div>

      {/* Granular Bio Data Inspection Modal */}
      <BioDataModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        metrics={metrics}
      />

      {/* Nova Pattern Discovery Modal */}
      <PatternDetailsModal
        isOpen={isPatternModalOpen}
        onClose={() => setIsPatternModalOpen(false)}
        onSetReminder={() => setIsReminderSet(true)}
        isReminderSet={isReminderSet}
      />

      {/* Circadian 24-hr Matrix Modal */}
      <CircadianModal
        isOpen={isCircadianModalOpen}
        onClose={() => setIsCircadianModalOpen(false)}
      />

      {/* Focus Block Detail Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#dae2fd] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
              <div>
                <span className="text-[11px] font-bold text-[#00685f] uppercase tracking-wider font-mono">
                  {selectedBlock.tier} FLOW BLOCK
                </span>
                <h3 className="text-lg font-bold text-[#131b2e] mt-0.5">
                  {selectedBlock.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="text-[#6d7a77] hover:text-[#131b2e] p-1 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-[13px] text-[#3d4947]">
              <div className="flex justify-between py-1 border-b border-[#f0f3fd]">
                <span className="text-[#6d7a77]">Timestamp:</span>
                <span className="font-semibold text-[#131b2e]">{selectedBlock.time}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3fd]">
                <span className="text-[#6d7a77]">Duration:</span>
                <span className="font-semibold text-[#131b2e]">{selectedBlock.durationMinutes} minutes</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f3fd]">
                <span className="text-[#6d7a77]">Interruptions:</span>
                <span className="font-semibold text-[#131b2e]">{selectedBlock.interruptions}</span>
              </div>
              {selectedBlock.notes && (
                <div className="pt-2">
                  <span className="text-[11px] uppercase font-bold text-[#6d7a77]">Executive Debrief:</span>
                  <p className="mt-1 p-3 bg-[#faf8ff] rounded-xl border border-[#eaedff] text-[12.5px] leading-relaxed">
                    {selectedBlock.notes}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBlock(null)}
                className="px-4 py-2 rounded-xl text-[13px] font-bold text-white bg-[#00685f] hover:bg-[#005049]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
