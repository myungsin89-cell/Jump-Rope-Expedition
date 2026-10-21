import { HEROES_CATALOG } from '../card-ui/catalog';
import type { HeroRarity } from '../card-ui/types';
import { activePurchases, economyUnitIds } from '../economy/model';
import type { EconomyStore } from '../economy/model';
import { calculateMatchPreview } from '../../shared/domain/matchScoring';
import type { PracticeStore, SavedPractice } from '../matches/practiceModel';
import { parseCount, practiceInputs } from '../matches/practiceModel';
import type { MedalStore } from '../medals/model';
import type { Preparation } from '../preparation/model';

export const heroMissionIds = [
  'FIVE_STEPS',
  'SHINING_CHALLENGE',
  'SHINING_COMPANIONS',
  'STEADY_STEPS',
  'COMEBACK',
  'FOUR_FORCES',
] as const;

export type HeroMissionId = (typeof heroMissionIds)[number];

export const HERO_MISSIONS: Record<HeroMissionId, { name: string; description: string }> =
  {
    FIVE_STEPS: {
      name: '다섯 계단',
      description: '팀 원기록이 5경기 연속 향상',
    },
    SHINING_CHALLENGE: {
      name: '빛나는 도전',
      description: '도전점퍼 개인 실제 기록이 5회 연속 향상',
    },
    SHINING_COMPANIONS: {
      name: '빛나는 동료들',
      description: '서로 다른 훈장 수상자가 누적 4명 늘 때마다',
    },
    STEADY_STEPS: {
      name: '꾸준한 발걸음',
      description: '4경기 연속 2위 이상 · 2팀에서는 비활성',
    },
    COMEBACK: {
      name: '다시 일어선 원정대',
      description: '직전 경기 꼴찌에서 바로 다음 경기 1위 · 2팀에서는 비활성',
    },
    FOUR_FORCES: {
      name: '네 가지 힘',
      description: '네 병력의 완성 세트 수가 늘 때마다',
    },
  };

export interface HeroAchievement {
  id: string;
  missionId: HeroMissionId;
  teamIndex: number;
  seasonIndex: number;
  sourceId: string;
  achievedAt: string;
  contributorIds: string[];
  contributorNames: string[];
}

export interface HeroReward {
  id: string;
  achievementId: string;
  missionId: HeroMissionId;
  teamIndex: number;
  seasonIndex: number;
  heroId: string | null;
  awardedAt: string;
  revealedAt?: string;
  contributorIds: string[];
  contributorNames: string[];
}

export interface HeroStore {
  version: 1;
  expeditionId: string;
  rewards: HeroReward[];
}

export interface HeroSources {
  practice: PracticeStore;
  medals: MedalStore;
  economy: EconomyStore;
}

export const heroKey = (id: string) => `jre.practice-heroes.v1.${id}`;

const emptyStore = (id: string): HeroStore => ({
  version: 1,
  expeditionId: id,
  rewards: [],
});

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';
const text = (value: unknown): value is string => typeof value === 'string';
const date = (value: unknown): value is string =>
  text(value) && Number.isFinite(Date.parse(value));
const season = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) < 5;
const team = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) < 4;
const heroId = (value: unknown): value is string =>
  text(value) && /^H(0[1-9]|1[0-5])$/.test(value);
const stringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => text(item));

function isReward(value: unknown): value is HeroReward {
  return (
    object(value) &&
    text(value.id) &&
    value.id.length > 0 &&
    text(value.achievementId) &&
    value.achievementId.length > 0 &&
    heroMissionIds.includes(value.missionId as HeroMissionId) &&
    team(value.teamIndex) &&
    season(value.seasonIndex) &&
    (value.heroId === null || heroId(value.heroId)) &&
    date(value.awardedAt) &&
    (value.revealedAt === undefined || date(value.revealedAt)) &&
    !(value.heroId === null && value.revealedAt !== undefined) &&
    stringList(value.contributorIds) &&
    stringList(value.contributorNames) &&
    value.contributorIds.length === value.contributorNames.length &&
    new Set(value.contributorIds).size === value.contributorIds.length
  );
}

