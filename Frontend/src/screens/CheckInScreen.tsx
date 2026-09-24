import React, { useState } from 'react';
import { 
  Activity, 
  Brain, 
  Zap, 
  Heart, 
  Timer, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { MetricOverview } from '../types';

interface CheckInScreenProps {
  metrics: MetricOverview;
  onUpdateMetrics: (updated: Partial<MetricOverview>) => void;
  onGoToOverview: () => void;
}

export const CheckInScreen: React.FC<CheckInScreenProps> = ({
  metrics,
  onUpdateMetrics,
  onGoToOverview,
}) => {
  // Check-in state
  const [mentalClarity, setMentalClarity] = useState(8);
  const [physicalEnergy, setPhysicalEnergy] = useState(7);
  const [autonomicTone, setAutonomicTone] = useState(9); // 1 = stressed, 10 = calm

  // Reaction time micro-test state
  const [testState, setTestState] = useState<'idle' | 'waiting' | 'ready' | 'result'>('idle');
  const [startTime, setStartTime] = useState(0);
  const [reactionTimeMs, setReactionTimeMs] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Reaction test logic
  const startReactionTest = () => {
    setTestState('waiting');
    const delay = 1500 + Math.random() * 2500;
    setTimeout(() => {
      setTestState('ready');
      setStartTime(Date.now());
    }, delay);
  };

  const handleTestClick = () => {
    if (testState === 'waiting') {
      // Clicked too early
      setTestState('idle');
      alert('Too early! Wait for the screen to turn green.');
    } else if (testState === 'ready') {
      const delta = Date.now() - startTime;
      setReactionTimeMs(delta);
      setTestState('result');
    }
  };

  const handleSubmitCheckIn = () => {
    // Calculate new focus index based on checkin & reaction time
    const bonus = reactionTimeMs && reactionTimeMs < 250 ? 3 : 0;
    const computedIndex = Math.min(99, Math.round((mentalClarity * 4 + physicalEnergy * 3 + autonomicTone * 3) + bonus));

    onUpdateMetrics({
      focusIndex: computedIndex,
      alphaFrequencyHz: 9.2 + (autonomicTone / 10) * 0.6,
      quantumSyncPercent: 99.8,
    });
    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#00685f] tracking-wide mb-1 font-mono">
          <Activity className="w-3.5 h-3.5" />
          <span>DAILY EQUILIBRIUM CALIBRATION</span>
        </div>
        <h1 className="text-3xl font-bold text-[#131b2e] tracking-tight">
          Subjective State & Neuro-Reflex Check-in
        </h1>
        <p className="text-[14px] text-[#3d4947] mt-1">
          Calibrate composite equilibrium by reporting real cognitive clarity, somatic energy, and testing autonomic reaction speed.
        </p>
      </div>

      {!submitted ? (
        <div className="space-y-6">
          {/* Sliders Card */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#e2e7ff] shadow-xs space-y-6">
            <h3 className="text-lg font-bold text-[#131b2e] border-b border-[#f0f3fd] pb-3">
              1. Somatic & Cognitive Ratings
            </h3>

            {/* Mental Clarity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[13.5px] font-bold text-[#131b2e]">
                  <Brain className="w-4 h-4 text-[#712ae2]" />
                  <span>Mental Clarity & Executive Bandwidth</span>
                </div>
                <span className="text-lg font-bold text-[#712ae2] tabular-nums">{mentalClarity} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={mentalClarity}
                onChange={(e) => setMentalClarity(parseInt(e.target.value))}
                className="w-full accent-[#712ae2] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#6d7a77] mt-1">
                <span>1 - Brain Fog</span>
                <span>5 - Moderate</span>
                <span>10 - Laser Precision</span>
              </div>
            </div>

            {/* Physical Energy */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[13.5px] font-bold text-[#131b2e]">
                  <Zap className="w-4 h-4 text-[#00685f]" />
                  <span>Physical Vitality & Somatic Drive</span>
                </div>
                <span className="text-lg font-bold text-[#00685f] tabular-nums">{physicalEnergy} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={physicalEnergy}
                onChange={(e) => setPhysicalEnergy(parseInt(e.target.value))}
                className="w-full accent-[#00685f] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#6d7a77] mt-1">
                <span>1 - Lethargic</span>
                <span>5 - Neutral</span>
                <span>10 - Peak Mitochondrial Prime</span>
              </div>
            </div>

            {/* Autonomic Tone */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[13.5px] font-bold text-[#131b2e]">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>Autonomic Calm vs Sympathetic Tension</span>
                </div>
                <span className="text-lg font-bold text-[#0284c7] tabular-nums">{autonomicTone} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={autonomicTone}
                onChange={(e) => setAutonomicTone(parseInt(e.target.value))}
                className="w-full accent-[#0284c7] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#6d7a77] mt-1">
                <span>1 - High Friction / Fight-or-Flight</span>
                <span>10 - Rest & Digest Tranquility</span>
              </div>
            </div>
          </div>

          {/* Neuro-Reflex Reaction Test Card */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#e2e7ff] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-[#00685f]" />
                <h3 className="text-lg font-bold text-[#131b2e]">2. Micro Neuro-Reflex Test</h3>
              </div>
              <span className="text-[11.5px] text-[#6d7a77]">Validates neural conduction latency</span>
            </div>

            {testState === 'idle' && (
              <div className="p-8 text-center bg-[#faf8ff] rounded-2xl border border-[#dae2fd]">
                <p className="text-[13px] text-[#3d4947] mb-4">
                  When you click start, wait for the red box to turn green, then click as fast as possible.
                </p>
                <button
                  onClick={startReactionTest}
                  className="px-6 py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-[13px] font-bold shadow-xs cursor-pointer"
                >
                  Start Reaction Speed Test
                </button>
              </div>
            )}

            {testState === 'waiting' && (
              <div
                onClick={handleTestClick}
                className="p-12 text-center bg-rose-500 text-white rounded-2xl cursor-pointer select-none transition-colors"
              >
                <span className="text-xl font-extrabold uppercase tracking-wider">Wait for GREEN...</span>
                <p className="text-[12px] opacity-90 mt-1">Do not click yet</p>
              </div>
            )}

            {testState === 'ready' && (
              <div
                onClick={handleTestClick}
                className="p-12 text-center bg-[#00a394] text-white rounded-2xl cursor-pointer select-none transition-colors animate-pulse"
              >
                <span className="text-3xl font-black uppercase tracking-wider">CLICK NOW!</span>
              </div>
            )}

            {testState === 'result' && (
              <div className="p-6 text-center bg-[#eefaf8] border border-[#a2e3d9] rounded-2xl">
                <span className="text-[11px] font-bold text-[#00685f] uppercase tracking-wider font-mono">Reaction Latency</span>
                <div className="text-4xl font-extrabold text-[#00685f] my-1 tabular-nums">
                  {reactionTimeMs} ms
                </div>
                <p className="text-[12px] text-[#3d4947]">
                  {reactionTimeMs && reactionTimeMs < 240
                    ? '⚡ Exceptional conduction speed — high executive focus potential!'
                    : 'Good somatic readiness recorded.'}
                </p>
                <button
                  onClick={startReactionTest}
                  className="mt-3 text-[12px] font-bold text-[#00685f] hover:underline"
                >
                  Retest Speed
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmitCheckIn}
              className="px-8 py-3.5 rounded-2xl bg-[#00685f] hover:bg-[#005049] text-white text-[14px] font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Submit Daily Calibration</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Submitted Success View */
        <div className="bg-white rounded-3xl p-10 border border-[#e2e7ff] text-center shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#d8f5ef] text-[#00685f] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-[#131b2e]">Telemetry Synchronized!</h2>
          <p className="text-[14px] text-[#3d4947] max-w-md mx-auto mt-2 leading-relaxed">
            Your subjective feedback and reaction reflex metrics have recalibrated your Composite Equilibrium model.
          </p>

          <div className="my-6 p-4 rounded-2xl bg-[#faf8ff] border border-[#dae2fd] max-w-sm mx-auto flex items-center justify-around">
            <div>
              <div className="text-[11px] font-bold text-[#6d7a77] uppercase">Recalibrated Index</div>
              <div className="text-3xl font-extrabold text-[#00685f] mt-1 tabular-nums">
                {metrics.focusIndex}
              </div>
            </div>
            <div className="w-px h-10 bg-[#dae2fd]"></div>
            <div>
              <div className="text-[11px] font-bold text-[#6d7a77] uppercase">Resonance</div>
              <div className="text-2xl font-extrabold text-[#131b2e] mt-1 tabular-nums">
                {metrics.alphaFrequencyHz.toFixed(1)} Hz
              </div>
            </div>
          </div>

          <button
            onClick={onGoToOverview}
            className="px-6 py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-[13px] font-bold shadow-xs cursor-pointer"
          >
            Return to Overview Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
