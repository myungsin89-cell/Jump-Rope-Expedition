export const BOSS_OPTIONS = [
  { id: 'BOSS_01', name: '바위 골렘' },
  { id: 'BOSS_02', name: '바람 익룡' },
  { id: 'BOSS_03', name: '가시 덩굴 트렌트' },
  { id: 'BOSS_04', name: '얼음 설인' },
  { id: 'BOSS_05', name: '화산 드래곤 카이저' },
] as const;

export interface StudentPlan {
  id: string;
  name: string;
}
export interface TeamPlan {
  name: string;
  studentIds: string[];
  captainId?: string;
}
export interface SeasonPlan {
  bossId: string;
  startDate: string;
  endDate: string;
}
export interface JumperSetting {
  studentId: string;
  multiplier: 1 | 2 | 3;
}
export interface Preparation {
  id: string;
  className: string;
  roster: string;
  students: StudentPlan[];
  teams: TeamPlan[];
  seasonCount: number;
  seasons: SeasonPlan[];
  teamsConfirmed: boolean;
  seasonsConfirmed: boolean;
  jumpers?: JumperSetting[][];
  currentSeasonIndex?: number;
}
export interface SavedPreparation extends Preparation {
  savedAt: string;
}
export type FieldErrors = Record<string, string>;
export type PreparationSection = 'class' | 'teams' | 'seasons';
export function fieldAttributes(id: string, errors: FieldErrors) {
  return {
    'aria-invalid': Boolean(errors[id]),
    'aria-describedby': errors[id] ? `${id}-error` : undefined,
  };
}
export const DRAFT_KEY = 'jre.preparation.draft.v2';
export const SAVED_KEY = 'jre.preparations.v2';
export const LEGACY_DRAFT_KEY = 'jre.preparation.draft.v1';
export const LEGACY_SAVED_KEY = 'jre.preparations.v1';

