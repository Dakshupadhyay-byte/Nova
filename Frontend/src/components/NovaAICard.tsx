import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles, Bot } from 'lucide-react';
import { NovaLogo } from './NovaLogo';

interface NovaAICardProps {
  onOpenNovaAI: () => void;
}

export const NovaAICard: React.FC<NovaAICardProps> = ({ onOpenNovaAI }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);
    const motionListener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener('change', motionListener);

    return () => {
      motionQuery.removeEventListener('change', motionListener);
    };
  }, []);

  const isActive = isHovered || isFocused;

  return (
    <button
      type="button"
      onClick={onOpenNovaAI}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label="Open NOVA AI assistant feature"
      className="w-full text-left bg-white rounded-3xl p-7 sm:p-9 lg:p-10 border border-[#E5EBE9] shadow-xs relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#7C5CFC]/40 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#7C5CFC]/40 cursor-pointer group min-h-[240px] md:min-h-[250px] flex flex-col justify-between select-none"
    >
      {/* ── Soft Atmospheric AI Ambient Gradient ── */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{
          opacity: isActive ? (prefersReducedMotion ? 0.4 : 0.85) : 0.3,
          scale: isActive ? 1.12 : 1,
        }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(124, 92, 252, 0.22) 0%, rgba(34, 199, 232, 0.14) 45%, rgba(0, 104, 95, 0.05) 75%, transparent 100%)',
        }}
      />

      {/* ── Subtle Left Aura ── */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{
          opacity: isActive ? 0.6 : 0.2,
        }}
        transition={{ duration: 0.4 }}
        className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full pointer-events-none blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(0, 104, 95, 0.08) 0%, rgba(124, 92, 252, 0.12) 50%, transparent 80%)',
        }}
      />

      {/* ── Light Sweep Overlay on Hover ── */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{
          opacity: isActive ? 1 : 0,
        }}
        transition={{ duration: 0.35 }}
        className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-[#7C5CFC]/[0.03] to-[#22C7E8]/[0.05]"
      />

      {/* ── Card Content Container ── */}
      <div className="relative z-10 w-full flex flex-col md:flex-row items-center md:items-center justify-between gap-6 md:gap-8">
        {/* ── Left / Center Section: Logo + Text ── */}
        <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-5 md:gap-7 w-full md:w-auto">
          {/* 88px NOVA AI Logo Container */}
          <div className="relative w-20 h-20 sm:w-[88px] sm:h-[88px] flex items-center justify-center shrink-0">
            {/* Radial expanding AI signal rings on hover */}
            <AnimatePresence>
              {isActive && !prefersReducedMotion && (
                <>
                  <motion.span
                    key="signal-ring-1"
                    initial={{ scale: 0.8, opacity: 0.75 }}
                    animate={{ scale: 1.45, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.75, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-3xl border border-[#7C5CFC]/45 pointer-events-none"
                  />
                  <motion.span
                    key="signal-ring-2"
                    initial={{ scale: 0.95, opacity: 0.55 }}
                    animate={{ scale: 1.7, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.85, delay: 0.12, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-3xl border border-[#22C7E8]/40 pointer-events-none"
                  />
                </>
              )}
            </AnimatePresence>

            {/* Soft diffused glow aura behind logo */}
            <motion.div
              initial={false}
              animate={{
                opacity: isActive ? 1 : 0.25,
                scale: isActive ? 1.3 : 0.95,
              }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="absolute inset-0 rounded-3xl blur-lg pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, rgba(124, 92, 252, 0.48) 0%, rgba(34, 199, 232, 0.3) 50%, transparent 80%)',
              }}
            />

            {/* 88px Standalone NOVA Logo (object-contain, completely uncropped) */}
            <motion.div
              initial={false}
              animate={{
                scale: isActive && !prefersReducedMotion ? 1.06 : 1,
              }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-20 h-20 sm:w-[88px] sm:h-[88px] flex items-center justify-center"
            >
              <NovaLogo size={88} />
            </motion.div>
          </div>

          {/* Feature Showcase Text Column */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#131b2e] leading-tight">
                NOVA <span className="text-[#7C5CFC]">AI</span>
              </h2>
              <span className="text-[10.5px] font-bold tracking-wider bg-gradient-to-r from-[#7C5CFC]/15 to-[#22C7E8]/15 text-[#7C5CFC] px-2.5 py-0.5 rounded-lg border border-[#7C5CFC]/25 shadow-2xs">
                INTELLIGENT COMPANION
              </span>
              <Sparkles className="w-5 h-5 text-[#7C5CFC]/60 group-hover:text-[#7C5CFC] transition-colors" />
            </div>

            <p className="text-[15px] sm:text-[16px] font-semibold text-[#00685F] mt-1">
              Your personal focus companion.
            </p>

            <p className="text-[13.5px] sm:text-[14.5px] text-[#3d4947] mt-1.5 leading-relaxed max-w-xl">
              Understand your focus, sleep, energy, and productivity patterns.
            </p>
          </div>
        </div>

        {/* ── Right Side: Large Primary Action CTA ── */}
        <div className="shrink-0 w-full md:w-auto flex justify-center md:justify-end pt-2 md:pt-0">
          <div className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#7C5CFC] hover:bg-[#6b47fc] text-white text-[15px] font-bold shadow-md group-hover:shadow-lg transition-all duration-200 w-full md:w-auto text-center">
            <span>Open NOVA AI</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1.5" />
          </div>
        </div>
      </div>
    </button>
  );
};
