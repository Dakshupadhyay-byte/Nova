import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, RefreshCw, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Activity } from 'lucide-react';
import { getIdToken } from '../services/auth';
import {
  createHealthPairingSession,
  getHealthPairingStatus,
  revokeHealthPairing,
} from '../services/api';

type PairingState = 'idle' | 'loading' | 'pairing' | 'connected' | 'error';

export const HealthConnectCard: React.FC = () => {
  const [pairingState, setPairingState] = useState<PairingState>('idle');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear polling on unmount
  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Initial check: check if user already has an active connected Android device
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const token = await getIdToken();
        if (!token) return;

        const res = await getHealthPairingStatus(token);
        if (res.success && res.data?.connected) {
          setPairingState('connected');
          setDeviceName(res.data.deviceName || 'Android Device');
        }
      } catch {
        // Non-blocking fallback
      }
    };

    checkInitialStatus();
  }, []);

  // Poll for connection status when in 'pairing' state
  const startPollingStatus = () => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const token = await getIdToken();
        if (!token) return;

        const res = await getHealthPairingStatus(token);
        if (res.success && res.data?.connected) {
          stopPolling();
          setPairingState('connected');
          setDeviceName(res.data.deviceName || 'Android Device');
        }
      } catch {
        // Continue polling silently
      }
    }, 2500);
  };

  // Handle "Sync Now" click to create pairing session
  const handleStartPairing = async () => {
    stopPolling();
    setErrorMsg(null);
    setPairingState('loading');

    try {
      const token = await getIdToken();
      if (!token) {
        setErrorMsg('Authentication token unavailable. Please re-login.');
        setPairingState('error');
        return;
      }

      const res = await createHealthPairingSession(token);
      if (res.success && res.data?.pairingCode) {
        setPairingCode(res.data.pairingCode);
        setPairingState('pairing');
        startPollingStatus();
      } else {
        const message = res.error?.message || 'Failed to create pairing session.';
        setErrorMsg(message);
        setPairingState('error');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error occurred while creating pairing session.');
      setPairingState('error');
    }
  };

  // Handle cancel pairing
  const handleCancelPairing = () => {
    stopPolling();
    setPairingCode(null);
    setErrorMsg(null);
    setPairingState('idle');
  };

  // Handle disconnect / revoke
  const handleDisconnect = async () => {
    try {
      const token = await getIdToken();
      if (token) {
        await revokeHealthPairing(token);
      }
    } catch {
      // Best-effort
    } finally {
      stopPolling();
      setPairingCode(null);
      setDeviceName(null);
      setPairingState('idle');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e2e7ff]/80 shadow-xs relative overflow-hidden transition-all duration-200">
      {/* Ambient background decoration */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#00685f]/5 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-[#7C5CFC]/5 blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Top Header / Badge */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#DDF4EF] border border-[#00685f]/20 flex items-center justify-center text-[#00685f]">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold tracking-wider text-[#00685f] uppercase font-mono">
              HEALTH CONNECT
            </span>
          </div>

          {pairingState === 'connected' ? (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#00685f] bg-[#DDF4EF] px-2.5 py-0.5 rounded-full border border-[#00685f]/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00685f]" />
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#687573] bg-[#f7f9f8] px-2.5 py-0.5 rounded-full border border-[#e5ebe9]">
              <Activity className="w-3 h-3 text-[#00685f]" />
              <span>Android Sync</span>
            </div>
          )}
        </div>

        {/* ── STATE 1: CONNECTED ── */}
        {pairingState === 'connected' && (
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-bold text-[#131b2e] leading-snug">
              Health Connect Connected
            </h3>
            <p className="text-[12.5px] text-[#687573] mt-1 leading-relaxed">
              Your health data is now connected to NOVA.
            </p>

            <div className="mt-3.5 p-3 bg-[#F0F7F5] border border-[#DDF4EF] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#00685f] shadow-2xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[12.5px] font-bold text-[#0D2422]">
                    {deviceName || 'Android Device'}
                  </p>
                  <p className="text-[10.5px] text-[#687573]">
                    Background synchronization active
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-[11.5px] font-semibold text-[#687573] hover:text-[#b91c1c] transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-red-50"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* ── STATE 2: PAIRING (QR CODE DISPLAY) ── */}
        {pairingState === 'pairing' && pairingCode && (
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-bold text-[#131b2e] leading-snug">
              Scan this QR code with NOVA Health Connect
            </h3>
            <p className="text-[12.5px] text-[#687573] mt-1 leading-relaxed">
              Open the NOVA Health Connect app and scan this code to connect your account.
            </p>

            {/* Compact QR Code Container */}
            <div className="mt-3.5 flex flex-col items-center justify-center p-3 sm:p-4 bg-[#F7F9F8] border border-[#E5EBE9] rounded-2xl">
              <div className="p-2 bg-white rounded-xl shadow-xs border border-[#E5EBE9]">
                <QRCodeSVG
                  value={pairingCode}
                  size={128}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0D2422"
                />
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-[11.5px] font-medium text-[#687573]">
                <span className="w-2 h-2 rounded-full bg-[#00685f] animate-pulse" />
                <span>Waiting for device scan...</span>
              </div>
            </div>

            {/* Cancel & Regenerate Actions */}
            <div className="mt-3 flex items-center justify-between text-[12px] px-1">
              <button
                onClick={handleCancelPairing}
                className="text-[#687573] hover:text-[#131b2e] font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStartPairing}
                className="text-[#00685f] hover:text-[#004D45] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate Code</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STATE 3: IDLE / LOADING / ERROR ── */}
        {(pairingState === 'idle' || pairingState === 'loading' || pairingState === 'error') && (
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-bold text-[#131b2e] leading-snug">
              Connect Your Health Data
            </h3>
            <p className="text-[12.5px] text-[#687573] mt-1 leading-relaxed">
              Connect the NOVA Health Connect app to your NOVA account.
            </p>

            {/* Error Message if any */}
            {pairingState === 'error' && errorMsg && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200/80 rounded-xl text-[12px] text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="flex-1 font-medium">{errorMsg}</p>
              </div>
            )}

            {/* Prominent Sync Now Button */}
            <button
              onClick={handleStartPairing}
              disabled={pairingState === 'loading'}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#00685f] hover:bg-[#004D45] active:scale-[0.99] text-white text-[13px] font-bold shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer disabled:opacity-60"
            >
              {pairingState === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Pairing Code...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>{pairingState === 'error' ? 'Try Again' : 'Sync Now'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default HealthConnectCard;
