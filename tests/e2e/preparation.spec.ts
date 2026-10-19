import { expect, test } from '@playwright/test';

test('registers a roster, restores the draft and opens overview without a setup wizard', async ({
  page,
}) => {
  await page.goto('/#/preparations');
  await page.getByRole('link', { name: '원정 만들기', exact: true }).click();
  await expect(page.locator('#team-name-0')).toHaveCount(0);
  await expect(page.locator('#boss-0')).toHaveCount(0);
  await page.getByRole('button', { name: '원정 만들기', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('학생 이름');
  await expect(page.getByRole('alert')).toBeFocused();
  await page.locator('#class-roster').fill('김민준\n김민준\n이서윤');
  await page.reload();
  await expect(page.locator('#class-roster')).toHaveValue('김민준\n김민준\n이서윤');
  await page.getByRole('button', { name: '원정 만들기', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('우리 반 원정');
  const nav = page.getByRole('navigation', { name: '원정 메뉴' });
  await expect(nav.getByRole('link')).toHaveText(['현황', '명단', '시즌 설정']);
  await expect(nav.getByRole('link', { name: '현황', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.getByRole('button', { name: '경기 기록하기' }).click();
  await expect(page).toHaveURL(/\/roster$/);
  for (let index = 0; index < 3; index++) {
    await page
      .getByRole('button', { name: `${index + 1} 원정대 대원 편성`, exact: true })
      .click();
    await page.getByRole('dialog').getByRole('checkbox').nth(index).check();
    await page.getByRole('button', { name: '1명 편성 저장', exact: true }).click();
    await page
      .getByRole('button', { name: new RegExp(`^${index + 1}번 .* 상세$`) })
      .click();
    await page.getByRole('checkbox', { name: '도전점퍼로 지정', exact: true }).check();
    await page.getByRole('button', { name: '학생 정보 저장', exact: true }).click();
  }
  await page.getByRole('button', { name: '1 원정대 이름과 대장 설정' }).click();
  await page
    .getByRole('textbox', { name: '원정대 이름', exact: true })
    .fill('초록 원정대');
  const options = await page
    .locator('#operation-team-captain option')
    .evaluateAll((items) => items.map((item) => (item as HTMLOptionElement).value));
  await page.getByLabel('원정대장', { exact: true }).selectOption(options[1]);
  await page.getByRole('button', { name: '원정대 저장', exact: true }).click();
  await page.reload();
  await expect(page.locator('.operation-team').first()).toContainText('김민준');
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0],
  );
  expect(new Set(stored.students.map((student: { id: string }) => student.id)).size).toBe(
    3,
  );
  expect(stored.teams[0].captainId).toBe(stored.students[0].id);
  await page.getByRole('link', { name: '시즌 설정', exact: true }).click();
  await page.locator('#boss-0').selectOption('BOSS_01');
  await page.locator('#start-0').fill('2026-10-20');
  await page.locator('#end-0').fill('2026-11-20');
  await page.getByRole('button', { name: '이 시즌으로 기록하기', exact: true }).click();
  await expect(page).not.toHaveURL(/\/seasons$/);
  await page.getByRole('button', { name: '경기 기록하기' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '함께 넘은 개수를 기록해요',
  );
  await expect(page.locator('#raw-0')).toBeVisible();
});

test('keeps the simple create screen usable on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/preparations');
  await page.getByRole('link', { name: '원정 만들기', exact: true }).click();
  await page.getByRole('link', { name: '내용으로 이동', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/prepare$/);
  await page.locator('#class-roster').fill('학생1\n학생2\n학생3');
  await page.getByRole('button', { name: '원정 만들기', exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await expect(page.getByRole('navigation', { name: '원정 메뉴' })).toBeVisible();
});
