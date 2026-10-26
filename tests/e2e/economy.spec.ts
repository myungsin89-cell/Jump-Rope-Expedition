import { expect, test } from '@playwright/test';
import { seedOperation } from './operation-fixture';

test('purchases units and a private hint, then restores a mistaken purchase', async ({
  page,
}) => {
  const id = await seedOperation(page, 9);
  await page.evaluate((expeditionId) => {
    const plan = JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0];
    const history = [0, 1].map((round) => ({
      id: `match-${round}`,
      classId: expeditionId,
      seasonIndex: 0,
      locked: true,
      savedAt: `2026-10-${20 + round}T00:00:00.000Z`,
      official: {
        confirmedAt: `2026-10-${20 + round}T00:00:00.000Z`,
        awards: plan.teams.map((_: unknown, teamIndex: number) => ({
          teamKey: `team-${teamIndex}`,
          points: 60 - teamIndex * 10 + round * 20,
        })),
      },
      teams: plan.teams.map(
        (team: { name: string; studentIds: string[] }, teamIndex: number) => ({
          key: `team-${teamIndex}`,
          name: team.name,
          raw: String(100 + round * 10 - teamIndex * 10),
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
              actual: '0',
            },
          ],
        }),
      ),
    }));
    localStorage.setItem(
      `jre.practice-matches.v1.${expeditionId}`,
      JSON.stringify({ version: 1, classId: expeditionId, draft: null, history }),
    );
  }, id);
  await page.reload();

  await page
    .getByRole('button', { name: '포인트·구매 관리 · 잔액 140P' })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 2 })).toContainText('초록 원정대');
  await expect(dialog.locator('.economy-balance')).toContainText('140P');

  const unitPurchase = dialog.getByRole('button', { name: '도토리 탐험가 1명 구매' });
  await unitPurchase.scrollIntoViewIfNeeded();
  await unitPurchase.click();
  await expect(dialog).toContainText('구매 후 110P');
  await dialog.getByRole('button', { name: '네, 함께 결정했어요' }).click();
  await expect(dialog.locator('.economy-balance')).toContainText('110P');
  await expect(dialog.getByLabel('보유 수량 1명')).toBeVisible();

  await dialog.getByRole('button', { name: '힌트 구매 · 100P' }).click();
  await dialog.getByRole('button', { name: '네, 함께 결정했어요' }).click();
  await expect(dialog.locator('.economy-balance')).toContainText('10P');
  await expect(dialog.getByText('상대는 물리 공격을 주로 사용해요.')).toBeVisible();

  await dialog.getByText('전체 구매·취소 기록 2건').click();
  await dialog.getByRole('button', { name: '교사 구매 취소' }).first().click();
  await dialog.getByLabel('취소 사유').fill('힌트를 잘못 선택함');
  await dialog.getByRole('button', { name: '구매 취소 · 100P 환불' }).click();
  await expect(dialog.locator('.economy-balance')).toContainText('110P');
  await expect(dialog.getByRole('button', { name: '힌트 구매 · 100P' })).toBeVisible();

  await dialog.getByRole('button', { name: /포인트·구매 관리 닫기/ }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: '포인트·구매 관리 · 잔액 110P' }).first(),
  ).toBeVisible();
  await page.getByRole('link', { name: '명단', exact: true }).click();
  await expect(page.getByLabel('원정대 수')).toBeDisabled();
});

test('allows teacher to reverse student board purchases in team preparation modal', async ({
  page,
}) => {
  const id = await seedOperation(page, 9);
  await page.evaluate((expeditionId) => {
    const plan = JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0];
    const history = [
      {
        id: 'match-0',
        classId: expeditionId,
        seasonIndex: 0,
        locked: true,
        savedAt: '2026-10-20T00:00:00.000Z',
        official: {
          confirmedAt: '2026-10-20T00:00:00.000Z',
          awards: plan.teams.map((_: unknown, teamIndex: number) => ({
            teamKey: `team-${teamIndex}`,
            points: 60 - teamIndex * 10,
          })),
        },
        teams: plan.teams.map(
          (team: { name: string; studentIds: string[] }, teamIndex: number) => ({
            key: `team-${teamIndex}`,
            name: team.name,
            raw: String(100 - teamIndex * 10),
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
                actual: '0',
              },
            ],
          }),
        ),
      },
    ];
    localStorage.setItem(
      `jre.practice-matches.v1.${expeditionId}`,
      JSON.stringify({ version: 1, classId: expeditionId, draft: null, history }),
    );
    localStorage.setItem(
      `jre.practice-economy.v1.${expeditionId}`,
      JSON.stringify({
        version: 1,
        expeditionId,
        purchases: [
          {
            id: 'student-buy-unit',
            teamKey: 'team-0',
            teamName: '초록 원정대',
            seasonIndex: 0,
            itemId: 'UNIT_01',
            itemName: '도토리 탐험가',
            price: 30,
            purchasedAt: '2026-10-22T00:00:00.000Z',
            actor: 'student-board',
          },
        ],
        reversals: [],
      }),
    );
  }, id);

  await page.reload();
  await page
    .getByRole('button', {
      name: '포인트·구매 관리 · 잔액 30P · 학생 구매 1건',
    })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 2 })).toContainText('초록 원정대');
  await expect(dialog.locator('.economy-balance')).toContainText('30P');

  await expect(dialog.getByRole('heading', { name: '학생 구매 내역' })).toBeVisible();
  const reverseButton = dialog.getByRole('button', {
    name: '도토리 탐험가 학생 구매 취소',
  });
  await expect(reverseButton).toBeVisible();
  await reverseButton.click();

  await expect(
    dialog.getByText(
      '학생이 원정대 게시판에서 구매한 내역이에요. 취소하면 30P가 팀 잔액으로 환불되고 병력·힌트 반영도 취소됩니다.',
    ),
  ).toBeVisible();
  await dialog.getByLabel('취소 사유').fill('학생 실수 구매 취소');
  await dialog.getByRole('button', { name: '구매 취소 · 30P 환불' }).click();

  await expect(dialog.locator('.economy-notice')).toContainText(
    '도토리 탐험가 구매를 취소하고 30P를 환불했어요.',
  );
  await expect(dialog.locator('.economy-balance')).toContainText('60P');
  await expect(
    dialog
      .getByRole('region', { name: '학생 구매 내역' })
      .getByText('취소됨 · 학생 실수 구매 취소'),
  ).toBeVisible();
  await expect(dialog.getByText('0건 취소 가능')).toBeVisible();
});
