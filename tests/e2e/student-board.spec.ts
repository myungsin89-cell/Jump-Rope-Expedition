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
  await seedOperation(page);
  const original = await page.evaluate(() => localStorage.getItem('jre.preparations.v2'));
  await page.getByRole('button', { name: '학생 화면 공유', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('읽기');
  await page
    .getByRole('link', { name: '학생 화면 미리보기', exact: true })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('초록 원정대');
  await expect(page.locator('.student-roster li')).toHaveCount(10);
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
  await expect(page.locator('.jre-card-hero')).toHaveCount(15);
  await expect(page.getByText('실제 보유 카드가 아니며', { exact: false })).toBeVisible();
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