export function rosterNames(roster: string): string[] {
  return roster
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
}
export function createPreparation(): Preparation {
  return {
    id: crypto.randomUUID(),
    className: '',
    roster: '',
    students: [],
    teams: [1, 2, 3].map((number) => ({ name: `${number} 원정대`, studentIds: [] })),
    seasonCount: 1,
    seasons: Array.from({ length: 5 }, () => ({
      bossId: '',
      startDate: '',
      endDate: '',
    })),
    teamsConfirmed: false,
    seasonsConfirmed: false,
    jumpers: [[], [], []],
  };
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
// A future season may remain unfinished. Only the season being used needs a boss and dates.
export function validateSeason(plan: Preparation, index: number): FieldErrors {
  const errors: FieldErrors = {};
  const season = plan.seasons[index];
  if (!season || index < 0 || index >= plan.seasonCount)
    return { 'season-count': '시즌을 확인해 주세요.' };
  if (!BOSS_OPTIONS.some((boss) => boss.id === season.bossId))
    errors[`boss-${index}`] = '이번 시즌의 보스를 선택해 주세요.';
  else if (
    plan.seasons
      .slice(0, plan.seasonCount)
      .some((other, at) => at !== index && other.bossId === season.bossId)
  )
    errors[`boss-${index}`] = '같은 보스는 한 번씩만 선택해 주세요.';
  if (!validDate(season.startDate))
    errors[`start-${index}`] = '올바른 시작일을 입력해 주세요.';
  if (!validDate(season.endDate))
    errors[`end-${index}`] = '올바른 종료 예정일을 입력해 주세요.';
  else if (validDate(season.startDate) && season.endDate < season.startDate)
    errors[`end-${index}`] = '종료 예정일은 시작일과 같거나 뒤여야 해요.';
  return errors;
}
export function readySeasonIndices(plan: Preparation): number[] {
  return plan.seasons
    .slice(0, plan.seasonCount)
    .flatMap((_, index) =>
      Object.keys(validateSeason(plan, index)).length ? [] : [index],
    );
}
export function validateJumpers(plan: Preparation): FieldErrors {
  const errors: FieldErrors = {};
  plan.teams.forEach((team, teamIndex) => {
    const jumpers = plan.jumpers?.[teamIndex] ?? [];
    if (jumpers.length < 1 || jumpers.length > 2)
      errors[`jumper-count-${teamIndex}`] =
        `${team.name}의 도전점퍼를 1명 또는 2명 정해 주세요.`;
    jumpers.forEach((jumper, index) => {
      if (!team.studentIds.includes(jumper.studentId))
        errors[`jumper-${teamIndex}-${index}`] =
          `${team.name}의 도전점퍼를 선택해 주세요.`;
      else if (
        jumpers.some((other, at) => at !== index && other.studentId === jumper.studentId)
      )
        errors[`jumper-${teamIndex}-${index}`] = '서로 다른 학생을 선택해 주세요.';
      if (![1, 2, 3].includes(jumper.multiplier))
        errors[`multiplier-${teamIndex}-${index}`] =
          '배수는 1배·2배·3배 중에서 정해 주세요.';
    });
  });
  return errors;
}
export function validatePreparation(
  plan: Preparation,
  section: PreparationSection,
): FieldErrors {
  const errors: FieldErrors = {};
  if (section === 'class') {
    // A display label is optional; creating an expedition must not require another naming step.
    if (!rosterNames(plan.roster).length)
      errors['class-roster'] = '학생 이름을 한 줄에 한 명씩 입력해 주세요.';
  }
  if (section === 'teams') {
    const names = plan.teams.map((team) => team.name.trim());
    plan.teams.forEach((team, index) => {
      if (!team.name.trim())
        errors[`team-name-${index}`] = `${index + 1}팀 이름을 입력해 주세요.`;
      else if (names.filter((name) => name === team.name.trim()).length > 1)
        errors[`team-name-${index}`] = '팀 이름은 서로 다르게 정해 주세요.';
      if (!team.studentIds.length)
        errors[`team-members-${index}`] = `${index + 1}팀에 학생을 배정해 주세요.`;
    });
  }
  if (section === 'seasons') {
    if (
      !Number.isInteger(plan.seasonCount) ||
      plan.seasonCount < 1 ||
      plan.seasonCount > 5
    )
      errors['season-count'] = '시즌은 1개부터 5개까지 정할 수 있어요.';
    plan.seasons
      .slice(0, plan.seasonCount)
      .forEach((_, index) => Object.assign(errors, validateSeason(plan, index)));
  }
  return errors;
}
export function assignStudents(
  plan: Preparation,
  ids: string[],
  teamIndex: number | null,
): Preparation {
  if (
    teamIndex !== null &&
    (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex >= plan.teams.length)
  ) {
    throw new Error('배정할 팀을 확인해 주세요.');
  }
  const allowed = new Set(plan.students.map((student) => student.id));
  const selected = new Set(ids.filter((id) => allowed.has(id)));
  return {
    ...plan,
    teamsConfirmed: false,
    jumpers: plan.jumpers?.map((jumpers, index) =>
      jumpers.filter((jumper) => !selected.has(jumper.studentId) || index === teamIndex),
    ),
    teams: plan.teams.map((team, index) => ({
      ...team,
      captainId:
        team.captainId && selected.has(team.captainId) && index !== teamIndex
          ? undefined
          : team.captainId,
      studentIds: [
        ...team.studentIds.filter((id) => !selected.has(id)),
        ...(index === teamIndex ? [...selected] : []),
      ],
    })),
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isPreparation(value: unknown): value is Preparation {
  if (!isRecord(value)) return false;
  if (
    value.jumpers !== undefined &&
    (!Array.isArray(value.jumpers) ||
      !Array.isArray(value.teams) ||
      value.jumpers.length !== value.teams.length ||
      !value.jumpers.every(
        (team) =>
          Array.isArray(team) &&
          team.length <= 2 &&
          team.every(
            (jumper) =>
              isRecord(jumper) &&
              typeof jumper.studentId === 'string' &&
              [1, 2, 3].includes(Number(jumper.multiplier)) &&
              typeof jumper.multiplier === 'number',
          ),
      ))
  )
    return false;
  if (!(
    typeof value.id === 'string' &&
    value.id.length &&
    typeof value.className === 'string' &&
    typeof value.roster === 'string' &&
    typeof value.teamsConfirmed === 'boolean' &&
    typeof value.seasonsConfirmed === 'boolean' &&
    Number.isInteger(value.seasonCount) &&
    Number(value.seasonCount) >= 1 &&
    Number(value.seasonCount) <= 5 &&
    Array.isArray(value.students) &&
    value.students.every(
      (student) =>
        isRecord(student) &&
        typeof student.id === 'string' &&
        student.id.length &&
        typeof student.name === 'string',
    ) &&
    Array.isArray(value.teams) &&
    value.teams.length >= 2 &&
    value.teams.length <= 4 &&
    value.teams.every(
      (team) =>
        isRecord(team) &&
        typeof team.name === 'string' &&
        (team.captainId === undefined ||
          (typeof team.captainId === 'string' &&
            Array.isArray(team.studentIds) &&
            team.studentIds.includes(team.captainId))) &&
        Array.isArray(team.studentIds) &&
        team.studentIds.every((id: unknown) => typeof id === 'string'),
    ) &&
    Array.isArray(value.seasons) &&
    value.seasons.length === 5 &&
    value.seasons.every(
      (season) =>
        isRecord(season) &&
        typeof season.bossId === 'string' &&
        typeof season.startDate === 'string' &&
        typeof season.endDate === 'string',
    )
  ))
    return false;
  const plan = value as unknown as Preparation;
  if (
    plan.currentSeasonIndex !== undefined &&
    (!Number.isInteger(plan.currentSeasonIndex) ||
      plan.currentSeasonIndex < 0 ||
      plan.currentSeasonIndex > 4)
  )
    return false;
  const ids = plan.students.map((student) => student.id);
  const assigned = plan.teams.flatMap((team) => team.studentIds);
  return (
    new Set(ids).size === ids.length &&
    new Set(assigned).size === assigned.length &&
    assigned.every((id) => ids.includes(id))
  );
}
function readRaw(key: string): unknown {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}
// Preserve legacy saved preparations in their original keys.
function migrateLegacy(value: unknown): Preparation {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.className !== 'string' ||
    !Array.isArray(value.teams) ||
    value.teams.length !== 3 ||
    !value.teams.every(
      (team) =>
        isRecord(team) &&
        typeof team.name === 'string' &&
        typeof team.roster === 'string',
    ) ||
    !Number.isInteger(value.seasonCount) ||
    Number(value.seasonCount) < 1 ||
    Number(value.seasonCount) > 5 ||
    !Array.isArray(value.seasons) ||
    value.seasons.length < Number(value.seasonCount) ||
    value.seasons.length > 5 ||
    !value.seasons.every(
      (season) =>
        isRecord(season) &&
        typeof season.bossId === 'string' &&
        typeof season.startDate === 'string' &&
        typeof season.endDate === 'string',
    )
  )
    throw new Error('이전 준비안을 읽을 수 없어요.');
  const students: StudentPlan[] = [];
  const teams: TeamPlan[] = value.teams.map((team) => {
    const studentIds = rosterNames(team.roster).map((name) => {
      const id = `${value.id}-student-${students.length + 1}`;
      students.push({ id, name });
      return id;
    });
    return { name: team.name, studentIds };
  });
  const plan: Preparation = {
    id: value.id,
    className: value.className,
    roster: students.map((student) => student.name).join('\n'),
    students,
    teams,
    seasonCount: Number(value.seasonCount),
    seasons: Array.from(
      { length: 5 },
      (_, index) =>
        (value.seasons as SeasonPlan[])[index] ?? {
          bossId: '',
          startDate: '',
          endDate: '',
        },
    ),
    teamsConfirmed: false,
    seasonsConfirmed: false,
  };
  plan.teamsConfirmed = Object.keys(validatePreparation(plan, 'teams')).length === 0;
  plan.seasonsConfirmed = Object.keys(validatePreparation(plan, 'seasons')).length === 0;
  return plan;
}
export function readDraft(): Preparation | null {
  const value = readRaw(DRAFT_KEY);
  if (value !== null) {
    if (!isPreparation(value)) throw new Error('작성 중인 명단을 읽을 수 없어요.');
    return value;
  }
  const legacy = readRaw(LEGACY_DRAFT_KEY);
  return legacy === null ? null : migrateLegacy(legacy);
}
export function writeDraft(plan: Preparation): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(plan));
}
export function readPreparations(): SavedPreparation[] {
  const current = readRaw(SAVED_KEY);
  if (
    current !== null &&
    (!Array.isArray(current) ||
      !current.every(
        (item: unknown) =>
          isPreparation(item) && isRecord(item) && typeof item.savedAt === 'string',
      ))
  )
    throw new Error('저장된 원정을 읽을 수 없어요.');
  const all = (current ?? []) as SavedPreparation[];
  const legacy = readRaw(LEGACY_SAVED_KEY);
  if (legacy !== null && !Array.isArray(legacy))
    throw new Error('이전 준비안을 읽을 수 없어요.');
  const migrated = ((legacy ?? []) as unknown[]).map((item) => {
    if (!isRecord(item) || typeof item.savedAt !== 'string')
      throw new Error('이전 준비안을 읽을 수 없어요.');
    return { ...migrateLegacy(item), savedAt: item.savedAt };
  });
  return [
    ...all,
    ...migrated.filter((item) => !all.some((saved) => saved.id === item.id)),
  ];
}
function persistPlan(plan: Preparation): SavedPreparation {
  if (!isPreparation(plan)) throw new Error('학생과 팀 정보를 다시 확인해 주세요.');
  const saved: SavedPreparation = {
    ...plan,
    className: plan.className.trim() || '우리 반 원정',
    savedAt: new Date().toISOString(),
  };
  const all = readPreparations();
  localStorage.setItem(
    SAVED_KEY,
    JSON.stringify([saved, ...all.filter((item) => item.id !== saved.id)]),
  );
  return saved;
}
export function savePreparation(plan: Preparation): SavedPreparation {
  if (Object.keys(validatePreparation(plan, 'class')).length)
    throw new Error('학생 명단을 확인해 주세요.');
  const names = rosterNames(plan.roster);
  const previous = plan.students.length
    ? plan
    : (readPreparations().find((item) => item.id === plan.id) ?? plan);
  const unchanged =
    previous.students.length === names.length &&
    previous.students.every((student, index) => student.name === names[index]);
  // A revised legacy draft must not keep invisible students or outdated team assignments.
  const students = unchanged
    ? previous.students
    : names.map((name) => ({ id: crypto.randomUUID(), name }));
  const saved = persistPlan({
    ...previous,
    className: plan.className,
    roster: plan.roster,
    students,
    teams: unchanged
      ? previous.teams
      : plan.teams.map((team) => ({ ...team, studentIds: [], captainId: undefined })),
    teamsConfirmed: unchanged && previous.teamsConfirmed,
    jumpers: unchanged ? previous.jumpers : plan.teams.map(() => []),
  });
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  } catch {
    /* Saved class is already durable. */
  }
  return saved;
}
export function saveGamePreparation(plan: Preparation): SavedPreparation {
  return persistPlan(plan);
}

export function mergeServerPreparations(
  incoming: SavedPreparation[],
): SavedPreparation[] {
  if (
    !incoming.every(
      (item) =>
        isPreparation(item) &&
        typeof item.savedAt === 'string' &&
        Number.isFinite(Date.parse(item.savedAt)),
    )
  )
    throw new Error('서버 원정 자료를 확인해 주세요.');
  const merged = new Map(readPreparations().map((item) => [item.id, item]));
  incoming.forEach((item) => {
    const local = merged.get(item.id);
    if (!local || Date.parse(item.savedAt) > Date.parse(local.savedAt))
      merged.set(item.id, item);
  });
  const result = [...merged.values()].sort(
    (left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt),
  );
  localStorage.setItem(SAVED_KEY, JSON.stringify(result));
  return result;
}
