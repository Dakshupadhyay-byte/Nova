// =============================================================================
// src/data/landingContent.ts — NOVA Landing Page Preview Data
// Deterministic preview data only. Never calls backend or real auth.
// =============================================================================

export const LANDING_PREVIEW = {
  focusScore: 76,
  sleepHours: 7.5,
  energyLevel: 8,
  sessions: 3,
  focusedMinutes: 75,
  interruptions: 2,
  weeklyTrend: [42, 58, 74, 85, 40, 90, 76],
  insight: "Your strongest focus sessions happen after nights with more than 7 hours of sleep.",
  historyDays: [
    { day: 'Monday',    sleep: 7.5, energy: 8, focus: 76 },
    { day: 'Tuesday',   sleep: 6.2, energy: 6, focus: 61 },
    { day: 'Wednesday', sleep: 8.0, energy: 9, focus: 84 },
    { day: 'Thursday',  sleep: 7.8, energy: 8, focus: 79 },
    { day: 'Friday',    sleep: 5.9, energy: 5, focus: 52 },
    { day: 'Saturday',  sleep: 8.5, energy: 9, focus: 90 },
  ],
};

export const NOVA_ACRONYM = [
  {
    letter: 'N',
    word: 'NOTICE',
    title: 'Notice what shapes your day.',
    description:
      'Start with a simple check-in. Record your sleep and energy so NOVA can understand the context behind your focus.',
    step: '01',
  },
  {
    letter: 'O',
    word: 'ORGANIZE',
    title: 'Organize your focus.',
    description:
      'Turn intention into focused sessions with a simple timer that keeps your attention on the work that matters.',
    step: '02',
  },
  {
    letter: 'V',
    word: 'VISUALIZE',
    title: 'Visualize what your data is telling you.',
    description:
      'Patterns become clearer when focus, sleep, and energy are viewed together over time.',
    step: '03',
  },
  {
    letter: 'A',
    word: 'ACT',
    title: 'Turn patterns into action.',
    description:
      'NOVA turns your history into simple observations that help you understand when you work best.',
    step: '04',
  },
];

export const FEATURES = [
  { emoji: '⏱', title: 'Focus Timer',         description: 'Stay in the session. Track interruptions. Build consistency.' },
  { emoji: '🌙', title: 'Wellness Check-in',   description: 'Log sleep and energy in seconds.' },
  { emoji: '📈', title: 'Analytics',           description: 'See how your habits and focus move together.' },
  { emoji: '✦',  title: 'NOVA Noticed',        description: 'Turn your history into meaningful observations.' },
  { emoji: '📋', title: 'History',             description: 'See how your days evolve over time.' },
];
