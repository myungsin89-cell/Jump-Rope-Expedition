import { expect, test } from '@playwright/test';
import { seedOperation } from './operation-fixture';

test('closes a season, freezes the final battle, replays it and preserves the result', async ({
  page,
}) => {
  const id = await seedOperation(page, 9);
  await page.evaluate((expeditionId) => {
    const plan = JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0];
    const history = Array.from({ length: 3 }, (_, round) => {
      const confirmedAt = `2026-10-${String(20 + round).padStart(2, '0')}T00:00:00.000Z`;
      return {
        id: `battle-match-${round}`,
        classId: expeditionId,
        seasonIndex: 0,
        locked: true,
        savedAt: confirmedAt,
        official: {
          confirmedAt,
          awards: plan.teams.map((_: unknown, teamIndex: number) => ({
            teamKey: `team-${teamIndex}`,
            points: 60 - teamIndex * 10,
          })),
        },
        teams: plan.teams.map(
          (team: { name: string; studentIds: string[] }, teamIndex: number) => ({
            key: `team-${teamIndex}`,
            name: team.name,
            raw: String(130 - teamIndex * 15 + round * 5),
            members: team.studentIds.map((studentId: string) => {
              const at = plan.students.findIndex(
                (student: { id: string }) => student.id === studentId,
              );
              return { ...plan.students[at], number: at + 1 };
            }),
            jumpers: [
              {
                studentId: plan.jumpers[teamIndex][0].studentId,
                multiplier: 2,
                actual: String(12 + round),
              },
            ],
          }),
        ),
      };
    });
    localStorage.setItem(
      `jre.practice-matches.v1.${expeditionId}`,
      JSON.stringify({ version: 1, classId: expeditionId, draft: null, history }),
    );
    const unitNames = {
      UNIT_01: '도토리 탐험가',
      UNIT_02: '숲속 해머단',
      UNIT_03: '잎사귀 수호자',
      UNIT_04: '별빛 요정',
    } as const;
    const purchases = plan.teams.flatMap((team: { name: string }, teamIndex: number) =>
      Object.entries(unitNames).map(([itemId, itemName], unitIndex) => ({
        id: `battle-buy-${teamIndex}-${unitIndex}`,
        teamKey: `team-${teamIndex}`,
        teamName: team.name,
        seasonIndex: 0,
        itemId,
        itemName,
        price: 30,
        purchasedAt: `2026-10-2${teamIndex}T0${unitIndex}:00:00.000Z`,
        actor: 'local-team',
      })),
    );
    localStorage.setItem(
      `jre.practice-economy.v1.${expeditionId}`,
      JSON.stringify({
        version: 1,
        expeditionId,
        purchases,
        reversals: [],
      }),
    );
  }, id);
  await page.reload();

  await page.getByRole('button', { name: '시즌 종료 · 최종 대전' }).click();
  let dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: '시즌을 마치고 최종 대전을 준비할까요?' }),
  ).toBeVisible();
  await expect(dialog.getByText('확정 경기 3개의 결과')).toBeVisible();
  await dialog.getByRole('button', { name: '전투 결과 계산하기' }).click();

  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('계산 완료 · 결과 고정')).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: '최종 대전 · 바위 골렘' }),
  ).toBeVisible();
  expect(
    await page.evaluate((expeditionId) => {
      const heroes = JSON.parse(
        localStorage.getItem(`jre.practice-heroes.v1.${expeditionId}`)!,
      );
      return heroes.rewards.every(
        (reward: { heroId: string | null; revealedAt?: string }) =>
          !reward.heroId || Boolean(reward.revealedAt),
      );
    }, id),
  ).toBe(true);

  await dialog.getByRole('button', { name: '최종 대전 재생' }).click();
  await expect(dialog.locator('.battle-arena')).toBeVisible();
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: 'artifacts/final-battle-arena.png', fullPage: false });
  await dialog.getByRole('button', { name: '건너뛰기' }).click();
  await expect(dialog.getByText('시즌 1 최종 결과')).toBeVisible();
  await expect(
    dialog.locator('.battle-results li').filter({ hasText: '초록 원정대' }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/final-battle-result.png', fullPage: false });
  await dialog.getByRole('button', { name: '결과 저장하고 시즌 마치기' }).click();
  await dialog.getByRole('button', { name: '현황으로 돌아가기' }).click();

  await expect(page.getByRole('button', { name: '경기 기록하기' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '최종 대전 결과 보기' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '최종 대전 결과 보기' }).click();
  await expect(page.getByRole('dialog').getByText('시즌 1 최종 결과')).toBeVisible();
  expect(
    await page.evaluate((expeditionId) => {
      const store = JSON.parse(
        localStorage.getItem(`jre.practice-battles.v1.${expeditionId}`)!,
      );
      return {
        status: store.battles[0].status,
        ruleVersion: store.battles[0].ruleVersion,
        teams: store.battles[0].teams.length,
      };
    }, id),
  ).toEqual({ status: 'finished', ruleVersion: 'battle-v1', teams: 3 });
});
