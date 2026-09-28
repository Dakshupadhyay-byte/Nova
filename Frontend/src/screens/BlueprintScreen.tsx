import React, { useState, useEffect, useCallback } from 'react';
import { 
  Compass, 
  Sparkles, 
  Calendar, 
  Target, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { getIdToken } from '../services/auth';
import { getBlueprints, createBlueprint, rescheduleBlueprintDay } from '../services/api';
import { Blueprint, BlueprintDay } from '../types';
import { NovaLogo } from '../components/NovaLogo';

export const BlueprintScreen: React.FC = () => {
  // Screen data state
  const [activeBlueprint, setActiveBlueprint] = useState<Blueprint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [screenError, setScreenError] = useState<string | null>(null);

  // Creation form state
  const [outcome, setOutcome] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(14);
  const [customDurationInput, setCustomDurationInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Rescheduling state
  const [reschedulingDayId, setReschedulingDayId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Fetch blueprints on mount
  const loadBlueprints = useCallback(async () => {
    setIsLoading(true);
    setScreenError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setScreenError('Authentication token not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      const result = await getBlueprints(token);
      if (result.success && result.data && Array.isArray(result.data.blueprints)) {
        // Find active blueprint if one exists
        const active = result.data.blueprints.find((bp) => bp.status === 'active');
        setActiveBlueprint(active || null);
      } else {
        setScreenError(result.error?.message || 'Unable to load your roadmap data.');
      }
    } catch (err: any) {
      console.error('[BLUEPRINT LOAD ERROR]', err);
      setScreenError('Network error while loading roadmap. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reschedule handlers
  const handleStartReschedule = (day: BlueprintDay) => {
    setReschedulingDayId(day.id);
    const cleanDate = day.logDate ? String(day.logDate).split('T')[0] : '';
    setRescheduleDate(cleanDate);
    setRescheduleError(null);
  };

  const handleCancelReschedule = () => {
    setReschedulingDayId(null);
    setRescheduleDate('');
    setRescheduleError(null);
  };

  const handleConfirmReschedule = async (dayId: number) => {
    if (!rescheduleDate) {
      setRescheduleError('Please choose a date.');
      return;
    }
    setRescheduleError(null);
    setIsRescheduling(true);

    try {
      const token = await getIdToken();
      if (!token) {
        setRescheduleError('Authentication required. Please log in again.');
        setIsRescheduling(false);
        return;
      }

      const result = await rescheduleBlueprintDay(token, dayId, rescheduleDate);
      if (result.success) {
        setReschedulingDayId(null);
        setRescheduleDate('');
        await loadBlueprints();
      } else {
        const errCode = result.error?.code;
        if (errCode === 'DATE_OCCUPIED') {
          setRescheduleError('A mission is already scheduled for this date in your roadmap.');
        } else {
          setRescheduleError(result.error?.message || 'Failed to reschedule mission.');
        }
      }
    } catch (err: any) {
      console.error('[RESCHEDULE ERROR]', err);
      setRescheduleError('Network error while rescheduling. Please try again.');
    } finally {
      setIsRescheduling(false);
    }
  };

  useEffect(() => {
    loadBlueprints();
  }, [loadBlueprints]);

  // Handle preset duration select
  const handleSelectPreset = (days: number) => {
    setDurationDays(days);
    setCustomDurationInput('');
    setFormError(null);
  };

  // Handle custom duration change
  const handleCustomDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomDurationInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 90) {
      setDurationDays(parsed);
      setFormError(null);
    }
  };

  // Handle blueprint creation submission
  const handleCreateBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedOutcome = outcome.trim();
    if (!trimmedOutcome) {
      setFormError('Please enter what you want to achieve with this Roadmap.');
      return;
    }
    if (trimmedOutcome.length > 500) {
      setFormError('Outcome description cannot exceed 500 characters.');
      return;
    }
    if (!durationDays || durationDays < 1 || durationDays > 90) {
      setFormError('Plan duration must be between 1 and 90 days.');
      return;
    }

    setIsGenerating(true);

    try {
      const token = await getIdToken();
      if (!token) {
        setFormError('Authentication required. Please sign in again.');
        setIsGenerating(false);
        return;
      }

      const result = await createBlueprint(token, trimmedOutcome, durationDays);

      if (result.success && result.data?.blueprint) {
        setActiveBlueprint(result.data.blueprint);
        setOutcome('');
        setDurationDays(14);
        setCustomDurationInput('');
      } else {
        const errCode = result.error?.code;
        if (errCode === 'ACTIVE_BLUEPRINT_EXISTS') {
          setFormError('You already have an active roadmap. Please complete or refresh it.');
          // Reload in case an active blueprint was already created elsewhere
          loadBlueprints();
        } else if (errCode === 'AI_UNAVAILABLE') {
          setFormError('The AI roadmap generator is temporarily unavailable. Please try again in a moment.');
        } else if (errCode === 'AI_RATE_LIMITED') {
          setFormError('The AI roadmap generator is currently busy. Please try again in a few seconds.');
        } else {
          setFormError(result.error?.message || 'Failed to generate roadmap. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('[BLUEPRINT CREATE ERROR]', err);
      setFormError('An unexpected network error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Loading State ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] px-6 py-16">
        <div className="w-10 h-10 border-4 border-[#00685F]/30 border-t-[#00685F] rounded-full animate-spin mb-4" />
        <p className="text-[14px] font-medium text-[#3d4947]">Loading your NOVA Roadmap...</p>
      </div>
    );
  }

  // ─── Fatal Screen Error State ─────────────────────────────────────────────
  if (screenError && !activeBlueprint) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl p-8 border border-rose-100 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#131b2e]">Unable to Load Roadmap</h2>
          <p className="text-[14px] text-[#6d7a77] max-w-md mx-auto">{screenError}</p>
          <button
            onClick={loadBlueprints}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-[13px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── STATE 2: Active Blueprint View ───────────────────────────────────────
  if (activeBlueprint) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const totalDays = activeBlueprint.days?.length || activeBlueprint.durationDays || 0;
    const completedDays = activeBlueprint.days?.filter((d) => d.status === 'completed').length || 0;
    const progressPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return '';
      try {
        const cleanDateStr = String(dateStr).split('T')[0];
        const [yearStr, monthStr, dayStr] = cleanDateStr.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        const day = Number(dayStr);
        if (year && month && day) {
          const d = new Date(year, month - 1, day);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        const fallback = new Date(dateStr);
        if (!isNaN(fallback.getTime())) {
          return fallback.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return cleanDateStr;
      } catch {
        return String(dateStr);
      }
    };

    const formatDayDate = (dateStr?: string | null) => {
      if (!dateStr) return '';
      try {
        const cleanDateStr = String(dateStr).split('T')[0];
        const [yearStr, monthStr, dayStr] = cleanDateStr.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        const day = Number(dayStr);
        if (year && month && day) {
          const d = new Date(year, month - 1, day);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        const fallback = new Date(dateStr);
        if (!isNaN(fallback.getTime())) {
          return fallback.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return cleanDateStr;
      } catch {
        return String(dateStr);
      }
    };

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#00685f] tracking-wide mb-1 font-mono">
              <Compass className="w-3.5 h-3.5" />
              <span>ACTIVE ROADMAP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#131b2e] tracking-tight">
              {activeBlueprint.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2f5f1] border border-[#99dfd5]/60 text-[12px] font-bold text-[#00685f]">
              <span className="w-2 h-2 rounded-full bg-[#00685f] animate-pulse" />
              Active Roadmap
            </span>
          </div>
        </div>

        {/* Blueprint Overview Summary Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e2e7ff] shadow-xs mb-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2 flex-1">
              <span className="text-[11px] font-bold text-[#6d7a77] uppercase tracking-wider font-mono">
                Target Outcome
              </span>
              <p className="text-[15px] font-medium text-[#131b2e] leading-relaxed">
                "{activeBlueprint.outcome}"
              </p>
            </div>

            <div className="flex flex-wrap gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-[#f0f3fd] pt-4 md:pt-0 md:pl-6 shrink-0">
              <div>
                <span className="text-[11px] font-bold text-[#6d7a77] uppercase tracking-wider font-mono">
                  Duration
                </span>
                <div className="text-[16px] font-bold text-[#131b2e] mt-0.5">
                  {activeBlueprint.durationDays} Days
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#6d7a77] uppercase tracking-wider font-mono">
                  Timeline
                </span>
                <div className="text-[13px] font-semibold text-[#3d4947] mt-0.5">
                  {formatDate(activeBlueprint.startDate)} – {formatDate(activeBlueprint.endDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 pt-2 border-t border-[#f0f3fd]">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[#3d4947]">Roadmap Completion</span>
              <span className="font-bold text-[#00685f] tabular-nums">{progressPercent}% ({completedDays}/{totalDays} Days)</span>
            </div>
            <div className="w-full h-2.5 bg-[#f0f3fd] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00685f] to-[#712ae2] transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Daily Roadmap Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#00685f]" />
              <span>Daily Missions Roadmap</span>
            </h2>
            <span className="text-[12px] text-[#6d7a77] font-medium font-mono">
              {totalDays} Days Structured
            </span>
          </div>

          <div className="space-y-4 relative">
            {activeBlueprint.days?.map((day: BlueprintDay) => {
              const cleanLogDate = day.logDate ? String(day.logDate).split('T')[0] : '';
              const isToday = cleanLogDate === todayStr;
              const isCompleted = day.status === 'completed';
              const isSkipped = day.status === 'skipped';
              const formattedDate = formatDayDate(day.logDate);

              return (
                <div
                  key={day.id || day.dayNumber}
                  className={`relative rounded-2xl transition-all duration-150 ${
                    isToday
                      ? 'bg-white border-2 border-[#00685f] shadow-md ring-4 ring-[#00685f]/10 p-5 sm:p-6'
                      : isCompleted
                      ? 'bg-white border border-emerald-200/80 p-5 sm:p-6 shadow-2xs'
                      : isSkipped
                      ? 'bg-[#f7f9f8] border border-[#e2e7ff]/60 p-5 opacity-75'
                      : 'bg-white border border-[#e2e7ff] p-5 sm:p-6 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {/* Day number bubble */}
                      <div
                        className={`px-3 py-1.5 rounded-xl flex items-center justify-center font-bold text-[13px] shrink-0 ${
                          isToday
                            ? 'bg-[#00685f] text-white shadow-xs'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-[#faf8ff] border border-[#dae2fd] text-[#131b2e]'
                        }`}
                      >
                        Day {day.dayNumber}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[15px] font-bold text-[#131b2e]">
                            {day.title}
                          </h3>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-md bg-[#00685f] text-white text-[10px] font-extrabold uppercase tracking-wider">
                              Today's Mission
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {formattedDate && (
                            <div className="flex items-center gap-1.5 text-[12px] text-[#00685f] font-semibold font-mono">
                              <Calendar className="w-3.5 h-3.5 text-[#00685f]/80" />
                              <span>{formattedDate}</span>
                            </div>
                          )}
                          {day.originalLogDate && String(day.originalLogDate).split('T')[0] !== cleanLogDate && (
                            <span className="text-[11px] text-[#6d7a77] italic bg-[#faf8ff] px-2 py-0.5 rounded-md border border-[#e2e7ff]">
                              Rescheduled from {formatDayDate(day.originalLogDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Reschedule Action */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap justify-end">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11.5px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      ) : isSkipped ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-200 text-[11.5px] font-medium">
                          <span>Skipped</span>
                        </span>
                      ) : isToday ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e2f5f1] text-[#00685f] border border-[#99dfd5] text-[11.5px] font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>In Progress</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#faf8ff] text-[#6d7a77] border border-[#dae2fd] text-[11.5px] font-medium">
                          <span>Pending</span>
                        </span>
                      )}

                      {/* Reschedule Button for pending missions */}
                      {!isCompleted && !isSkipped && reschedulingDayId !== day.id && (
                        <button
                          onClick={() => handleStartReschedule(day)}
                          title="Reschedule this mission"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#dae2fd] bg-white hover:bg-[#e2f5f1] hover:border-[#99dfd5] text-[#00685f] text-[11.5px] font-semibold transition-colors cursor-pointer shadow-2xs"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Reschedule</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Reschedule Form */}
                  {reschedulingDayId === day.id && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#faf8ff] border border-[#dae2fd] space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-[#131b2e]">Select New Date:</span>
                          <input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => {
                              setRescheduleDate(e.target.value);
                              setRescheduleError(null);
                            }}
                            disabled={isRescheduling}
                            className="px-2.5 py-1 text-[12px] rounded-lg border border-[#dae2fd] bg-white text-[#131b2e] focus:outline-hidden focus:border-[#00685f]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleConfirmReschedule(day.id)}
                            disabled={isRescheduling || !rescheduleDate}
                            className="px-3 py-1 rounded-lg bg-[#00685f] hover:bg-[#005049] disabled:bg-[#dae2fd] text-white text-[12px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
                          >
                            {isRescheduling ? 'Saving...' : 'Confirm'}
                          </button>
                          <button
                            onClick={handleCancelReschedule}
                            disabled={isRescheduling}
                            className="px-2.5 py-1 rounded-lg border border-[#dae2fd] bg-white hover:bg-[#f0f2fd] text-[#3d4947] text-[12px] font-medium transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      {rescheduleError && (
                        <div className="text-[11.5px] text-rose-600 font-medium">{rescheduleError}</div>
                      )}
                    </div>
                  )}

                  {/* Mission Description */}
                  <div className="space-y-2 mt-3 pt-3 border-t border-[#f0f3fd]">
                    <div className="text-[13.5px] text-[#3d4947] leading-relaxed">
                      <span className="font-semibold text-[#131b2e]">Mission: </span>
                      {day.mission}
                    </div>

                    {day.rationale && (
                      <div className="text-[12.5px] text-[#6d7a77] leading-relaxed italic bg-[#faf8ff] rounded-xl p-3 border border-[#f0f3fd]">
                        <span className="font-semibold not-italic text-[#00685f]">Why this works: </span>
                        {day.rationale}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE 1: Blueprint Creation Form View ────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#00685f] tracking-wide mb-1 font-mono">
          <Compass className="w-3.5 h-3.5" />
          <span>NOVA ROADMAP</span>
        </div>
        <h1 className="text-3xl font-bold text-[#131b2e] tracking-tight">
          Create Your Personalized Roadmap
        </h1>
        <p className="text-[14px] text-[#3d4947] mt-1.5 leading-relaxed">
          NOVA synthesizes your recent focus sessions, wellness check-ins, and health data to design a custom, day-by-day action roadmap.
        </p>
      </div>

      {/* Creation Form Card */}
      <form
        onSubmit={handleCreateBlueprint}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e2e7ff] shadow-xs space-y-6"
      >
        {/* Outcome Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="blueprint-outcome" className="text-[13.5px] font-bold text-[#131b2e] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#00685f]" />
              <span>Target Outcome or Goal</span>
            </label>
            <span className="text-[11px] text-[#6d7a77] tabular-nums font-mono">
              {outcome.length} / 500
            </span>
          </div>
          <textarea
            id="blueprint-outcome"
            rows={3}
            value={outcome}
            onChange={(e) => {
              setOutcome(e.target.value.slice(0, 500));
              setFormError(null);
            }}
            placeholder="e.g. Improve my deep focus during the afternoon"
            disabled={isGenerating}
            className="w-full px-4 py-3 rounded-2xl border border-[#dae2fd] text-[14px] text-[#131b2e] placeholder-[#9ba8a5] focus:outline-hidden focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/15 transition-all resize-none disabled:opacity-60 disabled:bg-[#f7f9f8]"
            required
          />
          <p className="text-[11.5px] text-[#6d7a77] mt-1.5">
            Be specific about what habit, focus outcome, or routine you want to build.
          </p>
        </div>

        {/* Duration Selection */}
        <div>
          <label className="text-[13.5px] font-bold text-[#131b2e] flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[#712ae2]" />
            <span>Plan Duration</span>
          </label>

          {/* Preset Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => handleSelectPreset(days)}
                disabled={isGenerating}
                className={`py-3 px-4 rounded-xl text-[13.5px] font-bold border transition-all cursor-pointer ${
                  durationDays === days && !customDurationInput
                    ? 'bg-[#e2f5f1] text-[#00685f] border-[#99dfd5] shadow-xs'
                    : 'bg-white text-[#3d4947] border-[#dae2fd] hover:bg-[#faf8ff] hover:border-[#00685f]/40'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {days} Days
              </button>
            ))}
          </div>

          {/* Custom Duration Input */}
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-[#6d7a77] font-medium">Or custom days:</span>
            <input
              type="number"
              min={1}
              max={90}
              placeholder="1 - 90"
              value={customDurationInput}
              onChange={handleCustomDurationChange}
              disabled={isGenerating}
              className="w-28 px-3 py-1.5 rounded-xl border border-[#dae2fd] text-[13px] text-[#131b2e] placeholder-[#9ba8a5] focus:outline-hidden focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/15 disabled:opacity-60"
            />
            <span className="text-[11.5px] text-[#6d7a77]">
              (Currently: {durationDays} {durationDays === 1 ? 'Day' : 'Days'})
            </span>
          </div>
        </div>

        {/* Inline Form Error */}
        {formError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3 text-rose-700">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div className="text-[13px] leading-relaxed">{formError}</div>
          </div>
        )}

        {/* Loading overlay during generation */}
        {isGenerating && (
          <div className="p-5 rounded-2xl bg-[#faf8ff] border border-[#dae2fd] flex items-center gap-4 animate-pulse">
            <div className="shrink-0 w-10 h-10 flex items-center justify-center">
              <NovaLogo size={36} />
            </div>
            <div>
              <div className="text-[13.5px] font-bold text-[#131b2e]">
                NOVA AI is generating your Roadmap...
              </div>
              <div className="text-[12px] text-[#6d7a77] mt-0.5">
                NOVA is analyzing your recent patterns and crafting your roadmap...
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isGenerating || !outcome.trim()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#00685f] hover:bg-[#005049] disabled:bg-[#dae2fd] disabled:text-[#6d7a77] text-white text-[14px] font-bold shadow-md hover:shadow-lg disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>{isGenerating ? 'Crafting Roadmap...' : 'Generate Roadmap'}</span>
            {!isGenerating && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
};
