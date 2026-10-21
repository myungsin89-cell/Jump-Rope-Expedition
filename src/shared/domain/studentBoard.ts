import type { Preparation } from '../../features/preparation/model';
export interface StudentHeroSlot {
  slot: number;
  revealed: boolean;
  heroId?: string;
}

export interface StudentHeroRevealEvent {
  eventId: string;
  slot: number;
  heroId: string;
  startedAt: string;
}

export interface StudentHeroSource {
  expeditionId: string;
  rewards: {
    id?: string;
    teamIndex: number;
    seasonIndex: number;
    heroId: string | null;
    revealedAt?: string;
  }[];
}

export interface StudentBoardData {
  version: 1;
  expeditionName: string;
  teamName: string;
  teamIndex: number;
  seasonNumber: number;
  publishedAt: string;
  members: { name: string; number: number; captain: boolean; jumper: boolean }[];
  heroes: StudentHeroSlot[];
  heroReveal?: StudentHeroRevealEvent;
}
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
const obj = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';
const name = (value: unknown, max = 60): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const integer = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
/** Reconstruct from allowlisted fields. Never forward teacher config, IDs, boss or strategy. */
export function studentBoardData(
  plan: Preparation,
  teamIndex: number,
  publishedAt = new Date().toISOString(),
  heroes?: StudentHeroSource,
): StudentBoardData {
  const team = plan.teams[teamIndex];
  if (!team) throw new Error('원정대를 찾을 수 없어요.');
  const teamRewards =
    heroes?.rewards.filter(
      (reward) =>
        reward.teamIndex === teamIndex &&
        reward.seasonIndex === (plan.currentSeasonIndex ?? 0) &&
        reward.heroId,
    ) ?? [];
  const latestReveal = teamRewards
    .map((reward, index) => ({ reward, slot: index + 1 }))
    .filter((item) => item.reward.revealedAt)
    .sort((left, right) =>
      String(right.reward.revealedAt).localeCompare(String(left.reward.revealedAt)),
    )[0];
  return {
    version: 1,
    expeditionName: plan.className,
    teamName: team.name,
    teamIndex,
    seasonNumber: (plan.currentSeasonIndex ?? 0) + 1,
    publishedAt,
    members: plan.students.flatMap((student, at) =>
      team.studentIds.includes(student.id)
        ? [
            {
              name: student.name,
              number: at + 1,
              captain: team.captainId === student.id,
              jumper: Boolean(
                plan.jumpers?.[teamIndex]?.some(
                  (choice) => choice.studentId === student.id,
                ),
              ),
            },
          ]
        : [],
    ),
    heroes: teamRewards.map((reward, index) => ({
      slot: index + 1,
      revealed: Boolean(reward.revealedAt),
      ...(reward.revealedAt && reward.heroId ? { heroId: reward.heroId } : {}),
    })),
    ...(latestReveal?.reward.heroId && latestReveal.reward.revealedAt
      ? {
          heroReveal: {
            eventId:
              latestReveal.reward.id ??
              `${teamIndex}:${latestReveal.slot}:${latestReveal.reward.revealedAt}`,
            slot: latestReveal.slot,
            heroId: latestReveal.reward.heroId,
            startedAt: latestReveal.reward.revealedAt,
          },
        }
      : {}),
  };
}

