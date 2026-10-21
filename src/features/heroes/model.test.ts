import { beforeEach, describe, expect, it } from 'vitest';
import { HEROES_CATALOG } from '../card-ui/catalog';
import type { EconomyStore } from '../economy/model';
import type { PracticeStore, SavedPractice } from '../matches/practiceModel';
import type { MedalDefinition, MedalStore } from '../medals/model';
import { createPreparation } from '../preparation/model';
import type { Preparation } from '../preparation/model';
import {
  deriveHeroAchievements,
  drawHeroId,
  heroKey,
  readHeroes,
  reconcileHeroRewards,
  revealHero,
} from './model';

function plan(teamCount = 3): Preparation {
  const value = createPreparation();
  value.className = '영웅 원정';
  value.students = Array.from({ length: teamCount }, (_, index) => ({
    id: `student-${index}`,
    name: `학생 ${index + 1}`,
  }));
  value.roster = value.students.map((student) => student.name).join('\n');
  value.teams = Array.from({ length: teamCount }, (_, index) => ({
    name: `${index + 1} 원정대`,
    studentIds: [`student-${index}`],
  }));
  value.jumpers = value.students.map((student) => [
    { studentId: student.id, multiplier: 1 as const },
  ]);
  value.currentSeasonIndex = 0;
  return value;
}

function savedMatch(
  value: Preparation,
  id: string,
  rawCounts: number[],
  actualCounts: number[],
): SavedPractice {
  const confirmedAt = `2026-10-${String(Number(id.replace(/\D/g, '')) + 1).padStart(2, '0')}T00:00:00.000Z`;
  return {
    id,
    classId: value.id,
    seasonIndex: 0,
    locked: true,
    savedAt: confirmedAt,
    official: { confirmedAt, awards: [] },
    teams: value.teams.map((team, index) => ({
      key: `team-${index}`,
      name: team.name,
      raw: String(rawCounts[index]),
      members: [
        {
          id: value.students[index].id,
          name: value.students[index].name,
          number: index + 1,
        },
      ],
      jumpers: [
        {
          studentId: value.students[index].id,
          multiplier: 1,
          actual: String(actualCounts[index]),
        },
      ],
    })),
  };
}

function stores(value: Preparation) {
  const practice: PracticeStore = {
    version: 1,
    classId: value.id,
    draft: null,
    history: [],
  };
  const medals: MedalStore = {
    version: 1,
    expeditionId: value.id,
    definitions: [],
    awards: [],
    entries: [],
  };
  const economy: EconomyStore = {
    version: 1,
    expeditionId: value.id,
    purchases: [],
    reversals: [],
  };
  return { practice, medals, economy };
}

beforeEach(() => localStorage.clear());

describe('영웅 추첨', () => {
  it('uses 60/30/10 rarity bands and redistributes exhausted rarity weights', () => {
    expect(drawHeroId(new Set(), () => 0)).toBe('H01');
    const rareRolls = [0.7, 0];
    expect(drawHeroId(new Set(), () => rareRolls.shift()!)).toBe('H09');
    const legendaryRolls = [0.95, 0];
    expect(drawHeroId(new Set(), () => legendaryRolls.shift()!)).toBe('H14');

    const commonIds = new Set(
      HEROES_CATALOG.filter((hero) => hero.rarity === 'common').map((hero) => hero.id),
    );
    expect(drawHeroId(commonIds, () => 0)).toBe('H09');
    expect(
      drawHeroId(new Set(HEROES_CATALOG.map((hero) => hero.id)), () => 0),
    ).toBeNull();
  });

  it('stores a stable no-duplicate draw and reveals it only once', () => {
    const value = plan();
    const sources = stores(value);
    sources.practice.history = Array.from({ length: 6 }, (_, index) =>
      savedMatch(value, `match-${index}`, [100 + index * 10, 80, 60], [10 + index, 5, 4]),
    );
    const first = reconcileHeroRewards(value, sources, () => 0);
    const second = reconcileHeroRewards(value, sources, () => 0.99);
    expect(second).toEqual(first);
    const teamRewards = first.rewards.filter((reward) => reward.teamIndex === 0);
    expect(new Set(teamRewards.map((reward) => reward.heroId)).size).toBe(
      teamRewards.length,
    );
    const sealed = teamRewards[0];
    const revealed = revealHero(value.id, sealed.id, '2026-10-21T00:00:00.000Z');
    expect(revealed.rewards.find((reward) => reward.id === sealed.id)?.revealedAt).toBe(
      '2026-10-21T00:00:00.000Z',
    );
    expect(revealHero(value.id, sealed.id)).toEqual(revealed);
  });
});

