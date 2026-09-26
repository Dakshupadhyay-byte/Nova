/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthChange, logOut } from './services/auth';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewScreen } from './screens/OverviewScreen';
import { FocusScreen } from './screens/FocusScreen';
import { CheckInScreen } from './screens/CheckInScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LoginScreen, AuthenticatedUser } from './screens/LoginScreen';
import { 
  INITIAL_METRICS, 
  INITIAL_FOCUS_BLOCKS, 
  USER_PROFILE, 
  getActiveUser, 
  setActiveUser, 
  isUserLoggedIn 
} from './data/mockData';
import { NavTab, MetricOverview, FocusBlock } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState(() => getActiveUser());
  const [metrics, setMetrics] = useState<MetricOverview>(INITIAL_METRICS);
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>(INITIAL_FOCUS_BLOCKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Keep state in sync with external user changes and Firebase Auth
  useEffect(() => {
    const handleUserUpdate = () => {
      setCurrentUser(getActiveUser());
    };
    window.addEventListener('nova_user_change', handleUserUpdate);

    const unsubscribeAuth = onAuthChange((user, token) => {
      if (user) {
        setActiveUser({
          name: user.name,
          email: user.email,
          avatar: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=00685f&textColor=ffffff`,
        });
        setCurrentUser(getActiveUser());
        setIsAuthenticated(true);
        if (currentTab === 'login') setCurrentTab('overview');
      } else {
        setIsAuthenticated(false);
        setCurrentTab('login');
      }
      setIsAuthLoading(false);
    });

    return () => {
      window.removeEventListener('nova_user_change', handleUserUpdate);
      unsubscribeAuth();
    };
  }, [currentTab]);

  // Handle new completed focus session from the FocusScreen
  const handleSessionComplete = (newBlock: FocusBlock) => {
    setFocusBlocks((prev) => [newBlock, ...prev]);

    setMetrics((prev) => {
      const updatedTotalMins = prev.focusMinutesTotal + newBlock.durationMinutes;
      const updatedCount = prev.focusSessionsCount + 1;
      // Recalculate focus flow percent
      const updatedFlowPct = Math.min(100, Math.round((updatedTotalMins / 90) * 100));
      const updatedFocusIndex = Math.min(99, Math.round((updatedFlowPct * 0.4) + (prev.exerciseBurnPercent * 0.3) + (prev.sleepAlignmentPercent * 0.3)));

      return {
        ...prev,
        focusMinutesTotal: updatedTotalMins,
        focusSessionsCount: updatedCount,
        focusFlowPercent: updatedFlowPct,
        focusIndex: updatedFocusIndex,
        syncCycle: prev.syncCycle + 1,
      };
    });
  };

  const handleUpdateMetrics = (updated: Partial<MetricOverview>) => {
    setMetrics((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  const handleLoginSuccess = (user?: AuthenticatedUser) => {
    if (user) {
      setActiveUser({
        name: user.name,
        role: user.role || 'Bio-Harmonic Operator',
        email: user.email || 'dipanshushah50@gmail.com',
        avatar: user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=00685f&textColor=ffffff`,
      });
      setCurrentUser(getActiveUser());
    }
    setIsAuthenticated(true);
    setCurrentTab('overview');
  };

  const handleLockTerminal = async () => {
    await logOut();
    setIsAuthenticated(false);
    setCurrentTab('login');
  };

  // Wait for initial auth check before rendering
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#00685f]/30 border-t-[#00685f] rounded-full animate-spin"></div>
      </div>
    );
  }

  // If user is locked or on the login tab, show full-screen Login Screen
  if (!isAuthenticated || currentTab === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col md:flex-row antialiased">
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        quantumSync={metrics.quantumSyncPercent}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <Header
          user={currentUser}
          onSearch={(query) => setSearchQuery(query)}
          onOpenSettings={() => setCurrentTab('settings')}
          onLockTerminal={handleLockTerminal}
        />

        {/* Screen Routing */}
        <main className="flex-1 pb-16">
          {currentTab === 'overview' && (
            <OverviewScreen
              metrics={metrics}
              focusBlocks={focusBlocks}
              onStartFocus={() => setCurrentTab('focus')}
              onViewFullLogbook={() => setCurrentTab('history')}
              searchQuery={searchQuery}
            />
          )}

          {currentTab === 'focus' && (
            <FocusScreen
              onBackToOverview={() => setCurrentTab('overview')}
              onSessionComplete={handleSessionComplete}
            />
          )}

          {currentTab === 'checkin' && (
            <CheckInScreen
              metrics={metrics}
              onUpdateMetrics={handleUpdateMetrics}
              onGoToOverview={() => setCurrentTab('overview')}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsScreen metrics={metrics} />
          )}

          {currentTab === 'history' && (
            <HistoryScreen focusBlocks={focusBlocks} />
          )}

          {currentTab === 'settings' && (
            <SettingsScreen user={currentUser} />
          )}
        </main>
      </div>
    </div>
  );
}
