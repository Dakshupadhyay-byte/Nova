import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Target, Activity, BarChart3, Clock, ChevronDown } from 'lucide-react';
import { LANDING_PREVIEW, NOVA_ACRONYM, FEATURES } from '../../data/landingContent';

// ─── NOVA Logo SVG ────────────────────────────────────────────────────────────
const NovaLogo = ({ size = 22, white = false }: { size?: number; white?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={white ? '#fff' : '#00685F'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
  </svg>
);

// ─── Inline SVG Mini Bar Chart ────────────────────────────────────────────────
const MiniBarChart = ({ data }: { data: number[] }) => {
  const max = Math.max(...data);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'T'];
  return (
    <div className="flex items-end gap-1.5 h-12">
      {data.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-sm transition-all duration-700"
            style={{
              height: `${(v / max) * 40}px`,
              background: i === data.length - 1
                ? '#00685F'
                : `rgba(0,104,95,${0.25 + (v / max) * 0.45})`,
            }}
          />
          <span className="text-[9px] font-mono text-[#687573]">{days[i]}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Progress Ring ─────────────────────────────────────────────────────────────
const ProgressRing = ({ value, size = 80, stroke = 6, color = '#00685F', label }: {
  value: number; size?: number; stroke?: number; color?: string; label?: string;
}) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5EBE9" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray 1.2s ease' }} />
      </svg>
      {label && <span className="text-[11px] text-[#687573] font-medium -mt-1">{label}</span>}
    </div>
  );
};

// ─── Section Reveal Wrapper ────────────────────────────────────────────────────
const Reveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
    }}>
      {children}
    </div>
  );
};

