import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPreparation } from '../preparation/model';
import {
  createPractice,
  parseCount,
  practiceKey,
  readPracticeStore,
  saveOfficialPractice,
  savePractice,
  validatePractice,
  voidOfficialPractice,
  writePracticeDraft,
} from './practiceModel';

function draft() {
  const plan = createPreparation();
  plan.students = [1, 2, 3, 4].map((number) => ({
    id: `s-${number}`,
    name: number < 3 ? '김민준' : `가상학생 ${number}`,
  }));
  plan.teams.forEach((team, index) => {
    team.studentIds = [`s-${index + 1}`];
  });
  plan.teams[0].studentIds.push('s-4');
  return createPractice(plan);
}
function completeDraft() {
  const value = draft();
  value.locked = true;
  value.teams.forEach((team) => {
    team.raw = '100';
    team.jumpers[0] = { studentId: team.members[0].id, multiplier: 2, actual: '20' };
  });
  return value;
}
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('연습 기록판 입력과 저장', () => {
  it('copies preparation jumpers into a new record and opens directly on counts', () => {
    const plan = createPreparation();
    plan.students = [1, 2, 3].map((id) => ({ id: `s-${id}`, name: `학생${id}` }));
    plan.teams.forEach((team, index) => {
      team.studentIds = [plan.students[index].id];
    });
    plan.seasonCount = 5;
    plan.seasons[0] = {
      bossId: 'BOSS_01',
      startDate: '2026-10-20',
      endDate: '2026-11-20',
    };
    plan.jumpers = plan.teams.map((team) => [
      { studentId: team.studentIds[0], multiplier: 2 },
    ]);
    const value = createPractice(plan);
    expect(value.locked).toBe(true);
    expect(value.seasonIndex).toBe(0);
    expect(value.teams[0].jumpers[0]).toEqual({
      studentId: 's-1',
      multiplier: 2,
      actual: '',
    });
    value.teams[0].jumpers[0].multiplier = 3;
    expect(plan.jumpers[0][0].multiplier).toBe(2);
  });
  it('does not silently turn a blank, decimal, negative, or unsafe input into a count', () => {
    for (const input of ['', ' ', '-1', '1.5', '1e3', '9007199254740992'])
      expect(parseCount(input)).toBeNull();
    expect(parseCount('0')).toBe(0);
    expect(parseCount('150')).toBe(150);
  });
  it('requires one or two distinct jumpers who belong to the team', () => {
    const value = draft();
    expect(validatePractice(value)['jumper-0-0']).toBeTruthy();
    value.teams[0].jumpers = [
      { studentId: 's-1', multiplier: 1, actual: '' },
      { studentId: 's-1', multiplier: 3, actual: '' },
    ];
    expect(validatePractice(value)['jumper-0-1']).toBeTruthy();
    value.teams[0].jumpers[1].studentId = 's-2';
    expect(validatePractice(value)['jumper-0-1']).toBeTruthy();
    value.teams[0].jumpers[1].studentId = 's-4';
    expect(validatePractice(value)['jumper-0-1']).toBeUndefined();
  });
  it('retains a draft across reads, including locked jumpers and zero counts', () => {
    const value = completeDraft();
    value.teams[0].raw = '0';
    value.teams[0].jumpers[0].actual = '0';
    writePracticeDraft(value);
    expect(readPracticeStore(value.classId).draft).toEqual(value);
  });
  it('saves only input snapshots and avoids duplicate saves or deleting a newer draft', () => {
    const value = completeDraft();
    writePracticeDraft(value);
    savePractice(value);
    savePractice(value);
    const next = { ...value, id: 'next-match' };
    writePracticeDraft(next);
    savePractice(value);
    const stored = readPracticeStore(value.classId);
    expect(stored.history).toHaveLength(1);
    expect(stored.draft?.id).toBe('next-match');
    expect(stored.history[0]).not.toHaveProperty('estimatedPoints');
    expect(Object.keys(localStorage)).toEqual([practiceKey(value.classId)]);
  });
  it('keeps an official award audit and reverses it without deleting the match', () => {
    const value = completeDraft();
    writePracticeDraft(value);
    const confirmed = saveOfficialPractice(value, '2026-10-21T01:00:00.000Z');
    expect(confirmed.draft).toBeNull();
    expect(confirmed.history[0].official?.awards).toEqual([
      { teamKey: 'team-0', points: 45 },
      { teamKey: 'team-1', points: 45 },
      { teamKey: 'team-2', points: 45 },
    ]);
    expect(confirmed.history[0].official?.scoringVersion).toBe('growth-v2');
    const voided = voidOfficialPractice(
      value.classId,
      value.id,
      '기록 입력 오류',
      '2026-10-21T02:00:00.000Z',
    );
    expect(voided.history).toHaveLength(1);
    expect(voided.history[0].official).toMatchObject({
      voidReason: '기록 입력 오류',
      voidedAt: '2026-10-21T02:00:00.000Z',
    });
  });
  it('uses the same-season best record for growth-v2 awards', () => {
    const first = completeDraft();
    saveOfficialPractice(first, '2026-10-21T01:00:00.000Z');
    const second = structuredClone(first);
    second.id = 'second-match';
    ['105', '104', '95'].forEach((raw, index) => {
      second.teams[index].raw = raw;
    });
    const confirmed = saveOfficialPractice(second, '2026-10-21T02:00:00.000Z');
    expect(confirmed.history[1].official?.awards).toEqual([
      { teamKey: 'team-0', points: 65 },
      { teamKey: 'team-1', points: 50 },
      { teamKey: 'team-2', points: 35 },
    ]);
  });
  it('preserves stored data on corruption and keeps the draft when saving fails', () => {
    const value = completeDraft();
    localStorage.setItem(practiceKey(value.classId), '{bad json');
    expect(() => writePracticeDraft(value)).toThrow();
    expect(localStorage.getItem(practiceKey(value.classId))).toBe('{bad json');
    localStorage.removeItem(practiceKey(value.classId));
    writePracticeDraft(value);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(() => savePractice(value)).toThrow();
    expect(readPracticeStore(value.classId).draft?.id).toBe(value.id);
  });
  it('rejects an individual count that is larger than its containing team count', () => {
    const value = completeDraft();
    value.teams[0].jumpers[0].actual = '101';
    expect(validatePractice(value, true)['actual-0-0']).toBeTruthy();
    expect(() => savePractice(value)).toThrow();
  });
});
