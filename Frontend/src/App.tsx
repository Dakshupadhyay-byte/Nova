/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { LandingPage } from './screens/landing/LandingPage';
import {
  INITIAL_METRICS,
  INITIAL_FOCUS_BLOCKS,
  getActiveUser,
  setActiveUser,
} from './data/mockData';
import { NavTab, MetricOverview, FocusBlock } from './types';

// ─── Auth state shared between routes ─────────────────────────────────────────
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Protected App Shell ───────────────────────────────────────────────────────
interface AppShellProps {
  authState: AuthState;
  onLogout: () => void;
}

const AppShell: React.FC<AppShellProps> = ({ authState, onLogout }) => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [currentUser, setCurrentUser] = useState(() => getActiveUser());
  const [metrics, setMetrics] = useState<MetricOverview>(INITIAL_METRICS);
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>(INITIAL_FOCUS_BLOCKS);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync user state
  useEffect(() => {
    const handleUserUpdate = () => setCurrentUser(getActiveUser());
    window.addEventListener('nova_user_change', handleUserUpdate);
    return () => window.removeEventListener('nova_user_change', handleUserUpdate);
  }, []);

  // If not authenticated (and done loading), redirect to login
  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#00685F]/30 border-t-[#00685F] rounded-full animate-spin" />
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSessionComplete = (newBlock: FocusBlock) => {
    setFocusBlocks(prev => [newBlock, ...prev]);
    setMetrics(prev => {
      const updatedTotalMins = prev.focusMinutesTotal + newBlock.durationMinutes;
      const updatedCount = prev.focusSessionsCount + 1;
      const updatedFlowPct = Math.min(100, Math.round((updatedTotalMins / 90) * 100));
      const updatedFocusIndex = Math.min(99, Math.round((updatedFlowPct * 0.4) + (prev.exerciseBurnPercent * 0.3) + (prev.sleepAlignmentPercent * 0.3)));
      return { ...prev, focusMinutesTotal: updatedTotalMins, focusSessionsCount: updatedCount, focusFlowPercent: updatedFlowPct, focusIndex: updatedFocusIndex, syncCycle: prev.syncCycle + 1 };
    });
  };

  const handleUpdateMetrics = (updated: Partial<MetricOverview>) => {
    setMetrics(prev => ({ ...prev, ...updated }));
  };

  const handleLockTerminal = async () => {
    await onLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col md:flex-row antialiased">
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} quantumSync={metrics.quantumSyncPercent} />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header user={currentUser} onSearch={q => setSearchQuery(q)} onOpenSettings={() => setCurrentTab('settings')} onLockTerminal={handleLockTerminal} />
        <main className="flex-1 pb-16">
          {currentTab === 'overview' && <OverviewScreen metrics={metrics} focusBlocks={focusBlocks} onStartFocus={() => setCurrentTab('focus')} onViewFullLogbook={() => setCurrentTab('history')} searchQuery={searchQuery} />}
          {currentTab === 'focus' && <FocusScreen onBackToOverview={() => setCurrentTab('overview')} onSessionComplete={handleSessionComplete} />}
          {currentTab === 'checkin' && <CheckInScreen metrics={metrics} onUpdateMetrics={handleUpdateMetrics} onGoToOverview={() => setCurrentTab('overview')} />}
          {currentTab === 'analytics' && <AnalyticsScreen metrics={metrics} />}
          {currentTab === 'history' && <HistoryScreen focusBlocks={focusBlocks} />}
          {currentTab === 'settings' && <SettingsScreen user={currentUser} />}
        </main>
      </div>
    </div>
  );
};

// ─── Login Route ───────────────────────────────────────────────────────────────
interface LoginRouteProps {
  authState: AuthState;
  onLoginSuccess: (user?: AuthenticatedUser) => void;
}

const LoginRoute: React.FC<LoginRouteProps> = ({ authState, onLoginSuccess }) => {
  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#00685F]/30 border-t-[#00685F] rounded-full animate-spin" />
      </div>
    );
  }
  // Already logged in → go to dashboard
  if (authState.isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <LoginScreen onLoginSuccess={onLoginSuccess} />;
};

// ─── Root App with Router ──────────────────────────────────────────────────────
export default function App() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, isLoading: true });

  useEffect(() => {
    const unsubscribe = onAuthChange((user, _token) => {
      if (user) {
        setActiveUser({
          name: user.name,
          email: user.email,
          avatar: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=00685f&textColor=ffffff`,
        });
        setAuthState({ isAuthenticated: true, isLoading: false });
      } else {
        setAuthState({ isAuthenticated: false, isLoading: false });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user?: AuthenticatedUser) => {
    // onAuthChange handles state — this is just a fallback for any remaining UI wiring
    if (user) {
      setActiveUser({
        name: user.name,
        role: user.role || 'NOVA User',
        email: user.email,
        avatar: user.avatar,
      });
    }
  };

  const handleLogout = async () => {
    await logOut();
    setAuthState({ isAuthenticated: false, isLoading: false });
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Login */}
        <Route path="/login" element={
          <LoginRoute authState={authState} onLoginSuccess={handleLoginSuccess} />
        } />

        {/* Protected dashboard — catch all app tabs */}
        <Route path="/dashboard" element={
          <AppShell authState={authState} onLogout={handleLogout} />
        } />
        <Route path="/focus" element={
          <AppShell authState={authState} onLogout={handleLogout} />
        } />
        <Route path="/checkin" element={
          <AppShell authState={authState} onLogout={handleLogout} />
        } />
        <Route path="/analytics" element={
          <AppShell authState={authState} onLogout={handleLogout} />
        } />
        <Route path="/history" element={
          <AppShell authState={authState} onLogout={handleLogout} />
        } />
        <Route path="/settings" element={
          <AppShell authState={authState} onLogout={handleLogout} />
        } />

        {/* Redirect old /login-style unknown paths to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

