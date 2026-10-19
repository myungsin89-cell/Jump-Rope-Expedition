import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPreparation,
  readPreparations,
  saveGamePreparation,
} from '../preparation/model';
import {
  createPractice,
  readPracticeStore,
  savePractice,
} from '../matches/practiceModel';
import {
  arrangeTeam,
  currentSeasonIndex,
  moveStudent,
  previewHistory,
  resizeTeams,
  setJumper,
} from './operations';

function plan() {
  const result = createPreparation();
  result.className = '기존 원정';
  result.students = Array.from({ length: 6 }, (_, index) => ({
    id: `s-${index}`,
    name: index < 2 ? '동명이인' : `학생${index}`,
  }));
  result.roster = result.students.map((student) => student.name).join('\n');
  result.teams.forEach((team, index) => {
    team.studentIds = [`s-${index}`, `s-${index + 3}`];
  });
  result.teams[0].captainId = 's-0';
  result.jumpers = result.teams.map((team) => [
    { studentId: team.studentIds[0], multiplier: 2 },
  ]);
  result.seasons[0] = {
    bossId: 'BOSS_01',
    startDate: '2026-10-20',
    endDate: '2026-11-20',
  };
  return result;
}
beforeEach(() => localStorage.clear());
describe('현황 중심 원정 운영', () => {
  it('edits a whole team atomically, preserves staying roles and unassigns removed members', () => {
    const value = plan();
    const arranged = arrangeTeam(value, 0, ['s-0', 's-1', 's-4']);
    expect(arranged.teams[0].studentIds).toEqual(['s-0', 's-1', 's-4']);
    expect(arranged.teams[0].captainId).toBe('s-0');
    expect(arranged.jumpers![0]).toEqual(value.jumpers![0]);
    expect(arranged.teams[1].studentIds).toEqual([]);
    expect(arranged.jumpers![1]).toEqual([]);
    expect(arranged.teams.flatMap((team) => team.studentIds)).not.toContain('s-3');
    expect(arranged.students).toEqual(value.students);
    expect(value.teams[0].studentIds).toEqual(['s-0', 's-3']);
    saveGamePreparation(arranged);
    expect(readPreparations()[0].teams).toEqual(arranged.teams);
  });
  it('clears removed captain and jumper roles when the team is emptied', () => {
    const arranged = arrangeTeam(plan(), 0, []);
    expect(arranged.teams[0].captainId).toBeUndefined();
    expect(arranged.jumpers![0]).toEqual([]);
    expect(() => arrangeTeam(plan(), 5, [])).toThrow('원정대');
  });
  it('persists captains and existing identities without new storage keys', () => {
    const value = plan();
    saveGamePreparation(value);
    expect(readPreparations()[0].teams[0].captainId).toBe('s-0');
    expect(readPreparations()[0].students).toEqual(value.students);
    expect(Object.keys(localStorage)).toEqual(['jre.preparations.v2']);
  });
  it('moves the same student and removes captain and jumper roles from the former team', () => {
    const moved = moveStudent(plan(), 's-0', 1);
    expect(moved.teams[0].captainId).toBeUndefined();
    expect(moved.teams[0].studentIds).not.toContain('s-0');
    expect(moved.teams[1].studentIds).toContain('s-0');
    expect(moved.jumpers![0]).toEqual([]);
    expect(moveStudent(moved, 's-0', 1)).toBe(moved);
  });
  it('retains all students when reducing an unplayed expedition to two teams', () => {
    const value = plan();
    const resized = resizeTeams(value, 2, readPracticeStore(value.id));
    expect(resized.teams).toHaveLength(2);
    expect(resized.students).toEqual(value.students);
    expect(resized.jumpers).toHaveLength(2);
    const four = resizeTeams(resized, 4, readPracticeStore(value.id));
    expect(four.teams).toHaveLength(4);
    expect(four.teams[2].studentIds).toEqual([]);
    saveGamePreparation(four);
    expect(readPreparations()[0].teams).toHaveLength(4);
  });
  it('does not delete old records to change the team count', () => {
    const value = plan();
    const draft = createPractice(value);
    draft.teams.forEach((team) => {
      team.raw = '100';
      team.jumpers[0].actual = '10';
    });
    const store = savePractice(draft);
    expect(() => resizeTeams(value, 2, store)).toThrow('기존 기록');
    expect(readPracticeStore(value.id).history).toHaveLength(1);
  });
  it('limits each team to two jumpers and retains independently chosen multipliers', () => {
    let value = setJumper(plan(), 's-3', true, 3);
    expect(value.jumpers![0]).toHaveLength(2);
    expect(value.jumpers![0][1].multiplier).toBe(3);
    value = {
      ...value,
      students: [...value.students, { id: 'extra', name: '추가' }],
      teams: value.teams.map((team, index) =>
        index ? team : { ...team, studentIds: [...team.studentIds, 'extra'] },
      ),
    };
    expect(() => setJumper(value, 'extra', true)).toThrow('최대 2명');
    value = setJumper(value, 's-0', false);
    expect(setJumper(value, 'extra', true).jumpers![0]).toHaveLength(2);
  });
  it('does not let empty choices from the older setup screen consume jumper slots', () => {
    const value = plan();
    value.jumpers![0] = [
      { studentId: '', multiplier: 1 },
      { studentId: 'old-student', multiplier: 2 },
    ];
    const configured = setJumper(value, 's-0', true, 3);
    expect(configured.jumpers![0]).toEqual([{ studentId: 's-0', multiplier: 3 }]);
    expect(setJumper(configured, 's-3', true).jumpers![0]).toHaveLength(2);
  });
  it('keeps season totals separate without changing the existing raw-record growth rule', () => {
    const value = plan();
    value.seasonCount = 2;
    value.currentSeasonIndex = 1;
    expect(currentSeasonIndex(value)).toBe(1);
    const a = createPractice(value, 0);
    const b = createPractice(value, 1);
    for (const entry of [a, b])
      entry.teams.forEach((team, index) => {
        team.raw = String(100 - index * 10 + (entry === b ? 10 : 0));
        team.jumpers[0].actual = '0';
      });
    const entries = [a, b].map((entry) => ({
      ...entry,
      savedAt: '2026-10-20T00:00:00Z',
    }));
    expect(previewHistory(entries, 0).points.get('team-0')).toBe(60);
    expect(previewHistory(entries, 1).points.get('team-0')).toBe(80);
  });
});
