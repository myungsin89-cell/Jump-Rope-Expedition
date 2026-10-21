import { describe, expect, it } from 'vitest';
import {
  calculateBattleAuthority,
  parseBattleAuthorityInput,
  parseBattleAuthorityResult,
} from './battleAuthority';

const input = {
  ruleVersion: 'battle-v1' as const,
  seasonIndex: 0,
  bossId: 'BOSS_04',
  matchCount: 3,
  eventPrefix: 'battle:fixture:0',
  teams: [
    {
      teamIndex: 0,
      teamName: '초록 원정대',
      inventory: { UNIT_01: 2, UNIT_02: 1, UNIT_03: 1, UNIT_04: 0 },
      heroIds: ['H01', 'H08'],
      bestJumperExtra: 30,
    },
    {
      teamIndex: 1,
      teamName: '노랑 원정대',
      inventory: { UNIT_01: 1, UNIT_02: 2, UNIT_03: 0, UNIT_04: 1 },
      heroIds: ['H02'],
      bestJumperExtra: 10,
    },
  ],
};

describe('shared final battle authority calculation', () => {
  it('recalculates and validates the exact deterministic server result', () => {
    const result = calculateBattleAuthority(input, '2026-10-22T00:00:00.000Z');
    expect(parseBattleAuthorityResult(result)).toEqual(result);
    expect(result.bossHp).toBeGreaterThan(
      result.teams.reduce((sum, team) => sum + team.actualDamage, 0),
    );
  });

  it('rejects reordered teams, duplicate heroes and modified server damage', () => {
    expect(() =>
      parseBattleAuthorityInput({
        ...input,
        teams: [input.teams[1], input.teams[0]],
      }),
    ).toThrow('순서');
    expect(() =>
      parseBattleAuthorityInput({
        ...input,
        teams: [{ ...input.teams[0], heroIds: ['H01', 'H01'] }, input.teams[1]],
      }),
    ).toThrow('원정대 입력');
    const result = calculateBattleAuthority(input, '2026-10-22T00:00:00.000Z');
    expect(() =>
      parseBattleAuthorityResult({
        ...result,
        teams: [{ ...result.teams[0], actualDamage: 999999 }, result.teams[1]],
      }),
    ).toThrow('산식');
  });
});
