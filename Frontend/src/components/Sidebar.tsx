import React from 'react';
import { 
  LayoutGrid, 
  Target, 
  Activity, 
  BarChart3, 
  Clock, 
  Settings, 
  Radio,
  Lock
} from 'lucide-react';
import { NavTab } from '../types';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  quantumSync: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  quantumSync,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'focus', label: 'Focus', icon: Target },
    { id: 'checkin', label: 'Check-in', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'login', label: 'Sign In / Lock', icon: Lock },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#faf8ff] border-r border-[#e2e7ff]/80 flex flex-col justify-between p-5 min-h-screen select-none">
      <div>
        {/* Brand Lockup */}
        <div 
          onClick={() => onSelectTab('overview')}
          className="flex items-center gap-3 px-2 py-3 mb-6 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-[#00685f] flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
            {/* Bio-harmonic double infinity ring icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold tracking-tight text-[#131b2e] leading-tight">
              NOVA
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-[#00685f] uppercase leading-none mt-0.5">
              BIO-HARMONIC
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-[#e2f5f1] text-[#00685f] font-semibold border border-[#99dfd5]/50 shadow-xs'
                    : 'text-[#3d4947] hover:bg-[#f0f2fd] hover:text-[#131b2e]'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] transition-colors ${
                    isActive ? 'text-[#00685f]' : 'text-[#6d7a77]'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Telemetry Link Bottom Status Card */}
      <div className="bg-[#f0f3fd] border border-[#dae2fd] rounded-xl p-3.5 mt-8 shadow-xs">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#6d7a77] tracking-wider uppercase mb-1">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[#00685f]" />
            <span>Telemetry Link</span>
          </div>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#008378] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00685f]"></span>
          </span>
        </div>
        <div className="text-[13px] font-medium text-[#131b2e] tabular-nums">
          Quantum Sync: <span className="font-semibold text-[#00685f]">{quantumSync.toFixed(1)}%</span>
        </div>
      </div>
    </aside>
  );
};
