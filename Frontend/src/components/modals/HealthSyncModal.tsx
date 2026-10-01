import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, CheckCircle2, AlertCircle, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';

interface HealthSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairingCode: string | null;
  pairingState: 'idle' | 'loading' | 'pairing' | 'connected' | 'error';
  deviceName: string | null;
  errorMsg: string | null;
  onRetry: () => void;
  onDisconnect: () => void;
}

export const HealthSyncModal: React.FC<HealthSyncModalProps> = ({
  isOpen,
  onClose,
  pairingCode,
  pairingState,
  deviceName,
  errorMsg,
  onRetry,
  onDisconnect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#dae2fd] shadow-2xl p-6 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#00685f]/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-[#7C5CFC]/5 blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#DDF4EF] border border-[#00685f]/20 flex items-center justify-center text-[#00685f]">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10.5px] font-bold tracking-wider text-[#00685f] uppercase font-mono">
                HEALTH CONNECT
              </span>
              <h3 className="text-[15px] font-bold text-[#131b2e] leading-none mt-0.5">
                {pairingState === 'connected' ? 'Device Connected' : 'Connect Health Data'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#f0f3fd] hover:bg-[#eaedff] dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-[#3d4947] dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4">
          {/* ── 1. LOADING STATE ── */}
          {pairingState === 'loading' && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-[#00685f] animate-spin mb-3" />
              <p className="text-[14px] font-bold text-[#131b2e]">Generating Pairing Session...</p>
              <p className="text-[12px] text-[#6d7a77] mt-1">Creating a secure single-use token</p>
            </div>
          )}

          {/* ── 2. PAIRING / QR CODE STATE ── */}
          {pairingState === 'pairing' && pairingCode && (
            <div>
              <p className="text-[13px] font-semibold text-[#131b2e]">
                Scan this QR code with NOVA Health Connect
              </p>
              <p className="text-[12px] text-[#6d7a77] mt-0.5">
                Open the NOVA Health Connect Android app and scan this code to connect your account.
              </p>

              {/* Compact QR Container */}
              <div className="mt-3.5 flex flex-col items-center justify-center p-3.5 bg-[#F7F9F8] border border-[#E5EBE9] rounded-2xl">
                <div className="p-2 bg-white rounded-xl shadow-xs border border-[#E5EBE9]">
                  <QRCodeSVG
                    value={pairingCode}
                    size={140}
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

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="px-3.5 py-2 text-[12.5px] font-medium text-[#687573] hover:text-[#131b2e] dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#eefaf8] hover:bg-[#e0f5f0] border border-[#b2e7df] text-[12.5px] font-semibold text-[#00685f] transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Code</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 3. CONNECTED STATE ── */}
          {pairingState === 'connected' && (
            <div>
              <div className="p-4 bg-[#F0F7F5] border border-[#DDF4EF] rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#00685f] shadow-2xs shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#00685f]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00685f]" />
                    <span className="text-[13px] font-bold text-[#0D2422] truncate">
                      {deviceName || 'Android Health Device'}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[#687573] mt-0.5">
                    Your health data is now connected to NOVA.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={onDisconnect}
                  className="px-3 py-1.5 text-[12px] font-semibold text-[#687573] hover:text-[#b91c1c] transition-colors cursor-pointer rounded-lg hover:bg-red-50 dark:text-slate-300 dark:hover:text-red-400"
                >
                  Disconnect Device
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#00685f] hover:bg-[#004D45] text-white text-[13px] font-bold transition-all cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* ── 4. ERROR STATE ── */}
          {pairingState === 'error' && (
            <div>
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 text-[12.5px] text-red-800">
                  <p className="font-semibold">Pairing Failed</p>
                  <p className="mt-0.5 text-[11.5px] text-red-700">{errorMsg || 'Failed to establish pairing session.'}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-[12.5px] font-medium text-[#687573] hover:text-[#131b2e] dark:text-slate-300 dark:hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00685f] hover:bg-[#004D45] text-white text-[13px] font-bold transition-all cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
