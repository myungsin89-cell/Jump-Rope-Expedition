import { BOSSES_CATALOG } from '../card-ui/boss-catalog';
import { activePurchases, economyUnitIds } from '../economy/model';
import type { EconomyStore, EconomyUnitId } from '../economy/model';
import type { HeroStore } from '../heroes/model';
import type { PracticeStore, SavedPractice } from '../matches/practiceModel';
import { parseCount } from '../matches/practiceModel';
import type { Preparation } from '../preparation/model';

export const BATTLE_RULE_VERSION = 'battle-v1' as const;

export type BattleStatus = 'closing' | 'calculated' | 'finished';
export type BattleEventType =
  'boss-reveal' | 'boss-attack' | 'team-attack' | 'cooperation' | 'result';

export interface BattleInventory {
  UNIT_01: number;
  UNIT_02: number;
  UNIT_03: number;
  UNIT_04: number;
}

export interface BattleTeamResult {
  teamIndex: number;
  teamName: string;
  inventory: BattleInventory;
  heroIds: string[];
  bestJumperExtra: number;
  baseOffense: number;
  heroAttack: number;
  physicalDefense: number;
  magicDefense: number;
  actionUptime: number;
  actualDamage: number;
  rank: number;
  victoryPoints: number;
}

export interface BattleEvent {
  id: string;
  type: BattleEventType;
  teamIndex?: number;
  amount?: number;
}

export interface SeasonBattle {
  id: string;
  seasonIndex: number;
  bossId: string;
  status: BattleStatus;
  requestedAt: string;
  matchCount: number;
  ruleVersion: typeof BATTLE_RULE_VERSION;
  calculatedAt?: string;
  finishedAt?: string;
  bossHp?: number;
  cooperationDamage?: number;
  teams?: BattleTeamResult[];
  events?: BattleEvent[];
}

export interface BattleStore {
  version: 1;
  expeditionId: string;
  battles: SeasonBattle[];
}

interface BossRules {
  physicalRatio: number;
  magicRatio: number;
  acornMultiplier: number;
  hammerMultiplier: number;
}

const BOSS_RULES: Record<string, BossRules> = {
  BOSS_01: {
    physicalRatio: 0.8,
    magicRatio: 0.2,
    acornMultiplier: 0.85,
    hammerMultiplier: 1.35,
  },
  BOSS_02: {
    physicalRatio: 0.25,
    magicRatio: 0.75,
    acornMultiplier: 1.4,
    hammerMultiplier: 0.8,
  },
  BOSS_03: {
    physicalRatio: 0.35,
    magicRatio: 0.65,
    acornMultiplier: 0.9,
    hammerMultiplier: 1.3,
  },
  BOSS_04: {
    physicalRatio: 0.75,
    magicRatio: 0.25,
    acornMultiplier: 1.3,
    hammerMultiplier: 0.85,
  },
  BOSS_05: {
    physicalRatio: 0.4,
    magicRatio: 0.6,
    acornMultiplier: 1.15,
    hammerMultiplier: 1.15,
  },
};

export const battleKey = (expeditionId: string) =>
  `jre.practice-battles.v1.${expeditionId}`;

const emptyStore = (expeditionId: string): BattleStore => ({
  version: 1,
  expeditionId,
  battles: [],
});

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';
const text = (value: unknown): value is string => typeof value === 'string';
const date = (value: unknown): value is string =>
  text(value) && Number.isFinite(Date.parse(value));
const safeInteger = (value: unknown, minimum = 0): value is number =>
  Number.isSafeInteger(value) && Number(value) >= minimum;
const finite = (value: unknown, minimum = 0): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum;
const seasonIndex = (value: unknown): value is number =>
  safeInteger(value) && Number(value) < 5;
const teamIndex = (value: unknown): value is number =>
  safeInteger(value) && Number(value) < 4;
const heroId = (value: unknown): value is string =>
  text(value) && /^H(0[1-9]|1[0-5])$/.test(value);
