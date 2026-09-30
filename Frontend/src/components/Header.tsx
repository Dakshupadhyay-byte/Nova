import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, Bell, Sparkles, X,
  LayoutGrid, Target, Activity, BarChart3, Clock,
  Compass, Settings, FlaskConical,
} from 'lucide-react';
import { USER_PROFILE } from '../data/mockData';
import { NovaLogo } from './NovaLogo';
import { NavTab } from '../types';

interface FeatureEntry {
  tab: NavTab;
  label: string;
  description: string;
  keywords: string[];
  iconType: 'logo' | 'lucide';
  lucideIcon?: string;
}

const FEATURES: FeatureEntry[] = [
  { tab: 'overview',  label: 'Overview',         description: 'Your daily focus & wellness dashboard',          keywords: ['overview','dashboard','home','summary','today'],                                     iconType: 'lucide', lucideIcon: 'LayoutGrid' },
  { tab: 'nova-ai',  label: 'NOVA AI',           description: 'Chat with your personal focus companion',        keywords: ['nova','ai','chat','assistant','ask','companion','help','gpt'],                      iconType: 'logo' },
  { tab: 'focus',    label: 'Focus',             description: 'Start a timed focus or deep work session',       keywords: ['focus','timer','pomodoro','deep work','session','work','concentration'],            iconType: 'lucide', lucideIcon: 'Target' },
  { tab: 'checkin',  label: 'Check-in',          description: 'Log sleep, energy and wellness data',            keywords: ['checkin','check-in','check in','wellness','sleep','energy','log','health','mood'],   iconType: 'lucide', lucideIcon: 'Activity' },
  { tab: 'analytics',label: 'Analytics',         description: 'Explore productivity trends and patterns',       keywords: ['analytics','trends','insights','stats','patterns','charts','graphs','data'],         iconType: 'lucide', lucideIcon: 'BarChart3' },
  { tab: 'history',  label: 'History',           description: 'Review previous focus and wellness sessions',    keywords: ['history','sessions','log','past','previous','records','logbook','activity'],          iconType: 'lucide', lucideIcon: 'Clock' },
  { tab: 'blueprint',label: 'Roadmap',           description: 'View and manage your mission roadmap',           keywords: ['roadmap','blueprint','plan','mission','goals','schedule','days'],                   iconType: 'lucide', lucideIcon: 'Compass' },
  { tab: 'simulator',label: 'What-If Simulator', description: 'Simulate changes to sleep, energy and focus',   keywords: ['simulator','what if','what-if','simulate','scenario','experiment','predict'],         iconType: 'lucide', lucideIcon: 'FlaskConical' },
  { tab: 'settings', label: 'Settings',          description: 'Manage preferences and account options',         keywords: ['settings','preferences','account','profile','options','config'],                     iconType: 'lucide', lucideIcon: 'Settings' },
];

const QUICK_ACCESS: NavTab[] = ['overview', 'focus', 'nova-ai', 'analytics', 'checkin'];

function matchFeatures(query: string): FeatureEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return FEATURES.filter(
    (f) =>
      f.label.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.keywords.some((k) => k.includes(q) || q.includes(k))
  );
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  LayoutGrid, Target, Activity, BarChart3, Clock, Compass, Settings, FlaskConical,
};

function FeatureIcon({ entry, active }: { entry: FeatureEntry; active: boolean }) {
  const cls = `w-[18px] h-[18px] ${active ? 'text-[#00685f]' : 'text-[#6d7a77]'}`;
  if (entry.iconType === 'logo') return <NovaLogo size={18} />;
  const Icon = ICON_MAP[entry.lucideIcon ?? ''];
  return Icon ? <Icon className={cls} /> : null;
}

interface HeaderProps {
  onSearch?: (query: string) => void;
  onNavigate?: (tab: NavTab) => void;
  onOpenSettings?: () => void;
  onLockTerminal?: () => void;
  user?: { name: string; role: string; avatar?: string; email?: string };
}

