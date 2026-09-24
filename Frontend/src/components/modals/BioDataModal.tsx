import React from 'react';
import { X, Activity, ShieldCheck, Waves, Cpu, Zap, Download } from 'lucide-react';
import { MetricOverview } from '../../types';

interface BioDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: MetricOverview;
}

export const BioDataModal: React.FC<BioDataModalProps> = ({
  isOpen,
  onClose,
  metrics,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#dae2fd] shadow-2xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#eaedff]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e6f7f4] text-[#00685f] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#131b2e]">Granular Bio-Telemetry Inspection</h3>
              <p className="text-[12px] text-[#6d7a77]">Real-time neuro-harmonic sensor matrix • Oura + Quantum Telemetry Sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f0f3fd] hover:bg-[#eaedff] flex items-center justify-center text-[#3d4947] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Grid */}
        <div className="mt-6 space-y-6">
          {/* Main Alpha Rhythm Card */}
          <div className="p-4 rounded-2xl bg-[#f0faf7] border border-[#a2e3d9] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-[#00685f]" />
                <span className="text-[13px] font-bold text-[#131b2e]">Alpha Rhythm Waveform</span>
              </div>
              <span className="text-lg font-bold text-[#00685f] font-mono tabular-nums">{metrics.alphaFrequencyHz} Hz</span>
            </div>
            <p className="text-[12px] text-[#3d4947] leading-relaxed">
              Neural oscillatory activity currently centered in the ideal 8-12 Hz alpha frequency envelope. Indicates serene executive presence, high neuroplasticity, and low autonomic friction.
            </p>
            {/* Visual waveform simulation */}
            <div className="h-12 w-full bg-white/80 rounded-xl p-2 flex items-center justify-center overflow-hidden border border-[#b2e7df]/60">
              <svg className="w-full h-full text-[#00685f]" preserveAspectRatio="none" viewBox="0 0 200 40">
                <path
                  d="M0,20 Q10,5 20,20 T40,20 T60,20 T80,20 T100,20 T120,20 T140,20 T160,20 T180,20 T200,20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
              </svg>
            </div>
          </div>

          {/* Sub-metrics 4-column grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#faf8ff] border border-[#dae2fd]">
              <div className="text-[11px] font-bold text-[#6d7a77] uppercase">HRV (rMSSD)</div>
              <div className="text-xl font-bold text-[#131b2e] mt-1 tabular-nums">78 ms</div>
              <div className="text-[10px] text-[#00685f] font-medium mt-0.5">+12% vs 30d avg</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#faf8ff] border border-[#dae2fd]">
              <div className="text-[11px] font-bold text-[#6d7a77] uppercase">Resting HR</div>
              <div className="text-xl font-bold text-[#131b2e] mt-1 tabular-nums">54 bpm</div>
              <div className="text-[10px] text-[#00685f] font-medium mt-0.5">Optimal recovery</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#faf8ff] border border-[#dae2fd]">
              <div className="text-[11px] font-bold text-[#6d7a77] uppercase">SpO2 Oxygen</div>
              <div className="text-xl font-bold text-[#131b2e] mt-1 tabular-nums">99.2%</div>
              <div className="text-[10px] text-[#00685f] font-medium mt-0.5">Prefrontal stability</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#faf8ff] border border-[#dae2fd]">
              <div className="text-[11px] font-bold text-[#6d7a77] uppercase">Neuro-Friction</div>
              <div className="text-xl font-bold text-[#712ae2] mt-1 tabular-nums">1.2 / 10</div>
              <div className="text-[10px] text-[#712ae2] font-medium mt-0.5">Minimal resistance</div>
            </div>
          </div>

          {/* Raw Telemetry Packet Summary */}
          <div className="p-4 rounded-2xl bg-[#faf8ff] border border-[#eaedff]">
            <div className="flex items-center justify-between text-[12px] font-bold text-[#131b2e] mb-2 font-mono">
              <span>SYNC PACKET TELEMETRY #1094</span>
              <span className="text-[#00685f]">VALIDATED 100%</span>
            </div>
            <div className="text-[11px] font-mono text-[#3d4947] space-y-1 bg-white p-3 rounded-xl border border-[#dae2fd]">
              <div>TIMESTAMP: 2026-09-24T05:49:44.000Z</div>
              <div>BINAURAL_CARRIER: 216.00 Hz | MODULATION: 9.40 Hz (Alpha)</div>
              <div>HOMEOSTATIC_LOAD: 0.28 (Nominal) | ADENOSINE_ACCUMULATION: 72%</div>
              <div>OPTIMAL_WIND_DOWN_TARGET: 22:15:00 (+45m earlier recommended)</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-[#eaedff] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-[13px] font-bold text-white bg-[#00685f] hover:bg-[#005049] transition-colors"
          >
            Close Telemetry View
          </button>
        </div>
      </div>
    </div>
  );
};
