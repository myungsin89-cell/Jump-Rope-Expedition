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
  previousRawCount: number | null;
}

function isCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/** Pure rule calculation. This preview does not authorize or post rewards. */
export function calculateMatchPreview(
  inputs: TeamMatchInput[],
  previous: Pick<TeamMatchInput, 'teamKey' | 'rawCount'>[] = [],
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
    if (
      !team.teamKey ||
      !isCount(team.rawCount) ||
      team.jumpers.length < 1 ||
      team.jumpers.length > 2
    ) {
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
    const previousRawCount =
      previous.find((entry) => entry.teamKey === team.teamKey)?.rawCount ?? null;
    if (previousRawCount !== null && !isCount(previousRawCount))
      throw new Error('직전 기록을 확인해 주세요.');
    const rankingPoints = ({ 1: 30, 2: 20, 3: 10, 4: 0 } as Record<number, number>)[rank];
    const growthPoints =
      previousRawCount !== null && team.rawCount > previousRawCount ? 20 : 0;
    return {
      teamKey: team.teamKey,
      rawCount: team.rawCount,
      ...counts[index],
      rank,
      participationPoints: 30,
      rankingPoints,
      growthPoints,
      estimatedPoints: 30 + rankingPoints + growthPoints,
      previousRawCount,
    };
  });
}
