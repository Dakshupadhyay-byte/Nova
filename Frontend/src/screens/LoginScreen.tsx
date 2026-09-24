import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Key, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Radio, 
  Sparkles, 
  Fingerprint, 
  CheckCircle2,
  Zap
} from 'lucide-react';
import { USER_PROFILE } from '../data/mockData';

interface LoginScreenProps {
  onLoginSuccess: (user?: { name: string; role: string; email: string }) => void;
  onContinueAsGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('elena.vance@agency.ops');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('Elena Vance');
  const [rememberMe, setRememberMe] = useState(true);
  const [biometricPasskeyActive, setBiometricPasskeyActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email or bio-telemetry identifier.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        name: mode === 'signup' ? (fullName || 'Elena Vance') : 'Elena Vance',
        role: 'High-Agency Ops',
        email,
      });
    }, 700);
  };

  const handleQuickDemo = () => {
    setEmail('elena.vance@agency.ops');
    setPassword('quantum-sync-2026');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 400);
  };

  const handlePasskeyAuth = () => {
    setBiometricPasskeyActive(true);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 900);
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
              BIO-HARMONIC
            </span>
          </div>
        </div>

        {/* Top Status & Fast Pass */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6f7f4] border border-[#a2e3d9]/70 text-[#00685f] text-[11.5px] font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#008378] animate-pulse"></span>
            <span>SECURE QUANTUM LINK</span>
          </div>

          <button
            onClick={handleQuickDemo}
            className="px-3.5 py-1.5 rounded-xl bg-[#00685f]/10 hover:bg-[#00685f]/20 text-[#00685f] text-[12.5px] font-bold transition-all border border-[#00685f]/20 cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>1-Click Demo Login</span>
          </button>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[460px] bg-white/90 backdrop-blur-xl rounded-3xl p-8 sm:p-9 border border-[#dae2fd]/80 shadow-xl relative">
          {/* Subtle Top Inner Edge Highlight */}
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#00685f]/30 to-transparent" />

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-[#eaedff]/60 border border-[#dae2fd]/70 rounded-2xl mb-7">
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-[13px] font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-white text-[#131b2e] shadow-xs'
                  : 'text-[#6d7a77] hover:text-[#131b2e]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-[13px] font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-white text-[#131b2e] shadow-xs'
                  : 'text-[#6d7a77] hover:text-[#131b2e]'
              }`}
            >
              Create Bio-Pass
            </button>
          </div>

          {/* Card Titles */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-[#131b2e] tracking-tight">
              {mode === 'signin' ? 'Welcome back to NOVA' : 'Initialize Bio-Harmonic Identity'}
            </h1>
            <p className="text-[13px] text-[#6d7a77] mt-1.5 leading-relaxed">
              {mode === 'signin'
                ? 'Authenticate to restore circadian telemetry and deep focus states.'
                : 'Configure encrypted biometric synchronization across your wearable nodes.'}
            </p>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-[12px] font-bold text-[#131b2e] uppercase tracking-wider mb-1.5 font-mono">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Vance"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f0f3fd]/80 hover:bg-[#ebf0fd] focus:bg-white text-[#131b2e] text-[13.5px] border border-[#dae2fd] focus:border-[#00685f] focus:ring-3 focus:ring-[#00685f]/15 focus:outline-hidden transition-all"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-[12px] font-bold text-[#131b2e] uppercase tracking-wider mb-1.5 font-mono">
                Work Email or Bio-Node ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6d7a77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f0f3fd]/80 hover:bg-[#ebf0fd] focus:bg-white text-[#131b2e] text-[13.5px] border border-[#dae2fd] focus:border-[#00685f] focus:ring-3 focus:ring-[#00685f]/15 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-bold text-[#131b2e] uppercase tracking-wider font-mono">
                  Quantum Key / Passcode
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="text-[11.5px] font-semibold text-[#00685f] hover:underline"
                  >
                    Forgot passcode?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6d7a77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter passcode..."
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#f0f3fd]/80 hover:bg-[#ebf0fd] focus:bg-white text-[#131b2e] text-[13.5px] border border-[#dae2fd] focus:border-[#00685f] focus:ring-3 focus:ring-[#00685f]/15 focus:outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6d7a77] hover:text-[#131b2e]"
                  title={showPassword ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me / Session Persistence */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[12.5px] text-[#3d4947]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#00685f] rounded-md border-[#dae2fd] focus:ring-[#00685f]"
                />
                <span>Remember this neural terminal</span>
              </label>
              <span className="text-[11px] font-mono text-[#6d7a77]">AES-256</span>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-[14px] font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Synchronizing Telemetry...</span>
                </div>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Authenticate & Enter' : 'Initialize Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#eaedff]"></div>
            </div>
            <span className="relative px-3 bg-white text-[11px] font-semibold text-[#6d7a77] uppercase tracking-wider">
              Or Bio-Pass Authentication
            </span>
          </div>

          {/* Alternative SSO Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handlePasskeyAuth}
              className="py-2.5 px-3 rounded-xl bg-[#faf8ff] hover:bg-[#f0f3fd] border border-[#dae2fd] text-[#131b2e] text-[12px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Fingerprint className="w-4 h-4 text-[#712ae2]" />
              <span>FIDO2 Passkey</span>
            </button>

            <button
              type="button"
              onClick={handleQuickDemo}
              className="py-2.5 px-3 rounded-xl bg-[#faf8ff] hover:bg-[#f0f3fd] border border-[#dae2fd] text-[#131b2e] text-[12px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#00685f]" />
              <span>Oura SSO Sync</span>
            </button>
          </div>

          {/* Quick Demo Elena Vance Tile */}
          <div
            onClick={handleQuickDemo}
            className="mt-6 p-3.5 rounded-2xl bg-[#eefaf8] border border-[#a2e3d9]/70 hover:border-[#00685f] transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <img
                src={USER_PROFILE.avatar}
                alt="Elena Vance"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-2xs group-hover:scale-105 transition-transform"
              />
              <div className="text-left">
                <div className="text-[12.5px] font-bold text-[#131b2e]">
                  Elena Vance
                </div>
                <div className="text-[11px] text-[#00685f] font-medium">
                  High-Agency Ops • Quick Login
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#00685f] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-5 border-t border-[#e2e7ff]/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#6d7a77]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#00685f]" />
          <span>Post-Quantum 256-bit Cryptographic Vault • Zero Knowledge Biometrics</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={handleQuickDemo}
            className="hover:text-[#131b2e] transition-colors"
          >
            Guest Inspection
          </button>
          <span>•</span>
          <span className="font-mono">NOVA v2.4-STITCH</span>
        </div>
      </footer>

      {/* Forgot Passcode Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-[#dae2fd] shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#e6f7f4] text-[#00685f] flex items-center justify-center mx-auto mb-3">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#131b2e]">Reset Quantum Passcode</h3>
            <p className="text-[12.5px] text-[#6d7a77] mt-1 mb-4 leading-relaxed">
              We will send a cryptographically signed recovery token to your registered bio-node address.
            </p>

            {forgotEmailSent ? (
              <div className="p-3 bg-[#eefaf8] rounded-xl border border-[#a2e3d9] text-[12px] text-[#00685f] font-semibold mb-4">
                Recovery token dispatched to {email}.
              </div>
            ) : (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter recovery email..."
                className="w-full px-3 py-2 rounded-xl border border-[#dae2fd] text-[13px] mb-4 focus:outline-hidden focus:border-[#00685f]"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setForgotModalOpen(false); setForgotEmailSent(false); }}
                className="px-4 py-2 rounded-xl text-[12.5px] font-semibold text-[#6d7a77] hover:bg-[#f0f3fd]"
              >
                Close
              </button>
              {!forgotEmailSent && (
                <button
                  type="button"
                  onClick={() => setForgotEmailSent(true)}
                  className="px-4 py-2 rounded-xl text-[12.5px] font-bold text-white bg-[#00685f] hover:bg-[#005049]"
                >
                  Send Token
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
