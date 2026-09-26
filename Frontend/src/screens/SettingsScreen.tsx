import React, { useState } from 'react';
import { 
  Settings, 
  Watch, 
  Radio, 
  Headphones, 
  Moon, 
  User, 
  ShieldCheck, 
  Check, 
  Sliders,
  Sparkles
} from 'lucide-react';
import { USER_PROFILE, UserProfileData } from '../data/mockData';

interface SettingsScreenProps {
  user?: Partial<UserProfileData>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ user }) => {
  const profile = {
    name: user?.name || USER_PROFILE.name,
    role: user?.role || USER_PROFILE.role,
    avatar: user?.avatar || USER_PROFILE.avatar,
    email: user?.email || USER_PROFILE.email,
    status: user?.status || USER_PROFILE.status,
  };
  // Wearables connection state
  const [wearables, setWearables] = useState([
    { id: 'oura', name: 'Oura Ring Gen 3', status: 'Connected', lastSync: '3m ago', enabled: true },
    { id: 'apple', name: 'Apple Watch Ultra 2', status: 'Standby', lastSync: '12m ago', enabled: true },
    { id: 'whoop', name: 'Whoop 4.0 Strap', status: 'Connected', lastSync: '1m ago', enabled: true },
    { id: 'garmin', name: 'Garmin Epix Pro', status: 'Disconnected', lastSync: '2d ago', enabled: false },
  ]);

  // Audio settings
  const [carrierFreq, setCarrierFreq] = useState(216);
  const [defaultBinaural, setDefaultBinaural] = useState('9.4');
  const [windDownTime, setWindDownTime] = useState('22:15');
  const [autoDim, setAutoDim] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleWearable = (id: string) => {
    setWearables((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleSaveSettings = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#00685f] tracking-wide mb-1 font-mono">
          <Settings className="w-3.5 h-3.5" />
          <span>SYSTEM CALIBRATION & PREFERENCES</span>
        </div>
        <h1 className="text-3xl font-bold text-[#131b2e] tracking-tight">
          System & Telemetry Settings
        </h1>
        <p className="text-[14px] text-[#3d4947] mt-1">
          Configure wearable sensor bridges, audio carrier frequencies, and circadian wind-down triggers.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#e2e7ff] shadow-xs flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={profile.avatar}
            alt={profile.name}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full object-cover border-2 border-[#dae2fd] shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-[#131b2e]">{profile.name}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e6f7f4] text-[#00685f] text-[11px] font-bold">
                {profile.status}
              </span>
            </div>
            <p className="text-[13px] text-[#6d7a77]">{profile.role}</p>
            {profile.email && (
              <div className="text-[11.5px] text-[#00685f] mt-1 font-mono">
                {profile.email}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connected Wearables Section */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#e2e7ff] shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f3fd]">
          <div>
            <h3 className="text-lg font-bold text-[#131b2e]">Sensor Hardware Bridges</h3>
            <p className="text-[12px] text-[#6d7a77]">Multi-modal biometric sync sources</p>
          </div>
          <span className="text-[12px] font-semibold text-[#00685f]">
            {wearables.filter((w) => w.enabled).length} Active Sources
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wearables.map((w) => (
            <div
              key={w.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                w.enabled ? 'bg-[#faf8ff] border-[#b2e7df]' : 'bg-[#f8f9fc] border-[#e2e7ff] opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Watch className="w-5 h-5 text-[#00685f]" />
                <div>
                  <h4 className="text-[13.5px] font-bold text-[#131b2e]">{w.name}</h4>
                  <div className="text-[11px] text-[#6d7a77] mt-0.5">
                    {w.status} • Synced {w.lastSync}
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleWearable(w.id)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  w.enabled ? 'bg-[#00685f]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    w.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Binaural & Audio Synthesis Preferences */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#e2e7ff] shadow-xs space-y-5">
        <h3 className="text-lg font-bold text-[#131b2e] pb-3 border-b border-[#f0f3fd]">
          Binaural Soundscape Defaults
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="text-[13px] font-bold text-[#131b2e] block mb-1">
              Base Carrier Frequency ({carrierFreq} Hz)
            </label>
            <p className="text-[12px] text-[#6d7a77] mb-2">
              Pythagorean tuning harmonic (standard 216 Hz or 432 Hz octave)
            </p>
            <input
              type="range"
              min="108"
              max="432"
              step="1"
              value={carrierFreq}
              onChange={(e) => setCarrierFreq(parseInt(e.target.value))}
              className="w-full accent-[#00685f] cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[13px] font-bold text-[#131b2e] block mb-1">
              Default Target Rhythm
            </label>
            <p className="text-[12px] text-[#6d7a77] mb-2">
              Automatic preset upon session launch
            </p>
            <select
              value={defaultBinaural}
              onChange={(e) => setDefaultBinaural(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#dae2fd] text-[13px] text-[#131b2e] bg-white focus:outline-hidden focus:border-[#00685f]"
            >
              <option value="9.4">9.4 Hz (Alpha — High-Agency Flow)</option>
              <option value="40.0">40.0 Hz (Gamma — Complex Architecture)</option>
              <option value="6.0">6.0 Hz (Theta — Intuitive Insight & Rest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Wind-Down & Circadian Scheduler */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-[#e2e7ff] shadow-xs space-y-5">
        <h3 className="text-lg font-bold text-[#131b2e] pb-3 border-b border-[#f0f3fd]">
          Circadian Rest Protocol
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div>
            <label className="text-[13px] font-bold text-[#131b2e] block mb-1">
              Target Bedtime Routine Initiation
            </label>
            <input
              type="time"
              value={windDownTime}
              onChange={(e) => setWindDownTime(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#dae2fd] text-[14px] font-semibold text-[#131b2e]"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#faf8ff] rounded-2xl border border-[#dae2fd]">
            <div>
              <span className="text-[13px] font-bold text-[#131b2e] block">
                Circadian Blue-Light Suppressor
              </span>
              <span className="text-[11.5px] text-[#6d7a77]">
                Shift UI and connected lighting to warm tones at 10:15 PM
              </span>
            </div>
            <button
              onClick={() => setAutoDim(!autoDim)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                autoDim ? 'bg-[#712ae2]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  autoDim ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        {savedSuccess && (
          <span className="text-[13px] font-bold text-[#00685f] flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4" /> Preferences Synchronized
          </span>
        )}
        <button
          onClick={handleSaveSettings}
          className="px-6 py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-[13.5px] font-bold transition-all shadow-xs cursor-pointer"
        >
          Save System Preferences
        </button>
      </div>
    </div>
  );
};
