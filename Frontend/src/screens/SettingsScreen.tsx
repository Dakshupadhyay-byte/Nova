import React, { useState } from 'react';
import { 
  Settings, 
  Watch, 
  Radio, 
  Headphones, 
  Moon, 
  Sun,
  Laptop,
  User, 
  ShieldCheck, 
  Check, 
  Sliders,
  Sparkles
} from 'lucide-react';
import { USER_PROFILE, UserProfileData } from '../data/mockData';
import { useTheme } from '../config/ThemeContext';

interface SettingsScreenProps {
  user?: Partial<UserProfileData>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ user }) => {
  const { theme, activeTheme, setTheme } = useTheme();

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
        <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide mb-1 font-mono" style={{ color: 'var(--nova-brand)' }}>
          <Settings className="w-3.5 h-3.5" />
          <span>SYSTEM PREFERENCES</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--nova-text-primary)' }}>
          System Settings
        </h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--nova-text-secondary)' }}>
          Configure appearance, wearable devices, audio soundscapes, and bedtime wind-down reminders.
        </p>
      </div>

      {/* User Profile Card */}
      <div
        className="rounded-3xl p-6 lg:p-8 shadow-xs flex items-center justify-between gap-6"
        style={{ background: 'var(--nova-surface-solid)', border: '1px solid var(--nova-border)' }}
      >
        <div className="flex items-center gap-4">
          <img
            src={profile.avatar}
            alt={profile.name}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full object-cover border-2 shadow-xs"
            style={{ borderColor: 'var(--nova-border)' }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold" style={{ color: 'var(--nova-text-primary)' }}>{profile.name}</h3>
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                style={{ background: 'var(--nova-badge-green-bg)', color: 'var(--nova-badge-green-text)' }}
              >
                {profile.status}
              </span>
            </div>
            <p className="text-[13px]" style={{ color: 'var(--nova-text-muted)' }}>{profile.role}</p>
            {profile.email && (
              <div className="text-[11.5px] mt-1 font-mono" style={{ color: 'var(--nova-brand)' }}>
                {profile.email}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appearance & Theme Section */}
      <div
        className="rounded-3xl p-6 lg:p-8 shadow-xs space-y-5"
        style={{ background: 'var(--nova-surface-solid)', border: '1px solid var(--nova-border)' }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--nova-divider)' }}>
          <div>
            <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide mb-0.5 font-mono" style={{ color: 'var(--nova-brand)' }}>
              <Sun className="w-3.5 h-3.5" />
              <span>APPEARANCE</span>
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--nova-text-primary)' }}>Theme Mode</h3>
            <p className="text-[12px]" style={{ color: 'var(--nova-text-muted)' }}>Choose how NOVA looks across all devices and dashboards</p>
          </div>
          <span
            className="text-[12px] font-semibold capitalize px-2.5 py-0.5 rounded-full"
            style={{ color: 'var(--nova-brand)', background: 'var(--nova-brand-light)' }}
          >
            {theme === 'system' ? `System (${activeTheme})` : `${theme} active`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Light */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer group ${theme === 'light' ? 'ring-2' : ''}`}
            style={{
              borderColor: theme === 'light' ? 'var(--nova-brand)' : 'var(--nova-border)',
              background: theme === 'light' ? 'var(--nova-nav-active-bg)' : 'var(--nova-surface-secondary)',
              ringColor: theme === 'light' ? 'var(--nova-brand)' : undefined,
              boxShadow: theme === 'light' ? '0 0 0 2px var(--nova-brand-border)' : 'none',
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: theme === 'light' ? 'var(--nova-brand)' : 'var(--nova-brand-soft)', color: theme === 'light' ? '#fff' : 'var(--nova-brand)' }}
              >
                <Sun className="w-5 h-5" />
              </div>
              <div
                className="w-4 h-4 rounded-full border flex items-center justify-center"
                style={{ borderColor: theme === 'light' ? 'var(--nova-brand)' : 'var(--nova-border)', background: theme === 'light' ? 'var(--nova-brand)' : 'transparent' }}
              >
                {theme === 'light' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <div>
              <div className="text-[14px] font-bold" style={{ color: 'var(--nova-text-primary)' }}>Light</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--nova-text-muted)' }}>Clean, daylight-tuned balanced contrast</div>
            </div>
          </button>

          {/* Dark */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer group ${theme === 'dark' ? '' : ''}`}
            style={{
              borderColor: theme === 'dark' ? 'var(--nova-brand)' : 'var(--nova-border)',
              background: theme === 'dark' ? 'var(--nova-nav-active-bg)' : 'var(--nova-surface-secondary)',
              boxShadow: theme === 'dark' ? '0 0 0 2px var(--nova-brand-border)' : 'none',
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: theme === 'dark' ? 'var(--nova-brand)' : 'var(--nova-surface-muted)', color: theme === 'dark' ? '#0b1110' : 'var(--nova-brand)' }}
              >
                <Moon className="w-5 h-5" />
              </div>
              <div
                className="w-4 h-4 rounded-full border flex items-center justify-center"
                style={{ borderColor: theme === 'dark' ? 'var(--nova-brand)' : 'var(--nova-border)', background: theme === 'dark' ? 'var(--nova-brand)' : 'transparent' }}
              >
                {theme === 'dark' && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--nova-bg)' }} />}
              </div>
            </div>
            <div>
              <div className="text-[14px] font-bold" style={{ color: 'var(--nova-text-primary)' }}>Dark</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--nova-text-muted)' }}>Deep layered teal, low fatigue at night</div>
            </div>
          </button>

          {/* System */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer group`}
            style={{
              borderColor: theme === 'system' ? 'var(--nova-brand)' : 'var(--nova-border)',
              background: theme === 'system' ? 'var(--nova-nav-active-bg)' : 'var(--nova-surface-secondary)',
              boxShadow: theme === 'system' ? '0 0 0 2px var(--nova-brand-border)' : 'none',
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: theme === 'system' ? 'var(--nova-brand)' : 'var(--nova-brand-soft)', color: theme === 'system' ? '#fff' : 'var(--nova-brand)' }}
              >
                <Laptop className="w-5 h-5" />
              </div>
              <div
                className="w-4 h-4 rounded-full border flex items-center justify-center"
                style={{ borderColor: theme === 'system' ? 'var(--nova-brand)' : 'var(--nova-border)', background: theme === 'system' ? 'var(--nova-brand)' : 'transparent' }}
              >
                {theme === 'system' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <div>
              <div className="text-[14px] font-bold" style={{ color: 'var(--nova-text-primary)' }}>System</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--nova-text-muted)' }}>Sync with operating system appearance</div>
            </div>
          </button>
        </div>
      </div>

      {/* Connected Wearables Section */}
      <div className="rounded-3xl p-6 lg:p-8 shadow-xs space-y-5" style={{ background: 'var(--nova-surface-solid)', border: '1px solid var(--nova-border)' }}>
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--nova-divider)' }}>
          <div>
            <h3 className="text-lg font-bold text-[#131b2e]">Connected Wearables & Apps</h3>
            <p className="text-[12px]" style={{ color: 'var(--nova-text-muted)' }}>Sync focus, sleep, and fitness data</p>
          </div>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--nova-brand)' }}>
            {wearables.filter((w) => w.enabled).length} Active Sources
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wearables.map((w) => (
            <div
              key={w.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${!w.enabled ? 'opacity-60' : ''}`}
              style={{
                background: w.enabled ? 'var(--nova-wearable-active-bg)' : 'var(--nova-wearable-inactive-bg)',
                borderColor: w.enabled ? 'var(--nova-wearable-active-border)' : 'var(--nova-wearable-inactive-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <Watch className="w-5 h-5" style={{ color: 'var(--nova-brand)' }} />
                <div>
                  <h4 className="text-[13.5px] font-bold" style={{ color: 'var(--nova-text-primary)' }}>{w.name}</h4>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--nova-text-muted)' }}>
                    {w.status} • Synced {w.lastSync}
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleWearable(w.id)}
                className="w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors"
                style={{ background: w.enabled ? 'var(--nova-brand)' : 'var(--nova-surface-muted)' }}
              >
                <div
                  className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform"
                  style={{ transform: w.enabled ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Binaural & Audio Synthesis Preferences */}
      <div
        className="rounded-3xl p-6 lg:p-8 shadow-xs space-y-5"
        style={{ background: 'var(--nova-surface-solid)', border: '1px solid var(--nova-border)' }}
      >
        <h3 className="text-lg font-bold pb-3 border-b" style={{ color: 'var(--nova-text-primary)', borderColor: 'var(--nova-divider)' }}>
          Focus Soundscape Defaults
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
              className="w-full p-2.5 rounded-xl border text-[13px] focus:outline-hidden"
              style={{ background: 'var(--nova-input-bg)', color: 'var(--nova-text-primary)', borderColor: 'var(--nova-input-border)' }}
            >
              <option value="9.4">9.4 Hz (Alpha — High-Agency Flow)</option>
              <option value="40.0">40.0 Hz (Gamma — Complex Architecture)</option>
              <option value="6.0">6.0 Hz (Theta — Intuitive Insight & Rest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Wind-Down & Circadian Scheduler */}
      <div
        className="rounded-3xl p-6 lg:p-8 shadow-xs space-y-5"
        style={{ background: 'var(--nova-surface-solid)', border: '1px solid var(--nova-border)' }}
      >
        <h3 className="text-lg font-bold pb-3 border-b" style={{ color: 'var(--nova-text-primary)', borderColor: 'var(--nova-divider)' }}>
          Bedtime Wind-Down Routine
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div>
            <label className="text-[13px] font-bold block mb-1" style={{ color: 'var(--nova-text-primary)' }}>
              Target Bedtime Routine Initiation
            </label>
            <input
              type="time"
              value={windDownTime}
              onChange={(e) => setWindDownTime(e.target.value)}
              className="px-3 py-2 rounded-xl border text-[14px] font-semibold"
              style={{ background: 'var(--nova-input-bg)', color: 'var(--nova-text-primary)', borderColor: 'var(--nova-input-border)' }}
            />
          </div>

          <div
            className="flex items-center justify-between p-4 rounded-2xl border"
            style={{ background: 'var(--nova-surface-secondary)', borderColor: 'var(--nova-border)' }}
          >
            <div>
              <span className="text-[13px] font-bold block" style={{ color: 'var(--nova-text-primary)' }}>
                Circadian Blue-Light Suppressor
              </span>
              <span className="text-[11.5px]" style={{ color: 'var(--nova-text-muted)' }}>
                Shift UI and connected lighting to warm tones at 10:15 PM
              </span>
            </div>
            <button
              onClick={() => setAutoDim(!autoDim)}
              className="w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors"
              style={{ background: autoDim ? 'var(--nova-purple)' : 'var(--nova-surface-muted)' }}
            >
              <div
                className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform"
                style={{ transform: autoDim ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        {savedSuccess && (
          <span className="text-[13px] font-bold flex items-center gap-1.5 animate-in fade-in" style={{ color: 'var(--nova-brand)' }}>
            <Check className="w-4 h-4" /> Preferences Synchronized
          </span>
        )}
        <button
          onClick={handleSaveSettings}
          className="px-6 py-2.5 rounded-xl text-white text-[13.5px] font-bold transition-all shadow-xs cursor-pointer"
          style={{ background: 'var(--nova-brand)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nova-brand-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--nova-brand)'; }}
        >
          Save System Preferences
        </button>
      </div>
    </div>
  );
};
