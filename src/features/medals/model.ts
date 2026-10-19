import type { Preparation } from '../preparation/model';
import { readySeasonIndices } from '../preparation/model';
import { currentSeasonIndex } from '../expedition/operations';

export const medalSymbols = ['star', 'leaf', 'heart', 'flag'] as const;
export type MedalSymbol = (typeof medalSymbols)[number];
export interface MedalDefinition {
  id: string;
  name: string;
  description: string;
  symbol: MedalSymbol;
  image: string;
  active: boolean;
}
export interface MedalAward {
  id: string;
  medalId: string;
  medal: MedalDefinition;
  studentId: string;
  studentName: string;
  teamKey: string;
  teamName: string;
  seasonIndex: number;
  awardedAt: string;
  actor: 'local-teacher';
}
export interface MedalPointEntry {
  awardId: string;
  teamKey: string;
  seasonIndex: number;
  delta: 10;
}
export interface MedalStore {
  version: 1;
  expeditionId: string;
  definitions: MedalDefinition[];
  awards: MedalAward[];
  entries: MedalPointEntry[];
}
export const medalKey = (id: string) => `jre.practice-medals.v1.${id}`;
const emptyStore = (id: string): MedalStore => ({
  version: 1,
  expeditionId: id,
  definitions: [],
  awards: [],
  entries: [],
});
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';
const text = (value: unknown): value is string => typeof value === 'string';
export const validMedalImage = (value: unknown): value is string =>
  text(value) &&
  (value === '' ||
    (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value) &&
      value.length <= 280000));
