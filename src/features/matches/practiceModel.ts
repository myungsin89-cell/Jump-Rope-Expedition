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
  official?: {
    confirmedAt: string;
    awards: { teamKey: string; points: number }[];
    scoringVersion?: 'growth-v2';
    voidedAt?: string;
    voidReason?: string;
  };
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

export function seasonBestInputs(
  history: SavedPractice[],
  seasonIndex: number,
  excludeMatchId?: string,
): Pick<TeamMatchInput, 'teamKey' | 'rawCount'>[] {
  const bests = new Map<string, number>();
  history
    .filter(
      (entry) =>
        entry.id !== excludeMatchId &&
        entry.seasonIndex === seasonIndex &&
        Boolean(entry.official) &&
        !entry.official?.voidedAt,
    )
    .forEach((entry) =>
      practiceInputs(entry).forEach((team) => {
        bests.set(team.teamKey, Math.max(bests.get(team.teamKey) ?? 0, team.rawCount));
      }),
    );
  return [...bests].map(([teamKey, rawCount]) => ({ teamKey, rawCount }));
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
    const results = calculateMatchPreview(practiceInputs(value));
    if (value.official !== undefined) {
      if (
        !isRecord(value.official) ||
        typeof value.official.confirmedAt !== 'string' ||
        !Number.isFinite(Date.parse(value.official.confirmedAt)) ||
        (value.official.scoringVersion !== undefined &&
          value.official.scoringVersion !== 'growth-v2') ||
        !Array.isArray(value.official.awards) ||
        value.official.awards.length !== results.length ||
        !value.official.awards.every(
          (award) =>
            isRecord(award) &&
            typeof award.teamKey === 'string' &&
            results.some((result) => result.teamKey === award.teamKey) &&
            Number.isSafeInteger(award.points) &&
            Number(award.points) >= 0,
        ) ||
        new Set(value.official.awards.map((award) => award.teamKey)).size !==
          value.official.awards.length ||
        (value.official.voidedAt !== undefined &&
          (typeof value.official.voidedAt !== 'string' ||
            !Number.isFinite(Date.parse(value.official.voidedAt)) ||
            typeof value.official.voidReason !== 'string' ||
            value.official.voidReason.trim().length < 3 ||
            value.official.voidReason.length > 200)) ||
        (value.official.voidedAt === undefined && value.official.voidReason !== undefined)
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function readPracticeStore(classId: string): PracticeStore {
  const raw = localStorage.getItem(practiceKey(classId));
  if (raw === null) return { version: 1, classId, draft: null, history: [] };
  return parsePracticeStore(JSON.parse(raw), classId);
}

export function parsePracticeStore(value: unknown, classId: string): PracticeStore {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.classId !== classId ||
    !(value.draft === null || isDraft(value.draft, classId)) ||
    !Array.isArray(value.history) ||
    !value.history.every((entry) => isSavedPractice(entry, classId)) ||
    new Set(value.history.map((entry) => entry.id)).size !== value.history.length
  ) {
    throw new Error('경기 기록을 읽을 수 없어요. 원본은 그대로 보관돼요.');
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

export function saveOfficialPractice(
  draft: PracticeDraft,
  confirmedAt: string,
): PracticeStore {
  if (!Number.isFinite(Date.parse(confirmedAt)))
    throw new Error('경기 확정 시간을 확인해 주세요.');
  if (!draft.locked || Object.keys(validatePractice(draft, true)).length)
    throw new Error('도전점퍼와 기록을 먼저 확인해 주세요.');
  const store = readPracticeStore(draft.classId);
  const results = calculateMatchPreview(
    practiceInputs(draft),
    seasonBestInputs(store.history, draft.seasonIndex, draft.id),
  );
  const official = {
    confirmedAt,
    scoringVersion: 'growth-v2' as const,
    awards: results.map((result) => ({
      teamKey: result.teamKey,
      points: result.estimatedPoints,
    })),
  };
  const existing = store.history.find((entry) => entry.id === draft.id);
  if (existing?.official) return store;
  if (existing) throw new Error('같은 입력이 이미 연습 기록으로 저장되어 있어요.');
  const next: PracticeStore = {
    ...store,
    draft: store.draft?.id === draft.id ? null : store.draft,
    history: [...store.history, { ...draft, savedAt: confirmedAt, official }],
  };
  localStorage.setItem(practiceKey(draft.classId), JSON.stringify(next));
  return next;
}

export function voidOfficialPractice(
  classId: string,
  matchId: string,
  voidReason: string,
  voidedAt: string,
): PracticeStore {
  const reason = voidReason.trim();
  if (reason.length < 3 || reason.length > 200)
    throw new Error('취소 사유를 3자 이상 200자 이내로 입력해 주세요.');
  if (!Number.isFinite(Date.parse(voidedAt)))
    throw new Error('경기 취소 시간을 확인해 주세요.');
  const store = readPracticeStore(classId);
  const target = store.history.find((entry) => entry.id === matchId);
  if (!target?.official) throw new Error('취소할 공식 경기 기록을 찾지 못했어요.');
  if (target.official.voidedAt) return store;
  const next: PracticeStore = {
    ...store,
    history: store.history.map((entry) =>
      entry.id === matchId
        ? {
            ...entry,
            official: { ...entry.official!, voidedAt, voidReason: reason },
          }
        : entry,
    ),
  };
  localStorage.setItem(practiceKey(classId), JSON.stringify(next));
  return next;
}
