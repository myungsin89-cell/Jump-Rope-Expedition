import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPreparation } from '../preparation/model';
import { arrangeTeam, moveStudent, resizeTeams } from '../expedition/operations';
import { readPracticeStore } from '../matches/practiceModel';
import {
  awardBlockReason,
  awardMedal,
  companionProgress,
  medalKey,
  medalPoints,
  readMedals,
  saveMedal,
  studentMedals,
  validMedalColor,
  validMedalImage,
} from './model';
import type { MedalDefinition } from './model';

function plan() {
  const value = createPreparation();
  value.students = Array.from({ length: 8 }, (_, at) => ({
    id: `s-${at}`,
    name: at < 2 ? '동명이인' : `학생${at}`,
  }));
  value.roster = value.students.map((item) => item.name).join('\n');
  value.teams[0].studentIds = ['s-0', 's-1', 's-2', 's-3', 's-4'];
  value.teams[1].studentIds = ['s-5', 's-6'];
  value.teams[2].studentIds = ['s-7'];
  value.seasons[0] = {
    bossId: 'BOSS_01',
    startDate: '2026-10-20',
    endDate: '2026-11-20',
  };
  return value;
}
const medal: MedalDefinition = {
  id: 'm-1',
  name: '도움의 손길',
  description: '함께 준비해요',
  symbol: 'leaf',
  image: '',
  active: true,
};
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
describe('로컬 훈장과 분리된 +10P 장부', () => {
  it('starts with no default definitions and does not mutate the existing roster or match store', () => {
    const value = plan();
    expect(readMedals(value.id).definitions).toEqual([]);
    expect(localStorage.length).toBe(0);
    saveMedal(value.id, medal);
    expect(Object.keys(localStorage)).toEqual([medalKey(value.id)]);
  });
  it('validates definitions, duplicate names, and safe image formats', () => {
    const value = plan();
    expect(() => saveMedal(value.id, { ...medal, name: ' ' })).toThrow('훈장 이름');
    saveMedal(value.id, medal);
    expect(() => saveMedal(value.id, { ...medal, id: 'another' })).toThrow('같은 이름');
    expect(validMedalImage('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(validMedalImage('https://example.com/image.png')).toBe(false);
    expect(validMedalImage('data:image/png;base64,aGVsbG8=')).toBe(true);
    expect(validMedalImage(`data:image/png;base64,${'A'.repeat(280000)}`)).toBe(false);
    expect(validMedalColor('#c96f3d')).toBe(true);
    expect(validMedalColor('orange')).toBe(false);
    expect(() =>
      saveMedal(value.id, { ...medal, id: 'bad-color', color: 'red' }),
    ).toThrow('색상');
  });
  it('writes one award and one fixed ten-point entry without a match', () => {
    const value = plan();
    saveMedal(value.id, medal);
    const store = awardMedal(value, 's-0', medal.id, 'award-1');
    expect(store.awards).toHaveLength(1);
    expect(store.entries).toEqual([
      { awardId: 'award-1', teamKey: 'team-0', seasonIndex: 0, delta: 10 },
    ]);
    expect(medalPoints(store, 0, 0)).toBe(10);
    expect(readPracticeStore(value.id).history).toEqual([]);
    expect(readMedals(value.id)).toEqual(store);
  });
  it('replays a request idempotently, while a new intentional award gives another ten', () => {
    const value = plan();
    saveMedal(value.id, medal);
    awardMedal(value, 's-0', medal.id, 'one');
    expect(awardMedal(value, 's-0', medal.id, 'one').entries).toHaveLength(1);
    const store = awardMedal(value, 's-0', medal.id, 'two');
    expect(medalPoints(store, 0, 0)).toBe(20);
    expect(studentMedals(store, 's-0')).toHaveLength(1);
    expect(studentMedals(store, 's-0')[0].awards).toHaveLength(2);
    expect(companionProgress(store, 0)).toEqual({ distinct: 1, earned: 0, next: 4 });
    expect(() => awardMedal(value, 's-1', medal.id, 'one')).toThrow('이미 사용');
  });
  it('counts distinct student identities rather than repeated awards or duplicate names', () => {
    const value = plan();
    saveMedal(value.id, medal);
    ['s-0', 's-1', 's-2', 's-3'].forEach((id) => awardMedal(value, id, medal.id, id));
    const store = awardMedal(value, 's-0', medal.id, 'again');
    expect(companionProgress(store, 0)).toEqual({ distinct: 4, earned: 1, next: 8 });
    expect(medalPoints(store, 0, 0)).toBe(50);
  });
  it('continues distinct recipients across seasons but separates points by awarded season', () => {
    let value = plan();
    saveMedal(value.id, medal);
    awardMedal(value, 's-0', medal.id, 'first');
    value = {
      ...value,
      seasonCount: 2,
      currentSeasonIndex: 1,
      seasons: value.seasons.map((item, index) =>
        index === 1 ? { ...value.seasons[0], bossId: 'BOSS_02' } : item,
      ),
    };
    const store = awardMedal(value, 's-1', medal.id, 'second');
    expect(medalPoints(store, 0, 0)).toBe(10);
    expect(medalPoints(store, 0, 1)).toBe(10);
    expect(companionProgress(store, 0).distinct).toBe(2);
  });
  it('preserves award identity and snapshots when students move or definitions change', () => {
    const value = plan();
    saveMedal(value.id, medal);
    awardMedal(value, 's-0', medal.id, 'first');
    const moved = moveStudent(value, 's-0', 1);
    saveMedal(value.id, {
      ...medal,
      name: '새 이름',
      description: '바뀐 설명',
      active: false,
    });
    const store = readMedals(value.id);
    expect(studentMedals(store, 's-0')[0].medal.name).toBe('도움의 손길');
    expect(medalPoints(store, 0, 0)).toBe(10);
    expect(medalPoints(store, 1, 0)).toBe(0);
    expect(awardBlockReason(moved, 's-0')).toBe('');
    expect(() => awardMedal(moved, 's-0', medal.id, 'new')).toThrow('사용 중지');
    expect(awardMedal(moved, 's-0', medal.id, 'first').awards).toHaveLength(1);
  });
  it('does not guess a point destination for unassigned students or unprepared seasons', () => {
    const value = plan();
    saveMedal(value.id, medal);
    const unassigned = arrangeTeam(value, 0, []);
    expect(() => awardMedal(unassigned, 's-0', medal.id, 'none')).toThrow('미배정');
    value.seasons[0].bossId = '';
    expect(() => awardMedal(value, 's-1', medal.id, 'none')).toThrow('시즌 설정');
    expect(readMedals(value.id).awards).toEqual([]);
  });
  it('retains the old document after storage failure and permits one clean retry', () => {
    const value = plan();
    saveMedal(value.id, medal);
    const original = localStorage.getItem(medalKey(value.id));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(() => awardMedal(value, 's-0', medal.id, 'one')).toThrow();
    expect(localStorage.getItem(medalKey(value.id))).toBe(original);
    expect(awardMedal(value, 's-0', medal.id, 'one').entries).toHaveLength(1);
  });
  it('never overwrites malformed or mismatched award and point data', () => {
    const value = plan();
    saveMedal(value.id, medal);
    const store = awardMedal(value, 's-0', medal.id, 'one');
    const bad = JSON.stringify({ ...store, entries: [] });
    localStorage.setItem(medalKey(value.id), bad);
    expect(() => readMedals(value.id)).toThrow('원본');
    expect(() => saveMedal(value.id, medal)).toThrow('원본');
    expect(localStorage.getItem(medalKey(value.id))).toBe(bad);
  });
  it('keeps old team indexes protected once medals have been awarded', () => {
    const value = plan();
    expect(() => resizeTeams(value, 2, readPracticeStore(value.id), true)).toThrow(
      '기존 기록',
    );
  });
});
