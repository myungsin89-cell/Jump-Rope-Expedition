import { calculateMatchPreview } from '../../shared/domain/matchScoring';
import type { JumperMultiplier, TeamMatchInput } from '../../shared/domain/matchScoring';
import type { FieldErrors, Preparation } from '../preparation/model';
import { readySeasonIndices, validateJumpers } from '../preparation/model';

export interface PracticeMember {
  id: string;
  name: string;
  number: number;
}
export interface PracticeJumper {
  studentId: string;
  multiplier: JumperMultiplier;
  actual: string;
}
export interface PracticeTeam {
  key: string;
  name: string;
  members: PracticeMember[];
  raw: string;
  jumpers: PracticeJumper[];
}
export interface PracticeDraft {
  id: string;
  classId: string;
  seasonIndex: number;
  locked: boolean;
  teams: PracticeTeam[];
}
export interface SavedPractice extends PracticeDraft {
  savedAt: string;
}
export interface PracticeStore {
  version: 1;
  classId: string;
  draft: PracticeDraft | null;
  history: SavedPractice[];
}

export const practiceKey = (classId: string) => `jre.practice-matches.v1.${classId}`;

export function createPractice(
  plan: Preparation,
  seasonIndex = readySeasonIndices(plan).includes(plan.currentSeasonIndex ?? -1)
    ? plan.currentSeasonIndex!
    : (readySeasonIndices(plan)[0] ?? 0),
): PracticeDraft {
  const presetReady = !Object.keys(validateJumpers(plan)).length;
  return {
    id: crypto.randomUUID(),
    classId: plan.id,
    seasonIndex,
    locked: presetReady,
    teams: plan.teams.map((team, index) => ({
      key: `team-${index}`,
      name: team.name,
      raw: '',
      members: team.studentIds.map((id) => {
        const number = plan.students.findIndex((student) => student.id === id);
        if (number < 0) throw new Error('팀 명단을 확인해 주세요.');
        return { ...plan.students[number], number: number + 1 };
      }),
      jumpers: presetReady
        ? plan.jumpers![index].map((jumper) => ({ ...jumper, actual: '' }))
        : [{ studentId: '', multiplier: 1, actual: '' }],
    })),
  };
}

