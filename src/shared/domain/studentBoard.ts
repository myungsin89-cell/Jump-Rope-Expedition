import type { Preparation } from '../../features/preparation/model';
import type { MedalStore, MedalSymbol } from '../../features/medals/model';
import type { PracticeStore } from '../../features/matches/practiceModel';
import type { EconomyStore } from '../../features/economy/model';

export const STUDENT_HERO_MISSION_NAMES = {
  FIVE_STEPS: '다섯 계단',
  SHINING_CHALLENGE: '빛나는 도전',
  SHINING_COMPANIONS: '빛나는 동료들',
  STEADY_STEPS: '꾸준한 발걸음',
  COMEBACK: '다시 일어선 원정대',
  FOUR_FORCES: '네 가지 힘',
} as const;

export type StudentHeroMissionId = keyof typeof STUDENT_HERO_MISSION_NAMES;

export const studentHeroMissionName = (value: unknown): string | undefined =>
  typeof value === 'string' && value in STUDENT_HERO_MISSION_NAMES
    ? STUDENT_HERO_MISSION_NAMES[value as StudentHeroMissionId]
    : undefined;

export interface StudentHeroSlot {
  slot: number;
  revealed: boolean;
  heroId?: string;
  missionName?: string;
}

export interface StudentHeroRevealEvent {
  eventId: string;
  slot: number;
  heroId: string;
  startedAt: string;
  missionName?: string;
}

export interface StudentBoardEvent {
  id: string;
  type: 'hero';
  missionName: string;
  occurredAt: string;
}

export interface StudentHeroSource {
  expeditionId: string;
  rewards: {
    id?: string;
    teamIndex: number;
    seasonIndex: number;
    heroId: string | null;
    missionId?: StudentHeroMissionId;
    achievedAt?: string;
    revealedAt?: string;
  }[];
}

export interface StudentBoardMedal {
  name: string;
  description: string;
  symbol: MedalSymbol;
  color: string;
  awardedAt: string;
}

export interface StudentGrowthRecord {
  seasonNumber: number;
  recordedAt: string;
  count: number;
}

export interface StudentBoardMember {
  name: string;
  number: number;
  captain: boolean;
  jumper: boolean;
  medals: StudentBoardMedal[];
  growth: StudentGrowthRecord[];
}

export interface StudentBoardTeam {
  name: string;
  teamIndex: number;
  members: StudentBoardMember[];
}

export interface StudentBoardSources {
  heroes?: StudentHeroSource;
  medals?: MedalStore;
  practice?: PracticeStore;
  economy?: EconomyStore;
}

export interface StudentBoardEconomy {
  earnedPoints: number;
  teacherSpentPoints: number;
  balance: number;
  inventory: Record<'UNIT_01' | 'UNIT_02' | 'UNIT_03' | 'UNIT_04', number>;
  hintPurchased: boolean;
  hint?: string;
}