describe('영웅 임무 판정', () => {
  it('finds growth, jumper, rank, companion, comeback and unit-set achievements', () => {
    const value = plan();
    const sources = stores(value);
    sources.practice.history = Array.from({ length: 6 }, (_, index) =>
      savedMatch(
        value,
        `match-${index}`,
        index === 0
          ? [100, 90, 50]
          : index === 1
            ? [110, 100, 300]
            : [110 + index * 10, 100, 80],
        [10 + index, 5, 4],
      ),
    );
    const medal: MedalDefinition = {
      id: 'kindness',
      name: '친절',
      description: '서로 도와요',
      symbol: 'star',
      image: '',
      color: '#2d6a4f',
      active: true,
    };
    sources.medals.definitions = [medal];
    sources.medals.awards = Array.from({ length: 4 }, (_, index) => ({
      id: `award-${index}`,
      medalId: medal.id,
      medal,
      studentId: `friend-${index}`,
      studentName: `친구 ${index + 1}`,
      teamKey: 'team-0',
      teamName: value.teams[0].name,
      seasonIndex: 0,
      awardedAt: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      actor: 'local-teacher',
    }));
    sources.medals.entries = sources.medals.awards.map((award) => ({
      awardId: award.id,
      teamKey: award.teamKey,
      seasonIndex: award.seasonIndex,
      delta: 10,
    }));
    const unitNames = [
      '도토리 탐험가',
      '숲속 해머단',
      '잎사귀 수호자',
      '별빛 요정',
    ] as const;
    sources.economy.purchases = unitNames.map((itemName, index) => ({
      id: `purchase-${index}`,
      teamKey: 'team-0',
      teamName: value.teams[0].name,
      seasonIndex: 0,
      itemId: `UNIT_0${index + 1}` as 'UNIT_01',
      itemName,
      price: 30,
      purchasedAt: `2026-09-${String(index + 10).padStart(2, '0')}T00:00:00.000Z`,
      actor: 'local-team',
    }));

    const missionIds = deriveHeroAchievements(value, sources).map(
      (item) => item.missionId,
    );
    expect(missionIds).toContain('FIVE_STEPS');
    expect(missionIds).toContain('SHINING_CHALLENGE');
    expect(missionIds).toContain('SHINING_COMPANIONS');
    expect(missionIds).toContain('STEADY_STEPS');
    expect(missionIds).toContain('COMEBACK');
    expect(missionIds).toContain('FOUR_FORCES');
  });

  it('disables the two rank missions for two-team operation', () => {
    const value = plan(2);
    const sources = stores(value);
    sources.practice.history = Array.from({ length: 5 }, (_, index) =>
      savedMatch(
        value,
        `match-${index}`,
        index === 0 ? [100, 50] : [110 + index * 10, index === 1 ? 300 : 60],
        [10, 5],
      ),
    );
    const missionIds = deriveHeroAchievements(value, sources).map(
      (item) => item.missionId,
    );
    expect(missionIds).not.toContain('STEADY_STEPS');
    expect(missionIds).not.toContain('COMEBACK');
  });

  it('preserves malformed local hero data instead of overwriting it', () => {
    const value = plan();
    localStorage.setItem(heroKey(value.id), '{"version":1,"rewards":"broken"}');
    expect(() => readHeroes(value.id)).toThrow('원본은 보존');
    expect(localStorage.getItem(heroKey(value.id))).toContain('broken');
  });
});