export const Header: React.FC<HeaderProps> = ({
  onSearch, onNavigate, onOpenSettings, onLockTerminal, user = USER_PROFILE,
}) => {
  const [searchVal, setSearchVal]                     = useState('');
  const [isFocused, setIsFocused]                     = useState(false);
  const [selectedIndex, setSelectedIndex]             = useState(-1);
  const [showNotifications, setShowNotifications]     = useState(false);
  const [showUserMenu, setShowUserMenu]               = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 'n1', title: 'Optimal Wind-Down Window', desc: 'Target 10:15 PM bed routine for optimal energy tomorrow.', time: '12m ago', read: false },
    { id: 'n2', title: 'Morning Cardio Completed',  desc: '32-minute morning cardio boosted your energy score.',    time: '2h ago',  read: false },
    { id: 'n3', title: 'Focus Session Completed',   desc: '25 minutes of deep focus logged successfully.',          time: '4h ago',  read: true  },
  ]);

  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const notifRef     = useRef<HTMLDivElement>(null);
  const userMenuRef  = useRef<HTMLDivElement>(null);

  const results     = matchFeatures(searchVal);
  const quickAccess = QUICK_ACCESS.map((tab) => FEATURES.find((f) => f.tab === tab)!);
  const listItems   = searchVal.trim() ? results : quickAccess;

  useEffect(() => { setSelectedIndex(-1); }, [searchVal]);

  // Ctrl/Cmd+K shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleNavigate = useCallback((feature: FeatureEntry) => {
    onNavigate?.(feature.tab);
    setSearchVal(''); setIsFocused(false); onSearch?.('');
  }, [onNavigate, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => (i + 1) % Math.max(listItems.length, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => (i <= 0 ? listItems.length - 1 : i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const t = listItems[selectedIndex] ?? listItems[0]; if (t) handleNavigate(t); }
    else if (e.key === 'Escape') { setSearchVal(''); setIsFocused(false); inputRef.current?.blur(); }
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.scrollTop !== undefined) {
        setIsScrolled(target.scrollTop > 10);
      } else {
        setIsScrolled(window.scrollY > 10);
      }
    };

    // Attach to scrollable main container or window
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (mainEl) mainEl.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const markAllRead = () => setNotifications((p) => p.map((n) => ({ ...n, read: true })));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className={`h-16 px-4 sm:px-6 border-b flex items-center justify-between sticky top-0 z-[20] shrink-0 transition-all duration-300 ${
      isScrolled
        ? 'bg-white/94 backdrop-blur-2xl border-[#dae2fd] shadow-md shadow-[#00685f]/8'
        : 'bg-white/65 backdrop-blur-md border-transparent shadow-none'
    }`}>

      {/* Search + Dropdown */}
      <div ref={containerRef} className="relative w-full max-w-lg">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6d7a77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchVal}
            onChange={(e) => { setSearchVal(e.target.value); onSearch?.(e.target.value); }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search features, focus, analytics…"
            aria-label="Search NOVA features"
            aria-haspopup="listbox"
            aria-expanded={isFocused}
            className="w-full pl-10 pr-12 py-2 text-[13.5px] nova-input"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {searchVal ? (
              <button onClick={() => { setSearchVal(''); onSearch?.(''); inputRef.current?.focus(); }} aria-label="Clear search" className="w-5 h-5 flex items-center justify-center text-[#9BA8A5] hover:text-[#131b2e] transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#6d7a77] bg-white/80 border border-[#dae2fd] rounded-md shadow-2xs pointer-events-none">⌘K</kbd>
            )}
          </div>
        </div>

        {isFocused && (
          <div role="listbox" aria-label="Search results" className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-2xl shadow-xl z-[40] overflow-hidden" style={{ boxShadow: '0 12px 40px rgba(0,102,95,0.12), 0 4px 12px rgba(0,0,0,0.06)' }}>
            <div className="px-4 pt-3 pb-1.5 border-b border-[#f0f3fd]">
              <span className="text-[10.5px] font-bold text-[#6d7a77] tracking-widest uppercase">{searchVal.trim() ? 'Features' : 'Quick Access'}</span>
            </div>
            {listItems.length > 0 ? (
              <ul className="py-1.5 max-h-72 overflow-y-auto">
                {listItems.map((feature, idx) => (
                  <li key={feature.tab}>
                    <button
                      role="option"
                      aria-selected={idx === selectedIndex}
                      onClick={() => handleNavigate(feature)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 cursor-pointer ${idx === selectedIndex ? 'bg-[#e2f5f1]' : 'hover:bg-[#f4f7ff]'}`}
                    >
                      <span className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${idx === selectedIndex ? 'bg-white border-[#99dfd5]' : 'bg-[#f7f9fb] border-[#e2e7ff]'}`}>
                        <FeatureIcon entry={feature} active={idx === selectedIndex} />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className={`text-[13.5px] font-semibold leading-tight ${idx === selectedIndex ? 'text-[#00685f]' : 'text-[#131b2e]'}`}>{feature.label}</span>
                        <span className={`text-[11.5px] leading-tight mt-0.5 ${idx === selectedIndex ? 'text-[#00685f]/70' : 'text-[#6d7a77]'}`}>{feature.description}</span>
                      </span>
                      {idx === selectedIndex && <span className="ml-auto shrink-0 text-[10px] font-mono text-[#00685f]/50 border border-[#99dfd5] rounded px-1 py-0.5">↵</span>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-[13px] font-medium text-[#687573]">No matching features</p>
                <p className="text-[11.5px] text-[#9BA8A5] mt-1">Try: Focus, Analytics, Check-in, NOVA AI, History</p>
              </div>
            )}
            <div className="px-4 py-2 border-t border-[#f0f3fd] flex items-center gap-3 text-[10px] text-[#9BA8A5]">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> open</span>
              <span><kbd className="font-mono">Esc</kbd> close</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 ml-4 shrink-0">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }} aria-label="Notifications" className="w-9 h-9 rounded-xl flex items-center justify-center text-[#3d4947] hover:text-[#131b2e] hover:bg-[#f0f3fd] border border-[#dae2fd]/70 transition-colors relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#712ae2] rounded-full ring-2 ring-white" />}
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#dae2fd] rounded-2xl shadow-xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-[#f0f3fd]">
                <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#712ae2]" /><span className="text-[13px] font-semibold text-[#131b2e]">NOVA Insights</span></div>
                {unreadCount > 0 && <button onClick={markAllRead} className="text-[11px] text-[#00685f] hover:underline font-medium">Mark all read</button>}
              </div>
              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-2.5 rounded-xl ${n.read ? 'bg-[#faf8ff]' : 'bg-[#f4f7ff] border-l-2 border-[#712ae2]'}`}>
                    <div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-[#131b2e]">{n.title}</span><span className="text-[10px] text-[#6d7a77]">{n.time}</span></div>
                    <p className="text-[11.5px] text-[#3d4947] mt-1 leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lock */}
        <button
          type="button"
          onClick={async () => {
            console.log('LOGOUT BUTTON CLICKED');
            await onLockTerminal?.();
          }}
          title="Lock Terminal / Sign In Screen"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#3d4947] hover:text-[#00685f] hover:bg-[#eefaf8] border border-[#dae2fd]/70 transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </button>

        {/* User */}
        <div ref={userMenuRef} className="relative">
          <div onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }} className="flex items-center gap-3 pl-2 cursor-pointer group" title="User Profile Menu">
            <img src={user.avatar || USER_PROFILE.avatar} alt={user.name} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-2xs group-hover:ring-2 group-hover:ring-[#00685f]/30 transition-all" />
            <div className="hidden sm:flex flex-col text-left"><span className="text-[13px] font-bold text-[#131b2e] leading-tight group-hover:text-[#00685f] transition-colors">{user.name}</span></div>
          </div>
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-[#dae2fd] rounded-2xl shadow-xl p-2 z-50">
              <div className="px-3 py-2 border-b border-[#f0f3fd]">
                <div className="text-[13px] font-bold text-[#131b2e]">{user.name}</div>
                <div className="text-[11px] text-[#6d7a77]">{user.role}</div>
                {user.email && <div className="text-[10px] text-[#00685f] font-mono mt-0.5 truncate">{user.email}</div>}
              </div>
              <div className="py-1">
                <button onClick={() => { setShowUserMenu(false); onOpenSettings?.(); }} className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-medium text-[#3d4947] hover:bg-[#f0f3fd] hover:text-[#131b2e] transition-colors">System Settings</button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    console.log('LOGOUT BUTTON CLICKED');
                    setShowUserMenu(false);
                    await onLockTerminal?.();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-between cursor-pointer"
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
