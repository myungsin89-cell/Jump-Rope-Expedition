import { beforeEach, describe, expect, it } from 'vitest';
import type { EconomyStore } from '../economy/model';
import type { HeroStore } from '../heroes/model';
import type { PracticeStore, SavedPractice } from '../matches/practiceModel';
import { createPreparation } from '../preparation/model';
import { calculateBattleAuthority } from '../../shared/domain/battleAuthority';
import {
  acceptAuthorityBattleResult,
  beginSeasonClose,
  calculateSeasonBattle,
  cancelSeasonClose,
  createBattleAuthorityInput,
  expeditionStandings,
  finishSeasonBattle,
  parseBattleStore,
  seasonBattle,
} from './model';

function fixture() {
  const plan = createPreparation();
  plan.id = 'battle-class';
  plan.currentSeasonIndex = 0;
  plan.teams = [
    { name: '초록 원정대', studentIds: ['s1'] },
    { name: '노랑 원정대', studentIds: ['s2'] },
  ];
  plan.students = [
    { id: 's1', name: '가람' },
    { id: 's2', name: '나래' },
  ];
  plan.seasons[0] = {
    bossId: 'BOSS_01',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  };
  const match: SavedPractice = {
    id: 'match-1',
    classId: plan.id,
    seasonIndex: 0,
    locked: true,
    savedAt: '2026-10-10T00:00:00.000Z',
    official: {
      confirmedAt: '2026-10-10T00:00:00.000Z',
      awards: [
        { teamKey: 'team-0', points: 60 },
        { teamKey: 'team-1', points: 50 },
      ],
    },
    teams: [
      {
        key: 'team-0',
        name: '초록 원정대',
        raw: '100',
        members: [{ id: 's1', name: '가람', number: 1 }],
        jumpers: [{ studentId: 's1', multiplier: 2, actual: '20' }],
      },
      {
        key: 'team-1',
        name: '노랑 원정대',
        raw: '90',
        members: [{ id: 's2', name: '나래', number: 2 }],
        jumpers: [{ studentId: 's2', multiplier: 1, actual: '10' }],
      },
    ],
  };
  const practice: PracticeStore = {
    version: 1,
    classId: plan.id,
    draft: null,
    history: [match],
  };
  const economy: EconomyStore = {
    version: 1,
    expeditionId: plan.id,
    reversals: [],
    purchases: [
      ['buy-a1', 'team-0', 'UNIT_01'],
      ['buy-a2', 'team-0', 'UNIT_02'],
      ['buy-a3', 'team-0', 'UNIT_03'],
      ['buy-a4', 'team-0', 'UNIT_04'],
      ['buy-b1', 'team-1', 'UNIT_01'],
    ].map(([id, teamKey, itemId]) => ({
      id,
      teamKey: teamKey as 'team-0' | 'team-1',
      teamName: teamKey === 'team-0' ? '초록 원정대' : '노랑 원정대',
      seasonIndex: 0,
      itemId: itemId as 'UNIT_01' | 'UNIT_02' | 'UNIT_03' | 'UNIT_04',
      itemName: '병력',
      price: 30 as const,
      purchasedAt: '2026-10-11T00:00:00.000Z',
      actor: 'local-team' as const,
    })),
  };
  const heroes: HeroStore = {
    version: 1,
    expeditionId: plan.id,
    rewards: [
      {
        id: 'reward-1',
        achievementId: 'achievement-1',
        missionId: 'FOUR_FORCES',
        teamIndex: 0,
        seasonIndex: 0,
        heroId: 'H12',
        awardedAt: '2026-10-12T00:00:00.000Z',
        contributorIds: [],
        contributorNames: [],
      },
      {
        id: 'reward-2',
        achievementId: 'achievement-2',
        missionId: 'SHINING_CHALLENGE',
        teamIndex: 0,
        seasonIndex: 0,
        heroId: 'H13',
        awardedAt: '2026-10-12T00:00:00.000Z',
        contributorIds: ['s1'],
        contributorNames: ['가람'],
      },
    ],
  };
  return { plan, practice, economy, heroes };
}