const bossId = (value: unknown): value is string =>
  text(value) && Boolean(BOSS_RULES[value]);
const inventory = (value: unknown): value is BattleInventory =>
  object(value) && economyUnitIds.every((id) => safeInteger(value[id]));

function isTeamResult(value: unknown): value is BattleTeamResult {
  return (
    object(value) &&
    teamIndex(value.teamIndex) &&
    text(value.teamName) &&
    value.teamName.length > 0 &&
    inventory(value.inventory) &&
    Array.isArray(value.heroIds) &&
    value.heroIds.every(heroId) &&
    new Set(value.heroIds).size === value.heroIds.length &&
    safeInteger(value.bestJumperExtra) &&
    finite(value.baseOffense) &&
    finite(value.heroAttack) &&
    finite(value.physicalDefense) &&
    finite(value.magicDefense) &&
    finite(value.actionUptime) &&
    value.actionUptime <= 1 &&
    safeInteger(value.actualDamage) &&
    safeInteger(value.rank, 1) &&
    (value.victoryPoints === 0 || value.victoryPoints === 1)
  );
}

function isEvent(value: unknown): value is BattleEvent {
  return (
    object(value) &&
    text(value.id) &&
    value.id.length > 0 &&
    ['boss-reveal', 'boss-attack', 'team-attack', 'cooperation', 'result'].includes(
      String(value.type),
    ) &&
    (value.teamIndex === undefined || teamIndex(value.teamIndex)) &&
    (value.amount === undefined || safeInteger(value.amount))
  );
}

function isBattle(value: unknown): value is SeasonBattle {
  if (
    !object(value) ||
    !text(value.id) ||
    !value.id.length ||
    !seasonIndex(value.seasonIndex) ||
    !bossId(value.bossId) ||
    !['closing', 'calculated', 'finished'].includes(String(value.status)) ||
    !date(value.requestedAt) ||
    !safeInteger(value.matchCount, 1) ||
    value.ruleVersion !== BATTLE_RULE_VERSION
  )
    return false;
  if (value.status === 'closing')
    return (
      value.calculatedAt === undefined &&
      value.finishedAt === undefined &&
      value.bossHp === undefined &&
      value.cooperationDamage === undefined &&
      value.teams === undefined &&
      value.events === undefined
    );
  return (
    date(value.calculatedAt) &&
    (value.status === 'finished'
      ? date(value.finishedAt)
      : value.finishedAt === undefined) &&
    safeInteger(value.bossHp, 1) &&
    safeInteger(value.cooperationDamage) &&
    Array.isArray(value.teams) &&
    value.teams.length >= 2 &&
    value.teams.length <= 4 &&
    value.teams.every(isTeamResult) &&
    new Set(value.teams.map((team) => team.teamIndex)).size === value.teams.length &&
    Array.isArray(value.events) &&
    value.events.every(isEvent) &&
    new Set(value.events.map((event) => event.id)).size === value.events.length
  );
}

export function parseBattleStore(value: unknown, expeditionId: string): BattleStore {
  try {
    if (
      !object(value) ||
      value.version !== 1 ||
      value.expeditionId !== expeditionId ||
      !Array.isArray(value.battles) ||
      !value.battles.every(isBattle) ||
      new Set(value.battles.map((battle) => battle.id)).size !== value.battles.length ||
      new Set(value.battles.map((battle) => battle.seasonIndex)).size !==
        value.battles.length
    )
      throw new Error();
    return value as unknown as BattleStore;
  } catch {
    throw new Error(
      '최종 대전 기록을 읽을 수 없어요. 원본은 보존했으며 새 계산을 막았어요.',
    );
  }
}

export function readBattles(expeditionId: string): BattleStore {
  const raw = localStorage.getItem(battleKey(expeditionId));
  if (raw === null) return emptyStore(expeditionId);
  try {
    return parseBattleStore(JSON.parse(raw), expeditionId);
  } catch (reason) {
    if (reason instanceof Error) throw reason;
    throw new Error('최종 대전 기록을 확인해 주세요.', { cause: reason });
  }
}

