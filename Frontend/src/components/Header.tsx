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
  if (entry.iconType === 'logo') return <NovaLogo size={18} />;
  const Icon = ICON_MAP[entry.lucideIcon ?? ''];
  return Icon ? <Icon className={`w-[18px] h-[18px] ${active ? 'text-[var(--nova-brand)]' : 'text-[var(--nova-text-muted)]'}`} /> : null;
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

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) setIsFocused(false);
      if (notifRef.current && !notifRef.current.contains(target)) setShowNotifications(false);
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setShowUserMenu(false);
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
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (mainEl) mainEl.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const markAllRead = () => setNotifications((p) => p.map((n) => ({ ...n, read: true })));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header
      className="h-16 px-4 sm:px-6 border-b flex items-center justify-between sticky top-0 z-[20] shrink-0 transition-all duration-300"
      style={{
        background: isScrolled ? 'var(--nova-header-bg-scrolled)' : 'var(--nova-header-bg)',
        borderColor: isScrolled ? 'var(--nova-header-border)' : 'transparent',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        boxShadow: isScrolled ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {/* Search */}
      <div ref={containerRef} className="relative w-full max-w-lg">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--nova-text-muted)' }} />
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
            className="w-full pl-12 pr-12 py-2 text-[13.5px] nova-input"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {searchVal ? (
              <button
                onClick={() => { setSearchVal(''); onSearch?.(''); inputRef.current?.focus(); }}
                aria-label="Clear search"
                className="w-5 h-5 flex items-center justify-center transition-colors cursor-pointer"
                style={{ color: 'var(--nova-text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd
                className="px-1.5 py-0.5 text-[10px] font-mono rounded-md shadow-2xs pointer-events-none"
                style={{
                  color: 'var(--nova-text-muted)',
                  background: 'var(--nova-surface-muted)',
                  border: '1px solid var(--nova-border)',
                }}
              >
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {isFocused && (
          <div
            role="listbox"
            aria-label="Search results"
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-xl z-[40] overflow-hidden"
            style={{
              background: 'var(--nova-overlay-surface)',
              border: '1px solid var(--nova-border)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <div className="px-4 pt-3 pb-1.5 border-b" style={{ borderColor: 'var(--nova-divider)' }}>
              <span className="text-[10.5px] font-bold tracking-widest uppercase" style={{ color: 'var(--nova-text-muted)' }}>
                {searchVal.trim() ? 'Features' : 'Quick Access'}
              </span>
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
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 cursor-pointer"
                      style={{
                        backgroundColor: idx === selectedIndex ? 'var(--nova-search-selected)' : 'transparent',
                      }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <span
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-colors"
                        style={{
                          background: idx === selectedIndex ? 'var(--nova-icon-active-bg)' : 'var(--nova-icon-bg)',
                          borderColor: idx === selectedIndex ? 'var(--nova-icon-active-border)' : 'var(--nova-icon-border)',
                        }}
                      >
                        <FeatureIcon entry={feature} active={idx === selectedIndex} />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span
                          className="text-[13.5px] font-semibold leading-tight"
                          style={{ color: idx === selectedIndex ? 'var(--nova-brand)' : 'var(--nova-text-primary)' }}
                        >
                          {feature.label}
                        </span>
                        <span
                          className="text-[11.5px] leading-tight mt-0.5"
                          style={{ color: idx === selectedIndex ? 'var(--nova-brand)' : 'var(--nova-text-muted)' }}
                        >
                          {feature.description}
                        </span>
                      </span>
                      {idx === selectedIndex && (
                        <span
                          className="ml-auto shrink-0 text-[10px] font-mono rounded px-1 py-0.5"
                          style={{ color: 'var(--nova-brand)', border: '1px solid var(--nova-brand-border)' }}
                        >
                          ↵
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-[13px] font-medium" style={{ color: 'var(--nova-text-secondary)' }}>No matching features</p>
                <p className="text-[11.5px] mt-1" style={{ color: 'var(--nova-text-muted)' }}>Try: Focus, Analytics, Check-in, NOVA AI, History</p>
              </div>
            )}
            <div className="px-4 py-2 border-t flex items-center gap-3 text-[10px]" style={{ borderColor: 'var(--nova-divider)', color: 'var(--nova-text-placeholder)' }}>
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
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            aria-label="Notifications"
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors relative cursor-pointer"
            style={{
              color: 'var(--nova-text-secondary)',
              borderColor: 'var(--nova-border)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nova-dropdown-hover)'; e.currentTarget.style.color = 'var(--nova-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--nova-text-secondary)'; }}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2"
                style={{ background: 'var(--nova-purple)', boxShadow: '0 0 0 2px var(--nova-surface-solid)' }}
              />
            )}
          </button>
          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-2xl shadow-xl p-4 z-50"
              style={{
                background: 'var(--nova-overlay-surface)',
                border: '1px solid var(--nova-border)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--nova-divider)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--nova-purple)' }} />
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--nova-text-primary)' }}>NOVA Insights</span>
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-medium hover:underline" style={{ color: 'var(--nova-brand)' }}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl"
                    style={{
                      background: n.read ? 'var(--nova-notif-read-bg)' : 'var(--nova-notif-unread-bg)',
                      borderLeft: n.read ? 'none' : `2px solid var(--nova-purple)`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--nova-text-primary)' }}>{n.title}</span>
                      <span className="text-[10px]" style={{ color: 'var(--nova-text-muted)' }}>{n.time}</span>
                    </div>
                    <p className="text-[11.5px] mt-1 leading-relaxed" style={{ color: 'var(--nova-text-secondary)' }}>{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lock */}
        <button
          type="button"
          onClick={async () => { await onLockTerminal?.(); }}
          title="Lock Terminal / Sign In Screen"
          className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer"
          style={{ color: 'var(--nova-text-secondary)', borderColor: 'var(--nova-border)', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nova-brand-light)'; e.currentTarget.style.color = 'var(--nova-brand)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--nova-text-secondary)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </button>

        {/* User Menu */}
        <div ref={userMenuRef} className="relative">
          <div
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className="flex items-center gap-3 pl-2 cursor-pointer group"
            title="User Profile Menu"
          >
            <img
              src={user.avatar || USER_PROFILE.avatar}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border-2 shadow-2xs group-hover:ring-2 transition-all"
              style={{ borderColor: 'var(--nova-border)' }}
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[13px] font-bold leading-tight transition-colors" style={{ color: 'var(--nova-text-primary)' }}>{user.name}</span>
            </div>
          </div>
          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl shadow-xl p-2 z-50"
              style={{
                background: 'var(--nova-overlay-surface)',
                border: '1px solid var(--nova-border)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              }}
            >
              <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--nova-divider)' }}>
                <div className="text-[13px] font-bold" style={{ color: 'var(--nova-text-primary)' }}>{user.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--nova-text-muted)' }}>{user.role}</div>
                {user.email && <div className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'var(--nova-brand)' }}>{user.email}</div>}
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setShowUserMenu(false); onOpenSettings?.(); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-medium transition-colors"
                  style={{ color: 'var(--nova-text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nova-dropdown-hover)'; e.currentTarget.style.color = 'var(--nova-text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--nova-text-secondary)'; }}
                >
                  System Settings
                </button>
                <button
                  type="button"
                  onClick={async (e) => { e.stopPropagation(); setShowUserMenu(false); await onLockTerminal?.(); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-medium flex items-center justify-between cursor-pointer transition-colors"
                  style={{ color: '#ef4444' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