describe('final battle model', () => {
  beforeEach(() => localStorage.clear());

  it('requires an official match and allows cancellation only before calculation', () => {
    const { plan, practice } = fixture();
    expect(() => beginSeasonClose(plan, { ...practice, history: [] })).toThrow('0개');
    const closing = beginSeasonClose(plan, practice, '2026-10-20T00:00:00.000Z');
    expect(seasonBattle(closing, 0)?.status).toBe('closing');
    expect(cancelSeasonClose(plan.id, 0).battles).toHaveLength(0);
  });

  it('freezes deterministic damage, defense and hero effects once', () => {
    const { plan, practice, economy, heroes } = fixture();
    beginSeasonClose(plan, practice, '2026-10-20T00:00:00.000Z');
    const first = calculateSeasonBattle(
      plan,
      practice,
      economy,
      heroes,
      '2026-10-20T01:00:00.000Z',
    );
    const result = seasonBattle(first, 0)!;
    expect(result.status).toBe('calculated');
    expect(result.teams?.[0]).toMatchObject({
      inventory: { UNIT_01: 1, UNIT_02: 1, UNIT_03: 1, UNIT_04: 1 },
      heroIds: ['H12', 'H13'],
      bestJumperExtra: 20,
      baseOffense: 259.6,
      heroAttack: 20,
      victoryPoints: 1,
      rank: 1,
    });
    expect(result.teams?.[0].actionUptime).toBeGreaterThan(0.45);
    expect(result.cooperationDamage).toBeGreaterThan(0);
    expect(result.events?.at(-1)?.type).toBe('result');
    expect(
      calculateSeasonBattle(plan, practice, { ...economy, purchases: [] }, heroes),
    ).toEqual(first);
    expect(() => cancelSeasonClose(plan.id, 0)).toThrow('다시 열 수 없어요');
  });

  it('accepts the server official-match count as authoritative', () => {
    const { plan, practice, economy, heroes } = fixture();
    const closing = beginSeasonClose(plan, practice, '2026-10-20T00:00:00.000Z');
    const pending = seasonBattle(closing, 0)!;
    const input = createBattleAuthorityInput(plan, practice, economy, heroes, 0, pending);
    const result = calculateBattleAuthority(
      { ...input, matchCount: 2 },
      '2026-10-20T01:00:00.000Z',
    );

    const accepted = acceptAuthorityBattleResult(plan.id, result);

    expect(seasonBattle(accepted, 0)).toMatchObject({
      status: 'calculated',
      matchCount: 2,
    });
  });

  it('keeps ties as shared first place and adds cumulative standings after finish', () => {
    const { plan, practice, economy, heroes } = fixture();
    const oneAcorn = economy.purchases.find(
      (purchase) => purchase.itemId === 'UNIT_01' && purchase.teamKey === 'team-1',
    )!;
    const tiedEconomy = {
      ...economy,
      purchases: [
        oneAcorn,
        {
          ...oneAcorn,
          id: 'buy-a1',
          teamKey: 'team-0' as const,
          teamName: '초록 원정대',
        },
      ],
    };
    beginSeasonClose(plan, practice);
    const calculated = calculateSeasonBattle(plan, practice, tiedEconomy, {
      ...heroes,
      rewards: [],
    });
    const battle = seasonBattle(calculated, 0)!;
    expect(battle.teams?.map((team) => team.rank)).toEqual([1, 1]);
    expect(battle.teams?.map((team) => team.victoryPoints)).toEqual([1, 1]);
    const finished = finishSeasonBattle(plan.id, 0, '2026-10-21T00:00:00.000Z');
    expect(expeditionStandings(finished)).toMatchObject([
      { rank: 1, victoryPoints: 1 },
      { rank: 1, victoryPoints: 1 },
    ]);
  });

  it('rejects malformed stored battle records without overwriting them', () => {
    const invalid = { version: 1, expeditionId: 'battle-class', battles: [{}] };
    localStorage.setItem('jre.practice-battles.v1.battle-class', JSON.stringify(invalid));
    expect(() => parseBattleStore(invalid, 'battle-class')).toThrow('원본은 보존');
    expect(localStorage.getItem('jre.practice-battles.v1.battle-class')).toBe(
      JSON.stringify(invalid),
    );
  });
});
