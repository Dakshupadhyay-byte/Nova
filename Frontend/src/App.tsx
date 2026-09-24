/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { onAuthChange, logOut, AuthStateUser } from './services/auth';
import { syncUser, getDashboard, recordSession, submitCheckin, DbUser } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<AuthStateUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<MetricOverview>(INITIAL_METRICS);
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>(INITIAL_FOCUS_BLOCKS);
  const [searchQuery, setSearchQuery] = useState('');

  // Firebase Auth persistent listener
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user, token) => {
      if (user && token) {
        setAuthUser(user);
        setUserToken(token);
        setIsAuthenticated(true);

        // Synchronize with PostgreSQL database
        const syncedDbUser = await syncUser(token);
        if (syncedDbUser) {
          setDbUser(syncedDbUser);
        }

        // Fetch live dashboard metrics from backend
        const dashData = await getDashboard(token);
        if (dashData) {
          setMetrics((prev) => ({
            ...prev,
            focusIndex: dashData.focusScore !== null ? dashData.focusScore : prev.focusIndex,
            focusFlowPercent: dashData.focusScore !== null ? dashData.focusScore : prev.focusFlowPercent,
            sleepHours: dashData.today?.sleepHours !== null && dashData.today?.sleepHours !== undefined
              ? dashData.today.sleepHours
              : prev.sleepHours,
          }));
        }
      } else {
        setAuthUser(null);
        setDbUser(null);
        setUserToken(null);
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle new completed focus session from FocusScreen
  const handleSessionComplete = async (newBlock: FocusBlock) => {
    setFocusBlocks((prev) => [newBlock, ...prev]);

    // Record session to PostgreSQL if token is present
    if (userToken) {
      await recordSession(
        userToken,
        newBlock.durationMinutes,
        newBlock.interruptions,
        true,
        new Date().toISOString()
      );
      // Refresh dashboard after session
      const dashData = await getDashboard(userToken);
      if (dashData && dashData.focusScore !== null) {
        setMetrics((prev) => ({
          ...prev,
          focusIndex: dashData.focusScore!,
          focusFlowPercent: dashData.focusScore!,
        }));
      }
    } else {
      setMetrics((prev) => {
        const updatedTotalMins = prev.focusMinutesTotal + newBlock.durationMinutes;
        const updatedCount = prev.focusSessionsCount + 1;
        const updatedFlowPct = Math.min(100, Math.round((updatedTotalMins / 90) * 100));
        const updatedFocusIndex = Math.min(
          99,
          Math.round(updatedFlowPct * 0.4 + prev.exerciseBurnPercent * 0.3 + prev.sleepAlignmentPercent * 0.3)
        );

        return {
          ...prev,
          focusMinutesTotal: updatedTotalMins,
          focusSessionsCount: updatedCount,
          focusFlowPercent: updatedFlowPct,
          focusIndex: updatedFocusIndex,
          syncCycle: prev.syncCycle + 1,
        };
      });
    }
  };

  const handleUpdateMetrics = async (updated: Partial<MetricOverview>) => {
    setMetrics((prev) => ({
      ...prev,
      ...updated,
    }));

    // If checkin metrics (sleepHours / energy) updated, persist to backend
    if (userToken && updated.sleepHours !== undefined) {
      const todayStr = new Date().toISOString().split('T')[0];
      const energyLevel = Math.min(10, Math.max(1, Math.round(metrics.focusIndex / 10))) || 7;
      await submitCheckin(userToken, updated.sleepHours, energyLevel, todayStr);
    }
  };

  const handleLoginSuccess = async (userObj?: any, token?: string) => {
    if (token) {
      setUserToken(token);
      const synced = await syncUser(token);
      if (synced) setDbUser(synced);
    }
    setIsAuthenticated(true);
    setCurrentTab('overview');
  };

  const handleLockTerminal = async () => {
    await logOut();
    setAuthUser(null);
    setDbUser(null);
    setUserToken(null);
    setIsAuthenticated(false);
    setCurrentTab('login');
  };

  // If user is locked or on login tab, show full-screen Login Screen
  if (!isAuthenticated || currentTab === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={() => {
          setIsAuthenticated(true);
          setCurrentTab('overview');
        }}
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
