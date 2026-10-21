export const BATTLE_RULE_VERSION = 'battle-v1' as const;

export const battleUnitIds = ['UNIT_01', 'UNIT_02', 'UNIT_03', 'UNIT_04'] as const;
export type BattleUnitId = (typeof battleUnitIds)[number];

export interface BattleInventory {
  UNIT_01: number;
  UNIT_02: number;
  UNIT_03: number;
  UNIT_04: number;
}

export interface BattleAuthorityTeamInput {
  teamIndex: number;
  teamName: string;
  inventory: BattleInventory;
  heroIds: string[];
  bestJumperExtra: number;
}

export interface BattleAuthorityInput {
  ruleVersion: typeof BATTLE_RULE_VERSION;
  seasonIndex: number;
  bossId: string;
  matchCount: number;
  eventPrefix: string;
  teams: BattleAuthorityTeamInput[];
}

export interface BattleTeamResult extends BattleAuthorityTeamInput {
  baseOffense: number;
  heroAttack: number;
  physicalDefense: number;
  magicDefense: number;
  actionUptime: number;
  actualDamage: number;
  rank: number;
  victoryPoints: number;
}

export type BattleEventType =
  'boss-reveal' | 'boss-attack' | 'team-attack' | 'cooperation' | 'result';

export interface BattleEvent {
  id: string;
  type: BattleEventType;
  teamIndex?: number;
  amount?: number;
}

export interface BattleAuthorityResult {
  ruleVersion: typeof BATTLE_RULE_VERSION;
  seasonIndex: number;
  bossId: string;
  matchCount: number;
  calculatedAt: string;
  bossHp: number;
  cooperationDamage: number;
  teams: BattleTeamResult[];
  events: BattleEvent[];
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

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';
const integer = (value: unknown, minimum = 0, maximum = 10_000_000) =>
  Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
const heroId = (value: unknown): value is string =>
  typeof value === 'string' && /^H(0[1-9]|1[0-5])$/.test(value);
const date = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

function parseInventory(value: unknown): BattleInventory {
  if (!object(value) || !battleUnitIds.every((id) => integer(value[id], 0, 100_000)))
    throw new Error('최종 대전 병력 수를 확인해 주세요.');
  return Object.fromEntries(
    battleUnitIds.map((id) => [id, Number(value[id])]),
  ) as unknown as BattleInventory;
}

export function parseBattleAuthorityInput(value: unknown): BattleAuthorityInput {
  if (
    !object(value) ||
    value.ruleVersion !== BATTLE_RULE_VERSION ||
    !integer(value.seasonIndex, 0, 4) ||
    typeof value.bossId !== 'string' ||
    !BOSS_RULES[value.bossId] ||
    !integer(value.matchCount, 1, 10_000) ||
    typeof value.eventPrefix !== 'string' ||
    !value.eventPrefix.length ||
    value.eventPrefix.length > 200 ||
    !Array.isArray(value.teams) ||
    value.teams.length < 2 ||
    value.teams.length > 4
  )
    throw new Error('최종 대전 서버 입력을 확인해 주세요.');
  const teams = value.teams.map((team) => {
    if (
      !object(team) ||
      !integer(team.teamIndex, 0, 3) ||
      typeof team.teamName !== 'string' ||
      !team.teamName.trim() ||
      team.teamName.length > 40 ||
      !Array.isArray(team.heroIds) ||
      team.heroIds.length > 15 ||
      !team.heroIds.every(heroId) ||
      new Set(team.heroIds).size !== team.heroIds.length ||
      !integer(team.bestJumperExtra, 0, 10_000_000)
    )
      throw new Error('최종 대전 원정대 입력을 확인해 주세요.');
    return {
      teamIndex: Number(team.teamIndex),
      teamName: team.teamName.trim(),
      inventory: parseInventory(team.inventory),
      heroIds: [...team.heroIds],
      bestJumperExtra: Number(team.bestJumperExtra),
    };
  });
  if (
    new Set(teams.map((team) => team.teamIndex)).size !== teams.length ||
    teams.some((team, index) => team.teamIndex !== index)
  )
    throw new Error('최종 대전 원정대 순서를 확인해 주세요.');
  return {
    ruleVersion: BATTLE_RULE_VERSION,
    seasonIndex: Number(value.seasonIndex),
    bossId: value.bossId,
    matchCount: Number(value.matchCount),
    eventPrefix: value.eventPrefix,
    teams,
  };
}

const rounded = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

function calculateTeam(
  input: BattleAuthorityTeamInput,
  rules: BossRules,
): Omit<BattleTeamResult, 'rank' | 'victoryPoints'> {
  const { inventory: units, heroIds } = input;
  const has = (id: string) => heroIds.includes(id);
  const fullForce = battleUnitIds.every((id) => units[id] > 0) && has('H12');
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
  const lumiAttack = has('H13') ? Math.min(input.bestJumperExtra, baseOffense * 0.2) : 0;
  const leonAttack = has('H15')
    ? Math.min(Math.max(physicalDefense, magicDefense) * 100 * 0.25, baseOffense * 0.25)
    : 0;
  const heroAttack = lumiAttack + leonAttack;
  return {
    ...input,
    baseOffense: rounded(baseOffense),
    heroAttack: rounded(heroAttack),
    physicalDefense: rounded(physicalDefense),
    magicDefense: rounded(magicDefense),
    actionUptime: rounded(actionUptime),
    actualDamage: Math.floor((baseOffense + heroAttack) * actionUptime),
  };
}

export function calculateBattleAuthority(
  raw: BattleAuthorityInput,
  calculatedAt = new Date().toISOString(),
): BattleAuthorityResult {
  const input = parseBattleAuthorityInput(raw);
  if (!date(calculatedAt)) throw new Error('최종 대전 계산 시간을 확인해 주세요.');
  const rules = BOSS_RULES[input.bossId];
  const calculated = input.teams.map((team) => calculateTeam(team, rules));
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
    { id: `${input.eventPrefix}:boss`, type: 'boss-reveal' },
    ...teams.flatMap((team) => [
      {
        id: `${input.eventPrefix}:boss-attack:${team.teamIndex}`,
        type: 'boss-attack' as const,
        teamIndex: team.teamIndex,
      },
      {
        id: `${input.eventPrefix}:team-attack:${team.teamIndex}`,
        type: 'team-attack' as const,
        teamIndex: team.teamIndex,
        amount: team.actualDamage,
      },
    ]),
    {
      id: `${input.eventPrefix}:cooperation`,
      type: 'cooperation',
      amount: cooperationDamage,
    },
    { id: `${input.eventPrefix}:result`, type: 'result' },
  ];
  return {
    ruleVersion: BATTLE_RULE_VERSION,
    seasonIndex: input.seasonIndex,
    bossId: input.bossId,
    matchCount: input.matchCount,
    calculatedAt,
    bossHp,
    cooperationDamage,
    teams,
    events,
  };
}