function commit(store: BattleStore): BattleStore {
  localStorage.setItem(battleKey(store.expeditionId), JSON.stringify(store));
  return store;
}

function activeSeasonMatches(
  store: PracticeStore,
  targetSeason: number,
): SavedPractice[] {
  return store.history.filter(
    (entry) =>
      entry.seasonIndex === targetSeason &&
      Boolean(entry.official) &&
      !entry.official?.voidedAt,
  );
}

export function seasonBattle(store: BattleStore, targetSeason: number) {
  return store.battles.find((battle) => battle.seasonIndex === targetSeason) ?? null;
}

export function isSeasonBattleLocked(store: BattleStore, targetSeason: number): boolean {
  const battle = seasonBattle(store, targetSeason);
  return battle?.status === 'calculated' || battle?.status === 'finished';
}

export function beginSeasonClose(
  plan: Preparation,
  practice: PracticeStore,
  requestedAt = new Date().toISOString(),
): BattleStore {
  if (!date(requestedAt)) throw new Error('시즌 종료 시간을 확인해 주세요.');
  const targetSeason = plan.currentSeasonIndex ?? 0;
  const season = plan.seasons[targetSeason];
  if (!season || !bossId(season.bossId))
    throw new Error('이번 시즌의 비밀 보스를 먼저 설정해 주세요.');
  const matches = activeSeasonMatches(practice, targetSeason);
  if (!matches.length)
    throw new Error(
      '확정 경기가 0개라 최종 대전을 열 수 없어요. 시즌을 소비하지 않고 설정으로 돌아갑니다.',
    );
  const store = readBattles(plan.id);
  if (seasonBattle(store, targetSeason)) return store;
  return commit({
    ...store,
    battles: [
      ...store.battles,
      {
        id: `battle:${plan.id}:${targetSeason}`,
        seasonIndex: targetSeason,
        bossId: season.bossId,
        status: 'closing',
        requestedAt,
        matchCount: matches.length,
        ruleVersion: BATTLE_RULE_VERSION,
      },
    ],
  });
}

export function cancelSeasonClose(
  expeditionId: string,
  targetSeason: number,
): BattleStore {
  const store = readBattles(expeditionId);
  const battle = seasonBattle(store, targetSeason);
  if (!battle) return store;
  if (battle.status !== 'closing')
    throw new Error('전투 계산이 끝난 시즌은 다시 열 수 없어요.');
  return commit({
    ...store,
    battles: store.battles.filter((item) => item.seasonIndex !== targetSeason),
  });
}

function teamInventory(
  economy: EconomyStore,
  targetSeason: number,
  targetTeam: number,
): BattleInventory {
  const purchases = activePurchases(economy).filter(
    (purchase) =>
      purchase.seasonIndex === targetSeason && purchase.teamKey === `team-${targetTeam}`,
  );
  const count = (id: EconomyUnitId) =>
    purchases.filter((purchase) => purchase.itemId === id).length;
  return {
    UNIT_01: count('UNIT_01'),
    UNIT_02: count('UNIT_02'),
    UNIT_03: count('UNIT_03'),
    UNIT_04: count('UNIT_04'),
  };
}

function seasonHeroIds(
  heroes: HeroStore,
  targetSeason: number,
  targetTeam: number,
): string[] {
  return heroes.rewards.flatMap((reward) =>
    reward.seasonIndex === targetSeason &&
    reward.teamIndex === targetTeam &&
    reward.heroId
      ? [reward.heroId]
      : [],
  );
}

function bestJumperExtra(
  practice: PracticeStore,
  targetSeason: number,
  targetTeam: number,
): number {
  return activeSeasonMatches(practice, targetSeason).reduce((best, match) => {
    const matchTeam = match.teams.find((team) => team.key === `team-${targetTeam}`);
    if (!matchTeam) return best;
    return Math.max(
      best,
      ...matchTeam.jumpers.map(
        (jumper) => (parseCount(jumper.actual) ?? 0) * (jumper.multiplier - 1),
      ),
    );
  }, 0);
}