export function parseStudentHeroSource(
  value: unknown,
  expeditionId: string,
): StudentHeroSource {
  if (
    !obj(value) ||
    value.expeditionId !== expeditionId ||
    !Array.isArray(value.rewards) ||
    value.rewards.length > 600
  )
    throw new Error('영웅 게시 자료를 확인해 주세요.');
  const rewards = value.rewards.map((reward) => {
    if (
      !obj(reward) ||
      !integer(reward.teamIndex, 0, 3) ||
      !integer(reward.seasonIndex, 0, 4) ||
      !(
        reward.id === undefined ||
        (typeof reward.id === 'string' && reward.id.length > 0 && reward.id.length <= 320)
      ) ||
      !(
        reward.heroId === null ||
        (typeof reward.heroId === 'string' && /^H(0[1-9]|1[0-5])$/.test(reward.heroId))
      ) ||
      (reward.revealedAt !== undefined &&
        (typeof reward.revealedAt !== 'string' ||
          !Number.isFinite(Date.parse(reward.revealedAt))))
    )
      throw new Error('영웅 게시 자료를 확인해 주세요.');
    return {
      ...(typeof reward.id === 'string' ? { id: reward.id } : {}),
      teamIndex: reward.teamIndex,
      seasonIndex: reward.seasonIndex,
      heroId: reward.heroId,
      ...(typeof reward.revealedAt === 'string' ? { revealedAt: reward.revealedAt } : {}),
    };
  });
  return { expeditionId, rewards };
}
export function parseStudentBoard(value: unknown): StudentBoardData {
  if (
    !obj(value) ||
    value.version !== 1 ||
    !name(value.expeditionName) ||
    !name(value.teamName, 40) ||
    !integer(value.teamIndex, 0, 3) ||
    !integer(value.seasonNumber, 1, 5) ||
    typeof value.publishedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.publishedAt)) ||
    !Array.isArray(value.members) ||
    value.members.length > 200 ||
    (value.heroes !== undefined &&
      (!Array.isArray(value.heroes) || value.heroes.length > 15))
  )
    throw new Error('학생 화면 자료를 확인해 주세요.');
  const members = value.members.map((member) => {
    if (
      !obj(member) ||
      !name(member.name) ||
      !integer(member.number, 1, 200) ||
      typeof member.captain !== 'boolean' ||
      typeof member.jumper !== 'boolean'
    )
      throw new Error('대원 명단을 확인해 주세요.');
    return {
      name: member.name,
      number: member.number,
      captain: member.captain,
      jumper: member.jumper,
    };
  });
  if (new Set(members.map((member) => member.number)).size !== members.length)
    throw new Error('대원 번호를 확인해 주세요.');
  const heroes = (value.heroes ?? []).map((hero) => {
    if (
      !obj(hero) ||
      !integer(hero.slot, 1, 15) ||
      typeof hero.revealed !== 'boolean' ||
      (hero.revealed
        ? typeof hero.heroId !== 'string' || !/^H(0[1-9]|1[0-5])$/.test(hero.heroId)
        : hero.heroId !== undefined)
    )
      throw new Error('영웅 공개 자료를 확인해 주세요.');
    return {
      slot: hero.slot,
      revealed: hero.revealed,
      ...(hero.revealed ? { heroId: hero.heroId as string } : {}),
    };
  });
  if (new Set(heroes.map((hero) => hero.slot)).size !== heroes.length)
    throw new Error('영웅 카드 위치를 확인해 주세요.');
  let heroReveal: StudentHeroRevealEvent | undefined;
  if (value.heroReveal !== undefined) {
    const reveal = value.heroReveal;
    if (
      !obj(reveal) ||
      typeof reveal.eventId !== 'string' ||
      !reveal.eventId.length ||
      reveal.eventId.length > 320 ||
      !integer(reveal.slot, 1, 15) ||
      typeof reveal.heroId !== 'string' ||
      !/^H(0[1-9]|1[0-5])$/.test(reveal.heroId) ||
      typeof reveal.startedAt !== 'string' ||
      !Number.isFinite(Date.parse(reveal.startedAt)) ||
      !heroes.some(
        (hero) =>
          hero.slot === reveal.slot && hero.revealed && hero.heroId === reveal.heroId,
      )
    )
      throw new Error('영웅 공개 이벤트를 확인해 주세요.');
    heroReveal = {
      eventId: reveal.eventId,
      slot: reveal.slot,
      heroId: reveal.heroId,
      startedAt: reveal.startedAt,
    };
  }
  return {
    version: 1,
    expeditionName: value.expeditionName,
    teamName: value.teamName,
    teamIndex: value.teamIndex,
    seasonNumber: value.seasonNumber,
    publishedAt: value.publishedAt,
    members,
    heroes,
    ...(heroReveal ? { heroReveal } : {}),
  };
}
/** Minimal one-teacher backup validation; unknown fields are never stored or published. */
export function parseTeacherPreparation(value: unknown): Preparation {
  if (
    !obj(value) ||
    !isUuid(value.id) ||
    !name(value.className) ||
    !Array.isArray(value.students) ||
    value.students.length < 1 ||
    value.students.length > 200 ||
    !Array.isArray(value.teams) ||
    value.teams.length < 2 ||
    value.teams.length > 4 ||
    !integer(value.seasonCount, 1, 5) ||
    !Array.isArray(value.seasons) ||
    value.seasons.length !== 5
  )
    throw new Error('원정 자료 형식을 확인해 주세요.');
  const students = value.students.map((item) => {
    if (!obj(item) || !name(item.id, 100) || !name(item.name))
      throw new Error('학생 자료를 확인해 주세요.');
    return { id: item.id, name: item.name };
  });
  if (new Set(students.map((student) => student.id)).size !== students.length)
    throw new Error('학생 식별 정보가 중복됐어요.');
  const assigned = new Set<string>();
  const teams = value.teams.map((item) => {
    if (
      !obj(item) ||
      !name(item.name, 40) ||
      !Array.isArray(item.studentIds) ||
      !item.studentIds.every(
        (id) =>
          typeof id === 'string' &&
          students.some((student) => student.id === id) &&
          !assigned.has(id) &&
          Boolean(assigned.add(id)),
      )
    )
      throw new Error('원정대 편성을 확인해 주세요.');
    if (item.captainId !== undefined && !item.studentIds.includes(item.captainId))
      throw new Error('원정대장을 확인해 주세요.');
    return {
      name: item.name,
      studentIds: item.studentIds as string[],
      ...(typeof item.captainId === 'string' ? { captainId: item.captainId } : {}),
    };
  });
  const seasons = value.seasons.map((item) => {
    if (
      !obj(item) ||
      typeof item.bossId !== 'string' ||
      !/^$|^BOSS_0[1-5]$/.test(item.bossId) ||
      typeof item.startDate !== 'string' ||
      !/^$|^\d{4}-\d{2}-\d{2}$/.test(item.startDate) ||
      typeof item.endDate !== 'string' ||
      !/^$|^\d{4}-\d{2}-\d{2}$/.test(item.endDate)
    )
      throw new Error('시즌 자료를 확인해 주세요.');
    return { bossId: item.bossId, startDate: item.startDate, endDate: item.endDate };
  });
  const jumpers = teams.map((team, index) => {
    const choices = Array.isArray(value.jumpers) ? value.jumpers[index] : [];
    if (!Array.isArray(choices) || choices.length > 2)
      throw new Error('도전점퍼를 확인해 주세요.');
    return choices.flatMap((choice) => {
      if (
        !obj(choice) ||
        typeof choice.studentId !== 'string' ||
        !integer(choice.multiplier, 1, 3)
      )
        throw new Error('도전점퍼를 확인해 주세요.');
      return team.studentIds.includes(choice.studentId)
        ? [{ studentId: choice.studentId, multiplier: choice.multiplier as 1 | 2 | 3 }]
        : [];
    });
  });
  const currentSeasonIndex = integer(value.currentSeasonIndex, 0, value.seasonCount - 1)
    ? value.currentSeasonIndex
    : 0;
  return {
    id: value.id,
    className: value.className,
    students,
    roster: students.map((student) => student.name).join('\n'),
    teams,
    seasonCount: value.seasonCount,
    seasons,
    jumpers,
    currentSeasonIndex,
    teamsConfirmed: value.teamsConfirmed === true,
    seasonsConfirmed: value.seasonsConfirmed === true,
  };
}
