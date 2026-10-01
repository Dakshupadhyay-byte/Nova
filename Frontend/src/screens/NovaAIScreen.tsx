import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, RotateCcw, Sparkles, Compass, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { NovaLogo } from '../components/NovaLogo';
import {
  sendMessage,
  createMessageId,
  SUGGESTED_PROMPTS,
  AIMessage,
} from '../services/novaAIService';
import { rescheduleBlueprintDay, shiftBlueprint } from '../services/api';
import { getIdToken } from '../services/auth';
import { RoadmapAIAction } from '../types';

const formatDateLabel = (dateStr: string) => {
  try {
    const parts = dateStr.split('T')[0].split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator: React.FC = () => (
  <div className="flex items-start gap-3">
    <div className="shrink-0 w-8 h-8 flex items-center justify-center">
      <NovaLogo size={32} />
    </div>
    <div
      className="rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs"
      style={{ background: 'var(--nova-surface-solid)', border: '1px solid var(--nova-border)' }}
    >
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ backgroundColor: 'var(--nova-purple)', animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }}
          />
        ))}
        <span className="text-[12px] ml-1 font-medium" style={{ color: 'var(--nova-text-muted)' }}>NOVA is thinking…</span>
      </div>
    </div>
  </div>
);

// ─── Single Chat Message ──────────────────────────────────────────────────────
interface ChatMessageProps {
  message: AIMessage;
  onConfirmAction: (messageId: string, action: RoadmapAIAction) => void;
  onCancelAction: (messageId: string) => void;
  onNavigateToRoadmap?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onConfirmAction, onCancelAction, onNavigateToRoadmap }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%]">
          <div className="rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm" style={{ backgroundColor: 'var(--nova-brand)' }}>
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-white">{message.content}</p>
          </div>
          <p className="text-[10px] mt-1 text-right pr-1" style={{ color: 'var(--nova-text-placeholder)' }}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-8 h-8 flex items-center justify-center mt-0.5">
        <NovaLogo size={32} />
      </div>
      <div className="max-w-[78%]">
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs"
          style={{ background: 'var(--nova-surface-solid)', border: '1px solid var(--nova-border)' }}
        >
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--nova-text-primary)' }}>{message.content}</p>

          {/* AI Roadmap Action Confirmation Card: Single Reschedule */}
          {message.action?.type === 'RESCHEDULE_ROADMAP_DAY' && (
            <div className="mt-3">
              {message.actionState === 'confirmed' ? (
                <div className="p-3 bg-[#e2f5f1] border border-[#99dfd5] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[12.5px] text-[#00685f]">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#00685f] shrink-0" />
                    <span>
                      Roadmap updated: Day {message.action.dayNumber} rescheduled to {formatDateLabel(message.action.targetDate)}.
                    </span>
                  </div>
                  {onNavigateToRoadmap && (
                    <button
                      onClick={onNavigateToRoadmap}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00685f] hover:bg-[#005049] text-white text-[11.5px] font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>View in Roadmap</span>
                    </button>
                  )}
                </div>
              ) : message.actionState === 'cancelled' ? (
                <div className="p-2.5 bg-[#f0f2fd] border border-[#dae2fd] rounded-xl text-[12px] text-[#6d7a77] italic">
                  Reschedule action was cancelled.
                </div>
              ) : (
                <div className="p-3.5 bg-[#faf8ff] border border-[#d9dcf5] rounded-xl shadow-xs">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Compass className="w-4 h-4 text-[#00685f]" />
                    <span className="text-[11px] font-bold text-[#00685f] uppercase tracking-wider font-mono">
                      Action Required · Confirm Reschedule
                    </span>
                  </div>
                  <p className="text-[13.5px] font-bold text-[#131b2e]">
                    Day {message.action.dayNumber}: {message.action.missionTitle}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[12px] font-medium text-[#44474f]">
                    <span className="px-2.5 py-0.5 bg-white border border-[#dae2fd] rounded-md">
                      {formatDateLabel(message.action.currentDate)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#6d7a77]" />
                    <span className="px-2.5 py-0.5 bg-[#e2f5f1] text-[#00685f] font-bold border border-[#99dfd5] rounded-md">
                      {formatDateLabel(message.action.targetDate)}
                    </span>
                  </div>

                  {message.actionError && (
                    <div className="mt-2.5 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5 text-[12px] text-red-700">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                      <span>{message.actionError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => onConfirmAction(message.id, message.action!)}
                      disabled={message.actionState === 'loading'}
                      className="px-3.5 py-1.5 rounded-lg bg-[#00685f] hover:bg-[#005049] text-white text-[12px] font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {message.actionState === 'loading' ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Rescheduling…</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Reschedule</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onCancelAction(message.id)}
                      disabled={message.actionState === 'loading'}
                      className="px-3 py-1.5 rounded-lg border border-[#dae2fd] bg-white hover:bg-[#f0f3fd] text-[#44474f] text-[12px] font-medium transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Roadmap Action Confirmation Card: Shift Entire Remaining Roadmap */}
          {message.action?.type === 'SHIFT_ROADMAP' && (
            <div className="mt-3">
              {message.actionState === 'confirmed' ? (
                <div className="p-3 bg-[#e2f5f1] border border-[#99dfd5] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[12.5px] text-[#00685f]">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#00685f] shrink-0" />
                    <span>
                      Roadmap updated: Your remaining missions have been shifted by {message.action.dayCount} day{message.action.dayCount > 1 ? 's' : ''}.
                    </span>
                  </div>
                  {onNavigateToRoadmap && (
                    <button
                      onClick={onNavigateToRoadmap}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00685f] hover:bg-[#005049] text-white text-[11.5px] font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>View in Roadmap</span>
                    </button>
                  )}
                </div>
              ) : message.actionState === 'cancelled' ? (
                <div className="p-2.5 bg-[#f0f2fd] border border-[#dae2fd] rounded-xl text-[12px] text-[#6d7a77] italic">
                  Roadmap shift was cancelled.
                </div>
              ) : (
                <div className="p-3.5 bg-[#faf8ff] border border-[#d9dcf5] rounded-xl shadow-xs">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Compass className="w-4 h-4 text-[#00685f]" />
                    <span className="text-[11px] font-bold text-[#00685f] uppercase tracking-wider font-mono">
                      Action Required · Confirm Roadmap Shift
                    </span>
                  </div>
                  <p className="text-[13.5px] font-bold text-[#131b2e]">
                    Shift remaining Roadmap by {message.action.dayCount} day{message.action.dayCount > 1 ? 's' : ''}
                  </p>

                  {/* Concise Preview List */}
                  {Array.isArray(message.action.previewDays) && message.action.previewDays.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 bg-white/70 border border-[#dae2fd] rounded-lg p-2.5 max-h-48 overflow-y-auto">
                      {message.action.previewDays.length <= 5 ? (
                        message.action.previewDays.map((d) => (
                          <div key={d.dayId} className="flex items-center justify-between text-[11.5px] text-[#44474f] py-0.5 border-b border-[#f0f2fd] last:border-0">
                            <span className="font-semibold text-[#131b2e] truncate max-w-[140px] sm:max-w-[200px]">
                              Day {d.dayNumber}: {d.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                              <span className="text-[#687573]">{formatDateLabel(d.currentDate)}</span>
                              <ArrowRight className="w-3 h-3 text-[#9BA8A5]" />
                              <span className="font-bold text-[#00685f]">{formatDateLabel(d.targetDate)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          {message.action.previewDays.slice(0, 3).map((d) => (
                            <div key={d.dayId} className="flex items-center justify-between text-[11.5px] text-[#44474f] py-0.5 border-b border-[#f0f2fd]">
                              <span className="font-semibold text-[#131b2e] truncate max-w-[140px] sm:max-w-[200px]">
                                Day {d.dayNumber}: {d.title}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                                <span className="text-[#687573]">{formatDateLabel(d.currentDate)}</span>
                                <ArrowRight className="w-3 h-3 text-[#9BA8A5]" />
                                <span className="font-bold text-[#00685f]">{formatDateLabel(d.targetDate)}</span>
                              </div>
                            </div>
                          ))}
                          <div className="py-1 text-center text-[11px] font-medium text-[#7C5CFC] bg-[#f5f3ff] rounded">
                            + {message.action.previewDays.length - 5} more missions
                          </div>
                          {message.action.previewDays.slice(-2).map((d) => (
                            <div key={d.dayId} className="flex items-center justify-between text-[11.5px] text-[#44474f] py-0.5 border-b border-[#f0f2fd] last:border-0">
                              <span className="font-semibold text-[#131b2e] truncate max-w-[140px] sm:max-w-[200px]">
                                Day {d.dayNumber}: {d.title}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                                <span className="text-[#687573]">{formatDateLabel(d.currentDate)}</span>
                                <ArrowRight className="w-3 h-3 text-[#9BA8A5]" />
                                <span className="font-bold text-[#00685f]">{formatDateLabel(d.targetDate)}</span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-[11.5px] text-[#687573] mt-2 font-medium">
                    {message.action.affectedDaysCount} pending missions affected
                  </p>

                  {message.actionError && (
                    <div className="mt-2.5 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5 text-[12px] text-red-700">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                      <span>{message.actionError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => onConfirmAction(message.id, message.action!)}
                      disabled={message.actionState === 'loading'}
                      className="px-3.5 py-1.5 rounded-lg bg-[#00685f] hover:bg-[#005049] text-white text-[12px] font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {message.actionState === 'loading' ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Shifting Roadmap…</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Shift</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onCancelAction(message.id)}
                      disabled={message.actionState === 'loading'}
                      className="px-3 py-1.5 rounded-lg border border-[#dae2fd] bg-white hover:bg-[#f0f3fd] text-[#44474f] text-[12px] font-medium transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-[10px] text-[#9BA8A5] mt-1 pl-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

// ─── Suggested Prompt Chip ────────────────────────────────────────────────────
interface SuggestedPromptProps {
  text: string;
  onClick: (text: string) => void;
  disabled: boolean;
}

const SuggestedPrompt: React.FC<SuggestedPromptProps> = ({ text, onClick, disabled }) => (
  <button
    onClick={() => onClick(text)}
    disabled={disabled}
    className="text-left px-3.5 py-2 rounded-xl bg-white border border-[#dae2fd] text-[13px] text-[#3d4947] hover:bg-[#f0f3fd] hover:border-[#7C5CFC]/40 hover:text-[#7C5CFC] dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:text-purple-300 dark:hover:bg-purple-950/30 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
  >
    {text}
  </button>
);

// ─── Empty / Welcome State ────────────────────────────────────────────────────
interface EmptyStateProps {
  onPromptClick: (text: string) => void;
  isLoading: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onPromptClick, isLoading }) => (
  <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
    {/* Ambient glow */}
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#7C5CFC]/5 rounded-full blur-3xl pointer-events-none" />

    <div className="relative flex flex-col items-center gap-4 mb-10">
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-white border border-[#dae2fd] flex items-center justify-center shadow-lg shadow-[#7C5CFC]/10">
          <NovaLogo size={72} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-[#dae2fd] flex items-center justify-center shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#7C5CFC]" />
        </div>
      </div>

      <div>
        <h2 className="text-[22px] font-bold text-[#0D2422] tracking-tight">NOVA AI</h2>
        <p className="text-[14px] text-[#687573] mt-1">Your personal focus companion</p>
      </div>

      <div className="max-w-xs text-center">
        <p className="text-[13.5px] text-[#687573] leading-relaxed">
          Hi! I can help you understand your focus, sleep, energy, and roadmap missions.
          <br />
          <span className="font-medium text-[#0D2422]">What would you like to explore today?</span>
        </p>
      </div>
    </div>

    {/* Suggested Prompts */}
    <div className="relative w-full max-w-lg">
      <p className="text-[11px] font-bold text-[#687573] tracking-widest uppercase mb-3">Suggested questions</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <SuggestedPrompt
            key={prompt}
            text={prompt}
            onClick={onPromptClick}
            disabled={isLoading}
          />
        ))}
      </div>
    </div>
  </div>
);

// ─── Main NOVA AI Screen ──────────────────────────────────────────────────────
interface NovaAIScreenProps {
  onNavigateToRoadmap?: () => void;
}

export const NovaAIScreen: React.FC<NovaAIScreenProps> = ({ onNavigateToRoadmap }) => {
  const [messages, setMessages]   = useState<AIMessage[]>([]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [input]);

  const handleConfirmAction = useCallback(async (messageId: string, action: RoadmapAIAction) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, actionState: 'loading', actionError: null } : m))
    );

    try {
      const token = await getIdToken();
      if (!token) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, actionState: 'error', actionError: 'Authentication required. Please log in.' } : m
          )
        );
        return;
      }

      let res: { success: boolean; data: any; error: any };
      if (action.type === 'RESCHEDULE_ROADMAP_DAY') {
        res = await rescheduleBlueprintDay(token, action.dayId, action.targetDate);
      } else if (action.type === 'SHIFT_ROADMAP') {
        res = await shiftBlueprint(token, action.blueprintId, action.dayCount);
      } else {
        return;
      }

      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, actionState: 'confirmed', actionError: null } : m))
        );
        // Trigger roadmap refresh in any listening components
        window.dispatchEvent(new CustomEvent('nova_roadmap_updated'));
      } else {
        const errMsg = res.error?.code === 'DATE_OCCUPIED'
          ? 'A mission is already scheduled for this date in your Roadmap.'
          : (res.error?.message || 'Failed to update roadmap.');
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, actionState: 'error', actionError: errMsg } : m))
        );
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, actionState: 'error', actionError: 'Network error while updating roadmap.' } : m
        )
      );
    }
  }, []);

  const handleCancelAction = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, actionState: 'cancelled', actionError: null } : m))
    );
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isLoading) return;

    setError(null);
    setInput('');

    const userMessage: AIMessage = {
      id:        createMessageId(),
      role:      'user',
      content:   messageText,
      timestamp: new Date(),
    };

    // Check if there is exactly one pending action in current messages
    const pendingActionMessages = messages.filter(
      (m) =>
        (m.action?.type === 'RESCHEDULE_ROADMAP_DAY' || m.action?.type === 'SHIFT_ROADMAP') &&
        m.actionState === 'pending'
    );

    if (pendingActionMessages.length === 1) {
      const pendingMsg = pendingActionMessages[0];
      const normalized = messageText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

      const CONFIRMATION_PHRASES = new Set([
        'yes',
        'yes please',
        'yes confirm',
        'confirm',
        'i confirm',
        'confirmed',
        'confirm it',
        'please confirm',
        'do it',
        'go ahead',
        'proceed',
        'move it',
        'shift it',
        'shift roadmap',
        'okay',
        'ok',
        'sure',
        'yep',
        'yeah',
      ]);

      const CANCELLATION_PHRASES = new Set([
        'no',
        'no thanks',
        'cancel',
        'dont do it',
        'dont move it',
        'dont shift it',
        'never mind',
        'nevermind',
        'stop',
        'nope',
        'dismiss',
      ]);

      if (CONFIRMATION_PHRASES.has(normalized)) {
        setMessages((prev) => [...prev, userMessage]);
        await handleConfirmAction(pendingMsg.id, pendingMsg.action!);
        return;
      }

      if (CANCELLATION_PHRASES.has(normalized)) {
        setMessages((prev) => [...prev, userMessage]);
        handleCancelAction(pendingMsg.id);
        return;
      }
    }

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const result = await sendMessage(messageText);

    setIsLoading(false);

    if (result.success && result.reply) {
      const novaMessage: AIMessage = {
        id:          createMessageId(),
        role:        'nova',
        content:     result.reply,
        timestamp:   new Date(),
        action:      result.action || null,
        actionState: result.action ? 'pending' : undefined,
      };
      setMessages((prev) => [...prev, novaMessage]);
    } else {
      setError(result.error ?? "I couldn't reach NOVA AI right now. Please try again.");
    }
  }, [input, isLoading, messages, handleConfirmAction, handleCancelAction]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = () => {
    setError(null);
    // Re-send the last user message
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) handleSend(lastUser.content);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden" style={{ backgroundColor: 'var(--nova-bg)' }}>
      {/* ── Ambient Background ── */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-[#7C5CFC]/[0.03] blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#00685F]/[0.03] blur-3xl rounded-full" />
      </div>

      {/* ── Page Header ── */}
      <div
        className="shrink-0 px-6 py-4 border-b backdrop-blur-sm z-10"
        style={{ background: 'var(--nova-surface-elevated)', borderColor: 'var(--nova-border)' }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <NovaLogo size={40} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold tracking-tight" style={{ color: 'var(--nova-text-primary)' }}>NOVA AI</h1>
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider uppercase"
                style={{ background: 'var(--nova-brand-light)', borderColor: 'var(--nova-brand-border)', color: 'var(--nova-brand)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--nova-brand)' }} />
                Ready
              </span>
            </div>
            <p className="text-[12px]" style={{ color: 'var(--nova-text-muted)' }}>Your personal focus companion</p>
          </div>
        </div>
      </div>

      {/* ── Messages Area (scrollable) ── */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ paddingBottom: '12px' }}>
        <div className="max-w-3xl mx-auto px-6 py-6">
          {!hasMessages ? (
            <EmptyState onPromptClick={handleSend} isLoading={isLoading} />
          ) : (
            <div className="space-y-5">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onConfirmAction={handleConfirmAction}
                  onCancelAction={handleCancelAction}
                  onNavigateToRoadmap={onNavigateToRoadmap}
                />
              ))}
              {isLoading && <TypingIndicator />}
              {error && (
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                    <NovaLogo size={32} />
                  </div>
                  <div className="max-w-[78%]">
                    <div className="bg-white border border-red-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs">
                      <p className="text-[13.5px] text-[#687573] leading-relaxed">{error}</p>
                      <button
                        onClick={handleRetry}
                        className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#00685F] hover:text-[#004D45] transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky Composer ── */}
      <div className="shrink-0 relative z-20">
        <div
          className="absolute -top-8 left-0 right-0 h-8 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, transparent, var(--nova-bg))` }}
        />

        <div className="px-4 pb-4 pt-2" style={{ backgroundColor: 'var(--nova-bg)' }}>
          <div className="max-w-[800px] mx-auto">
            {/* Suggested prompts */}
            {hasMessages && !isLoading && (
              <div className="flex flex-wrap gap-1.5 mb-2.5 px-1">
                {SUGGESTED_PROMPTS.slice(0, 3).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={isLoading}
                    className="px-2.5 py-1 rounded-lg text-[11.5px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'var(--nova-surface-solid)', border: '1px solid var(--nova-border)', color: 'var(--nova-text-secondary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--nova-purple)'; e.currentTarget.style.color = 'var(--nova-purple)'; e.currentTarget.style.background = 'var(--nova-purple-light)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--nova-border)'; e.currentTarget.style.color = 'var(--nova-text-secondary)'; e.currentTarget.style.background = 'var(--nova-surface-solid)'; }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Composer container */}
            <div
              className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-all duration-200"
              style={{
                background: 'var(--nova-surface-solid)',
                border: '1px solid var(--nova-input-border)',
                boxShadow: '0 -1px 12px rgba(124,92,252,0.06), 0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask NOVA anything…"
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none bg-transparent text-[14px] outline-none leading-relaxed max-h-[140px] min-h-[24px] disabled:opacity-60"
                style={{ color: 'var(--nova-text-primary)' }}
                aria-label="Message NOVA AI"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150"
                style={{
                  backgroundColor: (!input.trim() || isLoading) ? 'var(--nova-surface-secondary)' : 'var(--nova-purple)',
                  boxShadow: (!input.trim() || isLoading) ? 'none' : '0 2px 8px rgba(155,130,255,0.3)',
                  cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--nova-text-placeholder)' }}>
              Enter to send · Shift + Enter for new line · NOVA AI uses your real NOVA data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
