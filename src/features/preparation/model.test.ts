import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignStudents,
  BOSS_OPTIONS,
  createPreparation,
  DRAFT_KEY,
  LEGACY_SAVED_KEY,
  mergeServerPreparations,
  readDraft,
  readPreparations,
  rosterNames,
  saveGamePreparation,
  savePreparation,
  SAVED_KEY,
  validatePreparation,
  writeDraft,
  readySeasonIndices,
  validateSeason,
  validateJumpers,
} from './model';

function classPlan() {
  const plan = createPreparation();
  plan.className = '5학년 2반';
  plan.roster = '김민준\n김민준\n이서윤\n박도윤';
  return plan;
}
function withTeams() {
  let plan = savePreparation(classPlan());
  for (let index = 0; index < 3; index++)
    plan = {
      ...assignStudents(plan, [plan.students[index].id], index),
      savedAt: plan.savedAt,
    };
  return plan;
}
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('명단 먼저 등록하기', () => {
  it('creates a class without an expedition name, teams, dates or bosses', () => {
    const plan = classPlan();
    expect(validatePreparation(plan, 'class')).toEqual({});
    const saved = savePreparation(plan);
    expect(savePreparation(plan).students).toEqual(saved.students);
    expect(saved).not.toHaveProperty('name');
    expect(saved.students).toHaveLength(4);
    expect(saved.teams.every((team) => team.studentIds.length === 0)).toBe(true);
    expect(saved.teamsConfirmed).toBe(false);
    expect(saved.seasonsConfirmed).toBe(false);
  });
  it('preserves separate identities for students with the same name', () => {
    expect(rosterNames(' 김민준\n\n김민준\n 이서윤 ')).toEqual([
      '김민준',
      '김민준',
      '이서윤',
    ]);
    const saved = savePreparation(classPlan());
    expect(saved.students[0].id).not.toBe(saved.students[1].id);
    expect(readPreparations()[0].students).toEqual(saved.students);
  });
  it('requires only a nonempty roster, without another mandatory naming step', () => {
    expect(validatePreparation(createPreparation(), 'class')).toEqual({
      'class-roster': expect.any(String),
    });
  });
});

describe('게임 화면에서 팀과 시즌 준비', () => {
  it('lets the first ready season be used while four future seasons remain empty', () => {
    const plan = withTeams();
    plan.seasonCount = 5;
    plan.seasons[0] = {
      bossId: 'BOSS_01',
      startDate: '2026-10-20',
      endDate: '2026-11-20',
    };
    expect(plan.teamsConfirmed).toBe(false);
    expect(plan.seasonsConfirmed).toBe(false);
    expect(validatePreparation(plan, 'teams')).toEqual({});
    expect(validateSeason(plan, 0)).toEqual({});
    expect(readySeasonIndices(plan)).toEqual([0]);
    expect(validateSeason(plan, 1)['boss-1']).toBeTruthy();
  });
  it('keeps jumper settings separate, validates membership, and clears moved students only', () => {
    const plan = withTeams();
    plan.jumpers = plan.teams.map((team) => [
      { studentId: team.studentIds[0], multiplier: 3 },
    ]);
    expect(validateJumpers(plan)).toEqual({});
    const moved = assignStudents(plan, [plan.students[0].id], 1);
    expect(moved.jumpers![0]).toEqual([]);
    expect(moved.jumpers![1]).toEqual(plan.jumpers[1]);
    expect(validateJumpers(moved)['jumper-count-0']).toBeTruthy();
    saveGamePreparation(plan);
    expect(readPreparations()[0].jumpers).toEqual(plan.jumpers);
  });
  it('moves the same student without copying their identity into two teams', () => {
    const plan = withTeams();
    const id = plan.students[0].id;
    const moved = assignStudents(plan, [id, id], 1);
    expect(moved.teams[0].studentIds).not.toContain(id);
    expect(moved.teams[1].studentIds.filter((value) => value === id)).toHaveLength(1);
    expect(
      assignStudents(moved, [id], null).teams.flatMap((team) => team.studentIds),
    ).not.toContain(id);
    expect(() => assignStudents(plan, [id], 9)).toThrow();
  });
  it('checks all three teams only when confirming the team setup', () => {
    const plan = savePreparation(classPlan());
    expect(validatePreparation(plan, 'teams')['team-members-0']).toBeTruthy();
    const configured = withTeams();
    expect(validatePreparation(configured, 'teams')).toEqual({});
    configured.teams[1].name = configured.teams[0].name;
    expect(validatePreparation(configured, 'teams')['team-name-1']).toBeTruthy();
  });
  it('allows five distinct bosses, but rejects duplicate bosses and a sixth season', () => {
    const plan = classPlan();
    plan.seasonCount = 5;
    plan.seasons = BOSS_OPTIONS.map((boss) => ({
      bossId: boss.id,
      startDate: '2026-10-19',
      endDate: '2026-11-10',
    }));
    expect(validatePreparation(plan, 'seasons')).toEqual({});
    plan.seasons[4].bossId = plan.seasons[0].bossId;
    expect(validatePreparation(plan, 'seasons')['boss-4']).toBeTruthy();
    plan.seasonCount = 6;
    expect(validatePreparation(plan, 'seasons')['season-count']).toBeTruthy();
  });
  it('checks real dates, end-date order, and same-day seasons', () => {
    const plan = classPlan();
    plan.seasons[0] = {
      bossId: 'BOSS_01',
      startDate: '2026-10-19',
      endDate: '2026-10-19',
    };
    expect(validatePreparation(plan, 'seasons')).toEqual({});
    plan.seasons[0].endDate = '2026-02-30';
    expect(validatePreparation(plan, 'seasons')['end-0']).toBeTruthy();
    plan.seasons[0].endDate = '2026-10-18';
    expect(validatePreparation(plan, 'seasons')['end-0']).toBeTruthy();
  });
});

