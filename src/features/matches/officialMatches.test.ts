import { describe, expect, it } from 'vitest';

import { calculateMatchPreview } from '../../shared/domain/matchScoring';
import { officialAwards } from './officialMatches';

const team = (index: number, rawCount: number) => ({
  teamKey: `team-${index}`,
  rawCount,
  jumpers: [{ studentId: `student-${index}`, multiplier: 1 as const, actualCount: 0 }],
});

describe('official match awards', () => {
  it('turns a complete three-team result into one award per team', () => {
    const awards = officialAwards(
      calculateMatchPreview([team(0, 300), team(1, 200), team(2, 100)]),
    );
    expect(awards).toEqual([
      { teamKey: 'team-0', points: 45 },
      { teamKey: 'team-1', points: 40 },
      { teamKey: 'team-2', points: 35 },
    ]);
  });

  it('turns a four-team baseline result into growth-v2 awards', () => {
    const results = calculateMatchPreview([
      team(0, 400),
      team(1, 300),
      team(2, 200),
      team(3, 100),
    ]);
    expect(officialAwards(results)).toEqual([
      { teamKey: 'team-0', points: 45 },
      { teamKey: 'team-1', points: 40 },
      { teamKey: 'team-2', points: 35 },
      { teamKey: 'team-3', points: 30 },
    ]);
  });
});
