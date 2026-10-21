import { beforeEach, describe, expect, it } from 'vitest';
import { awardMedal, readMedals, saveMedal } from '../medals/model';
import {
  createPractice,
  readPracticeStore,
  saveOfficialPractice,
} from '../matches/practiceModel';
import { createPreparation } from '../preparation/model';
import type { Preparation } from '../preparation/model';
import {
  economyKey,
  purchaseItem,
  readEconomy,
  reversePurchase,
  teamEconomySummary,
} from './model';

function plan(teamCount = 3): Preparation {
  const value = createPreparation();
  value.className = '포인트 원정';
  value.students = Array.from({ length: teamCount }, (_, index) => ({
    id: `s-${index}`,
    name: `학생${index}`,
  }));
  value.roster = value.students.map((student) => student.name).join('\n');
  value.teams = Array.from({ length: teamCount }, (_, index) => ({
    name: `${index + 1} 원정대`,
    studentIds: [`s-${index}`],
  }));
  value.jumpers = value.teams.map((team) => [
    { studentId: team.studentIds[0], multiplier: 1 },
  ]);
  value.seasons[0] = {
    bossId: 'BOSS_01',
    startDate: '2026-10-20',
    endDate: '2026-11-20',
  };
  value.currentSeasonIndex = 0;
  return value;
}

function addMatch(value: Preparation, raws: number[]) {
  const draft = createPractice(value, 0);
  draft.teams.forEach((team, index) => {
    team.raw = String(raws[index]);
    team.jumpers[0].actual = '0';
  });
  return saveOfficialPractice(draft, new Date().toISOString());
}

beforeEach(() => localStorage.clear());

describe('로컬 포인트·구매 장부', () => {
  it('merges match and medal earnings, spends once, and blocks insufficient balance', () => {
    const value = plan();
    const practice = addMatch(value, [100, 90, 80]);
    saveMedal(value.id, {
      id: 'kindness',
      name: '친절 훈장',
      description: '친구를 도왔어요.',
      symbol: 'heart',
      image: '',
      active: true,
    });
    const medals = awardMedal(value, 's-0', 'kindness', 'award-1');
    const sources = { practice, medals };
    const first = purchaseItem(value, sources, 0, 0, 'UNIT_01', 'buy-1');
    expect(first.purchases).toHaveLength(1);
    expect(purchaseItem(value, sources, 0, 0, 'UNIT_01', 'buy-1')).toEqual(first);
    const second = purchaseItem(value, sources, 0, 0, 'UNIT_02', 'buy-2');
    expect(teamEconomySummary(value, sources, second, 0, 0)).toMatchObject({
      matchEarned: 60,
      medalEarned: 10,
      spent: 60,
      balance: 10,
      inventory: { UNIT_01: 1, UNIT_02: 1, UNIT_03: 0, UNIT_04: 0 },
    });
    expect(() => purchaseItem(value, sources, 0, 0, 'UNIT_03', 'buy-3')).toThrow(
      '20P 부족',
    );
  });

  it('allows one hint per team and restores it with an append-only teacher reversal', () => {
    const value = plan();
    addMatch(value, [100, 90, 80]);
    const practice = addMatch(value, [110, 100, 90]);
    const sources = { practice, medals: readMedals(value.id) };
    const bought = purchaseItem(value, sources, 0, 0, 'BOSS_HINT', 'hint-1');
    expect(teamEconomySummary(value, sources, bought, 0, 0)).toMatchObject({
      balance: 40,
      hintPurchased: true,
    });
    expect(() => purchaseItem(value, sources, 0, 0, 'BOSS_HINT', 'hint-2')).toThrow(
      '이미',
    );
    expect(() => reversePurchase(value.id, 'hint-1', 'undo-1', '실수')).toThrow(
      '3자 이상',
    );
    const restored = reversePurchase(value.id, 'hint-1', 'undo-1', '학생 오입력');
    expect(restored.purchases).toHaveLength(1);
    expect(restored.reversals).toHaveLength(1);
    expect(teamEconomySummary(value, sources, restored, 0, 0)).toMatchObject({
      balance: 140,
      hintPurchased: false,
    });
    expect(reversePurchase(value.id, 'hint-1', 'undo-1', '학생 오입력')).toEqual(
      restored,
    );
  });

  it('lets fourth place spend its 30 participation points after confirmation', () => {
    const value = plan(4);
    const draft = createPractice(value, 0);
    draft.teams.forEach((team, index) => {
      team.raw = String(100 - index * 10);
      team.jumpers[0].actual = '0';
    });
    saveOfficialPractice(draft, new Date().toISOString());
    const practice = readPracticeStore(value.id);
    const sources = { practice, medals: readMedals(value.id) };
    const summary = teamEconomySummary(value, sources, readEconomy(value.id), 3, 0);
    expect(summary.balance).toBe(30);
    const purchased = purchaseItem(value, sources, 3, 0, 'UNIT_01', 'buy-4');
    expect(teamEconomySummary(value, sources, purchased, 3, 0)).toMatchObject({
      balance: 0,
      spent: 30,
      inventory: { UNIT_01: 1, UNIT_02: 0, UNIT_03: 0, UNIT_04: 0 },
    });
  });

  it('preserves malformed source data and refuses to overwrite it', () => {
    const value = plan();
    localStorage.setItem(economyKey(value.id), '{"version":1,"purchases":"broken"}');
    expect(() => readEconomy(value.id)).toThrow('원본은 보존');
    expect(localStorage.getItem(economyKey(value.id))).toContain('broken');
    expect(() =>
      purchaseItem(
        value,
        { practice: readPracticeStore(value.id), medals: readMedals(value.id) },
        0,
        0,
        'UNIT_01',
        'buy-1',
      ),
    ).toThrow('원본은 보존');
  });
});
