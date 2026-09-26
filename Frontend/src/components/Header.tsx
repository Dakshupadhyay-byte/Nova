import React, { useState } from 'react';
import { Search, Bell, Sparkles, CheckCircle2, Sliders, ExternalLink } from 'lucide-react';
import { USER_PROFILE } from '../data/mockData';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onOpenSettings?: () => void;
  onLockTerminal?: () => void;
  user?: {
    name: string;
    role: string;
    avatar?: string;
    email?: string;
  };
}

export const Header: React.FC<HeaderProps> = ({ 
  onSearch, 
  onOpenSettings, 
  onLockTerminal,
  user = USER_PROFILE 
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'Optimal Wind-Down Window',
      desc: 'Predicted REM deficit: Target 10:15 PM bed routine to maintain 9.4 Hz baseline.',
      time: '12m ago',
      read: false,
    },
    {
      id: 'n2',
      title: 'Zone 2 Metabolic Calibration',
      desc: '32-minute morning cardio elevated mitochondrial oxidative capacity by +14%.',
      time: '2h ago',
      read: false,
    },
    {
      id: 'n3',
      title: 'Binaural Alpha Frequency Locked',
      desc: 'Carrier frequency 216Hz + 9.4Hz pulse synchronized with Oura telemetry.',
      time: '4h ago',
      read: true,
    },
  ]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch?.(e.target.value);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 px-8 border-b border-[#e2e7ff]/80 bg-[#faf8ff]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
      {/* Search Input Bar */}
      <div className="relative w-full max-w-lg">
        <Search className="w-4 h-4 text-[#6d7a77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchVal}
          onChange={handleSearchChange}
          placeholder="Search bio-telemetry, sessions, protocols..."
          className="w-full pl-10 pr-12 py-2 text-[13.5px] bg-[#f0f3fd]/80 hover:bg-[#ebf0fd] focus:bg-white text-[#131b2e] placeholder-[#6d7a77] rounded-xl border border-[#dae2fd] focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/15 focus:outline-hidden transition-all duration-150"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#6d7a77] bg-white/70 border border-[#dae2fd] rounded-md shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Status Pill Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e6f7f4] border border-[#a2e3d9]/60 text-[#00685f] text-[12px] font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-[#008378] animate-pulse"></span>
          <span>EQUILIBRIUM ACTIVE</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#3d4947] hover:text-[#131b2e] hover:bg-[#f0f3fd] border border-[#dae2fd]/70 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#712ae2] rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#dae2fd] rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#f0f3fd]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#712ae2]" />
                  <span className="text-[13px] font-semibold text-[#131b2e]">Telemetry Insights</span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-[#00685f] hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl text-left transition-colors ${
                      n.read ? 'bg-[#faf8ff]' : 'bg-[#f4f7ff] border-l-2 border-[#712ae2]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#131b2e]">{n.title}</span>
                      <span className="text-[10px] text-[#6d7a77]">{n.time}</span>
                    </div>
                    <p className="text-[11.5px] text-[#3d4947] mt-1 leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lock Terminal / Switch to Login Screen Button */}
        <button
          onClick={onLockTerminal}
          title="Lock Terminal / Sign In Screen"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#3d4947] hover:text-[#00685f] hover:bg-[#eefaf8] border border-[#dae2fd]/70 transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </button>

        {/* User Profile */}
        <div className="relative">
          <div 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-2 cursor-pointer group"
            title="User Profile Menu"
          >
            <img
              src={user.avatar || USER_PROFILE.avatar}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-2xs group-hover:ring-2 group-hover:ring-[#00685f]/30 transition-all"
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[13px] font-bold text-[#131b2e] leading-tight group-hover:text-[#00685f] transition-colors">
                {user.name}
              </span>
              <span className="text-[11px] text-[#6d7a77] leading-tight">
                {user.role}
              </span>
            </div>
          </div>

          {/* User Profile Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-[#dae2fd] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-[#f0f3fd]">
                <div className="text-[13px] font-bold text-[#131b2e]">{user.name}</div>
                <div className="text-[11px] text-[#6d7a77]">{user.role}</div>
                {user.email && (
                  <div className="text-[10px] text-[#00685f] font-mono mt-0.5 truncate">{user.email}</div>
                )}
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenSettings?.();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-medium text-[#3d4947] hover:bg-[#f0f3fd] hover:text-[#131b2e] transition-colors"
                >
                  System & Telemetry Settings
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLockTerminal?.();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-between"
                >
                  <span>Lock Terminal / Sign Out</span>
                  <span className="text-[10px] font-mono opacity-70">ESC</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