export function parseHeroStore(value: unknown, expeditionId: string): HeroStore {
  try {
    if (
      !object(value) ||
      value.version !== 1 ||
      value.expeditionId !== expeditionId ||
      !Array.isArray(value.rewards) ||
      !value.rewards.every(isReward) ||
      new Set(value.rewards.map((reward) => reward.id)).size !== value.rewards.length ||
      new Set(value.rewards.map((reward) => reward.achievementId)).size !==
        value.rewards.length ||
      new Set(
        value.rewards.flatMap((reward) =>
          reward.heroId
            ? [`${reward.teamIndex}:${reward.seasonIndex}:${reward.heroId}`]
            : [],
        ),
      ).size !== value.rewards.filter((reward) => reward.heroId).length
    )
      throw new Error();
    return value as unknown as HeroStore;
  } catch {
    throw new Error(
      '영웅 기록을 읽을 수 없어요. 원본은 보존했으며 새 영웅 지급을 막았어요.',
    );
  }
}

export function readHeroes(expeditionId: string): HeroStore {
  const raw = localStorage.getItem(heroKey(expeditionId));
  if (raw === null) return emptyStore(expeditionId);
  try {
    return parseHeroStore(JSON.parse(raw), expeditionId);
  } catch (reason) {
    if (reason instanceof Error) throw reason;
    throw new Error('영웅 기록을 확인해 주세요.', { cause: reason });
  }
}

function commit(store: HeroStore): HeroStore {
  localStorage.setItem(heroKey(store.expeditionId), JSON.stringify(store));
  return store;
}

function teamIndex(key: string): number {
  const index = Number(key.replace('team-', ''));
  if (!team(index)) throw new Error('원정대 기록을 확인해 주세요.');
  return index;
}

function officialMatches(store: PracticeStore): SavedPractice[] {
  return store.history.filter(
    (entry) => Boolean(entry.official) && !entry.official?.voidedAt,
  );
}

function achievement(
  missionId: HeroMissionId,
  at: SavedPractice,
  index: number,
  contributors: { id: string; name: string }[] = [],
): HeroAchievement {
  return {
    id: `${missionId}:${at.id}:${index}:${contributors.map((item) => item.id).join(',')}`,
    missionId,
    teamIndex: index,
    seasonIndex: at.seasonIndex,
    sourceId: at.id,
    achievedAt: at.official!.confirmedAt,
    contributorIds: contributors.map((item) => item.id),
    contributorNames: contributors.map((item) => item.name),
  };
}

function matchAchievements(store: PracticeStore, teamCount: number): HeroAchievement[] {
  const matches = officialMatches(store);
  const rewards: HeroAchievement[] = [];
  const rawState = new Map<number, { previous: number; streak: number }>();
  const jumperState = new Map<string, { previous: number; streak: number }>();
  const rankStreak = new Map<number, number>();
  let previousRanks: Map<number, number> | null = null;
  let previousLastRank: number | null = null;

  matches.forEach((match, matchAt) => {
    const previous = matchAt > 0 ? matches[matchAt - 1] : null;
    const results = calculateMatchPreview(
      practiceInputs(match),
      previous ? practiceInputs(previous) : [],
    );
    const resultByTeam = new Map(
      results.map((result) => [teamIndex(result.teamKey), result]),
    );

    match.teams.forEach((matchTeam) => {
      const index = teamIndex(matchTeam.key);
      const raw = parseCount(matchTeam.raw)!;
      const state = rawState.get(index);
      if (!state) rawState.set(index, { previous: raw, streak: 0 });
      else {
        state.streak = raw > state.previous ? state.streak + 1 : 0;
        state.previous = raw;
        if (state.streak === 5) {
          rewards.push(achievement('FIVE_STEPS', match, index));
          state.streak = 0;
        }
      }

      matchTeam.jumpers.forEach((jumper) => {
        const actual = parseCount(jumper.actual)!;
        const state = jumperState.get(jumper.studentId);
        if (!state) jumperState.set(jumper.studentId, { previous: actual, streak: 0 });
        else {
          state.streak = actual > state.previous ? state.streak + 1 : 0;
          state.previous = actual;
          if (state.streak === 5) {
            const member = matchTeam.members.find((item) => item.id === jumper.studentId);
            rewards.push(
              achievement(
                'SHINING_CHALLENGE',
                match,
                index,
                member ? [{ id: member.id, name: member.name }] : [],
              ),
            );
            state.streak = 0;
          }
        }
      });
    });

    if (teamCount > 2) {
      results.forEach((result) => {
        const index = teamIndex(result.teamKey);
        const streak = result.rank <= 2 ? (rankStreak.get(index) ?? 0) + 1 : 0;
        if (streak === 4) {
          rewards.push(achievement('STEADY_STEPS', match, index));
          rankStreak.set(index, 0);
        } else rankStreak.set(index, streak);
        if (
          previousRanks &&
          previousLastRank !== null &&
          previousLastRank > 1 &&
          previousRanks.get(index) === previousLastRank &&
          result.rank === 1
        )
          rewards.push(achievement('COMEBACK', match, index));
      });
      previousRanks = new Map(
        [...resultByTeam].map(([index, result]) => [index, result.rank]),
      );
      previousLastRank = Math.max(...results.map((result) => result.rank));
    }
  });
  return rewards;
}