const rounded = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

function calculateTeam(
  plan: Preparation,
  practice: PracticeStore,
  economy: EconomyStore,
  heroes: HeroStore,
  targetSeason: number,
  targetTeam: number,
  rules: BossRules,
): Omit<BattleTeamResult, 'rank' | 'victoryPoints'> {
  const team = plan.teams[targetTeam];
  if (!team) throw new Error('최종 대전에 참여할 원정대를 확인해 주세요.');
  const units = teamInventory(economy, targetSeason, targetTeam);
  const heroIds = seasonHeroIds(heroes, targetSeason, targetTeam);
  const has = (id: string) => heroIds.includes(id);
  const fullForce = economyUnitIds.every((id) => units[id] > 0) && has('H12');
  const sharedAttack =
    (has('H04') ? 0.07 : 0) +
    (has('H09') ? 0.15 : 0) +
    (has('H11') ? 0.15 : 0) +
    (has('H14') ? 0.2 : 0) +
    (fullForce ? 0.18 : 0);
  const sharedDefense =
    (has('H10') ? 0.15 : 0) + (has('H14') ? 0.2 : 0) + (fullForce ? 0.18 : 0);
  const physicalPrimary = rules.physicalRatio >= rules.magicRatio;
  const physicalBonus =
    sharedDefense +
    (has('H05') ? 0.1 : 0) +
    (has('H06') ? 0.07 : 0) +
    (has('H11') && physicalPrimary ? 0.15 : 0);
  const magicBonus =
    sharedDefense +
    (has('H03') ? 0.1 : 0) +
    (has('H07') ? 0.07 : 0) +
    (has('H11') && !physicalPrimary ? 0.15 : 0);
  const acornAttack =
    units.UNIT_01 *
    100 *
    rules.acornMultiplier *
    (1 + sharedAttack + (has('H01') ? 0.1 : 0));
  const hammerAttack =
    units.UNIT_02 *
    100 *
    rules.hammerMultiplier *
    (1 + sharedAttack + (has('H02') ? 0.1 : 0));
  const baseOffense = acornAttack + hammerAttack;
  const physicalDefense = units.UNIT_03 * (1 + physicalBonus);
  const magicDefense = units.UNIT_04 * (1 + magicBonus);
  const defenseUptime =
    0.45 +
    0.55 *
      (1 -
        rules.physicalRatio * 0.45 ** physicalDefense -
        rules.magicRatio * 0.45 ** magicDefense);
  const actionUptime = Math.min(1, defenseUptime + (has('H08') ? 0.07 : 0));
  const jumperExtra = bestJumperExtra(practice, targetSeason, targetTeam);
  const lumiAttack = has('H13') ? Math.min(jumperExtra, baseOffense * 0.2) : 0;
  const leonAttack = has('H15')
    ? Math.min(Math.max(physicalDefense, magicDefense) * 100 * 0.25, baseOffense * 0.25)
    : 0;
  const heroAttack = lumiAttack + leonAttack;
  return {
    teamIndex: targetTeam,
    teamName: team.name,
    inventory: units,
    heroIds,
    bestJumperExtra: jumperExtra,
    baseOffense: rounded(baseOffense),
    heroAttack: rounded(heroAttack),
    physicalDefense: rounded(physicalDefense),
    magicDefense: rounded(magicDefense),
    actionUptime: rounded(actionUptime),
    actualDamage: Math.floor((baseOffense + heroAttack) * actionUptime),
  };
}

