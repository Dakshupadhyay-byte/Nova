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

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col justify-between relative overflow-hidden select-none">
      {/* Ambient Atmospheric Background Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-[#00685f]/8 via-[#712ae2]/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-20 -right-20 w-[600px] h-[600px] bg-[#008378]/6 blur-3xl pointer-events-none -z-10" />

      {/* Top Bar Header */}
      <header className="px-8 py-6 flex items-center justify-between">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00685f] flex items-center justify-center text-white shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
            </svg>
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
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[460px] bg-white/95 backdrop-blur-xl rounded-3xl p-8 sm:p-9 border border-[#dae2fd]/90 shadow-xl relative">
          {/* Subtle Top Inner Edge Highlight */}
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#00685f]/30 to-transparent" />

          {/* Central Logo / Shield Badge */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#e6f7f4] to-[#f0f3fd] border border-[#a2e3d9]/60 flex items-center justify-center text-[#00685f] shadow-inner relative group">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
              </svg>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-[#dae2fd] flex items-center justify-center shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#008378]" />
              </div>
            </div>
          </div>

          {/* Card Titles */}
          <div className="text-center mb-7">
            <h1 className="text-2xl font-extrabold text-[#131b2e] tracking-tight">
              Welcome to NOVA
            </h1>
            <p className="text-[13px] text-[#6d7a77] mt-2 leading-relaxed">
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
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-[#faf8ff] text-[#1f2937] text-[14.5px] font-bold border-2 border-[#e5e7eb] hover:border-[#00685f]/40 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-75 disabled:cursor-not-allowed"
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
          <div className="mt-6 pt-4 border-t border-[#f0f3fd] flex items-center justify-center gap-2 text-[11.5px] text-[#6d7a77]">
            <ShieldCheck className="w-4 h-4 text-[#00685f] shrink-0" />
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