// ─── Main LandingPage Component ───────────────────────────────────────────────
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [mobileMenu, setMobileMenu] = useState(false);

  const sectionRefs: Record<string, React.RefObject<HTMLElement | null>> = {
    hero: useRef(null),
    notice: useRef(null),
    organize: useRef(null),
    visualize: useRef(null),
    act: useRef(null),
    features: useRef(null),
    history: useRef(null),
    about: useRef(null),
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 32);
      const scrollY = window.scrollY + 200;
      for (const [key, ref] of Object.entries(sectionRefs)) {
        if (ref.current) {
          const top = ref.current.offsetTop;
          const bot = top + ref.current.offsetHeight;
          if (scrollY >= top && scrollY < bot) { setActiveSection(key); break; }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = sectionRefs[id]?.current || document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenu(false);
  };

  const goLogin = () => navigate('/login');

  const navLinks = [
    { label: 'Overview', key: 'hero' },
    { label: 'Focus',    key: 'organize' },
    { label: 'Check-in', key: 'notice' },
    { label: 'Analytics', key: 'visualize' },
    { label: 'History',  key: 'history' },
  ];

  const acronymActive = ['notice', 'organize', 'visualize', 'act'];

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#0D2422] font-[var(--font-manrope)] antialiased">
      {/* ── Ambient BG ──────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-[#00685F]/[0.04] blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-[#7C5CFC]/[0.04] blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-[#00685F]/[0.03] blur-3xl" />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl border-b border-[#E5EBE9] shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-[#00685F] flex items-center justify-center shadow-sm">
              <NovaLogo white />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[16px] font-bold tracking-tight text-[#0D2422]">NOVA</span>
              <span className="text-[9px] text-[#00685F] font-semibold tracking-widest uppercase">Notice. Organize. Visualize. Act.</span>
            </div>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.key} onClick={() => scrollTo(l.key)}
                className={`px-3.5 py-2 rounded-lg text-[13.5px] font-medium transition-all cursor-pointer ${activeSection === l.key ? 'text-[#00685F] bg-[#DDF4EF]' : 'text-[#687573] hover:text-[#0D2422] hover:bg-[#F0F7F5]'}`}>
                {l.label}
              </button>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2">
            <button onClick={goLogin}
              className="hidden sm:block px-4 py-2 text-[13.5px] font-semibold text-[#00685F] hover:bg-[#DDF4EF] rounded-lg transition-all cursor-pointer">
              Login
            </button>
            <button onClick={goLogin}
              className="px-4 py-2 bg-[#00685F] hover:bg-[#004D45] text-white text-[13.5px] font-bold rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {/* Mobile menu toggle */}
            <button onClick={() => setMobileMenu(m => !m)} className="md:hidden p-2 rounded-lg hover:bg-[#F0F7F5] cursor-pointer text-[#687573]">
              <div className="w-5 flex flex-col gap-1.5">
                <span className={`h-0.5 bg-current rounded transition-all ${mobileMenu ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`h-0.5 bg-current rounded transition-all ${mobileMenu ? 'opacity-0' : ''}`} />
                <span className={`h-0.5 bg-current rounded transition-all ${mobileMenu ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-[#E5EBE9] px-6 py-4 flex flex-col gap-1">
            {navLinks.map(l => (
              <button key={l.key} onClick={() => scrollTo(l.key)}
                className="text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-[#687573] hover:text-[#0D2422] hover:bg-[#F0F7F5] cursor-pointer transition-all">
                {l.label}
              </button>
            ))}
            <button onClick={goLogin} className="mt-2 text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-[#00685F] cursor-pointer">
              Login
            </button>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={sectionRefs.hero as React.RefObject<HTMLElement>} id="hero" className="min-h-screen flex flex-col pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
          {/* Top Label */}
          <div className="flex justify-center mb-8" style={{ animation: 'fadeUp 0.6s ease both' }}>
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#DDF4EF] border border-[#00685F]/20 rounded-full text-[#00685F] text-[12px] font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Focus &amp; Wellness Companion</span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-8" style={{ animation: 'fadeUp 0.7s ease 0.1s both' }}>
            <h1 className="text-5xl sm:text-6xl lg:text-[78px] font-bold tracking-[-0.03em] text-[#0D2422] leading-[1.05] mb-6">
              Understand your focus.<br />
              <span className="text-[#00685F]">Improve your day.</span>
            </h1>
            <p className="text-[17px] sm:text-[19px] text-[#687573] max-w-2xl mx-auto leading-relaxed font-normal">
              NOVA connects your focus, sleep, and energy to reveal the patterns behind your best work.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16" style={{ animation: 'fadeUp 0.7s ease 0.2s both' }}>
            <button onClick={goLogin}
              className="px-7 py-3.5 bg-[#00685F] hover:bg-[#004D45] text-white text-[15px] font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer">
              Get Started — It's Free <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => scrollTo('notice')}
              className="px-7 py-3.5 bg-white border border-[#E5EBE9] hover:border-[#00685F]/30 text-[#0D2422] text-[15px] font-semibold rounded-2xl hover:shadow-sm transition-all cursor-pointer flex items-center gap-2">
              Explore NOVA <ChevronDown className="w-4 h-4 text-[#687573]" />
            </button>
          </div>

          {/* ── Hero Dashboard Preview ───────────────────────────────────────── */}
          <div className="relative max-w-4xl mx-auto w-full" style={{ animation: 'fadeUp 0.8s ease 0.3s both' }}>
            {/* Outer glow */}
            <div className="absolute inset-0 bg-[#00685F]/[0.06] rounded-3xl blur-2xl -z-10 scale-105" />
            <div className="bg-white border border-[#E5EBE9] rounded-3xl shadow-xl overflow-hidden">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F5F4]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#00685F] flex items-center justify-center"><NovaLogo size={16} white /></div>
                  <div>
                    <p className="text-[12px] text-[#687573] font-mono">NOVA DASHBOARD</p>
                    <p className="text-[13px] font-bold text-[#0D2422] -mt-0.5">Today's Focus Overview</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-[#DDF4EF] rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#00685F] animate-pulse" />
                  <span className="text-[11px] font-semibold text-[#00685F] tracking-wider uppercase">Live</span>
                </div>
              </div>

              {/* Dashboard Grid */}
              <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Focus Score */}
                <div className="bg-[#F7F9F8] rounded-2xl p-4 flex flex-col items-center text-center">
                  <ProgressRing value={LANDING_PREVIEW.focusScore} size={72} stroke={6} />
                  <p className="text-[22px] font-bold text-[#0D2422] mt-2">{LANDING_PREVIEW.focusScore}</p>
                  <p className="text-[11px] text-[#687573] font-medium mt-0.5">Focus Score</p>
                </div>
                {/* Sleep */}
                <div className="bg-[#F7F9F8] rounded-2xl p-4">
                  <p className="text-[11px] text-[#687573] font-medium uppercase tracking-wider mb-2">Sleep</p>
                  <p className="text-[26px] font-bold text-[#0D2422]">{LANDING_PREVIEW.sleepHours}<span className="text-[14px] text-[#687573] font-normal">h</span></p>
                  <div className="mt-2 h-1.5 bg-[#E5EBE9] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00685F] rounded-full" style={{ width: `${(LANDING_PREVIEW.sleepHours / 9) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-[#687573] mt-1">Goal: 8h</p>
                </div>
                {/* Energy */}
                <div className="bg-[#F7F9F8] rounded-2xl p-4">
                  <p className="text-[11px] text-[#687573] font-medium uppercase tracking-wider mb-2">Energy</p>
                  <p className="text-[26px] font-bold text-[#0D2422]">{LANDING_PREVIEW.energyLevel}<span className="text-[14px] text-[#687573] font-normal">/10</span></p>
                  <div className="mt-2 flex gap-0.5">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i < LANDING_PREVIEW.energyLevel ? '#00685F' : '#E5EBE9' }} />
                    ))}
                  </div>
                  <p className="text-[10px] text-[#687573] mt-1">{LANDING_PREVIEW.sessions} sessions</p>
                </div>
                {/* Focus Trend */}
                <div className="bg-[#F7F9F8] rounded-2xl p-4">
                  <p className="text-[11px] text-[#687573] font-medium uppercase tracking-wider mb-2">7D Trend</p>
                  <MiniBarChart data={LANDING_PREVIEW.weeklyTrend} />
                </div>
              </div>

              {/* NOVA Noticed Bar */}
              <div className="mx-6 mb-6 bg-gradient-to-r from-[#7C5CFC]/[0.08] to-[#00685F]/[0.06] border border-[#7C5CFC]/20 rounded-2xl px-5 py-4 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#7C5CFC] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#7C5CFC] tracking-wider uppercase mb-0.5">NOVA Noticed</p>
                  <p className="text-[13px] text-[#0D2422] font-medium leading-snug">"{LANDING_PREVIEW.insight}"</p>
                  <p className="text-[11px] text-[#687573] mt-1">Observed across your recent focus sessions.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="flex justify-center mt-12">
            <button onClick={() => scrollTo('notice')} className="flex flex-col items-center gap-2 text-[#687573] hover:text-[#00685F] transition-colors cursor-pointer">
              <span className="text-[12px] font-medium tracking-widest uppercase">Discover NOVA</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          WHAT IS NOVA?
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 bg-white border-y border-[#E5EBE9]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[11px] font-bold tracking-[0.2em] text-[#00685F] uppercase mb-4">The NOVA Philosophy</p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0D2422] mb-5">
                Your focus doesn't exist in isolation.
              </h2>
              <p className="text-[17px] text-[#687573] max-w-2xl mx-auto leading-relaxed">
                NOVA brings together focus, sleep, and energy so you can understand the patterns behind your productivity.
              </p>
            </div>
          </Reveal>

          {/* Flow Diagram */}
          <Reveal delay={0.15}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0">
              {[
                { label: 'Sleep', val: '7.5h', icon: '🌙', color: '#7C5CFC' },
                { label: 'Energy', val: '8/10', icon: '⚡', color: '#00685F' },
                { label: 'Focus', val: '76', icon: '🎯', color: '#00685F' },
              ].map((item, i) => (
                <React.Fragment key={item.label}>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-2xl border border-[#E5EBE9] bg-[#F7F9F8] flex flex-col items-center justify-center gap-1 shadow-xs">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-[12px] text-[#687573] font-medium">{item.label}</span>
                    </div>
                    <span className="text-[13px] font-bold text-[#0D2422] mt-2">{item.val}</span>
                  </div>
                  {i < 2 && (
                    <div className="w-12 h-px bg-gradient-to-r from-[#E5EBE9] via-[#00685F]/40 to-[#E5EBE9] sm:mx-4 my-4 sm:my-0 rotate-90 sm:rotate-0" />
                  )}
                </React.Fragment>
              ))}
              <div className="w-12 h-px bg-gradient-to-r from-[#E5EBE9] via-[#00685F]/40 to-[#E5EBE9] sm:mx-4 my-4 sm:my-0 rotate-90 sm:rotate-0" />
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00685F] to-[#004D45] flex flex-col items-center justify-center gap-1 shadow-md">
                  <NovaLogo size={24} white />
                  <span className="text-[11px] text-white/80 font-medium">NOVA AI</span>
                </div>
                <span className="text-[13px] font-bold text-[#00685F] mt-2">Insights</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ACRONYM SECTIONS — N · O · V · A
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Sticky NOVA Acronym Progress Indicator */}
      <div className="sticky top-16 z-40 flex justify-center py-3 pointer-events-none">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-[#E5EBE9] rounded-full px-5 py-2 shadow-sm pointer-events-auto">
          {NOVA_ACRONYM.map((item) => (
            <button key={item.letter} onClick={() => scrollTo(item.word.toLowerCase())}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-bold transition-all cursor-pointer ${
                activeSection === item.word.toLowerCase()
                  ? 'bg-[#00685F] text-white'
                  : 'text-[#687573] hover:text-[#0D2422]'
              }`}>
              <span>{item.letter}</span>
              <span className="hidden sm:block text-[11px] font-medium">{item.word}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── N: NOTICE ─────────────────────────────────────────────────────── */}
      <section ref={sectionRefs.notice as React.RefObject<HTMLElement>} id="notice" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#DDF4EF] border border-[#00685F]/20 flex items-center justify-center">
                    <span className="text-[22px] font-bold text-[#00685F]">N</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#00685F] tracking-[0.2em] uppercase">01 / Notice</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0D2422] mb-5">
                  Notice what shapes your day.
                </h2>
                <p className="text-[17px] text-[#687573] leading-relaxed mb-8">
                  Start with a simple check-in. Record your sleep and energy so NOVA can understand the context behind your focus.
                </p>
                <button onClick={goLogin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00685F] hover:bg-[#004D45] text-white text-[14px] font-bold rounded-xl transition-all cursor-pointer shadow-sm">
                  Start Noticing <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              {/* Check-in UI Preview */}
              <div className="bg-white border border-[#E5EBE9] rounded-3xl p-7 shadow-md">
                <p className="text-[13px] text-[#687573] font-medium mb-1">Good morning ☀️</p>
                <p className="text-[18px] font-bold text-[#0D2422] mb-6">How did you sleep?</p>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-[12px] text-[#687573] mb-2">
                      <span>Sleep duration</span><span className="font-bold text-[#0D2422]">7.5 hours</span>
                    </div>
                    <div className="h-2 bg-[#F0F5F4] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#00685F] to-[#00a896] rounded-full" style={{ width: '83%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[12px] text-[#687573] mb-2">
                      <span>Energy level</span><span className="font-bold text-[#0D2422]">8 / 10</span>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className={`flex-1 h-2 rounded-full ${i < 8 ? 'bg-[#00685F]' : 'bg-[#E5EBE9]'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#F0F5F4]">
                    <div>
                      <p className="text-[11px] text-[#687573] font-medium">Today's Focus Score</p>
                      <p className="text-[28px] font-bold text-[#0D2422]">76</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#DDF4EF] rounded-full text-[#00685F] text-[12px] font-semibold">
                      <Activity className="w-3.5 h-3.5" /> On Track
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── O: ORGANIZE ───────────────────────────────────────────────────── */}
      <section ref={sectionRefs.organize as React.RefObject<HTMLElement>} id="organize" className="py-28 px-6 bg-white border-y border-[#E5EBE9]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal delay={0.1}>
              {/* Timer UI Preview */}
              <div className="bg-[#F7F9F8] border border-[#E5EBE9] rounded-3xl p-8 text-center shadow-md order-2 lg:order-1">
                <p className="text-[11px] font-bold text-[#00685F] tracking-[0.2em] uppercase mb-2">Focus Session</p>
                <div className="relative w-48 h-48 mx-auto my-6 flex items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90 w-full h-full">
                    <circle cx="96" cy="96" r="80" fill="none" stroke="#E5EBE9" strokeWidth="8" />
                    <circle cx="96" cy="96" r="80" fill="none" stroke="#00685F" strokeWidth="8"
                      strokeLinecap="round" strokeDasharray="251 502" />
                  </svg>
                  <div>
                    <p className="text-[42px] font-bold text-[#0D2422] font-mono tabular-nums">25:00</p>
                    <p className="text-[12px] text-[#687573]">Deep Focus</p>
                  </div>
                </div>
                <button onClick={goLogin}
                  className="px-7 py-3 bg-[#00685F] hover:bg-[#004D45] text-white font-bold text-[14px] rounded-2xl transition-all shadow-sm hover:shadow cursor-pointer">
                  Start Session
                </button>
                <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                  {[
                    { label: 'Focused', val: '1h 15m' },
                    { label: 'Sessions', val: '3' },
                    { label: 'Interruptions', val: '2' },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-[18px] font-bold text-[#0D2422]">{s.val}</p>
                      <p className="text-[11px] text-[#687573]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#DDF4EF] border border-[#00685F]/20 flex items-center justify-center">
                    <span className="text-[22px] font-bold text-[#00685F]">O</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#00685F] tracking-[0.2em] uppercase">02 / Organize</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0D2422] mb-5">
                  Organize your focus.
                </h2>
                <p className="text-[17px] text-[#687573] leading-relaxed mb-8">
                  Turn intention into focused sessions with a simple timer that keeps your attention on the work that matters.
                </p>
                <button onClick={goLogin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00685F] hover:bg-[#004D45] text-white text-[14px] font-bold rounded-xl transition-all cursor-pointer shadow-sm">
                  <Target className="w-4 h-4" /> Start Focusing
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── V: VISUALIZE ──────────────────────────────────────────────────── */}
      <section ref={sectionRefs.visualize as React.RefObject<HTMLElement>} id="visualize" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#DDF4EF] border border-[#00685F]/20 flex items-center justify-center">
                    <span className="text-[22px] font-bold text-[#00685F]">V</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#00685F] tracking-[0.2em] uppercase">03 / Visualize</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0D2422] mb-5">
                  Visualize what your data is telling you.
                </h2>
                <p className="text-[17px] text-[#687573] leading-relaxed mb-8">
                  Patterns become clearer when focus, sleep, and energy are viewed together over time.
                </p>
                <button onClick={goLogin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00685F] hover:bg-[#004D45] text-white text-[14px] font-bold rounded-xl transition-all cursor-pointer shadow-sm">
                  <BarChart3 className="w-4 h-4" /> View Analytics
                </button>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              {/* Analytics Preview */}
              <div className="bg-white border border-[#E5EBE9] rounded-3xl p-6 shadow-md space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold text-[#0D2422]">Focus Trend</p>
                  <div className="flex gap-1">
                    {['7D', '14D', '30D'].map((t, i) => (
                      <span key={t} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${i === 0 ? 'bg-[#DDF4EF] text-[#00685F]' : 'text-[#687573]'}`}>{t}</span>
                    ))}
                  </div>
                </div>
                <MiniBarChart data={LANDING_PREVIEW.weeklyTrend} />

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#F0F5F4]">
                  <div className="bg-[#F7F9F8] rounded-xl p-3">
                    <p className="text-[11px] text-[#687573] mb-1">Sleep → Focus</p>
                    <div className="flex items-end gap-1 h-8">
                      {[65, 72, 58, 82, 76].map((v, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-[#7C5CFC]/40" style={{ height: `${(v / 100) * 32}px` }} />
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#F7F9F8] rounded-xl p-3">
                    <p className="text-[11px] text-[#687573] mb-1">Energy → Focus</p>
                    <div className="flex items-end gap-1 h-8">
                      {[70, 68, 75, 80, 76].map((v, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-[#00685F]/40" style={{ height: `${(v / 100) * 32}px` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── A: ACT ────────────────────────────────────────────────────────── */}
      <section ref={sectionRefs.act as React.RefObject<HTMLElement>} id="act" className="py-28 px-6 bg-white border-y border-[#E5EBE9]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal delay={0.1}>
              {/* NOVA Noticed Preview */}
              <div className="bg-gradient-to-br from-[#7C5CFC]/[0.06] to-[#00685F]/[0.04] border border-[#7C5CFC]/20 rounded-3xl p-8 shadow-md order-2 lg:order-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#7C5CFC] flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-white w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#7C5CFC] tracking-[0.15em] uppercase">NOVA Noticed</p>
                  </div>
                </div>
                <blockquote className="text-[17px] font-semibold text-[#0D2422] leading-relaxed mb-5">
                  "{LANDING_PREVIEW.insight}"
                </blockquote>
                <p className="text-[12px] text-[#687573] border-t border-[#E5EBE9] pt-4">
                  Observed across your recent focus sessions. This is a productivity insight, not medical advice.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[100px] bg-white rounded-xl p-3 border border-[#E5EBE9]">
                    <p className="text-[22px] font-bold text-[#0D2422]">+24%</p>
                    <p className="text-[11px] text-[#687573]">Longer focus after 7h+ sleep</p>
                  </div>
                  <div className="flex-1 min-w-[100px] bg-white rounded-xl p-3 border border-[#E5EBE9]">
                    <p className="text-[22px] font-bold text-[#7C5CFC]">3×</p>
                    <p className="text-[11px] text-[#687573]">Weekly pattern observed</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#DDF4EF] border border-[#00685F]/20 flex items-center justify-center">
                    <span className="text-[22px] font-bold text-[#00685F]">A</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#00685F] tracking-[0.2em] uppercase">04 / Act</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0D2422] mb-5">
                  Turn patterns into action.
                </h2>
                <p className="text-[17px] text-[#687573] leading-relaxed mb-8">
                  NOVA turns your history into simple observations that help you understand when you work best.
                </p>
                <button onClick={goLogin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C5CFC] hover:bg-[#6548d9] text-white text-[14px] font-bold rounded-xl transition-all cursor-pointer shadow-sm">
                  <Sparkles className="w-4 h-4" /> See Your Insights
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW NOVA WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-[11px] font-bold tracking-[0.2em] text-[#00685F] uppercase mb-4">The Flow</p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0D2422]">How NOVA works.</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {NOVA_ACRONYM.map((item, i) => (
              <Reveal key={item.letter} delay={i * 0.08}>
                <div className="relative bg-white border border-[#E5EBE9] rounded-2xl p-6 hover:border-[#00685F]/30 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#DDF4EF] border border-[#00685F]/20 flex items-center justify-center group-hover:bg-[#00685F] transition-all">
                      <span className="text-[22px] font-bold text-[#00685F] group-hover:text-white transition-all">{item.letter}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#687573]">{item.step}</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#0D2422] mb-2">{item.word}</h3>
                  <p className="text-[13px] text-[#687573] leading-relaxed">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={sectionRefs.features as React.RefObject<HTMLElement>} id="features" className="py-28 px-6 bg-white border-y border-[#E5EBE9]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-[11px] font-bold tracking-[0.2em] text-[#00685F] uppercase mb-4">Features</p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0D2422]">
                Everything you need to understand your focus.
              </h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.07}>
                <div className="bg-[#F7F9F8] border border-[#E5EBE9] rounded-2xl p-6 hover:bg-white hover:border-[#00685F]/30 hover:shadow-sm transition-all cursor-pointer" onClick={goLogin}>
                  <span className="text-3xl mb-4 block">{f.emoji}</span>
                  <h3 className="text-[16px] font-bold text-[#0D2422] mb-2">{f.title}</h3>
                  <p className="text-[13px] text-[#687573] leading-relaxed">{f.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HISTORY SHOWCASE
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={sectionRefs.history as React.RefObject<HTMLElement>} id="history" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-[11px] font-bold tracking-[0.2em] text-[#00685F] uppercase mb-4">History</p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0D2422] mb-4">
                Your patterns become clearer over time.
              </h2>
              <p className="text-[17px] text-[#687573]">Watch your focus evolve as you build better habits.</p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="bg-white border border-[#E5EBE9] rounded-3xl overflow-hidden shadow-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F5F4]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#00685F]" />
                  <span className="text-[13px] font-bold text-[#0D2422]">Focus History</span>
                </div>
                <span className="text-[12px] text-[#687573]">Past 6 days</span>
              </div>
              <div className="divide-y divide-[#F0F5F4]">
                {LANDING_PREVIEW.historyDays.map((day, i) => (
                  <div key={day.day} className="flex items-center px-6 py-4 hover:bg-[#F7F9F8] transition-colors" style={{ opacity: 1 - i * 0.08 }}>
                    <div className="w-28 shrink-0">
                      <p className="text-[13px] font-semibold text-[#0D2422]">{day.day}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#687573] w-10">Sleep</span>
                        <div className="w-20 h-1.5 bg-[#E5EBE9] rounded-full overflow-hidden">
                          <div className="h-full bg-[#7C5CFC] rounded-full" style={{ width: `${(day.sleep / 9) * 100}%` }} />
                        </div>
                        <span className="text-[12px] font-semibold text-[#0D2422] w-8">{day.sleep}h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#687573] w-12">Energy</span>
                        <div className="flex gap-0.5">
                          {[...Array(10)].map((_, j) => (
                            <div key={j} className={`w-1.5 h-1.5 rounded-full ${j < day.energy ? 'bg-[#00685F]' : 'bg-[#E5EBE9]'}`} />
                          ))}
                        </div>
                        <span className="text-[12px] font-semibold text-[#0D2422] w-6">{day.energy}</span>
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-[16px] font-bold text-[#0D2422]">{day.focus}</span>
                      <span className="text-[10px] text-[#687573] block">focus</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-[#F7F9F8] border-t border-[#E5EBE9] flex justify-center">
                <button onClick={goLogin}
                  className="text-[13px] font-semibold text-[#00685F] hover:text-[#004D45] transition-colors cursor-pointer flex items-center gap-1.5">
                  Explore your history <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ABOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={sectionRefs.about as React.RefObject<HTMLElement>} id="about" className="py-28 px-6 bg-white border-y border-[#E5EBE9]">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#00685F] uppercase mb-4">About NOVA</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0D2422] mb-6">
              Built to make productivity more personal.
            </h2>
            <p className="text-[17px] text-[#687573] leading-relaxed mb-10">
              NOVA is designed around a simple idea: better productivity starts with understanding the person behind the work.
              NOVA combines focus, wellness, data, and AI into one calm experience.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {['Focus', 'Wellness', 'Data', 'AI'].map((tag) => (
                <span key={tag} className="px-5 py-2.5 bg-[#F7F9F8] border border-[#E5EBE9] rounded-full text-[14px] font-semibold text-[#0D2422]">
                  {tag}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-36 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00685F]/[0.03] to-[#00685F]/[0.06]" />
        </div>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#00685F] flex items-center justify-center shadow-lg">
                <NovaLogo size={32} white />
              </div>
            </div>
            <div className="mb-6">
              <p className="text-[11px] font-bold tracking-[0.2em] text-[#00685F] uppercase mb-2">NOVA</p>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[16px] text-[#687573] font-medium">
                <span>Notice.</span><span>Organize.</span><span>Visualize.</span><span>Act.</span>
              </div>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#0D2422] mb-5">
              Ready to understand your focus?
            </h2>
            <p className="text-[17px] text-[#687573] mb-10 leading-relaxed">
              Start noticing the patterns behind your best work.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={goLogin}
                className="px-8 py-4 bg-[#00685F] hover:bg-[#004D45] text-white text-[15px] font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer">
                Get Started — It's Free <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={goLogin}
                className="px-8 py-4 bg-white border border-[#E5EBE9] hover:border-[#00685F]/30 text-[#0D2422] text-[15px] font-semibold rounded-2xl hover:shadow-sm transition-all cursor-pointer">
                Login
              </button>
            </div>

            {/* Security note */}
            <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-[#687573]">
              <ShieldCheck className="w-4 h-4 text-[#00685F]" />
              <span>Google OAuth 2.0 · End-to-End Encrypted · No data sold</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#E5EBE9] bg-white px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#00685F] flex items-center justify-center"><NovaLogo size={16} white /></div>
              <span className="text-[16px] font-bold text-[#0D2422]">NOVA</span>
            </div>
            <p className="text-[12px] text-[#687573]">Notice. Organize. Visualize. Act.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { label: 'Overview', key: 'hero' },
              { label: 'Focus',    key: 'organize' },
              { label: 'Check-in', key: 'notice' },
              { label: 'Analytics', key: 'visualize' },
              { label: 'History',  key: 'history' },
            ].map(l => (
              <button key={l.key} onClick={() => scrollTo(l.key)}
                className="text-[13px] text-[#687573] hover:text-[#00685F] transition-colors cursor-pointer">
                {l.label}
              </button>
            ))}
            <button onClick={goLogin} className="text-[13px] text-[#00685F] font-semibold cursor-pointer hover:text-[#004D45]">
              Login
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-[#F0F5F4] text-center text-[11px] text-[#687573]">
          © {new Date().getFullYear()} NOVA. All rights reserved.
        </div>
      </footer>

      {/* Keyframe animation */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
