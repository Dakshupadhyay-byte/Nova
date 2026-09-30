import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { NovaLogo } from './NovaLogo';

interface FloatingNovaAIButtonProps {
  onOpenNovaAI: () => void;
}

export const FloatingNovaAIButton: React.FC<FloatingNovaAIButtonProps> = ({ onOpenNovaAI }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
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
    <motion.button
      type="button"
      onClick={onOpenNovaAI}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label="Open NOVA AI assistant"
      title="Open NOVA AI"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed right-4 bottom-4 sm:right-8 sm:bottom-8 z-[30] w-[170px] h-[64px] sm:w-[210px] sm:h-[72px] px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-full glass-strong border border-[#dae2fd] hover:border-[#7C5CFC]/50 shadow-xl hover:shadow-2xl shadow-[#7C5CFC]/15 hover:shadow-[#7C5CFC]/30 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#7C5CFC] flex items-center justify-between cursor-pointer group select-none overflow-hidden"
    >
      {/* Soft Ambient AI Aura */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{
          opacity: isActive ? (prefersReducedMotion ? 0.4 : 0.85) : 0.35,
          scale: isActive ? 1.2 : 1,
        }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="absolute -top-12 -right-12 w-44 h-44 rounded-full pointer-events-none blur-2xl -z-10"
        style={{
          background:
            'radial-gradient(circle, rgba(124, 92, 252, 0.28) 0%, rgba(34, 199, 232, 0.18) 50%, rgba(0, 104, 95, 0.08) 80%, transparent 100%)',
        }}
      />

      {/* Button Content */}
      <div className="flex items-center gap-2.5 sm:gap-3 z-10">
        {/* NOVA Logo */}
        <div className="w-[38px] h-[38px] sm:w-[44px] sm:h-[44px] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-108">
          <NovaLogo size={38} className="sm:hidden shrink-0 object-contain" />
          <NovaLogo size={44} className="hidden sm:block shrink-0 object-contain" />
        </div>

        {/* Text Lockup */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1">
            <span className="text-[14px] sm:text-[16px] font-bold text-[#131b2e] group-hover:text-[#7C5CFC] transition-colors leading-tight">
              NOVA AI
            </span>
            <Sparkles className="w-3 h-3 text-[#7C5CFC] opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#00685F] group-hover:text-[#7C5CFC]/90 transition-colors leading-tight mt-0.5">
            Ask NOVA
          </span>
        </div>
      </div>

      {/* Subtle indicator dot / pulse */}
      <div className="relative flex items-center justify-center w-3 h-3 shrink-0 mr-1 z-10">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#7C5CFC] opacity-40 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7C5CFC]" />
      </div>
    </motion.button>
  );
};
