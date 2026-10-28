export type JumperMultiplier = 1 | 2 | 3;

export interface TeamMatchInput {
  teamKey: string;
  rawCount: number;
  jumpers: { studentId: string; multiplier: JumperMultiplier; actualCount: number }[];
}

export interface MatchPreview {
  teamKey: string;
  rawCount: number;
  extraCount: number;
  rankingCount: number;
  rank: number;
  participationPoints: number;
  rankingPoints: number;
  growthPoints: number;
  estimatedPoints: number;
  seasonBestRawCount: number | null;
  growthKind: 'baseline' | 'maintained' | 'improved' | 'breakthrough' | 'none';
}

function isCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function reachesPercent(value: number, baseline: number, percent: number): boolean {
  return BigInt(value) * 100n >= BigInt(baseline) * BigInt(percent);
}

/** Pure rule calculation. This preview does not authorize or post rewards. */
export function calculateMatchPreview(
  inputs: TeamMatchInput[],
  seasonBests: Pick<TeamMatchInput, 'teamKey' | 'rawCount'>[] = [],
): MatchPreview[] {
  if (
    inputs.length < 2 ||
    inputs.length > 4 ||
    new Set(inputs.map((team) => team.teamKey)).size !== inputs.length
  ) {
    throw new Error('서로 다른 2~4개 원정대 기록이 필요해요.');
  }
  const allStudents = new Set<string>();
  const counts = inputs.map((team) => {
    if (!team.teamKey || !isCount(team.rawCount) || team.jumpers.length > 2) {
      throw new Error('팀 원기록과 도전점퍼를 확인해 주세요.');
    }
    let extraCount = 0;
    for (const jumper of team.jumpers) {
      if (
        !jumper.studentId ||
        allStudents.has(jumper.studentId) ||
        ![1, 2, 3].includes(jumper.multiplier) ||
        !isCount(jumper.actualCount) ||
        jumper.actualCount > team.rawCount
      ) {
        throw new Error('도전점퍼의 실제 기록과 배수를 확인해 주세요.');
      }
      allStudents.add(jumper.studentId);
      extraCount += jumper.actualCount * (jumper.multiplier - 1);
    }
    const rankingCount = team.rawCount + extraCount;
    if (!isCount(extraCount) || !isCount(rankingCount))
      throw new Error('개수가 너무 커요. 입력을 확인해 주세요.');
    return { extraCount, rankingCount };
  });
  return inputs.map((team, index) => {
    const rank =
      1 +
      counts.filter((count) => count.rankingCount > counts[index].rankingCount).length;
    const seasonBestRawCount =
      seasonBests.find((entry) => entry.teamKey === team.teamKey)?.rawCount ?? null;
    if (seasonBestRawCount !== null && !isCount(seasonBestRawCount))
      throw new Error('시즌 최고 기록을 확인해 주세요.');
    const rankingPoints = ({ 1: 15, 2: 10, 3: 5, 4: 0 } as Record<number, number>)[rank];
    let growthPoints: number;
    let growthKind: MatchPreview['growthKind'];
    if (seasonBestRawCount === null) {
      growthPoints = 10;
      growthKind = 'baseline';
    } else if (team.rawCount > seasonBestRawCount) {
      const breakthrough =
        seasonBestRawCount === 0 ||
        reachesPercent(team.rawCount, seasonBestRawCount, 105);
      growthPoints = breakthrough ? 30 : 20;
      growthKind = breakthrough ? 'breakthrough' : 'improved';
    } else if (reachesPercent(team.rawCount, seasonBestRawCount, 95)) {
      growthPoints = 10;
      growthKind = 'maintained';
    } else {
      growthPoints = 0;
      growthKind = 'none';
    }
    return {
      teamKey: team.teamKey,
      rawCount: team.rawCount,
      ...counts[index],
      rank,
      participationPoints: 20,
      rankingPoints,
      growthPoints,
      estimatedPoints: 20 + rankingPoints + growthPoints,
      seasonBestRawCount,
      growthKind,
    };
  });
}
