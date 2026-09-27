import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, RotateCcw, Sparkles } from 'lucide-react';
import { NovaLogo } from '../components/NovaLogo';
import {
  sendMessage,
  createMessageId,
  SUGGESTED_PROMPTS,
  AIMessage,
} from '../services/novaAIService';

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator: React.FC = () => (
  <div className="flex items-start gap-3">
    <div className="shrink-0 w-8 h-8 flex items-center justify-center">
      <NovaLogo size={32} />
    </div>
    <div className="bg-white border border-[#e2e7ff]/80 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-[#7C5CFC] rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }}
          />
        ))}
        <span className="text-[12px] text-[#687573] ml-1 font-medium">NOVA is thinking…</span>
      </div>
    </div>
  </div>
);

// ─── Single Chat Message ──────────────────────────────────────────────────────
interface ChatMessageProps {
  message: AIMessage;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%]">
          <div className="bg-[#00685F] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-[10px] text-[#9BA8A5] mt-1 text-right pr-1">
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
        <div className="bg-white border border-[#e2e7ff]/80 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs">
          <p className="text-[14px] leading-relaxed text-[#131b2e] whitespace-pre-wrap">{message.content}</p>
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
    className="text-left px-3.5 py-2 rounded-xl bg-white border border-[#dae2fd] text-[13px] text-[#3d4947] hover:bg-[#f0f3fd] hover:border-[#7C5CFC]/40 hover:text-[#7C5CFC] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
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
          Hi! I can help you understand your focus, sleep, energy, and productivity patterns.
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
export const NovaAIScreen: React.FC = () => {
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

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const result = await sendMessage(messageText);

    setIsLoading(false);

    if (result.success && result.reply) {
      const novaMessage: AIMessage = {
        id:        createMessageId(),
        role:      'nova',
        content:   result.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, novaMessage]);
    } else {
      setError(result.error ?? "I couldn't reach NOVA AI right now. Please try again.");
    }
  }, [input, isLoading]);

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
    <div className="flex flex-col h-full min-h-0 bg-[#F7F9F8] relative">
      {/* ── Ambient Background ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-[#7C5CFC]/[0.03] blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#00685F]/[0.03] blur-3xl rounded-full" />
      </div>

      {/* ── Page Header ── */}
      <div className="shrink-0 px-6 py-4 border-b border-[#E5EBE9] bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <NovaLogo size={40} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold text-[#0D2422] tracking-tight">NOVA AI</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DDF4EF] border border-[#00685F]/20 text-[10px] font-bold text-[#00685F] tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00685F] animate-pulse" />
                Ready
              </span>
            </div>
            <p className="text-[12px] text-[#687573]">Your personal focus companion</p>
          </div>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {!hasMessages ? (
            <EmptyState onPromptClick={handleSend} isLoading={isLoading} />
          ) : (
            <div className="space-y-5">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
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

      {/* ── Input Area ── */}
      <div className="shrink-0 border-t border-[#E5EBE9] bg-white/90 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Suggested prompts — shown when there are messages, collapsed */}
          {hasMessages && !isLoading && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUGGESTED_PROMPTS.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-[#F7F9F8] border border-[#E5EBE9] text-[11.5px] text-[#687573] hover:border-[#7C5CFC]/40 hover:text-[#7C5CFC] hover:bg-[#f5f3ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3 bg-white border border-[#dae2fd] rounded-2xl px-4 py-3 shadow-xs focus-within:border-[#7C5CFC]/50 focus-within:ring-2 focus-within:ring-[#7C5CFC]/10 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask NOVA anything…"
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent text-[14px] text-[#131b2e] placeholder-[#9BA8A5] outline-none leading-relaxed max-h-[140px] min-h-[24px] disabled:opacity-60"
              style={{ height: 'auto' }}
              aria-label="Message NOVA AI"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="shrink-0 w-9 h-9 rounded-xl bg-[#7C5CFC] hover:bg-[#6B4DE6] disabled:bg-[#dae2fd] disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150 shadow-sm shadow-[#7C5CFC]/30 disabled:shadow-none"
            >
              <ArrowUp className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-[#9BA8A5] mt-2 text-center">
            Enter to send · Shift + Enter for new line · NOVA AI uses your real NOVA data
          </p>
        </div>
      </div>
    </div>
  );
};
