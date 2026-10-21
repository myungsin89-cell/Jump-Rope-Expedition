import { expect, test } from '@playwright/test';
import { seedOperation } from './operation-fixture';

test('awards sealed mission cards, confirms team readiness and reveals one hero once', async ({
  page,
}) => {
  const id = await seedOperation(page, 9);
  await page.evaluate((expeditionId) => {
    const plan = JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0];
    const history = Array.from({ length: 6 }, (_, round) => {
      const confirmedAt = `2026-10-${String(round + 10).padStart(2, '0')}T00:00:00.000Z`;
      return {
        id: `hero-match-${round}`,
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
            raw: String(teamIndex === 0 ? 100 + round * 10 : 80 - teamIndex * 10),
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
                actual: String(teamIndex === 0 ? 10 + round : 5),
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
  }, id);
  await page.reload();

  const vaultButton = page.getByRole('button', {
    name: /영웅 보관함 · 3장 · 미공개 3/,
  });
  await expect(vaultButton).toBeVisible();
  await vaultButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('함께 공개할 카드')).toBeVisible();
  const sealedButtons = dialog.getByRole('button', { name: '팀원과 공개하기' });
  await expect(sealedButtons).toHaveCount(3);
  await sealedButtons.first().click();
  await expect(dialog.getByText('팀원들이 모두 함께 보고 있나요?')).toBeVisible();
  await expect(dialog.locator('.jre-card-hero')).toHaveCount(0);
  await dialog.getByRole('button', { name: '모두 함께 공개하기' }).click();
  await expect(dialog.getByText('새로운 영웅이 원정대에 합류했습니다')).toBeVisible();
  await expect(dialog.locator('.jre-card-hero')).toHaveCount(1);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'artifacts/hero-reveal-desktop.png', fullPage: false });
  await dialog.getByRole('button', { name: '영웅 보관함으로' }).click();
  await expect(dialog.getByText('이번 시즌 영웅')).toBeVisible();
  await expect(dialog.locator('.hero-owned-grid .jre-card-hero')).toHaveCount(1);
  await dialog.getByRole('button', { name: /영웅 보관함 닫기/ }).click();

  await page.reload();
  await expect(
    page.getByRole('button', { name: /영웅 보관함 · 3장 · 미공개 2/ }),
  ).toBeVisible();
  expect(
    await page.evaluate((expeditionId) => {
      const store = JSON.parse(
        localStorage.getItem(`jre.practice-heroes.v1.${expeditionId}`)!,
      );
      return {
        rewards: store.rewards.length,
        revealed: store.rewards.filter(
          (reward: { revealedAt?: string }) => reward.revealedAt,
        ).length,
      };
    }, id),
  ).toEqual({ rewards: 4, revealed: 1 });
});
