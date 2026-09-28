import React from 'react';
import { 
  LayoutGrid, 
  Target, 
  Activity, 
  BarChart3, 
  Clock, 
  Compass,
  Settings, 
  Lock 
} from 'lucide-react';
import { NavTab } from '../types';
import { NovaLogo } from './NovaLogo';

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
    { id: 'blueprint', label: 'Blueprint', icon: Compass },
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
          <div className="flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
            <NovaLogo size="md" />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold tracking-tight text-[#131b2e] leading-tight">
              NOVA
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-[#00685f] uppercase leading-none mt-0.5">
              NOTICE. ORGANIZE. VISUALIZE. ACT.
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

      {/* Floating Circular NOVA AI Button (bottom-left fixed) */}
      <button
        type="button"
        onClick={() => onSelectTab('nova-ai')}
        aria-label="Open NOVA AI"
        title="Open NOVA AI"
        className={`fixed bottom-5 left-5 z-40 h-[50px] w-[50px] hover:w-[142px] focus-visible:w-[142px] rounded-full bg-white/95 backdrop-blur-md border shadow-md hover:shadow-xl flex items-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#7C5CFC]/40 cursor-pointer group px-[9px] ${
          currentTab === 'nova-ai'
            ? 'border-[#7C5CFC] ring-2 ring-[#7C5CFC]/20 shadow-lg'
            : 'border-[#e2e7ff] hover:border-[#7C5CFC]/40'
        }`}
      >
        {/* Soft AI Glow on Hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#7C5CFC]/10 via-[#22C7E8]/10 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Logo Container */}
        <div className="shrink-0 w-8 h-8 flex items-center justify-center relative z-10 transition-transform duration-200 group-hover:scale-108">
          <NovaLogo size={32} />
        </div>

        {/* Revealed NOVA AI text & Arrow on Hover */}
        <div className="flex items-center gap-1.5 ml-2.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-all duration-250 ease-out whitespace-nowrap relative z-10">
          <span className="text-[13px] font-bold tracking-tight text-[#0D2422]">
            NOVA AI
          </span>
          <span className="text-[#7C5CFC] text-[12px] font-bold">
            →
          </span>
        </div>
      </button>
    </aside>
  );
};