export function calculateSeasonBattle(
  plan: Preparation,
  practice: PracticeStore,
  economy: EconomyStore,
  heroes: HeroStore,
  calculatedAt = new Date().toISOString(),
): BattleStore {
  if (!date(calculatedAt)) throw new Error('최종 대전 계산 시간을 확인해 주세요.');
  const targetSeason = plan.currentSeasonIndex ?? 0;
  const store = readBattles(plan.id);
  const pending = seasonBattle(store, targetSeason);
  if (!pending) throw new Error('먼저 시즌 종료를 눌러 주세요.');
  if (pending.status !== 'closing') return store;
  const rules = BOSS_RULES[pending.bossId];
  if (!rules || !BOSSES_CATALOG.some((boss) => boss.id === pending.bossId))
    throw new Error('비밀 보스의 전투 규칙을 확인해 주세요.');
  const calculated = plan.teams.map((_, index) =>
    calculateTeam(plan, practice, economy, heroes, targetSeason, index, rules),
  );
  const highestDamage = Math.max(...calculated.map((team) => team.actualDamage));
  const teams: BattleTeamResult[] = calculated.map((team) => ({
    ...team,
    rank: 1 + calculated.filter((other) => other.actualDamage > team.actualDamage).length,
    victoryPoints: team.actualDamage === highestDamage ? 1 : 0,
  }));
  const totalDamage = teams.reduce((sum, team) => sum + team.actualDamage, 0);
  const bossHp = Math.max(1_000, Math.ceil((totalDamage * 1.18) / 100) * 100);
  const cooperationDamage = Math.max(0, bossHp - totalDamage);
  const events: BattleEvent[] = [
    { id: `${pending.id}:boss`, type: 'boss-reveal' },
    ...teams.flatMap((team) => [
      {
        id: `${pending.id}:boss-attack:${team.teamIndex}`,
        type: 'boss-attack' as const,
        teamIndex: team.teamIndex,
      },
      {
        id: `${pending.id}:team-attack:${team.teamIndex}`,
        type: 'team-attack' as const,
        teamIndex: team.teamIndex,
        amount: team.actualDamage,
      },
    ]),
    {
      id: `${pending.id}:cooperation`,
      type: 'cooperation',
      amount: cooperationDamage,
    },
    { id: `${pending.id}:result`, type: 'result' },
  ];
  return commit({
    ...store,
    battles: store.battles.map((battle) =>
      battle.id === pending.id
        ? {
            ...battle,
            status: 'calculated',
            calculatedAt,
            bossHp,
            cooperationDamage,
            teams,
            events,
          }
        : battle,
    ),
  });
}

export function finishSeasonBattle(
  expeditionId: string,
  targetSeason: number,
  finishedAt = new Date().toISOString(),
): BattleStore {
  if (!date(finishedAt)) throw new Error('최종 대전 완료 시간을 확인해 주세요.');
  const store = readBattles(expeditionId);
  const battle = seasonBattle(store, targetSeason);
  if (!battle || battle.status === 'closing')
    throw new Error('계산을 마친 최종 대전을 먼저 재생해 주세요.');
  if (battle.status === 'finished') return store;
  return commit({
    ...store,
    battles: store.battles.map((item) =>
      item.id === battle.id ? { ...item, status: 'finished', finishedAt } : item,
    ),
  });
}

export interface ExpeditionStanding {
  teamIndex: number;
  teamName: string;
  victoryPoints: number;
  totalDamage: number;
  rank: number;
}

export function expeditionStandings(store: BattleStore): ExpeditionStanding[] {
  const totals = new Map<number, Omit<ExpeditionStanding, 'rank'>>();
  store.battles
    .filter((battle) => battle.status === 'finished')
    .forEach((battle) =>
      battle.teams?.forEach((team) => {
        const previous = totals.get(team.teamIndex);
        totals.set(team.teamIndex, {
          teamIndex: team.teamIndex,
          teamName: team.teamName,
          victoryPoints: (previous?.victoryPoints ?? 0) + team.victoryPoints,
          totalDamage: (previous?.totalDamage ?? 0) + team.actualDamage,
        });
      }),
    );
  const all = [...totals.values()];
  return all.map((team) => ({
    ...team,
    rank:
      1 +
      all.filter(
        (other) =>
          other.victoryPoints > team.victoryPoints ||
          (other.victoryPoints === team.victoryPoints &&
            other.totalDamage > team.totalDamage),
      ).length,
  }));
}