export function parseBattleAuthorityResult(value: unknown): BattleAuthorityResult {
  if (!object(value)) throw new Error('최종 대전 서버 결과를 확인해 주세요.');
  const firstEvent = Array.isArray(value.events) ? value.events[0] : null;
  const eventPrefix =
    object(firstEvent) &&
    typeof firstEvent.id === 'string' &&
    firstEvent.id.endsWith(':boss')
      ? firstEvent.id.slice(0, -':boss'.length)
      : '';
  const input = parseBattleAuthorityInput({
    ...value,
    eventPrefix,
    teams: Array.isArray(value.teams)
      ? value.teams.map((team) =>
          object(team)
            ? {
                teamIndex: team.teamIndex,
                teamName: team.teamName,
                inventory: team.inventory,
                heroIds: team.heroIds,
                bestJumperExtra: team.bestJumperExtra,
              }
            : team,
        )
      : value.teams,
  });
  if (
    !date(value.calculatedAt) ||
    !integer(value.bossHp, 1) ||
    !integer(value.cooperationDamage) ||
    !Array.isArray(value.teams) ||
    !Array.isArray(value.events)
  )
    throw new Error('최종 대전 서버 결과를 확인해 주세요.');
  const expected = calculateBattleAuthority(input, value.calculatedAt);
  const canonical = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(canonical)
      : object(item)
        ? Object.fromEntries(
            Object.keys(item)
              .sort()
              .map((key) => [key, canonical(item[key])]),
          )
        : item;
  if (JSON.stringify(canonical(value)) !== JSON.stringify(canonical(expected)))
    throw new Error('최종 대전 서버 결과의 산식을 확인해 주세요.');
  return expected;
}
