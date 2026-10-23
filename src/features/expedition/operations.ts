import { assignStudents, readySeasonIndices } from '../preparation/model';
import type { JumperSetting, Preparation } from '../preparation/model';
import type { PracticeStore, SavedPractice } from '../matches/practiceModel';
import { practiceInputs, seasonBestInputs } from '../matches/practiceModel';
import { calculateMatchPreview } from '../../shared/domain/matchScoring';

export type OperationPanel = 'overview' | 'roster' | 'seasons';
export const operationHref = (id: string, panel: OperationPanel = 'overview') =>
  `#/preparations/${id}${panel === 'overview' ? '' : `/${panel}`}`;
export function currentSeasonIndex(plan: Preparation): number {
  if (plan.currentSeasonIndex !== undefined && plan.currentSeasonIndex < plan.seasonCount)
    return plan.currentSeasonIndex;
  return readySeasonIndices(plan)[0] ?? 0;
}
export function hasPracticeInputs(store: PracticeStore): boolean {
  return (
    store.history.length > 0 ||
    Boolean(
      store.draft?.teams.some(
        (team) => team.raw.trim() || team.jumpers.some((jumper) => jumper.actual.trim()),
      ),
    )
  );
}
export function resizeTeams(
  plan: Preparation,
  count: number,
  store: PracticeStore,
  hasMedalAwards = false,
): Preparation {
  if (![2, 3, 4].includes(count)) throw new Error('원정대는 2~4개로 정해 주세요.');
  if (count === plan.teams.length) return plan;
  if (hasPracticeInputs(store) || hasMedalAwards)
    throw new Error(
      '기존 기록을 보호하기 위해 기록이 있는 원정의 원정대 수 변경은 아직 지원하지 않아요. 명단 배정과 이름은 수정할 수 있어요.',
    );
  return {
    ...plan,
    teamsConfirmed: false,
    teams: Array.from(
      { length: count },
      (_, index) => plan.teams[index] ?? { name: `${index + 1} 원정대`, studentIds: [] },
    ),
    jumpers: Array.from({ length: count }, (_, index) => plan.jumpers?.[index] ?? []),
  };
}
export function moveStudent(
  plan: Preparation,
  studentId: string,
  teamIndex: number | null,
): Preparation {
  const current = plan.teams.findIndex((team) => team.studentIds.includes(studentId));
  if (current === (teamIndex ?? -1)) return plan;
  return assignStudents(plan, [studentId], teamIndex);
}
export function arrangeTeam(
  plan: Preparation,
  teamIndex: number,
  studentIds: string[],
): Preparation {
  if (!plan.teams[teamIndex]) throw new Error('편성할 원정대를 확인해 주세요.');
  const selected = new Set(studentIds);
  const removed = plan.teams[teamIndex].studentIds.filter((id) => !selected.has(id));
  // One atomic save; students removed from this roster wait for reassignment.
  return assignStudents(assignStudents(plan, removed, null), studentIds, teamIndex);
}
export function setJumper(
  plan: Preparation,
  studentId: string,
  enabled: boolean,
  multiplier: 1 | 2 | 3 = 1,
): Preparation {
  const teamIndex = plan.teams.findIndex((team) => team.studentIds.includes(studentId));
  if (teamIndex < 0) throw new Error('먼저 학생을 원정대에 배정해 주세요.');
  // Earlier setup drafts may contain empty placeholder choices. They must not occupy a slot.
  const choices = (plan.jumpers?.[teamIndex] ?? []).filter(
    (choice, index, values) =>
      plan.teams[teamIndex].studentIds.includes(choice.studentId) &&
      values.findIndex((item) => item.studentId === choice.studentId) === index,
  );
  const existing = choices.find((choice) => choice.studentId === studentId);
  if (enabled && !existing && choices.length >= 2)
    throw new Error(
      '한 원정대의 도전점퍼는 최대 2명이에요. 기존 지정을 해제한 뒤 선택해 주세요.',
    );
  const next: JumperSetting[] = enabled
    ? [
        ...choices.filter((choice) => choice.studentId !== studentId),
        { studentId, multiplier },
      ]
    : choices.filter((choice) => choice.studentId !== studentId);
  return {
    ...plan,
    jumpers: plan.teams.map((_, index) =>
      index === teamIndex ? next : (plan.jumpers?.[index] ?? []),
    ),
  };
}
export function previewHistory(history: SavedPractice[], seasonIndex: number) {
  const activeHistory = history.filter(
    (entry) => Boolean(entry.official) && !entry.official?.voidedAt,
  );
  const entries = activeHistory.filter((entry) => entry.seasonIndex === seasonIndex);
  const points = new Map<string, number | null>();
  let latest: ReturnType<typeof calculateMatchPreview> = [];
  activeHistory.forEach((entry, index) => {
    const results = calculateMatchPreview(
      practiceInputs(entry),
      seasonBestInputs(activeHistory.slice(0, index), entry.seasonIndex, entry.id),
    );
    if (entry.seasonIndex !== seasonIndex) return;
    latest = results;
    entry.official!.awards.forEach((award) => {
      const sum = points.get(award.teamKey);
      points.set(award.teamKey, sum === null ? null : (sum ?? 0) + award.points);
    });
  });
  return { entries, latest, points };
}
