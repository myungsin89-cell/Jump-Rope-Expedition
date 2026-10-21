import { expect, test } from '@playwright/test';
import { seedOperation } from './operation-fixture';

test('uses a compact expedition list with one clear create action and correct card padding', async ({
  page,
}) => {
  await seedOperation(page);
  await page.goto('/#/preparations');
  await expect(
    page.getByRole('heading', { name: '우리의 원정', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: '원정 만들기', exact: true })).toHaveCount(
    1,
  );
  const entry = page.locator('.operation-library-entry');
  expect(await entry.evaluate((element) => getComputedStyle(element).paddingLeft)).toBe(
    '24px',
  );
  expect(
    await entry.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThan(140);
  await page.screenshot({ path: 'artifacts/ready-library-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await entry
      .locator('h2')
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThan(180);
  expect(
    await entry.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThan(200);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({ path: 'artifacts/ready-library-mobile.png', fullPage: true });
});

test('previews a read-only student team and browses real unit and hero cards without exposing the boss', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const id = await seedOperation(page);
  await page.evaluate((expeditionId) => {
    localStorage.setItem(
      `jre.practice-heroes.v1.${expeditionId}`,
      JSON.stringify({
        version: 1,
        expeditionId,
        rewards: [
          {
            id: 'student-sealed',
            achievementId: 'student-achievement-1',
            missionId: 'FIVE_STEPS',
            teamIndex: 0,
            seasonIndex: 0,
            heroId: 'H01',
            awardedAt: '2026-10-21T00:00:00.000Z',
            contributorIds: [],
            contributorNames: [],
          },
          {
            id: 'student-revealed',
            achievementId: 'student-achievement-2',
            missionId: 'SHINING_CHALLENGE',
            teamIndex: 0,
            seasonIndex: 0,
            heroId: 'H02',
            awardedAt: '2026-10-21T00:00:00.000Z',
            revealedAt: '2026-10-22T00:00:00.000Z',
            contributorIds: [],
            contributorNames: [],
          },
        ],
      }),
    );
  }, id);
  const original = await page.evaluate(() => localStorage.getItem('jre.preparations.v2'));
  await page.getByRole('button', { name: '학생 화면 공유', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('읽기');
  await expect(
    page.getByRole('button', { name: '원정대 게시판 만들기', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('서버 연결됨', { exact: true })).toBeVisible();
  await expect(page.locator('.student-share-pending')).toHaveCount(3);
  await page
    .getByRole('link', { name: '학생 화면 미리보기', exact: true })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('초록 원정대');
  await expect(page.locator('.student-roster li')).toHaveCount(10);
  await expect(page.getByText('도전점퍼', { exact: true })).toHaveCount(0);
  expect(
    await page
      .locator('.student-roster li.is-jumper .student-member-name')
      .first()
      .evaluate((element) => getComputedStyle(element).textDecorationLine),
  ).toContain('underline');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /구매|기록하기|학생 추가|편성/ }),
  ).toHaveCount(0);
  await expect(page.getByText('바위 골렘', { exact: true })).toHaveCount(0);
  await expect(page.getByText('2배', { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: 'artifacts/ready-student-team-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '병력 카드', exact: true }).click();
  await expect(page.locator('.jre-card-unit')).toHaveCount(4);
  for (const img of await page.locator('.jre-card-image').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();
    expect(
      await img.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0);
  }
  await page.screenshot({
    path: 'artifacts/ready-student-cards-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '영웅 카드', exact: true }).click();
  await expect(page.locator('.student-owned-heroes .jre-card-hero')).toHaveCount(1);
  await expect(page.locator('.student-sealed-hero')).toHaveCount(1);
  await expect(page.locator('.student-card-grid .jre-card-hero')).toHaveCount(16);
  await expect(
    page.getByText('아직 만나지 못한 영웅까지', { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.getByRole('button', { name: '우리 원정대', exact: true }).click();
  await page.screenshot({
    path: 'artifacts/ready-student-team-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '명단 새로고침', exact: true }).click();
  await expect(page.locator('.student-roster li')).toHaveCount(10);
  expect(await page.evaluate(() => localStorage.getItem('jre.preparations.v2'))).toBe(
    original,
  );
  expect(errors).toEqual([]);
});

test('plays one scheduled hero reveal across a live team board', async ({ page }) => {
  const token = '33333333-3333-4333-8333-333333333333';
  const startedAt = new Date(Date.now() + 1_800).toISOString();
  const payload = {
    version: 1,
    expeditionName: '별빛 원정',
    teamName: '초록 원정대',
    teamIndex: 0,
    seasonNumber: 1,
    publishedAt: new Date().toISOString(),
    members: [{ name: '가람', number: 1, captain: true, jumper: false }],
    heroes: [{ slot: 1, revealed: true, heroId: 'H09' }],
    heroReveal: {
      eventId: 'reward-live-1',
      slot: 1,
      heroId: 'H09',
      startedAt,
    },
  };
  await page.route('**/functions/v1/student-board?token=*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
  await page.goto(`/#/team/${token}`);
  await expect(
    page.getByRole('heading', { level: 1, name: '초록 원정대' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '영웅 카드', exact: true }).click();
  await expect(page.locator('.student-sealed-hero')).toHaveCount(1);
  const reveal = page.locator('.student-live-reveal');
  await expect(reveal).toBeVisible({ timeout: 5_000 });
  await expect(reveal).toContainText('새로운 영웅이 합류했습니다');
  await expect(reveal.getByText('아르코', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'artifacts/student-live-hero-reveal.png',
    fullPage: true,
  });
});