describe('저장·복구와 이전 입력 보존', () => {
  it('merges server preparations without replacing a newer local copy', () => {
    const first = savePreparation(classPlan());
    const savedAt = Date.parse(first.savedAt);
    const localNewer = {
      ...first,
      className: '로컬 최신',
      savedAt: new Date(savedAt + 2_000).toISOString(),
    };
    localStorage.setItem(SAVED_KEY, JSON.stringify([localNewer]));
    const serverOlder = {
      ...first,
      className: '서버 과거',
      savedAt: new Date(savedAt + 1_000).toISOString(),
    };
    const serverNew = {
      ...savePreparation(classPlan()),
      className: '서버 새 원정',
      savedAt: new Date(savedAt + 3_000).toISOString(),
    };
    const merged = mergeServerPreparations([serverOlder, serverNew]);
    expect(merged.map((plan) => plan.className)).toEqual(['서버 새 원정', '로컬 최신']);
    expect(readPreparations()).toEqual(merged);
  });

  it('rejects malformed server preparations without changing local data', () => {
    const local = savePreparation(classPlan());
    const raw = localStorage.getItem(SAVED_KEY);
    expect(() => mergeServerPreparations([{ ...local, savedAt: 'not-a-date' }])).toThrow(
      '서버 원정 자료',
    );
    expect(localStorage.getItem(SAVED_KEY)).toBe(raw);
  });

  it('keeps a draft, multiple classes and persisted team assignments', () => {
    const first = classPlan();
    writeDraft(first);
    expect(readDraft()).toEqual(first);
    const saved = savePreparation(first);
    const configured = assignStudents(saved, [saved.students[0].id], 0);
    saveGamePreparation(configured);
    const second = savePreparation(classPlan());
    const all = readPreparations();
    expect(all.map((plan) => plan.id)).toEqual([second.id, saved.id]);
    expect(all[1].teams[0].studentIds).toEqual([saved.students[0].id]);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
  it('does not overwrite unreadable data or remove a draft after a failed save', () => {
    localStorage.setItem(SAVED_KEY, '{bad json');
    expect(() => savePreparation(classPlan())).toThrow();
    expect(localStorage.getItem(SAVED_KEY)).toBe('{bad json');
    localStorage.removeItem(SAVED_KEY);
    const plan = classPlan();
    writeDraft(plan);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(() => savePreparation(plan)).toThrow();
    expect(readDraft()?.id).toBe(plan.id);
  });
  it('migrates previous team rosters without losing names or changing legacy storage', () => {
    const legacy = [
      {
        id: 'old-id',
        name: '교사가 지은 예전 이름',
        className: '4학년 1반',
        teams: [
          { name: '나무', roster: '김민준' },
          { name: '햇살', roster: '김민준' },
          { name: '바람', roster: '이서윤' },
        ],
        seasonCount: 1,
        seasons: [{ bossId: 'BOSS_01', startDate: '2026-10-19', endDate: '2026-11-10' }],
        savedAt: '2026-10-19T00:00:00Z',
      },
    ];
    const raw = JSON.stringify(legacy);
    localStorage.setItem(LEGACY_SAVED_KEY, raw);
    const migrated = readPreparations()[0];
    expect(migrated.students.map((student) => student.name)).toEqual([
      '김민준',
      '김민준',
      '이서윤',
    ]);
    expect(migrated.teams.map((team) => team.name)).toEqual(['나무', '햇살', '바람']);
    expect(readPreparations()[0].students).toEqual(migrated.students);
    expect(migrated).not.toHaveProperty('name');
    saveGamePreparation(migrated);
    expect(readPreparations()).toHaveLength(1);
    expect(localStorage.getItem(LEGACY_SAVED_KEY)).toBe(raw);
  });
});
