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
      { teamKey: 'team-0', points: 60 },
      { teamKey: 'team-1', points: 50 },
      { teamKey: 'team-2', points: 40 },
    ]);
  });

  it('blocks confirmation when a fourth-place point rule is still undecided', () => {
    const results = calculateMatchPreview([
      team(0, 400),
      team(1, 300),
      team(2, 200),
      team(3, 100),
    ]);
    expect(() => officialAwards(results)).toThrow('4위 순위 포인트');
  });
});
