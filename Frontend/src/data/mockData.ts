import { FocusBlock, MetricOverview, VelocityDay, CircadianEvent } from '../types';
import avatarImg from '../assets/images/avatar_elena_vance_1790254222548.jpg';

export const USER_PROFILE = {
  name: 'Elena Vance',
  role: 'High-Agency Ops',
  avatar: avatarImg,
  status: 'EQUILIBRIUM ACTIVE',
  quantumSync: 99.4,
  syncCycle: 1094,
};

export const INITIAL_METRICS: MetricOverview = {
  focusIndex: 76,
  focusFlowPercent: 76,
  focusSessionsCount: 3,
  focusMinutesTotal: 75,

  exerciseBurnPercent: 84,
  exerciseMinutes: 48,
  exerciseCalories: 420,
  exerciseTargetCalories: 400,
  zone2Minutes: 32,
  zone2Calories: 310,
  hiitMinutes: 16,
  hiitCalories: 110,

  sleepAlignmentPercent: 81,
  sleepHours: 6.5,
  sleepGoalHours: 8.0,
  sleepDeficitHours: 1.5,
  deepSleep: '1h 24m',
  awakeSleep: '42m',
  lightSleep: '3h 14m',
  remSleep: '1h 10m',

  alphaFrequencyHz: 9.4,
  quantumSyncPercent: 99.4,
  syncCycle: 1094,
};

export const INITIAL_FOCUS_BLOCKS: FocusBlock[] = [
  {
    id: 'block-1',
    title: 'System Architecture Map',
    tier: 'DEEP',
    time: '09:30 AM',
    durationMinutes: 25,
    interruptions: 0,
    notes: 'Mapped distributed multi-agent state reconciliation protocols with zero friction.',
    tags: ['Architecture', 'High Priority'],
  },
  {
    id: 'block-2',
    title: 'Protocol Refactor Sprint',
    tier: 'CORE',
    time: '11:15 AM',
    durationMinutes: 25,
    interruptions: 1,
    notes: 'Refactored async event subscribers. Minor interruption from executive sync channel.',
    tags: ['Engineering', 'Core'],
  },
  {
    id: 'block-3',
    title: 'Quarterly Operations Memo',
    tier: 'LIGHT',
    time: '02:30 PM',
    durationMinutes: 17,
    interruptions: 2,
    notes: 'Drafted staffing and compute capital allocation priorities for Q4 roadmap.',
    tags: ['Operations', 'Writing'],
  },
];

export const VELOCITY_DATA: VelocityDay[] = [
  { day: 'Mon', label: 'Monday', value: 42, deepMinutes: 50, interruptions: 4 },
  { day: 'Tue', label: 'Tuesday', value: 58, deepMinutes: 75, interruptions: 3 },
  { day: 'Wed', label: 'Wednesday', value: 74, deepMinutes: 100, interruptions: 1 },
  { day: 'Thu', label: 'Thursday', value: 85, deepMinutes: 125, interruptions: 0 },
  { day: 'Fri', label: 'Friday', value: 40, deepMinutes: 45, interruptions: 5 },
  { day: 'Sat', label: 'Saturday', value: 90, deepMinutes: 110, interruptions: 1 },
  { day: 'Today', label: 'Sunday (Today)', value: 76, deepMinutes: 75, interruptions: 3 },
];

export const CIRCADIAN_TIMELINE: CircadianEvent[] = [
  {
    id: 'c-1',
    time: '06:15 AM',
    category: 'sleep',
    title: 'Wakeup & REM Emergence',
    detail: 'Completed 4 complete sleep cycles. Total sleep: 6h 30m. Restorative baseline maintained.',
    impactScore: '+82 Bio-readiness',
  },
  {
    id: 'c-2',
    time: '07:30 AM',
    category: 'workout',
    title: 'Morning Zone 2 Aerobic & Sunlight Exposure',
    detail: '32 min Zone 2 HR steady state + 16 min high-output intervals. 420 kcal total burn.',
    impactScore: 'Mitochondrial prime',
  },
  {
    id: 'c-3',
    time: '08:45 AM',
    category: 'nutrition',
    title: 'Precision Fasting & Electrolyte Buffer',
    detail: 'Hydration with magnesium glycinate and sodium electrolyte balance. Fasting extended.',
    impactScore: 'Ketone stability',
  },
  {
    id: 'c-4',
    time: '09:30 AM',
    category: 'focus',
    title: 'Deep Flow Block 1: System Architecture Map',
    detail: '25 min deep cognitive lock with 40Hz Gamma binaural carrier. Zero interruptions.',
    impactScore: 'Peak Alpha (9.4 Hz)',
  },
  {
    id: 'c-5',
    time: '11:15 AM',
    category: 'focus',
    title: 'Deep Flow Block 2: Protocol Refactor Sprint',
    detail: '25 min focused execution. 1 context switch recorded. Executive throughput high.',
    impactScore: 'Optimal velocity',
  },
  {
    id: 'c-6',
    time: '01:00 PM',
    category: 'nutrition',
    title: 'Targeted High-Protein Refuel',
    detail: 'Clean organic protein, avocado, leafy greens. Insulin response smooth.',
    impactScore: 'Stable glucose',
  },
  {
    id: 'c-7',
    time: '02:30 PM',
    category: 'focus',
    title: 'Light Flow Block 3: Quarterly Operations Memo',
    detail: '17 min sprint. Mild afternoon fatigue detected; 2 minor interruptions logged.',
    impactScore: 'Moderate load',
  },
  {
    id: 'c-8',
    time: '05:45 PM',
    category: 'recovery',
    title: 'Evening Decompression & Blue-Light Filter',
    detail: 'Recommended 20-min wind-down walk and ambient lighting transition.',
    impactScore: 'Predicted sleep latency < 12m',
  },
];