function companionAchievements(store: MedalStore): HeroAchievement[] {
  const results: HeroAchievement[] = [];
  const states = new Map<
    string,
    { seen: Set<string>; contributors: { id: string; name: string }[] }
  >();
  [...store.awards]
    .sort((a, b) => a.awardedAt.localeCompare(b.awardedAt) || a.id.localeCompare(b.id))
    .forEach((award) => {
      const state = states.get(award.teamKey) ?? {
        seen: new Set<string>(),
        contributors: [],
      };
      states.set(award.teamKey, state);
      if (state.seen.has(award.studentId)) return;
      state.seen.add(award.studentId);
      state.contributors.push({ id: award.studentId, name: award.studentName });
      if (state.seen.size % 4 !== 0) return;
      const index = teamIndex(award.teamKey);
      results.push({
        id: `SHINING_COMPANIONS:${award.teamKey}:${state.seen.size}`,
        missionId: 'SHINING_COMPANIONS',
        teamIndex: index,
        seasonIndex: award.seasonIndex,
        sourceId: award.id,
        achievedAt: award.awardedAt,
        contributorIds: state.contributors.map((item) => item.id),
        contributorNames: state.contributors.map((item) => item.name),
      });
      state.contributors = [];
    });
  return results;
}

function forceAchievements(store: EconomyStore): HeroAchievement[] {
  const results: HeroAchievement[] = [];
  type EconomyUnitId = (typeof economyUnitIds)[number];
  const isEconomyUnitId = (itemId: string): itemId is EconomyUnitId =>
    (economyUnitIds as readonly string[]).includes(itemId);
  const states = new Map<string, Record<EconomyUnitId, number>>();
  activePurchases(store)
    .sort(
      (a, b) => a.purchasedAt.localeCompare(b.purchasedAt) || a.id.localeCompare(b.id),
    )
    .forEach((purchase) => {
      if (!isEconomyUnitId(purchase.itemId)) return;
      const key = `${purchase.teamKey}:${purchase.seasonIndex}`;
      const counts =
        states.get(key) ??
        ({ UNIT_01: 0, UNIT_02: 0, UNIT_03: 0, UNIT_04: 0 } as Record<
          EconomyUnitId,
          number
        >);
      states.set(key, counts);
      const before = Math.min(...economyUnitIds.map((id) => counts[id]));
      const itemId = purchase.itemId;
      counts[itemId] += 1;
      const after = Math.min(...economyUnitIds.map((id) => counts[id]));
      if (after <= before) return;
      results.push({
        id: `FOUR_FORCES:${purchase.teamKey}:${purchase.seasonIndex}:${after}`,
        missionId: 'FOUR_FORCES',
        teamIndex: teamIndex(purchase.teamKey),
        seasonIndex: purchase.seasonIndex,
        sourceId: purchase.id,
        achievedAt: purchase.purchasedAt,
        contributorIds: [],
        contributorNames: [],
      });
    });
  return results;
}

export function deriveHeroAchievements(
  plan: Preparation,
  sources: HeroSources,
): HeroAchievement[] {
  return [
    ...matchAchievements(sources.practice, plan.teams.length),
    ...companionAchievements(sources.medals),
    ...forceAchievements(sources.economy),
  ].sort((a, b) => a.achievedAt.localeCompare(b.achievedAt) || a.id.localeCompare(b.id));
}

