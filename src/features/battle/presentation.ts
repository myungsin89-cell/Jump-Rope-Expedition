import type { BattleTeamResult, SeasonBattle } from './model';

export type BattlePresentationCueType =
  | 'boss-intro'
  | 'deployment'
  | 'defense'
  | 'unit-attack'
  | 'hero-attack'
  | 'cooperation'
  | 'victory';

export interface BattlePresentationCue {
  id: string;
  type: BattlePresentationCueType;
  durationMs: number;
  teamIndex?: number;
  unitId?: 'UNIT_01' | 'UNIT_02' | 'UNIT_03' | 'UNIT_04';
  heroIds?: string[];
  defenseType?: 'physical' | 'magic';
  amount?: number;
  teamCumulative: number;
  globalDamage: number;
  roundNumber?: number;
  roundTotal?: number;
  actionIndex?: number;
  actionCount?: number;
}

interface BossPresentationRule {
  defenseType: 'physical' | 'magic';
  acornWeight: number;
  hammerWeight: number;
}

interface PlannedAttack {
  type: 'unit-attack' | 'hero-attack';
  unitId?: 'UNIT_01' | 'UNIT_02';
  heroIds?: string[];
  amount?: number;
}

const bossRules: Record<string, BossPresentationRule> = {
  BOSS_01: { defenseType: 'physical', acornWeight: 0.85, hammerWeight: 1.35 },
  BOSS_02: { defenseType: 'magic', acornWeight: 1.4, hammerWeight: 0.8 },
  BOSS_03: { defenseType: 'magic', acornWeight: 0.9, hammerWeight: 1.3 },
  BOSS_04: { defenseType: 'physical', acornWeight: 1.3, hammerWeight: 0.85 },
  BOSS_05: { defenseType: 'magic', acornWeight: 1.15, hammerWeight: 1.15 },
};

