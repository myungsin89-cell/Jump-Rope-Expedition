export const DEFENSE_TIMING = {
  launch: 820,
  guard: 1140,
  impact: 1800,
} as const;

export type DefensePhase = 'telegraph' | 'incoming' | 'guard' | 'impact';
