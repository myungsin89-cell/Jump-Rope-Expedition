import { describe, expect, it } from 'vitest';
import { createPreparation } from '../../features/preparation/model';
import {
  isUuid,
  parseStudentBoard,
  parseTeacherPreparation,
  studentBoardData,
} from './studentBoard';
function plan() {
  const value = createPreparation();
  value.className = '우리 반 원정';
  value.students = [
    { id: 'a', name: '동명이인' },
    { id: 'b', name: '동명이인' },
    { id: 'c', name: '서윤' },
  ];
  value.teams.forEach((team, index) => {
    team.studentIds = [value.students[index].id];
  });
  value.teams[0].captainId = 'a';
  value.jumpers = [[{ studentId: 'a', multiplier: 3 }], [], []];
  return value;
}
describe('student-only preparation snapshot', () => {
  it('publishes all team rosters and excludes teacher settings, boss and multipliers', () => {
    const value = plan();
    const board = studentBoardData(value, 0);
    expect(board.members).toEqual([
      {
        name: '동명이인',
        number: 1,
        captain: true,
        jumper: true,
        medals: [],
        growth: [],
      },
    ]);
    expect(board.teams).toHaveLength(3);
    expect(board.teams[1].members[0].name).toBe('동명이인');
    const text = JSON.stringify(board);
    for (const word of [
      'bossId',
      'multiplier',
      'studentIds',
      'captainId',
      'roster',
      'seasons',
      'ownerKey',
    ])
      expect(text).not.toContain(word);
    expect(() => studentBoardData(value, 5)).toThrow('원정대');
  });
  it('strips unexpected fields from a remote snapshot', () => {
    const board = studentBoardData(plan(), 0);
    expect(
      parseStudentBoard({
        ...board,
        bossId: 'BOSS_01',
        ownerKey: 'private',
        members: board.members.map((member) => ({ ...member, multiplier: 3 })),
      }),
    ).toEqual(board);
  });
  it('publishes only this team sealed count and revealed hero identities', () => {
    const value = plan();
    const board = studentBoardData(value, 0, '2026-10-22T00:00:00.000Z', {
      heroes: {
        expeditionId: value.id,
        rewards: [
          { id: 'sealed-1', teamIndex: 0, seasonIndex: 0, heroId: 'H01' },
          {
            id: 'reveal-2',
            teamIndex: 0,
            seasonIndex: 0,
            heroId: 'H02',
            revealedAt: '2026-10-22T00:00:00.000Z',
          },
          {
            teamIndex: 1,
            seasonIndex: 0,
            heroId: 'H15',
            revealedAt: '2026-10-22T00:00:00.000Z',
          },
        ],
      },
    });
    expect(board.heroes).toEqual([
      { slot: 1, revealed: false },
      { slot: 2, revealed: true, heroId: 'H02' },
    ]);
    expect(board.heroReveal).toEqual({
      eventId: 'reveal-2',
      slot: 2,
      heroId: 'H02',
      startedAt: '2026-10-22T00:00:00.000Z',
    });
    expect(JSON.stringify(board)).not.toContain('H01');
    expect(JSON.stringify(board)).not.toContain('H15');
    expect(parseStudentBoard(board)).toEqual(board);
    expect(() =>
      parseStudentBoard({
        ...board,
        heroReveal: { ...board.heroReveal, heroId: 'H15' },
      }),
    ).toThrow('이벤트');
  });
  it('rejects malformed member numbers and unsupported versions', () => {
    const board = studentBoardData(plan(), 0);
    expect(() =>
      parseStudentBoard({ ...board, members: [...board.members, ...board.members] }),
    ).toThrow();
    expect(() => parseStudentBoard({ ...board, version: 2 })).toThrow();
    expect(() =>
      parseStudentBoard({
        ...board,
        members: [{ name: '이름', number: -1, captain: false, jumper: false }],
      }),
    ).toThrow();
  });
  it('validates a teacher backup while retaining identities and unprepared seasons', () => {
    const value = plan();
    const next = parseTeacherPreparation({ ...value, unknownSecret: 'not-stored' });
    expect(next.students).toEqual(value.students);
    expect(next.jumpers).toEqual(value.jumpers);
    expect('unknownSecret' in next).toBe(false);
  });
  it('rejects duplicate student assignments and invalid captains', () => {
    const value = plan();
    value.teams[1].studentIds = ['a'];
    expect(() => parseTeacherPreparation(value)).toThrow('원정대 편성');
    value.teams[1].studentIds = ['b'];
    value.teams[0].captainId = 'b';
    expect(() => parseTeacherPreparation(value)).toThrow('원정대장');
    expect(isUuid('not-a-token')).toBe(false);
    expect(isUuid(value.id)).toBe(true);
  });
});