function distributeInteger(total: number, weights: number[]): number[] {
  if (total <= 0 || !weights.length) return weights.map(() => 0);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal <= 0) return weights.map((_, index) => (index === 0 ? total : 0));

  const exact = weights.map((weight) => (total * weight) / weightTotal);
  const allocated = exact.map(Math.floor);
  let remainder = total - allocated.reduce((sum, amount) => sum + amount, 0);
  exact
    .map((amount, index) => ({ index, fraction: amount - Math.floor(amount) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index)
    .forEach(({ index }) => {
      if (remainder <= 0) return;
      allocated[index] += 1;
      remainder -= 1;
    });
  return allocated;
}

function stableScore(value: string) {
  return [...value].reduce(
    (score, character) => (score * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
}

function shuffledTeams(teams: BattleTeamResult[], battleId: string) {
  return [...teams].sort(
    (left, right) =>
      stableScore(`${battleId}:${left.teamIndex}`) -
        stableScore(`${battleId}:${right.teamIndex}`) || left.teamIndex - right.teamIndex,
  );
}

function mixedRoundOrder(
  teams: BattleTeamResult[],
  battleId: string,
  roundIndex: number,
) {
  const base = shuffledTeams(teams, battleId);
  if (!base.length) return base;
  const offset = roundIndex % base.length;
  const rotated = [...base.slice(offset), ...base.slice(0, offset)];
  if (roundIndex % 2 === 0 || rotated.length < 3) return rotated;
  return [rotated[0], ...rotated.slice(1).reverse()];
}

function attackPlan(
  team: BattleTeamResult,
  rule: BossPresentationRule,
  battleId: string,
): PlannedAttack[] {
  const rawTotal = team.baseOffense + team.heroAttack;
  const heroDamage =
    rawTotal > 0 && team.heroAttack > 0
      ? Math.min(
          team.actualDamage,
          Math.round((team.actualDamage * team.heroAttack) / rawTotal),
        )
      : 0;
  const unitDamage = team.actualDamage - heroDamage;
  const hasHeroMoment = team.heroIds.length > 0;
  const unitHitCount = unitDamage > 0 ? (hasHeroMoment ? 3 : 4) : 0;
  const availableUnits = [
    {
      unitId: 'UNIT_01' as const,
      weight: team.inventory.UNIT_01 * rule.acornWeight,
    },
    {
      unitId: 'UNIT_02' as const,
      weight: team.inventory.UNIT_02 * rule.hammerWeight,
    },
  ]
    .filter((part) => part.weight > 0)
    .sort((left, right) => right.weight - left.weight);
  const fallbackUnit =
    team.inventory.UNIT_02 > team.inventory.UNIT_01
      ? { unitId: 'UNIT_02' as const, weight: 1 }
      : { unitId: 'UNIT_01' as const, weight: 1 };
  const attackingUnits = availableUnits.length ? availableUnits : [fallbackUnit];
  const unitIds = Array.from(
    { length: unitHitCount },
    (_, index) => attackingUnits[index % attackingUnits.length].unitId,
  );
  const unitWeights = unitIds.map(
    (unitId) =>
      attackingUnits.find((candidate) => candidate.unitId === unitId)?.weight ?? 1,
  );
  const unitAmounts = distributeInteger(unitDamage, unitWeights);
  const plan: PlannedAttack[] = unitIds.map((unitId, index) => ({
    type: 'unit-attack',
    unitId,
    amount: unitAmounts[index],
  }));

  if (hasHeroMoment) {
    const heroMoment: PlannedAttack = {
      type: 'hero-attack',
      heroIds: team.heroIds,
      amount: heroDamage || undefined,
    };
    const insertionPoint = Math.min(
      plan.length,
      1 + (stableScore(`${battleId}:hero:${team.teamIndex}`) % Math.max(1, plan.length)),
    );
    plan.splice(insertionPoint, 0, heroMoment);
  }

  return plan;
}

export function buildBattlePresentation(battle: SeasonBattle): BattlePresentationCue[] {
  const teams = battle.teams ?? [];
  const rule = bossRules[battle.bossId] ?? bossRules.BOSS_05;
  const cues: BattlePresentationCue[] = [
    {
      id: `${battle.id}:presentation:intro`,
      type: 'boss-intro',
      durationMs: 8_500,
      teamCumulative: 0,
      globalDamage: 0,
    },
    {
      id: `${battle.id}:presentation:deployment`,
      type: 'deployment',
      durationMs: Math.max(6_500, teams.length * 2_400 + 600),
      teamCumulative: 0,
      globalDamage: 0,
    },
  ];
  const plans = new Map(
    teams.map((team) => [team.teamIndex, attackPlan(team, rule, battle.id)]),
  );
  const roundTotal = Math.max(0, ...[...plans.values()].map((plan) => plan.length));
  const cumulativeByTeam = new Map(teams.map((team) => [team.teamIndex, 0]));
  let globalDamage = 0;

  for (let roundIndex = 0; roundIndex < roundTotal; roundIndex += 1) {
    const roundTeams = mixedRoundOrder(teams, battle.id, roundIndex);
    const defender = roundTeams[0];
    if (defender) {
      const defenseUnitId =
        rule.defenseType === 'physical' ? ('UNIT_03' as const) : ('UNIT_04' as const);
      cues.push({
        id: `${battle.id}:presentation:defense:${roundIndex}:${defender.teamIndex}`,
        type: 'defense',
        durationMs: 3_600,
        teamIndex: defender.teamIndex,
        unitId: defenseUnitId,
        defenseType: rule.defenseType,
        teamCumulative: cumulativeByTeam.get(defender.teamIndex) ?? 0,
        globalDamage,
        roundNumber: roundIndex + 1,
        roundTotal,
      });
    }

    roundTeams.forEach((team) => {
      const plan = plans.get(team.teamIndex) ?? [];
      const attack = plan[roundIndex];
      if (!attack) return;
      const amount = attack.amount ?? 0;
      const teamCumulative = (cumulativeByTeam.get(team.teamIndex) ?? 0) + amount;
      cumulativeByTeam.set(team.teamIndex, teamCumulative);
      globalDamage += amount;
      cues.push({
        id: `${battle.id}:presentation:${roundIndex}:${team.teamIndex}:${attack.type}`,
        type: attack.type,
        durationMs: attack.type === 'hero-attack' ? 6_200 : 3_400,
        teamIndex: team.teamIndex,
        unitId: attack.unitId,
        heroIds: attack.heroIds,
        amount: attack.amount,
        teamCumulative,
        globalDamage,
        roundNumber: roundIndex + 1,
        roundTotal,
        actionIndex: roundIndex + 1,
        actionCount: plan.length,
      });
    });
  }

  const cooperationDamage = battle.cooperationDamage ?? 0;
  globalDamage += cooperationDamage;
  cues.push(
    {
      id: `${battle.id}:presentation:cooperation`,
      type: 'cooperation',
      durationMs: 4_200,
      amount: cooperationDamage,
      teamCumulative: 0,
      globalDamage,
    },
    {
      id: `${battle.id}:presentation:victory`,
      type: 'victory',
      durationMs: 1_800,
      teamCumulative: 0,
      globalDamage,
    },
  );

  return cues;
}
