import { describe, expect, it } from 'vitest';
import { calculateMatchPreview } from './matchScoring';
import type { TeamMatchInput } from './matchScoring';

function records(counts = [500, 400, 300]): TeamMatchInput[] {
  return counts.map((rawCount, index) => ({
    teamKey: `team-${index}`,
    rawCount,
    jumpers: [{ studentId: `student-${index}`, actualCount: 20, multiplier: 1 }],
  }));
}

describe('경기 예상 계산', () => {
  it.each([1, 2, 3] as const)(
    'adds only the extra portion for a %s-times jumper',
    (multiplier) => {
      const teams = records();
      teams[0].jumpers[0].multiplier = multiplier;
      const result = calculateMatchPreview(teams)[0];
      expect(result.rankingCount).toBe(500 + 20 * (multiplier - 1));
      expect(result.rawCount).toBe(500);
    },
  );
  it('combines two independently chosen multipliers', () => {
    const teams = records();
    teams[0].jumpers = [
      { studentId: 'a', actualCount: 20, multiplier: 3 },
      { studentId: 'b', actualCount: 10, multiplier: 2 },
    ];
    expect(calculateMatchPreview(teams)[0].rankingCount).toBe(550);
  });
  it('uses competition ranks for ties without awarding victory points', () => {
    const result = calculateMatchPreview(records([500, 500, 300]));
    expect(result.map((team) => team.rank)).toEqual([1, 1, 3]);
    expect(result.map((team) => team.estimatedPoints)).toEqual([45, 45, 35]);
    expect(result[0]).not.toHaveProperty('victoryPoints');
  });
  it('gives every team first place when all records are zero', () => {
    const teams = records([0, 0, 0]);
    teams.forEach((team) => {
      team.jumpers[0].actualCount = 0;
    });
    expect(calculateMatchPreview(teams).map((team) => team.rank)).toEqual([1, 1, 1]);
  });
  it('compares raw counts, not multiplier-adjusted counts, for growth', () => {
    const teams = records([510, 490, 500]);
    teams[1].jumpers[0].multiplier = 3;
    const result = calculateMatchPreview(teams, records([500, 500, 500]));
    expect(result.map((team) => team.growthPoints)).toEqual([20, 10, 10]);
    expect(calculateMatchPreview(teams).map((team) => team.growthPoints)).toEqual([
      10, 10, 10,
    ]);
  });
  it('rewards season-best growth more than rank and recognizes steady performance', () => {
    const result = calculateMatchPreview(
      records([105, 104, 95, 94]),
      records([100, 100, 100, 100]),
    );
    expect(result.map((team) => team.growthPoints)).toEqual([30, 20, 10, 0]);
    expect(result.map((team) => team.growthKind)).toEqual([
      'breakthrough',
      'improved',
      'maintained',
      'none',
    ]);
    expect(result[3].estimatedPoints).toBe(20);
  });
  it('rejects duplicate students, missing teams, and unsafe counts', () => {
    const duplicate = records();
    duplicate[1].jumpers[0].studentId = duplicate[0].jumpers[0].studentId;
    expect(() => calculateMatchPreview(duplicate)).toThrow();
    expect(() => calculateMatchPreview(records().slice(0, 1))).toThrow();
    const huge = records();
    huge[0].rawCount = Number.MAX_SAFE_INTEGER;
    huge[0].jumpers[0].multiplier = 3;
    expect(() => calculateMatchPreview(huge)).toThrow();
  });
  it('supports two teams using the existing first and second place rules', () => {
    const result = calculateMatchPreview(records([500, 400]));
    expect(result.map((team) => team.rank)).toEqual([1, 2]);
    expect(result.map((team) => team.estimatedPoints)).toEqual([45, 40]);
  });
  it('gives every team a baseline bonus and fourth place no ranking bonus', () => {
    const result = calculateMatchPreview(records([500, 400, 300, 200]));
    expect(result.map((team) => team.rank)).toEqual([1, 2, 3, 4]);
    expect(result.map((team) => team.estimatedPoints)).toEqual([45, 40, 35, 30]);
    expect(result[3].rankingPoints).toBe(0);
    expect(result[3].participationPoints).toBe(20);
    expect(result[3].growthKind).toBe('baseline');
  });
});