export function parseCount(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function validatePractice(draft: PracticeDraft, records = false): FieldErrors {
  const errors: FieldErrors = {};
  draft.teams.forEach((team, teamIndex) => {
    if (team.jumpers.length < 1 || team.jumpers.length > 2)
      errors[`jumper-count-${teamIndex}`] = '도전점퍼는 1명 또는 2명을 정해 주세요.';
    team.jumpers.forEach((jumper, index) => {
      const field = `jumper-${teamIndex}-${index}`;
      if (!team.members.some((student) => student.id === jumper.studentId))
        errors[field] = `${team.name}의 도전점퍼를 선택해 주세요.`;
      else if (
        team.jumpers.filter((other) => other.studentId === jumper.studentId).length > 1
      )
        errors[field] = '서로 다른 학생을 선택해 주세요.';
      if (![1, 2, 3].includes(jumper.multiplier))
        errors[`multiplier-${teamIndex}-${index}`] =
          '배수는 1배·2배·3배 중에서 정해 주세요.';
    });
    if (!records) return;
    const raw = parseCount(team.raw);
    if (raw === null)
      errors[`raw-${teamIndex}`] = '팀 원기록을 0 이상의 정수로 입력해 주세요.';
    let extra = 0;
    team.jumpers.forEach((jumper, index) => {
      const actual = parseCount(jumper.actual);
      if (actual === null)
        errors[`actual-${teamIndex}-${index}`] =
          '개인 실제 기록을 0 이상의 정수로 입력해 주세요.';
      else if (raw !== null && actual > raw)
        errors[`actual-${teamIndex}-${index}`] =
          '개인 기록은 포함된 팀 원기록보다 클 수 없어요.';
      else extra += actual * (jumper.multiplier - 1);
    });
    if (raw !== null && !Number.isSafeInteger(raw + extra))
      errors[`raw-${teamIndex}`] = '개수가 너무 커요. 입력을 확인해 주세요.';
  });
  return errors;
}

export function practiceInputs(draft: PracticeDraft): TeamMatchInput[] {
  if (Object.keys(validatePractice(draft, true)).length)
    throw new Error('각 원정대의 기록을 확인해 주세요.');
  return draft.teams.map((team) => ({
    teamKey: team.key,
    rawCount: parseCount(team.raw)!,
    jumpers: team.jumpers.map((jumper) => ({
      studentId: jumper.studentId,
      multiplier: jumper.multiplier,
      actualCount: parseCount(jumper.actual)!,
    })),
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isDraft(value: unknown, classId: string): value is PracticeDraft {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    value.classId !== classId ||
    !Number.isInteger(value.seasonIndex) ||
    Number(value.seasonIndex) < 0 ||
    Number(value.seasonIndex) > 4 ||
    typeof value.locked !== 'boolean' ||
    !Array.isArray(value.teams) ||
    value.teams.length < 2 ||
    value.teams.length > 4 ||
    !value.teams.every(
      (team, index) =>
        isRecord(team) &&
        team.key === `team-${index}` &&
        typeof team.name === 'string' &&
        typeof team.raw === 'string' &&
        Array.isArray(team.members) &&
        team.members.length > 0 &&
        team.members.every(
          (member) =>
            isRecord(member) &&
            typeof member.id === 'string' &&
            member.id.length > 0 &&
            typeof member.name === 'string' &&
            Number.isSafeInteger(member.number) &&
            Number(member.number) > 0,
        ) &&
        Array.isArray(team.jumpers) &&
        team.jumpers.length >= 1 &&
        team.jumpers.length <= 2 &&
        team.jumpers.every(
          (jumper) =>
            isRecord(jumper) &&
            typeof jumper.studentId === 'string' &&
            [1, 2, 3].includes(Number(jumper.multiplier)) &&
            typeof jumper.multiplier === 'number' &&
            typeof jumper.actual === 'string',
        ),
    )
  )
    return false;
  const draft = value as unknown as PracticeDraft;
  const memberIds = draft.teams.flatMap((team) =>
    team.members.map((member) => member.id),
  );
  return (
    new Set(memberIds).size === memberIds.length &&
    (!draft.locked || Object.keys(validatePractice(draft)).length === 0)
  );
}

function isSavedPractice(value: unknown, classId: string): value is SavedPractice {
  if (
    !isDraft(value, classId) ||
    !value.locked ||
    !isRecord(value) ||
    typeof value.savedAt !== 'string'
  )
    return false;
  try {
    calculateMatchPreview(practiceInputs(value));
    return true;
  } catch {
    return false;
  }
}

export function readPracticeStore(classId: string): PracticeStore {
  const raw = localStorage.getItem(practiceKey(classId));
  if (raw === null) return { version: 1, classId, draft: null, history: [] };
  const value: unknown = JSON.parse(raw);
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.classId !== classId ||
    !(value.draft === null || isDraft(value.draft, classId)) ||
    !Array.isArray(value.history) ||
    !value.history.every((entry) => isSavedPractice(entry, classId)) ||
    new Set(value.history.map((entry) => entry.id)).size !== value.history.length
  ) {
    throw new Error('연습 기록을 읽을 수 없어요. 원본은 그대로 보관돼요.');
  }
  return value as unknown as PracticeStore;
}

export function writePracticeDraft(draft: PracticeDraft): PracticeStore {
  if (!isDraft(draft, draft.classId)) throw new Error('경기 입력 내용을 확인해 주세요.');
  const store = readPracticeStore(draft.classId);
  const next = { ...store, draft };
  localStorage.setItem(practiceKey(draft.classId), JSON.stringify(next));
  return next;
}

export function savePractice(draft: PracticeDraft): PracticeStore {
  if (!draft.locked || Object.keys(validatePractice(draft, true)).length)
    throw new Error('도전점퍼와 기록을 먼저 확인해 주세요.');
  calculateMatchPreview(practiceInputs(draft));
  const store = readPracticeStore(draft.classId);
  const existing = store.history.find((entry) => entry.id === draft.id);
  const next: PracticeStore = {
    ...store,
    // A duplicate save must not erase a newer, different draft.
    draft: store.draft?.id === draft.id ? null : store.draft,
    history: existing
      ? store.history
      : [...store.history, { ...draft, savedAt: new Date().toISOString() }],
  };
  localStorage.setItem(practiceKey(draft.classId), JSON.stringify(next));
  return next;
}
