import { describe, expect, it } from 'vitest';

import type { SeasonBattle } from './model';
import { buildBattlePresentation } from './presentation';
import { calculateBattleAuthority } from '../../shared/domain/battleAuthority';

const battle: SeasonBattle = {
  id: 'battle:preview:0',
  seasonIndex: 0,
  bossId: 'BOSS_01',
  status: 'calculated',
  requestedAt: '2026-10-22T00:00:00.000Z',
  calculatedAt: '2026-10-22T00:00:01.000Z',
  matchCount: 3,
  ruleVersion: 'battle-v1',
  bossHp: 4_000,
  cooperationDamage: 700,
  teams: [
    {
      teamIndex: 0,
      teamName: '초록 원정대',
      inventory: { UNIT_01: 2, UNIT_02: 1, UNIT_03: 1, UNIT_04: 1 },
      heroIds: ['H01', 'H13'],
      bestJumperExtra: 120,
      baseOffense: 1_000,
      heroAttack: 100,
      physicalDefense: 1,
      magicDefense: 1,
      actionUptime: 0.82,
      actualDamage: 1_100,
      rank: 1,
      victoryPoints: 1,
    },
    {
      teamIndex: 1,
      teamName: '햇살 원정대',
      inventory: { UNIT_01: 1, UNIT_02: 2, UNIT_03: 1, UNIT_04: 0 },
      heroIds: ['H08'],
      bestJumperExtra: 0,
      baseOffense: 1_200,
      heroAttack: 0,
      physicalDefense: 1,
      magicDefense: 0,
      actionUptime: 0.75,
      actualDamage: 900,
      rank: 2,
      victoryPoints: 0,
    },
    {
      teamIndex: 2,
      teamName: '별빛 원정대',
      inventory: { UNIT_01: 3, UNIT_02: 1, UNIT_03: 0, UNIT_04: 2 },
      heroIds: [],
      bestJumperExtra: 0,
      baseOffense: 1_500,
      heroAttack: 0,
      physicalDefense: 0,
      magicDefense: 2,
      actionUptime: 0.86,
      actualDamage: 1_300,
      rank: 1,
      victoryPoints: 1,
    },
  ],
  events: [],
};

describe('battle presentation', () => {
  it.each(
    ['BOSS_01', 'BOSS_02', 'BOSS_03', 'BOSS_04', 'BOSS_05'].flatMap((bossId) =>
      [2, 3, 4].map((teamCount) => ({ bossId, teamCount })),
    ),
  )(
    'preserves authority totals for $bossId with $teamCount teams',
    ({ bossId, teamCount }) => {
      const allTeams = [
        ...battle.teams!,
        { ...battle.teams![0], teamIndex: 3, teamName: '네 번째 원정대' },
      ];
      const result = calculateBattleAuthority(
        {
          ruleVersion: 'battle-v1',
          seasonIndex: 0,
          bossId,
          matchCount: 3,
          eventPrefix: 'test:all-bosses',
          teams: allTeams.slice(0, teamCount).map((team) => ({
            teamIndex: team.teamIndex,
            teamName: team.teamName,
            inventory: team.inventory,
            heroIds: team.heroIds,
            bestJumperExtra: team.bestJumperExtra,
          })),
        },
        '2026-10-24T00:00:00.000Z',
      );
      const frozen: SeasonBattle = { ...battle, ...result };
      const before = structuredClone(frozen);
      const cues = buildBattlePresentation(frozen);
      expect(frozen).toEqual(before);
      for (const team of result.teams) {
        expect(
          cues
            .filter((cue) => cue.teamIndex === team.teamIndex)
            .reduce((sum, cue) => sum + (cue.amount ?? 0), 0),
        ).toBe(team.actualDamage);
      }
      expect(cues.at(-1)?.globalDamage).toBe(result.bossHp);
      expect(cues.find((cue) => cue.type === 'cooperation')?.amount).toBe(
        result.cooperationDamage,
      );
      const expectedDefense =
        bossId === 'BOSS_01' || bossId === 'BOSS_04' ? 'physical' : 'magic';
      expect(
        cues
          .filter((cue) => cue.type === 'defense')
          .every((cue) => cue.defenseType === expectedDefense),
      ).toBe(true);
    },
  );

  it('splits each stored team result without changing its damage total', () => {
    const cues = buildBattlePresentation(battle);
    battle.teams?.forEach((team) => {
      const displayed = cues
        .filter((cue) => cue.teamIndex === team.teamIndex)
        .reduce((sum, cue) => sum + (cue.amount ?? 0), 0);
      expect(displayed).toBe(team.actualDamage);
    });
  });

  it('ends with the exact stored boss hp after the cooperation attack', () => {
    const cues = buildBattlePresentation(battle);
    expect(cues.at(-2)).toMatchObject({
      type: 'cooperation',
      globalDamage: battle.bossHp,
      amount: battle.cooperationDamage,
    });
  });

  it('alternates every team through mixed attack rounds', () => {
    const cues = buildBattlePresentation(battle);
    const defenses = cues.filter((cue) => cue.type === 'defense');
    expect(defenses).toHaveLength(4);
    expect(new Set(defenses.map((cue) => cue.teamIndex)).size).toBe(3);

    for (let round = 1; round <= 4; round += 1) {
      const attacks = cues.filter(
        (cue) =>
          cue.roundNumber === round &&
          (cue.type === 'unit-attack' || cue.type === 'hero-attack'),
      );
      expect(attacks).toHaveLength(3);
      expect(new Set(attacks.map((cue) => cue.teamIndex)).size).toBe(3);
    }
  });

  it('splits one stored result into repeated hits and gives heroes a long moment', () => {
    const cues = buildBattlePresentation(battle);
    battle.teams?.forEach((team) => {
      const attacks = cues.filter(
        (cue) =>
          cue.teamIndex === team.teamIndex &&
          (cue.type === 'unit-attack' || cue.type === 'hero-attack'),
      );
      expect(attacks).toHaveLength(4);
    });
    expect(
      cues
        .filter((cue) => cue.type === 'hero-attack')
        .every((cue) => cue.durationMs >= 4_000),
    ).toBe(true);
    expect(
      cues
        .filter((cue) => cue.type === 'unit-attack')
        .every((cue) => cue.durationMs >= 2_600),
    ).toBe(true);
  });

  it('builds the same replay order from the same stored result', () => {
    expect(buildBattlePresentation(battle)).toEqual(buildBattlePresentation(battle));
  });
});
