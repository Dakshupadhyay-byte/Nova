export type NavTab = 'overview' | 'focus' | 'checkin' | 'analytics' | 'history' | 'blueprint' | 'simulator' | 'settings' | 'login' | 'nova-ai';

export interface DailyHealthMetric {
  date: string;
  steps: number;
  exercise_minutes: number;
  exercise_distance_meters: number;
}

export interface FocusBlock {
  id: string;
  title: string;
  tier: 'DEEP' | 'CORE' | 'LIGHT';
  time: string;
  durationMinutes: number;
  interruptions: number;
  notes?: string;
  tags?: string[];
}

export interface MetricOverview {
  focusIndex: number;
  focusFlowPercent: number;
  focusSessionsCount: number;
  focusMinutesTotal: number;
  
  exerciseBurnPercent: number;
  exerciseMinutes: number;
  exerciseCalories: number;
  exerciseTargetCalories: number;
  zone2Minutes: number;
  zone2Calories: number;
  hiitMinutes: number;
  hiitCalories: number;
  
  sleepAlignmentPercent: number;
  sleepHours: number;
  sleepGoalHours: number;
  sleepDeficitHours: number;
  deepSleep: string;
  awakeSleep: string;
  lightSleep: string;
  remSleep: string;

  alphaFrequencyHz: number;
  quantumSyncPercent: number;
  syncCycle: number;
}

export interface VelocityDay {
  day: string;
  label: string;
  value: number; // 0-100
  deepMinutes: number;
  interruptions: number;
}

export interface CircadianEvent {
  id: string;
  time: string;
  category: 'sleep' | 'workout' | 'focus' | 'nutrition' | 'recovery';
  title: string;
  detail: string;
  impactScore?: string;
}

export interface BlueprintDay {
  id: number;
  dayNumber: number;
  logDate: string;
  title: string;
  mission: string;
  rationale: string | null;
  status: 'pending' | 'completed' | 'skipped' | string;
  completedAt: string | null;
  originalLogDate?: string | null;
  rescheduledAt?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface Blueprint {
  id: number;
  title: string;
  outcome: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'cancelled' | 'paused' | string;
  createdAt: string;
  updatedAt?: string | null;
  days: BlueprintDay[];
}

// ─── What-If Simulator Types ───────────────────────────────────────────────────

export interface SimulationDataPoint {
  sleepHours: number;
  energyLevel: number;
  logDate: string;
}

export interface SimulationResult {
  available: boolean;
  variable: string;
  value: number;
  baselineAvgSleep: number | null;
  baselineAvgEnergy: number | null;
  simulatedAvgEnergy: number | null;
  energyDelta: number | null;
  sampleSize: number;
  totalRecords: number;
  sleepRangeLow: number;
  sleepRangeHigh: number;
  confidence: 'low' | 'moderate' | 'high';
  distribution: SimulationDataPoint[];
  insight: string;
}

// ─── AI Roadmap Action Types ───────────────────────────────────────────────────

export interface RoadmapAIAction {
  type: 'RESCHEDULE_ROADMAP_DAY';
  dayId: number;
  dayNumber: number;
  missionTitle: string;
  currentDate: string;
  targetDate: string;
}

