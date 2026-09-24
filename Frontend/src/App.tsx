/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewScreen } from './screens/OverviewScreen';
import { FocusScreen } from './screens/FocusScreen';
import { CheckInScreen } from './screens/CheckInScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LoginScreen } from './screens/LoginScreen';
import { INITIAL_METRICS, INITIAL_FOCUS_BLOCKS } from './data/mockData';
import { NavTab, MetricOverview, FocusBlock } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<MetricOverview>(INITIAL_METRICS);
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>(INITIAL_FOCUS_BLOCKS);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentTab('overview');
  };

  const handleLockTerminal = () => {
    setIsAuthenticated(false);
    setCurrentTab('login');
  };

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
            <SettingsScreen />
          )}
        </main>
      </div>
    </div>
  );
}
