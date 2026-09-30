import React from 'react';
import { 
  LayoutGrid, 
  Target, 
  Activity, 
  BarChart3, 
  Clock, 
  Compass,
  Settings,
  Lock,
  FlaskConical
} from 'lucide-react';
import { NavTab } from '../types';
import { NovaLogo } from './NovaLogo';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  quantumSync?: number;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  isNovaAI?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const mainNavItems: NavItemConfig[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'nova-ai', label: 'NOVA AI', isNovaAI: true },
    { id: 'focus', label: 'Focus', icon: Target },
    { id: 'checkin', label: 'Check-in', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'blueprint', label: 'Roadmap', icon: Compass },
    { id: 'simulator', label: 'What-If Simulator', icon: FlaskConical },
    { id: 'login', label: 'Sign In / Lock', icon: Lock },
  ];

  const secondaryNavItems: NavItemConfig[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderNavItem = (item: NavItemConfig) => {
    const isActive = currentTab === item.id;
    const isAi = item.isNovaAI;

    return (
      <button
        key={item.id}
        onClick={() => onSelectTab(item.id)}
        title={item.label}
        aria-label={item.label}
        className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-200 text-left group cursor-pointer relative ${
          isActive
            ? 'bg-[#00685f]/12 text-[#00685f] font-bold border border-[#00685f]/30 shadow-sm shadow-[#00685f]/10 scale-[1.01]'
            : isAi
            ? 'text-[#3d4947] hover:bg-[#712ae2]/10 hover:text-[#712ae2] hover:translate-x-1.5'
            : 'text-[#3d4947] hover:bg-[#00685f]/8 hover:text-[#00685f] hover:translate-x-1.5'
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#00685f] rounded-r-full shadow-sm shadow-[#00685f]/50" />
        )}
        <div className="w-[22px] h-[22px] flex items-center justify-center shrink-0">
          {isAi ? (
            <NovaLogo 
              size={22} 
              className="shrink-0 object-contain transition-transform duration-180 group-hover:scale-108" 
            />
          ) : (
            item.icon && (
              <item.icon
                className={`w-[18px] h-[18px] transition-colors ${
                  isActive ? 'text-[#00685f]' : 'text-[#6d7a77]'
                }`}
              />
            )
          )}
        </div>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="w-full md:w-64 shrink-0 glass-strong border-b md:border-b-0 md:border-r border-[#dae2fd]/80 flex flex-col justify-between p-3.5 md:p-5 md:min-h-screen select-none z-[20] overflow-x-auto md:overflow-y-auto">
      <div className="flex flex-row md:flex-col items-center md:items-stretch justify-between md:justify-start w-full">
        {/* Brand Lockup */}
        <div 
          onClick={() => onSelectTab('overview')}
          className="flex items-center gap-3 px-2 py-2 md:py-3 mb-0 md:mb-6 cursor-pointer group shrink-0"
        >
          <div className="flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
            <NovaLogo size="md" />
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] md:text-[17px] font-bold tracking-tight text-[#131b2e] leading-tight">
              NOVA
            </span>
            <span className="text-[9.5px] md:text-[10px] font-semibold tracking-wider text-[#00685f] uppercase leading-none mt-0.5 hidden sm:block">
              NOTICE. ORGANIZE. VISUALIZE. ACT.
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-row md:flex-col gap-1 md:gap-1.5 overflow-x-auto md:overflow-visible no-scrollbar py-1" aria-label="Main Navigation">
          {mainNavItems.map(renderNavItem)}
        </nav>

        {/* Divider */}
        <div className="hidden md:block my-4 border-t border-[#dae2fd]/80" />

        {/* Secondary / Settings Navigation */}
        <nav className="hidden md:flex flex-col space-y-1.5" aria-label="Settings Navigation">
          {secondaryNavItems.map(renderNavItem)}
        </nav>
      </div>
    </aside>
  );
};
