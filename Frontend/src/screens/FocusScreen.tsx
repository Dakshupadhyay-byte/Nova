import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Headphones, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft 
} from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';
import { FocusBlock } from '../types';

interface FocusScreenProps {
  onBackToOverview: () => void;
  onSessionComplete: (newBlock: FocusBlock) => void;
}

export const FocusScreen: React.FC<FocusScreenProps> = ({
  onBackToOverview,
  onSessionComplete,
}) => {
  // Timer state
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [volume, setVolume] = useState(0.4);

  // Distraction tracking
  const [interruptions, setInterruptions] = useState<string[]>([]);
  const [interruptionInput, setInterruptionInput] = useState('');
  const [showLogDialog, setShowLogDialog] = useState(false);

  // Completed dialog
  const [isCompleted, setIsCompleted] = useState(false);

  // Central audio stop helper
  const stopAllFocusAudio = useCallback(() => {
    audioEngine.stop();
    setIsPlayingAudio(false);
  }, []);

  // Audio lifecycle cleanup on unmount and page unload/hide
  useEffect(() => {
    const handleUnload = () => {
      audioEngine.stop();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      stopAllFocusAudio();
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [stopAllFocusAudio]);

  // Timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((sec) => sec - 1);
      }, 1000);
    } else if (isActive && secondsRemaining === 0) {
      setIsActive(false);
      stopAllFocusAudio();
      setIsCompleted(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsRemaining, stopAllFocusAudio]);

  // Audio manual toggle handler (for the headphones button)
  const toggleAudio = () => {
    if (isPlayingAudio) {
      stopAllFocusAudio();
    } else {
      audioEngine.start(216, 10, 0.05, volume);
      setIsPlayingAudio(true);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
  };

  // Start Focus Session
  const handleStartSession = () => {
    setIsActive(true);
    if (!isPlayingAudio) {
      audioEngine.start(216, 10, 0.05, volume);
      setIsPlayingAudio(true);
    }
  };

  // Stop / Pause Focus Session
  const handleStopSession = () => {
    setIsActive(false);
    stopAllFocusAudio();
  };

  // Reset Timer
  const handleReset = () => {
    setIsActive(false);
    stopAllFocusAudio();
    setSecondsRemaining(totalSeconds);
  };

  const setDuration = (minutes: number) => {
    setIsActive(false);
    stopAllFocusAudio();
    setTotalSeconds(minutes * 60);
    setSecondsRemaining(minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = ((totalSeconds - secondsRemaining) / totalSeconds) * 100;

  const handleAddInterruption = () => {
    if (interruptionInput.trim()) {
      setInterruptions((prev) => [...prev, interruptionInput.trim()]);
      setInterruptionInput('');
      setShowLogDialog(false);
    }
  };

  const handleSaveAndExit = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const durationMins = Math.round((totalSeconds - secondsRemaining) / 60) || 1;

    const newBlock: FocusBlock = {
      id: `block-${Date.now()}`,
      title: 'Deep Focus Sprint',
      tier: 'DEEP',
      time: timeStr,
      durationMinutes: durationMins,
      interruptions: interruptions.length,
      notes: `Focus flow completed. Interruptions: ${
        interruptions.length > 0 ? interruptions.join(', ') : 'None'
      }.`,
    };

    onSessionComplete(newBlock);
    stopAllFocusAudio();
    onBackToOverview();
  };

  const handleExitFocusMode = () => {
    stopAllFocusAudio();
    onBackToOverview();
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handleExitFocusMode}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#dae2fd] text-[#3d4947] hover:text-[#131b2e] hover:bg-[#f0f3fd] transition-colors text-[13px] font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Focus Mode</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6f7f4] border border-[#a2e3d9] text-[#00685f] text-[12px] font-bold">
          <span className="w-2 h-2 rounded-full bg-[#008378] animate-pulse"></span>
          <span>FOCUS SOUNDSCAPE READY</span>
        </div>
      </div>

      {/* Main Focus Console */}
      <div className="bg-white rounded-3xl p-8 lg:p-10 border border-[#e2e7ff] shadow-sm relative overflow-hidden">
        {/* Target Focus Block Label */}
        <div className="text-center max-w-lg mx-auto mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#faf8ff] border border-[#dae2fd] text-[11.5px] font-bold text-[#6d7a77] uppercase font-mono tracking-wider">
            Target Focus Block
          </div>
        </div>

        {/* Circular Progress & Huge Digital Timer */}
        <div className="relative flex flex-col items-center justify-center my-6">
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* SVG Background Track & Progress */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="#f0f3fd"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="#00685f"
                strokeWidth="6"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (progressPercent / 100) * 276.46}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-300"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-extrabold text-[#131b2e] tracking-tight font-mono tabular-nums">
                {formatTime(secondsRemaining)}
              </span>
              <span className="text-[12px] font-semibold text-[#00685f] mt-1.5 uppercase tracking-wider">
                {isActive ? 'Focus Active' : 'Focus Paused'}
              </span>
            </div>
          </div>

          {/* Quick Duration Buttons */}
          <div className="flex items-center gap-2 mt-4 p-1 bg-[#eaedff]/60 rounded-full">
            {[15, 25, 50, 90].map((mins) => (
              <button
                key={mins}
                onClick={() => setDuration(mins)}
                className={`px-3.5 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                  totalSeconds === mins * 60
                    ? 'bg-[#00685f] text-white shadow-2xs'
                    : 'text-[#3d4947] hover:text-[#131b2e]'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={isActive ? handleStopSession : handleStartSession}
            className="px-8 py-3.5 rounded-2xl bg-[#00685f] hover:bg-[#005049] text-white text-[15px] font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 cursor-pointer"
          >
            {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isActive ? 'Stop Focus Session' : 'Start Focus Session'}</span>
          </button>

          <button
            onClick={handleReset}
            title="Reset Timer"
            className="w-12 h-12 rounded-2xl bg-[#faf8ff] hover:bg-[#f0f3fd] border border-[#dae2fd] text-[#3d4947] hover:text-[#131b2e] flex items-center justify-center transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowLogDialog(true)}
            className="px-4 py-3 rounded-2xl bg-[#fff5f5] hover:bg-[#ffebeb] border border-[#fecdd3] text-rose-700 text-[13px] font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Log Interruption ({interruptions.length})</span>
          </button>
        </div>

        {/* Ambient Soundscape Control Bar */}
        <div className="mt-10 p-5 rounded-2xl bg-[#faf8ff] border border-[#eaedff]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAudio}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  isPlayingAudio
                    ? 'bg-[#00685f] text-white'
                    : 'bg-white border border-[#dae2fd] text-[#6d7a77] hover:text-[#131b2e]'
                }`}
              >
                <Headphones className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[#131b2e]">Focus Soundscape</span>
                  <span className={`text-[11px] font-bold ${isPlayingAudio ? 'text-[#00685f]' : 'text-[#6d7a77]'}`}>
                    {isPlayingAudio ? '● Streaming Audio' : 'Muted'}
                  </span>
                </div>
                <div className="text-[11.5px] text-[#6d7a77]">
                  Ambient focus sound
                </div>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#6d7a77]" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-28 accent-[#00685f] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Interruptions List if any */}
        {interruptions.length > 0 && (
          <div className="mt-5 p-4 rounded-2xl bg-[#fffbfb] border border-[#fee2e2]">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Logged Friction Points:
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {interruptions.map((inter, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#fecdd3] text-rose-800 text-[12px] font-medium"
                >
                  {inter}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interruption Modal */}
      {showLogDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-[#dae2fd] shadow-2xl p-6">
            <h4 className="text-base font-bold text-[#131b2e] mb-1">Log Interruption</h4>
            <p className="text-[12px] text-[#6d7a77] mb-3">
              Logging context switches preserves awareness without breaking your focus workflow.
            </p>
            <input
              type="text"
              autoFocus
              value={interruptionInput}
              onChange={(e) => setInterruptionInput(e.target.value)}
              placeholder="e.g. Urgent Slack alert, phone call..."
              className="w-full px-3 py-2 rounded-xl border border-[#dae2fd] text-[13px] mb-4 focus:outline-hidden focus:border-[#00685f]"
              onKeyDown={(e) => e.key === 'Enter' && handleAddInterruption()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLogDialog(false)}
                className="px-3 py-1.5 text-[12px] font-semibold text-[#6d7a77] hover:bg-[#f0f3fd] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddInterruption}
                className="px-4 py-1.5 text-[12px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Record Interruption
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Completed Dialog */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#dae2fd] shadow-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#d8f5ef] text-[#00685f] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#131b2e]">Deep Focus Block Complete!</h3>
            <p className="text-[13px] text-[#3d4947] mt-1 mb-4">
              Focus session logged successfully. Energy restored.
            </p>
            <div className="p-3 bg-[#faf8ff] rounded-2xl border border-[#eaedff] text-left text-[12.5px] space-y-1.5 mb-5">
              <div className="flex justify-between">
                <span className="text-[#6d7a77]">Focus Block:</span>
                <span className="font-bold text-[#131b2e]">Deep Focus Sprint</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6d7a77]">Duration:</span>
                <span className="font-bold text-[#00685f]">{Math.round(totalSeconds / 60)} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6d7a77]">Interruptions:</span>
                <span className="font-bold text-[#131b2e]">{interruptions.length}</span>
              </div>
            </div>
            <button
              onClick={handleSaveAndExit}
              className="w-full py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white font-bold text-[13.5px] transition-colors cursor-pointer"
            >
              Save to Daily Log & Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