function definition(value: unknown): value is MedalDefinition {
  return (
    object(value) &&
    text(value.id) &&
    value.id.length > 0 &&
    text(value.name) &&
    value.name.trim().length > 0 &&
    value.name.length <= 40 &&
    text(value.description) &&
    value.description.length <= 300 &&
    medalSymbols.includes(value.symbol as MedalSymbol) &&
    validMedalImage(value.image) &&
    typeof value.active === 'boolean'
  );
}
const season = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) < 5;
export function readMedals(id: string): MedalStore {
  const raw = localStorage.getItem(medalKey(id));
  if (raw === null) return emptyStore(id);
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !object(value) ||
      value.version !== 1 ||
      value.expeditionId !== id ||
      !Array.isArray(value.definitions) ||
      !Array.isArray(value.awards) ||
      !Array.isArray(value.entries)
    )
      throw new Error();
    if (
      !value.definitions.every(definition) ||
      new Set(value.definitions.map((item) => item.id)).size !== value.definitions.length
    )
      throw new Error();
    const definitions = value.definitions;
    if (
      !value.awards.every(
        (award) =>
          object(award) &&
          text(award.id) &&
          award.id.length > 0 &&
          text(award.medalId) &&
          definition(award.medal) &&
          award.medal.id === award.medalId &&
          definitions.some((item) => item.id === award.medalId) &&
          text(award.studentId) &&
          award.studentId.length > 0 &&
          text(award.studentName) &&
          text(award.teamKey) &&
          /^team-[0-3]$/.test(award.teamKey) &&
          text(award.teamName) &&
          season(award.seasonIndex) &&
          text(award.awardedAt) &&
          Number.isFinite(Date.parse(award.awardedAt)) &&
          award.actor === 'local-teacher',
      )
    )
      throw new Error();
    const awards = value.awards as unknown as MedalAward[];
    if (
      new Set(awards.map((award) => award.id)).size !== awards.length ||
      value.entries.length !== awards.length
    )
      throw new Error();
    if (
      !value.entries.every(
        (entry) =>
          object(entry) &&
          text(entry.awardId) &&
          entry.delta === 10 &&
          awards.some(
            (award) =>
              award.id === entry.awardId &&
              award.teamKey === entry.teamKey &&
              award.seasonIndex === entry.seasonIndex,
          ),
      ) ||
      new Set(value.entries.map((entry) => entry.awardId)).size !== awards.length
    )
      throw new Error();
    return value as unknown as MedalStore;
  } catch {
    throw new Error(
      '훈장 기록을 읽을 수 없어요. 원본은 보존했어요. 다른 저장 내용을 확인해 주세요.',
    );
  }
}
function commit(store: MedalStore): MedalStore {
  // One write keeps the award and its +10 entry together. Local prototype, not server authority.
  localStorage.setItem(medalKey(store.expeditionId), JSON.stringify(store));
  return store;
}
export function saveMedal(id: string, input: MedalDefinition): MedalStore {
  const store = readMedals(id);
  const next = {
    ...input,
    name: input.name.trim(),
    description: input.description.trim(),
  };
  if (!definition(next))
    throw new Error(
      '훈장 이름은 40자, 설명은 300자 이내로 입력하고 올바른 아이콘이나 이미지를 골라 주세요.',
    );
  if (store.definitions.some((item) => item.id !== next.id && item.name === next.name))
    throw new Error('같은 이름의 훈장이 있어요. 다른 이름을 입력해 주세요.');
  return commit({
    ...store,
    definitions: [...store.definitions.filter((item) => item.id !== next.id), next],
  });
}
export function awardBlockReason(plan: Preparation, studentId: string): string {
  if (!plan.students.some((student) => student.id === studentId))
    return '학생 명단을 확인해 주세요.';
  if (!plan.teams.some((team) => team.studentIds.includes(studentId)))
    return '먼저 학생을 원정대에 편성해 주세요. 미배정 학생의 포인트 귀속은 아직 정하지 않았어요.';
  if (!readySeasonIndices(plan).includes(currentSeasonIndex(plan)))
    return '먼저 시즌 설정에서 기록할 시즌을 준비해 주세요. 시즌이 없는 수여의 포인트 귀속은 아직 정하지 않았어요.';
  return '';
}
export function awardMedal(
  plan: Preparation,
  studentId: string,
  medalId: string,
  requestId: string,
): MedalStore {
  const store = readMedals(plan.id);
  const existing = store.awards.find((award) => award.id === requestId);
  if (existing) {
    if (existing.studentId !== studentId || existing.medalId !== medalId)
      throw new Error('이미 사용한 수여 요청이에요. 상세창을 다시 열어 주세요.');
    return store; // Replaying one request never grants points twice.
  }
  const blocked = awardBlockReason(plan, studentId);
  if (blocked) throw new Error(blocked);
  if (!requestId.trim()) throw new Error('수여 요청을 확인해 주세요.');
  const medal = store.definitions.find((item) => item.id === medalId && item.active);
  if (!medal)
    throw new Error('수여할 훈장을 선택해 주세요. 사용 중지한 훈장은 새로 줄 수 없어요.');
  const student = plan.students.find((item) => item.id === studentId)!;
  const index = plan.teams.findIndex((team) => team.studentIds.includes(studentId));
  const team = plan.teams[index];
  const award: MedalAward = {
    id: requestId,
    medalId,
    medal: { ...medal },
    studentId,
    studentName: student.name,
    teamKey: `team-${index}`,
    teamName: team.name,
    seasonIndex: currentSeasonIndex(plan),
    awardedAt: new Date().toISOString(),
    actor: 'local-teacher',
  };
  return commit({
    ...store,
    awards: [...store.awards, award],
    entries: [
      ...store.entries,
      {
        awardId: requestId,
        teamKey: award.teamKey,
        seasonIndex: award.seasonIndex,
        delta: 10,
      },
    ],
  });
}
export function medalPoints(
  store: MedalStore,
  teamIndex: number,
  seasonIndex: number,
): number {
  return store.entries
    .filter(
      (entry) =>
        entry.teamKey === `team-${teamIndex}` && entry.seasonIndex === seasonIndex,
    )
    .reduce((sum, entry) => sum + entry.delta, 0);
}
export function companionProgress(store: MedalStore, teamIndex: number) {
  const distinct = new Set(
    store.awards
      .filter((award) => award.teamKey === `team-${teamIndex}`)
      .map((award) => award.studentId),
  ).size;
  return {
    distinct,
    earned: Math.floor(distinct / 4),
    next: (Math.floor(distinct / 4) + 1) * 4,
  };
}
export function studentMedals(store: MedalStore, studentId: string) {
  const groups = new Map<string, { medal: MedalDefinition; awards: MedalAward[] }>();
  store.awards
    .filter((award) => award.studentId === studentId)
    .forEach((award) => {
      const group = groups.get(award.medalId) ?? { medal: award.medal, awards: [] };
      group.awards.push(award);
      groups.set(award.medalId, group);
    });
  return [...groups.values()];
}
