import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Zap,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import { USER_PROFILE, DEFAULT_MOCK_USER } from '../data/mockData';
import { NovaLogo } from '../components/NovaLogo';
import { useTheme } from '../config/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export interface AuthenticatedUser {
  name: string;
  role: string;
  email: string;
  avatar?: string;
}

import { signInWithGoogle } from '../services/auth';

interface LoginScreenProps {
  onLoginSuccess: (user?: AuthenticatedUser) => void;
  onContinueAsGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [authStep, setAuthStep] = useState<'idle' | 'authorizing' | 'syncing' | 'complete'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // Primary Google authentication handler
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsLoading(true);
    setAuthStep('authorizing');

    try {
      await signInWithGoogle();
      // The onAuthChange listener in App.tsx will handle the rest!
    } catch (err: any) {
      setIsLoading(false);
      setAuthStep('idle');
      setErrorMsg(err?.message || 'Google authentication failed. Please try again.');
    }
  };

  // Quick 1-Click Demo Login
  const handleQuickDemo = () => {
    setIsLoading(true);
    setAuthStep('syncing');
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        name: DEFAULT_MOCK_USER.name,
        role: DEFAULT_MOCK_USER.role,
        email: DEFAULT_MOCK_USER.email,
        avatar: DEFAULT_MOCK_USER.avatar,
      });
    }, 450);
  };

  const { activeTheme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden select-none" style={{ backgroundColor: 'var(--nova-bg)', color: 'var(--nova-text-primary)' }}>
      {/* Ambient Atmospheric Background Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-[#00685f]/8 via-[#712ae2]/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-20 -right-20 w-[600px] h-[600px] bg-[#008378]/6 blur-3xl pointer-events-none -z-10" />

      {/* Top Bar Header */}
      <header className="px-8 py-6 flex items-center justify-between">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center shrink-0">
            <NovaLogo size="md" />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold tracking-tight text-[#131b2e] leading-tight">
              NOVA
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-[#00685f] uppercase leading-none mt-0.5">
              NOVA — Notice. Organize. Visualize. Act.
            </span>
          </div>
        </div>

        {/* Theme toggle on login screen */}
        <button
          onClick={() => setTheme(activeTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="p-2.5 rounded-xl border transition-all cursor-pointer"
          style={{ borderColor: 'var(--nova-border)', background: 'var(--nova-surface-muted)', color: 'var(--nova-text-muted)' }}
        >
          {activeTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" style={{ color: 'var(--nova-purple)' }} />}
        </button>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div
          className="w-full max-w-[460px] backdrop-blur-xl rounded-3xl p-8 sm:p-9 shadow-xl relative"
          style={{ background: 'var(--nova-surface-elevated)', border: '1px solid var(--nova-border)' }}
        >
          {/* Subtle Top Inner Edge Highlight */}
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#00685f]/30 to-transparent" />

          {/* Logo Badge */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner relative group"
              style={{ background: 'transparent', border: '1px solid var(--nova-brand-border)' }}
            >
              <NovaLogo size="lg" />
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-xs"
                style={{ background: 'var(--nova-overlay-surface)', border: '1px solid var(--nova-border)' }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--nova-brand)' }} />
              </div>
            </div>
          </div>

          {/* Card Titles */}
          <div className="text-center mb-7">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--nova-text-primary)' }}>
              Welcome to NOVA
            </h1>
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: 'var(--nova-text-muted)' }}>
              NOVA — Notice. Organize. Visualize. Act. Sign in with Google to synchronize your profile and get started.
            </p>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Option: Continue with Google */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl text-[14.5px] font-bold border-2 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-75 disabled:cursor-not-allowed"
              style={{ background: 'var(--nova-overlay-surface)', borderColor: 'var(--nova-border)', color: 'var(--nova-text-primary)' }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2.5 py-0.5">
                  <span className="w-4 h-4 border-2 border-[#00685f]/30 border-t-[#00685f] rounded-full animate-spin"></span>
                  <span className="text-[13.5px] text-[#00685f] font-semibold">
                    {authStep === 'authorizing' && 'Connecting to Google Identity...'}
                    {authStep === 'syncing' && 'Synchronizing Neural Profile...'}
                    {authStep === 'complete' && 'Quantum Link Established!'}
                  </span>
                </div>
              ) : (
                <>
                  {/* Official Google 'G' Multi-Color SVG */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span className="tracking-tight text-[#1e293b] group-hover:text-[#0f172a]">
                    Continue with Google
                  </span>
                </>
              )}
            </button>

          </div>

          {/* Security Footnote */}
          <div
            className="mt-6 pt-4 border-t flex items-center justify-center gap-2 text-[11.5px]"
            style={{ borderColor: 'var(--nova-divider)', color: 'var(--nova-text-muted)' }}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--nova-brand)' }} />
            <span>Google OAuth 2.0 • End-to-End Cryptographic Encryption</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      {/* <footer className="px-8 py-5 border-t border-[#e2e7ff]/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#6d7a77]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#00685f]" />
          <span>Post-Quantum 256-bit Cryptographic Vault</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono">NOVA v2.4-STITCH</span>
        </div>
      </footer> */}
    </div>
  );
};