export interface StudentBoardData {
  version: 1;
  expeditionName: string;
  teamName: string;
  teamIndex: number;
  seasonNumber: number;
  publishedAt: string;
  members: StudentBoardMember[];
  teams: StudentBoardTeam[];
  heroes: StudentHeroSlot[];
  events: StudentBoardEvent[];
  economy?: StudentBoardEconomy;
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
const date = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

export function parseStudentMedalSource(
  value: unknown,
  expeditionId: string,
): MedalStore {
  if (
    !obj(value) ||
    value.version !== 1 ||
    value.expeditionId !== expeditionId ||
    !Array.isArray(value.definitions) ||
    value.definitions.length > 200 ||
    !Array.isArray(value.awards) ||
    value.awards.length > 2_000 ||
    !Array.isArray(value.entries) ||
    value.entries.length > 2_000
  )
    throw new Error('훈장 게시 자료를 확인해 주세요.');
  const definitions = value.definitions.map((definition) => {
    if (
      !obj(definition) ||
      !name(definition.id, 200) ||
      !name(definition.name, 40) ||
      typeof definition.description !== 'string' ||
      definition.description.length > 300 ||
      !['star', 'leaf', 'heart', 'flag'].includes(String(definition.symbol)) ||
      (definition.color !== undefined &&
        (typeof definition.color !== 'string' ||
          !/^#[0-9a-f]{6}$/i.test(definition.color))) ||
      typeof definition.active !== 'boolean'
    )
      throw new Error('훈장 게시 자료를 확인해 주세요.');
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      symbol: definition.symbol as MedalSymbol,
      image: '',
      ...(typeof definition.color === 'string' ? { color: definition.color } : {}),
      active: definition.active,
    };
  });
  const awards = value.awards.map((award) => {
    if (
      !obj(award) ||
      !name(award.studentId, 200) ||
      !date(award.awardedAt) ||
      !obj(award.medal) ||
      !name(award.medal.name, 40) ||
      typeof award.medal.description !== 'string' ||
      award.medal.description.length > 300 ||
      !['star', 'leaf', 'heart', 'flag'].includes(String(award.medal.symbol)) ||
      (award.medal.color !== undefined &&
        (typeof award.medal.color !== 'string' ||
          !/^#[0-9a-f]{6}$/i.test(award.medal.color)))
    )
      throw new Error('훈장 게시 자료를 확인해 주세요.');
    return {
      id: name(award.id, 200) ? award.id : `${award.studentId}:${award.awardedAt}`,
      medalId: name(award.medalId, 200) ? award.medalId : award.medal.name,
      medal: {
        id: name(award.medal.id, 200) ? award.medal.id : award.medal.name,
        name: award.medal.name,
        description: award.medal.description,
        symbol: award.medal.symbol as MedalSymbol,
        image: '',
        ...(typeof award.medal.color === 'string' ? { color: award.medal.color } : {}),
        active: true,
      },
      studentId: award.studentId,
      studentName: typeof award.studentName === 'string' ? award.studentName : '',
      teamKey: typeof award.teamKey === 'string' ? award.teamKey : '',
      teamName: typeof award.teamName === 'string' ? award.teamName : '',
      seasonIndex: integer(award.seasonIndex, 0, 4) ? award.seasonIndex : 0,
      awardedAt: award.awardedAt,
      actor: 'local-teacher' as const,
    };
  });
  const entries = value.entries.map((entry) => {
    if (
      !obj(entry) ||
      !name(entry.awardId, 200) ||
      typeof entry.teamKey !== 'string' ||
      !/^team-[0-3]$/.test(entry.teamKey) ||
      !integer(entry.seasonIndex, 0, 4) ||
      entry.delta !== 10
    )
      throw new Error('훈장 점수 자료를 확인해 주세요.');
    return {
      awardId: entry.awardId,
      teamKey: entry.teamKey,
      seasonIndex: entry.seasonIndex,
      delta: 10 as const,
    };
  });
  return { version: 1, expeditionId, definitions, awards, entries };
}

export function parseStudentPracticeSource(
  value: unknown,
  expeditionId: string,
): PracticeStore {
  if (
    !obj(value) ||
    value.version !== 1 ||
    value.classId !== expeditionId ||
    !Array.isArray(value.history) ||
    value.history.length > 100
  )
    throw new Error('성장 기록 게시 자료를 확인해 주세요.');
  const history = value.history.map((record, recordIndex) => {
    if (
      !obj(record) ||
      !integer(record.seasonIndex, 0, 4) ||
      !date(record.savedAt) ||
      !Array.isArray(record.teams) ||
      record.teams.length > 4
    )
      throw new Error('성장 기록 게시 자료를 확인해 주세요.');
    const teams = record.teams.map((team, teamIndex) => {
      if (!obj(team) || !Array.isArray(team.jumpers) || team.jumpers.length > 2)
        throw new Error('성장 기록 게시 자료를 확인해 주세요.');
      const jumpers = team.jumpers.map((jumper) => {
        if (
          !obj(jumper) ||
          !name(jumper.studentId, 200) ||
          typeof jumper.actual !== 'string' ||
          !/^\d+$/.test(jumper.actual) ||
          ![1, 2, 3].includes(Number(jumper.multiplier))
        )
          throw new Error('성장 기록 게시 자료를 확인해 주세요.');
        return {
          studentId: jumper.studentId,
          multiplier: jumper.multiplier as 1 | 2 | 3,
          actual: jumper.actual,
        };
      });
      return {
        key: `team-${teamIndex}`,
        name: typeof team.name === 'string' ? team.name : '',
        members: [],
        raw: typeof team.raw === 'string' ? team.raw : '0',
        jumpers,
      };
    });
    let official;
    if (record.official !== undefined) {
      if (!obj(record.official) || !Array.isArray(record.official.awards))
        throw new Error('공식 점수 게시 자료를 확인해 주세요.');
      const awards = record.official.awards.map((award) => {
        if (
          !obj(award) ||
          typeof award.teamKey !== 'string' ||
          !/^team-[0-3]$/.test(award.teamKey) ||
          !integer(award.points, 0, 10_000_000)
        )
          throw new Error('공식 점수 게시 자료를 확인해 주세요.');
        return { teamKey: award.teamKey, points: award.points };
      });
      official = {
        confirmedAt: date(record.official.confirmedAt)
          ? record.official.confirmedAt
          : record.savedAt,
        awards,
        ...(date(record.official.voidedAt) ? { voidedAt: record.official.voidedAt } : {}),
      };
    }
    return {
      id: typeof record.id === 'string' ? record.id : `published-${recordIndex}`,
      classId: expeditionId,
      seasonIndex: record.seasonIndex,
      locked: true,
      teams,
      savedAt: record.savedAt,
      ...(official ? { official } : {}),
    };
  });
  return { version: 1, classId: expeditionId, draft: null, history };
}

export function parseStudentEconomySource(
  value: unknown,
  expeditionId: string,
): EconomyStore {
  if (
    !obj(value) ||
    value.version !== 1 ||
    value.expeditionId !== expeditionId ||
    !Array.isArray(value.purchases) ||
    value.purchases.length > 5_000 ||
    !Array.isArray(value.reversals) ||
    value.reversals.length > 5_000
  )
    throw new Error('상점 게시 자료를 확인해 주세요.');
  const itemIds = ['UNIT_01', 'UNIT_02', 'UNIT_03', 'UNIT_04', 'BOSS_HINT'];
  const purchases = value.purchases.map((purchase) => {
    if (
      !obj(purchase) ||
      !name(purchase.id, 200) ||
      typeof purchase.teamKey !== 'string' ||
      !/^team-[0-3]$/.test(purchase.teamKey) ||
      !integer(purchase.seasonIndex, 0, 4) ||
      !itemIds.includes(String(purchase.itemId)) ||
      purchase.price !== (purchase.itemId === 'BOSS_HINT' ? 100 : 30) ||
      !date(purchase.purchasedAt) ||
      !['local-team', 'student-board'].includes(String(purchase.actor))
    )
      throw new Error('상점 게시 자료를 확인해 주세요.');
    return purchase;
  });
  const reversals = value.reversals.map((reversal) => {
    if (!obj(reversal) || !name(reversal.purchaseId, 200))
      throw new Error('구매 복구 게시 자료를 확인해 주세요.');
    return reversal;
  });
  return {
    version: 1,
    expeditionId,
    purchases: purchases as unknown as EconomyStore['purchases'],
    reversals: reversals as unknown as EconomyStore['reversals'],
  };
}
/** Reconstruct from allowlisted fields. Never forward teacher config, IDs, boss or strategy. */
export function studentBoardData(
  plan: Preparation,
  teamIndex: number,
  publishedAt = new Date().toISOString(),
  sources: StudentBoardSources = {},
): StudentBoardData {
  const team = plan.teams[teamIndex];
  if (!team) throw new Error('원정대를 찾을 수 없어요.');
  const teamRewards =
    sources.heroes?.rewards.filter(
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
  const events = teamRewards
    .flatMap((reward, index) => {
      const missionName = reward.missionId
        ? STUDENT_HERO_MISSION_NAMES[reward.missionId]
        : undefined;
      const occurredAt = reward.achievedAt ?? reward.revealedAt;
      return missionName && occurredAt
        ? [
            {
              id: reward.id ?? `${teamIndex}:${index + 1}:${occurredAt}`,
              type: 'hero' as const,
              missionName,
              occurredAt,
            },
          ]
        : [];
    })
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 12);
  const seasonIndex = plan.currentSeasonIndex ?? 0;
  const teamKey = `team-${teamIndex}`;
  const matchPoints =
    sources.practice?.history
      .filter(
        (entry) =>
          entry.seasonIndex === seasonIndex &&
          Boolean(entry.official) &&
          !entry.official?.voidedAt,
      )
      .flatMap((entry) => entry.official?.awards ?? [])
      .filter((award) => award.teamKey === teamKey)
      .reduce((sum, award) => sum + award.points, 0) ?? 0;
  const medalPoints =
    sources.medals?.entries
      .filter((entry) => entry.teamKey === teamKey && entry.seasonIndex === seasonIndex)
      .reduce((sum, entry) => sum + entry.delta, 0) ?? 0;
  const reversed = new Set(
    sources.economy?.reversals.map((entry) => entry.purchaseId) ?? [],
  );
  const purchases =
    sources.economy?.purchases.filter(
      (purchase) =>
        purchase.teamKey === teamKey &&
        purchase.seasonIndex === seasonIndex &&
        purchase.actor !== 'student-board' &&
        !reversed.has(purchase.id),
    ) ?? [];
  const unitIds = ['UNIT_01', 'UNIT_02', 'UNIT_03', 'UNIT_04'] as const;
  const hintText: Record<string, string> = {
    BOSS_01: '상대는 물리 공격을 주로 사용해요. 잎사귀 수호자가 방어에 유리해요.',
    BOSS_02: '상대는 마법 공격을 주로 사용해요. 별빛 요정이 방어에 유리해요.',
    BOSS_03: '상대는 마법 공격을 주로 사용해요. 별빛 요정이 방어에 유리해요.',
    BOSS_04: '상대는 물리 공격을 주로 사용해요. 잎사귀 수호자가 방어에 유리해요.',
    BOSS_05:
      '상대는 물리와 마법 공격을 고르게 사용해요. 두 방어 병력을 균형 있게 준비해요.',
  };
  const earnedPoints = matchPoints + medalPoints;
  const teacherSpentPoints = purchases.reduce((sum, purchase) => sum + purchase.price, 0);
  const hintPurchased = purchases.some((purchase) => purchase.itemId === 'BOSS_HINT');
  const economy = sources.economy
    ? {
        earnedPoints,
        teacherSpentPoints,
        balance: earnedPoints - teacherSpentPoints,
        inventory: Object.fromEntries(
          unitIds.map((unitId) => [
            unitId,
            purchases.filter((purchase) => purchase.itemId === unitId).length,
          ]),
        ) as StudentBoardEconomy['inventory'],
        hintPurchased,
        ...(hintPurchased
          ? {
              hint:
                hintText[plan.seasons[seasonIndex]?.bossId] ?? '힌트를 확인할 수 없어요.',
            }
          : {}),
      }
    : undefined;
  const boardTeams = plan.teams.map((boardTeam, boardTeamIndex) => ({
    name: boardTeam.name,
    teamIndex: boardTeamIndex,
    members: plan.students.flatMap((student, at) => {
      if (!boardTeam.studentIds.includes(student.id)) return [];
      const medals =
        sources.medals?.awards
          .filter((award) => award.studentId === student.id)
          .map((award) => {
            const current = sources.medals?.definitions.find(
              (definition) => definition.id === award.medalId,
            );
            return {
              name: award.medal.name,
              description: award.medal.description,
              symbol: award.medal.symbol,
              color: current?.color ?? award.medal.color ?? '#2d6a4f',
              awardedAt: award.awardedAt,
            };
          }) ?? [];
      const growth =
        sources.practice?.history
          .filter((entry) => Boolean(entry.official) && !entry.official?.voidedAt)
          .flatMap((entry) =>
            entry.teams.flatMap((matchTeam) =>
              matchTeam.jumpers
                .filter((choice) => choice.studentId === student.id)
                .map((choice) => ({
                  seasonNumber: entry.seasonIndex + 1,
                  recordedAt: entry.savedAt,
                  count: Number(choice.actual),
                })),
            ),
          ) ?? [];
      return [
        {
          name: student.name,
          number: at + 1,
          captain: boardTeam.captainId === student.id,
          jumper: Boolean(
            plan.jumpers?.[boardTeamIndex]?.some(
              (choice) => choice.studentId === student.id,
            ),
          ),
          medals,
          growth,
        },
      ];
    }),
  }));
  return {
    version: 1,
    expeditionName: plan.className,
    teamName: team.name,
    teamIndex,
    seasonNumber: (plan.currentSeasonIndex ?? 0) + 1,
    publishedAt,
    members: boardTeams[teamIndex].members,
    teams: boardTeams,
    heroes: teamRewards.map((reward, index) => ({
      slot: index + 1,
      revealed: Boolean(reward.revealedAt),
      ...(reward.revealedAt && reward.heroId ? { heroId: reward.heroId } : {}),
      ...(reward.missionId
        ? { missionName: STUDENT_HERO_MISSION_NAMES[reward.missionId] }
        : {}),
    })),
    events,
    ...(economy ? { economy } : {}),
    ...(latestReveal?.reward.heroId && latestReveal.reward.revealedAt
      ? {
          heroReveal: {
            eventId:
              latestReveal.reward.id ??
              `${teamIndex}:${latestReveal.slot}:${latestReveal.reward.revealedAt}`,
            slot: latestReveal.slot,
            heroId: latestReveal.reward.heroId,
            startedAt: latestReveal.reward.revealedAt,
            ...(latestReveal.reward.missionId
              ? {
                  missionName: STUDENT_HERO_MISSION_NAMES[latestReveal.reward.missionId],
                }
              : {}),
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
      !(
        reward.missionId === undefined ||
        (typeof reward.missionId === 'string' &&
          reward.missionId in STUDENT_HERO_MISSION_NAMES)
      ) ||
      (reward.revealedAt !== undefined &&
        (typeof reward.revealedAt !== 'string' ||
          !Number.isFinite(Date.parse(reward.revealedAt)))) ||
      (reward.achievedAt !== undefined &&
        (typeof reward.achievedAt !== 'string' ||
          !Number.isFinite(Date.parse(reward.achievedAt))))
    )
      throw new Error('영웅 게시 자료를 확인해 주세요.');
    return {
      ...(typeof reward.id === 'string' ? { id: reward.id } : {}),
      teamIndex: reward.teamIndex,
      seasonIndex: reward.seasonIndex,
      heroId: reward.heroId,
      ...(typeof reward.missionId === 'string'
        ? { missionId: reward.missionId as StudentHeroMissionId }
        : {}),
      ...(typeof reward.achievedAt === 'string' ? { achievedAt: reward.achievedAt } : {}),
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
      (!Array.isArray(value.heroes) || value.heroes.length > 15)) ||
    (value.events !== undefined &&
      (!Array.isArray(value.events) || value.events.length > 30))
  )
    throw new Error('학생 화면 자료를 확인해 주세요.');
  const parseMember = (member: unknown): StudentBoardMember => {
    if (
      !obj(member) ||
      !name(member.name) ||
      !integer(member.number, 1, 200) ||
      typeof member.captain !== 'boolean' ||
      typeof member.jumper !== 'boolean' ||
      (member.medals !== undefined && !Array.isArray(member.medals)) ||
      (member.growth !== undefined && !Array.isArray(member.growth))
    )
      throw new Error('대원 명단을 확인해 주세요.');
    const medals = (member.medals ?? []).map((medal) => {
      if (
        !obj(medal) ||
        !name(medal.name, 40) ||
        typeof medal.description !== 'string' ||
        medal.description.length > 300 ||
        !['star', 'leaf', 'heart', 'flag'].includes(String(medal.symbol)) ||
        typeof medal.color !== 'string' ||
        !/^#[0-9a-f]{6}$/i.test(medal.color) ||
        typeof medal.awardedAt !== 'string' ||
        !Number.isFinite(Date.parse(medal.awardedAt))
      )
        throw new Error('훈장 기록을 확인해 주세요.');
      return {
        name: medal.name,
        description: medal.description,
        symbol: medal.symbol as MedalSymbol,
        color: medal.color,
        awardedAt: medal.awardedAt,
      };
    });
    const growth = (member.growth ?? []).map((record) => {
      if (
        !obj(record) ||
        !integer(record.seasonNumber, 1, 5) ||
        typeof record.recordedAt !== 'string' ||
        !Number.isFinite(Date.parse(record.recordedAt)) ||
        !integer(record.count, 0, 10_000_000)
      )
        throw new Error('성장 기록을 확인해 주세요.');
      return {
        seasonNumber: record.seasonNumber,
        recordedAt: record.recordedAt,
        count: record.count,
      };
    });
    return {
      name: member.name,
      number: member.number,
      captain: member.captain,
      jumper: member.jumper,
      medals,
      growth,
    };
  };
  const members = value.members.map(parseMember);
  if (new Set(members.map((member) => member.number)).size !== members.length)
    throw new Error('대원 번호를 확인해 주세요.');
  const teams =
    value.teams === undefined
      ? [
          {
            name: value.teamName,
            teamIndex: value.teamIndex,
            members,
          },
        ]
      : (() => {
          if (
            !Array.isArray(value.teams) ||
            value.teams.length < 2 ||
            value.teams.length > 4
          )
            throw new Error('원정대 명단을 확인해 주세요.');
          const parsed = value.teams.map((team) => {
            if (
              !obj(team) ||
              !name(team.name, 40) ||
              !integer(team.teamIndex, 0, 3) ||
              !Array.isArray(team.members) ||
              team.members.length > 200
            )
              throw new Error('원정대 명단을 확인해 주세요.');
            const teamMembers = team.members.map(parseMember);
            if (
              new Set(teamMembers.map((member) => member.number)).size !==
              teamMembers.length
            )
              throw new Error('원정대 대원 번호를 확인해 주세요.');
            return { name: team.name, teamIndex: team.teamIndex, members: teamMembers };
          });
          if (new Set(parsed.map((team) => team.teamIndex)).size !== parsed.length)
            throw new Error('원정대 순서를 확인해 주세요.');
          return parsed;
        })();
  let economy: StudentBoardEconomy | undefined;
  if (value.economy !== undefined) {
    const source = value.economy;
    const unitIds = ['UNIT_01', 'UNIT_02', 'UNIT_03', 'UNIT_04'] as const;
    const inventory = obj(source) && obj(source.inventory) ? source.inventory : null;
    if (
      !obj(source) ||
      !integer(source.earnedPoints, 0, 10_000_000) ||
      !integer(source.teacherSpentPoints, 0, 10_000_000) ||
      !integer(source.balance, 0, 10_000_000) ||
      source.balance !== source.earnedPoints - source.teacherSpentPoints ||
      !inventory ||
      !unitIds.every((unitId) => integer(inventory[unitId], 0, 100_000)) ||
      typeof source.hintPurchased !== 'boolean' ||
      (source.hintPurchased
        ? typeof source.hint !== 'string' ||
          source.hint.length < 1 ||
          source.hint.length > 500
        : source.hint !== undefined)
    )
      throw new Error('원정대 포인트와 병력 기록을 확인해 주세요.');
    economy = {
      earnedPoints: source.earnedPoints,
      teacherSpentPoints: source.teacherSpentPoints,
      balance: source.balance,
      inventory: Object.fromEntries(
        unitIds.map((unitId) => [unitId, Number(inventory[unitId])]),
      ) as StudentBoardEconomy['inventory'],
      hintPurchased: source.hintPurchased,
      ...(source.hintPurchased ? { hint: source.hint as string } : {}),
    };
  }
  const heroes = (value.heroes ?? []).map((hero) => {
    if (
      !obj(hero) ||
      !integer(hero.slot, 1, 15) ||
      typeof hero.revealed !== 'boolean' ||
      (hero.revealed
        ? typeof hero.heroId !== 'string' || !/^H(0[1-9]|1[0-5])$/.test(hero.heroId)
        : hero.heroId !== undefined) ||
      !(
        hero.missionName === undefined ||
        (typeof hero.missionName === 'string' && name(hero.missionName, 40))
      )
    )
      throw new Error('영웅 공개 자료를 확인해 주세요.');
    return {
      slot: hero.slot,
      revealed: hero.revealed,
      ...(hero.revealed ? { heroId: hero.heroId as string } : {}),
      ...(typeof hero.missionName === 'string' ? { missionName: hero.missionName } : {}),
    };
  });
  if (new Set(heroes.map((hero) => hero.slot)).size !== heroes.length)
    throw new Error('영웅 카드 위치를 확인해 주세요.');
  const events = (value.events ?? []).map((event) => {
    if (
      !obj(event) ||
      typeof event.id !== 'string' ||
      !event.id.length ||
      event.id.length > 320 ||
      event.type !== 'hero' ||
      !name(event.missionName, 40) ||
      typeof event.occurredAt !== 'string' ||
      !Number.isFinite(Date.parse(event.occurredAt))
    )
      throw new Error('원정대 소식 자료를 확인해 주세요.');
    return {
      id: event.id,
      type: 'hero' as const,
      missionName: event.missionName,
      occurredAt: event.occurredAt,
    };
  });
  if (
    events.length > 30 ||
    new Set(events.map((event) => event.id)).size !== events.length
  )
    throw new Error('원정대 소식 자료를 확인해 주세요.');
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
      !(
        reveal.missionName === undefined ||
        (typeof reveal.missionName === 'string' && name(reveal.missionName, 40))
      ) ||
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
      ...(typeof reveal.missionName === 'string'
        ? { missionName: reveal.missionName }
        : {}),
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
    teams,
    heroes,
    events,
    ...(economy ? { economy } : {}),
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