const rarityWeight: Record<HeroRarity, number> = {
  common: 60,
  rare: 30,
  legendary: 10,
};

function safeRoll(random: () => number): number {
  const value = random();
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999) : 0;
}

export function drawHeroId(
  ownedIds: ReadonlySet<string>,
  random: () => number = secureRandom,
): string | null {
  const available = HEROES_CATALOG.filter((hero) => !ownedIds.has(hero.id));
  if (!available.length) return null;
  const rarities = (['common', 'rare', 'legendary'] as const).filter((rarity) =>
    available.some((hero) => hero.rarity === rarity),
  );
  const total = rarities.reduce((sum, rarity) => sum + rarityWeight[rarity], 0);
  let position = safeRoll(random) * total;
  const selectedRarity =
    rarities.find((rarity) => {
      position -= rarityWeight[rarity];
      return position < 0;
    }) ?? rarities[rarities.length - 1];
  const pool = available.filter((hero) => hero.rarity === selectedRarity);
  return pool[Math.floor(safeRoll(random) * pool.length)].id;
}

function secureRandom(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 2 ** 32;
}

export function reconcileHeroRewards(
  plan: Preparation,
  sources: HeroSources,
  random: () => number = secureRandom,
): HeroStore {
  const store = readHeroes(plan.id);
  const known = new Set(store.rewards.map((reward) => reward.achievementId));
  const rewards = [...store.rewards];
  deriveHeroAchievements(plan, sources).forEach((item) => {
    if (known.has(item.id)) return;
    const owned = new Set(
      rewards.flatMap((reward) =>
        reward.teamIndex === item.teamIndex &&
        reward.seasonIndex === item.seasonIndex &&
        reward.heroId
          ? [reward.heroId]
          : [],
      ),
    );
    rewards.push({
      id: `reward:${item.id}`,
      achievementId: item.id,
      missionId: item.missionId,
      teamIndex: item.teamIndex,
      seasonIndex: item.seasonIndex,
      heroId: drawHeroId(owned, random),
      awardedAt: item.achievedAt,
      contributorIds: item.contributorIds,
      contributorNames: item.contributorNames,
    });
    known.add(item.id);
  });
  return rewards.length === store.rewards.length ? store : commit({ ...store, rewards });
}

export function revealHero(
  expeditionId: string,
  rewardId: string,
  revealedAt = new Date().toISOString(),
): HeroStore {
  if (!date(revealedAt)) throw new Error('영웅 공개 시간을 확인해 주세요.');
  const store = readHeroes(expeditionId);
  const reward = store.rewards.find((item) => item.id === rewardId);
  if (!reward || !reward.heroId) throw new Error('공개할 영웅 카드를 찾지 못했어요.');
  if (reward.revealedAt) return store;
  return commit({
    ...store,
    rewards: store.rewards.map((item) =>
      item.id === rewardId ? { ...item, revealedAt } : item,
    ),
  });
}

export function revealSeasonHeroes(
  expeditionId: string,
  seasonIndexValue: number,
  revealedAt = new Date().toISOString(),
): HeroStore {
  if (!season(seasonIndexValue) || !date(revealedAt))
    throw new Error('영웅 공개 시즌과 시간을 확인해 주세요.');
  const store = readHeroes(expeditionId);
  const hasSealed = store.rewards.some(
    (reward) =>
      reward.seasonIndex === seasonIndexValue &&
      Boolean(reward.heroId) &&
      !reward.revealedAt,
  );
  if (!hasSealed) return store;
  return commit({
    ...store,
    rewards: store.rewards.map((reward) =>
      reward.seasonIndex === seasonIndexValue && reward.heroId && !reward.revealedAt
        ? { ...reward, revealedAt }
        : reward,
    ),
  });
}

export function teamHeroRewards(
  store: HeroStore,
  teamIndexValue: number,
  seasonIndex?: number,
): HeroReward[] {
  return store.rewards.filter(
    (reward) =>
      reward.teamIndex === teamIndexValue &&
      (seasonIndex === undefined || reward.seasonIndex === seasonIndex),
  );
}
