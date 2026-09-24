// =============================================================================
// src/services/api.ts — Frontend HTTP API Service Client
// =============================================================================

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
