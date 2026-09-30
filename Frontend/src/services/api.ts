import { Blueprint, BlueprintDay } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface DbUser {
  id: number;
  name: string;
  email: string;
}

export interface DashboardData {
  focusScore: number | null;
  todayEnergy: number | null;
  todaySleep: number | null;
  recentInsight: string;
  today?: {
    sleepHours: number | null;
    energyLevel: number | null;
    logDate: string | null;
  };
  recentWellness?: Array<{
    logDate: string;
    sleepHours: number | null;
    energyLevel: number | null;
  }>;
  focus?: {
    totalSessions: number;
    completedSessions: number;
    totalFocusMinutes: number;
    averageSessionMinutes: number | null;
    averageInterruptions: number | null;
  };
}

/**
 * Generic fetch wrapper attaching Firebase Bearer Token.
 */
async function fetchWithAuth<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T | null; error: any }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      console.warn(`[API ERROR] ${endpoint} returned status ${response.status}:`, json.error);
      return { success: false, data: null, error: json.error || { message: 'HTTP Request failed' } };
    }

    return { success: true, data: json.data, error: null };
  } catch (err: any) {
    console.warn(`[API NETWORK ERROR] ${endpoint}:`, err?.message || err);
    return { success: false, data: null, error: { message: err?.message || 'Network error' } };
  }
}

/**
 * Sync Firebase user with PostgreSQL backend.
 */
export async function syncUser(token: string): Promise<DbUser | null> {
  const result = await fetchWithAuth<{ user: DbUser }>('/auth/sync', token, {
    method: 'POST',
    body: JSON.stringify({ credential: token }),
  });

  return result.success && result.data ? result.data.user : null;
}

/**
 * Fetch authenticated user dashboard metrics.
 */
export async function getDashboard(token: string): Promise<DashboardData | null> {
  const result = await fetchWithAuth<DashboardData>('/dashboard', token, {
    method: 'GET',
  });

  return result.success && result.data ? result.data : null;
}

/**
 * Submit daily wellness check-in.
 */
export async function submitCheckin(
  token: string,
  sleepHours: number,
  energyLevel: number,
  logDate: string
): Promise<boolean> {
  const result = await fetchWithAuth('/checkin', token, {
    method: 'POST',
    body: JSON.stringify({
      sleepHours,
      energyLevel,
      logDate,
    }),
  });

  return result.success;
}

/**
 * Record completed focus session.
 */
export async function recordSession(
  token: string,
  durationMinutes: number,
  interruptions: number,
  completed: boolean = true,
  startedAt: string
): Promise<boolean> {
  const result = await fetchWithAuth('/sessions', token, {
    method: 'POST',
    body: JSON.stringify({
      durationMinutes,
      interruptions,
      completed,
      startedAt,
    }),
  });

  return result.success;
}

export interface DailyHealthMetric {
  date: string;
  steps: number;
  exercise_minutes: number;
  exercise_distance_meters: number;
}

/**
 * Fetch authenticated user daily health aggregates.
 */
export async function getDailyHealth(
  token: string,
  from?: string,
  to?: string
): Promise<DailyHealthMetric[] | null> {
  const queryParams = new URLSearchParams();
  if (from) queryParams.append('from', from);
  if (to) queryParams.append('to', to);

  const endpoint = `/health/daily${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const result = await fetchWithAuth<DailyHealthMetric[]>(endpoint, token, {
    method: 'GET',
  });

  return result.success && Array.isArray(result.data) ? result.data : null;
}

/**
 * Fetch all blueprints and nested days for the authenticated user.
 * GET /api/blueprints
 */
export async function getBlueprints(
  token: string
): Promise<{ success: boolean; data: { blueprints: Blueprint[] } | null; error: any }> {
  return fetchWithAuth<{ blueprints: Blueprint[] }>('/blueprints', token, {
    method: 'GET',
  });
}

/**
 * Create a new personalized blueprint for the authenticated user.
 * POST /api/blueprints
 */
export async function createBlueprint(
  token: string,
  outcome: string,
  durationDays: number
): Promise<{ success: boolean; data: { blueprint: Blueprint } | null; error: any }> {
  return fetchWithAuth<{ blueprint: Blueprint }>('/blueprints', token, {
    method: 'POST',
    body: JSON.stringify({
      outcome,
      durationDays,
    }),
  });
}

/**
 * Reschedule a pending roadmap mission to a new calendar date.
 * PATCH /api/blueprints/days/:dayId/reschedule
 */
export async function rescheduleBlueprintDay(
  token: string,
  dayId: number,
  newDate: string
): Promise<{ success: boolean; data: { day: BlueprintDay } | null; error: any }> {
  return fetchWithAuth<{ day: BlueprintDay }>(`/blueprints/days/${dayId}/reschedule`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      newDate,
    }),
  });
}

/**
 * Shift all pending missions in an active roadmap forward by N days.
 * PATCH /api/blueprints/:blueprintId/shift
 */
export async function shiftBlueprint(
  token: string,
  blueprintId: number,
  days: number
): Promise<{ success: boolean; data: { shiftedCount: number; days: BlueprintDay[] } | null; error: any }> {
  return fetchWithAuth<{ shiftedCount: number; days: BlueprintDay[] }>(`/blueprints/${blueprintId}/shift`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      days,
    }),
  });
}

// ─── What-If Simulator ────────────────────────────────────────────────────────

export interface WhatIfRequest {
  variable: 'sleep';
  value: number;
}

export interface WhatIfSimulationResponse {
  simulation: import('../types').SimulationResult;
}

/**
 * POST /api/simulation/what-if
 *
 * Runs a What-If simulation against the authenticated user's real historical data.
 * The backend derives the user ID from the Firebase auth token — never from this payload.
 */
export async function runWhatIfSimulation(
  token: string,
  variable: 'sleep',
  value: number
): Promise<WhatIfSimulationResponse | null> {
  const result = await fetchWithAuth<WhatIfSimulationResponse>('/simulation/what-if', token, {
    method: 'POST',
    body: JSON.stringify({ variable, value }),
  });

  return result.success && result.data ? result.data : null;
}

