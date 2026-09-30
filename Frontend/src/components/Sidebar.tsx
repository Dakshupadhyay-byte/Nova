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
        className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 text-left group cursor-pointer ${
          isActive
            ? 'bg-[#e2f5f1] text-[#00685f] font-semibold border border-[#99dfd5]/50 shadow-xs'
            : isAi
            ? 'text-[#3d4947] hover:bg-[#f6f4fe] hover:text-[#131b2e]'
            : 'text-[#3d4947] hover:bg-[#f0f2fd] hover:text-[#131b2e]'
        }`}
      >
        <div className="w-[22px] h-[22px] flex items-center justify-center shrink-0">
          {isAi ? (
            <NovaLogo 
              size={22} 
              className="shrink-0 object-contain transition-transform duration-150 group-hover:scale-105" 
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
    <aside className="w-full md:w-64 shrink-0 bg-[#faf8ff] border-b md:border-b-0 md:border-r border-[#e2e7ff]/80 flex flex-col justify-between p-4 md:p-5 md:min-h-screen select-none">
      <div className="flex flex-col">
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
          {mainNavItems.map(renderNavItem)}
        </nav>

        {/* Divider */}
        <div className="my-4 border-t border-[#e2e7ff]/80" />

        {/* Secondary / Settings Navigation */}
        <nav className="space-y-1.5" aria-label="Settings Navigation">
          {secondaryNavItems.map(renderNavItem)}
        </nav>
      </div>
    </aside>
  );
};
