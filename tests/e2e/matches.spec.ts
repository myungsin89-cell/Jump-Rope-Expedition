import { expect, test } from '@playwright/test';
import { seedMatchClass } from './match-fixture';

test('confirms official results, posts points once, and preserves a cancellation audit', async ({
  page,
}) => {
  const id = await seedMatchClass(page);
  // Legacy practice drafts can still open their original per-record jumper selection.
  await page.goto(`/#/game/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '이번 도전의 주인공을 정해요',
  );
  await page.getByRole('button', { name: '도전점퍼 정하고 기록 입력' }).click();
  await expect(page.getByRole('alert')).toContainText('도전점퍼를 선택');
  await expect(page.getByRole('alert')).toBeFocused();
  await page.locator('#jumper-count-0').selectOption('2');
  for (let index = 0; index < 3; index++)
    await page.locator(`#jumper-${index}-0`).selectOption(`s-${index + 1}`);
  await expect(page.locator('#jumper-0-1 option[value="s-1"]')).toBeDisabled();
  await page.locator('#jumper-0-1').selectOption('s-4');
  await page.locator('#multiplier-0-0').selectOption('3');
  await page.locator('#multiplier-0-1').selectOption('2');
  await page.getByRole('button', { name: '도전점퍼 정하고 기록 입력' }).click();
  await expect(page.locator('#jumper-0-0')).toHaveCount(0);
  await page.getByRole('link', { name: '원정대 현황판으로 돌아가기' }).click();
  await expect(page).toHaveURL(new RegExp(`/#/preparations/${id}$`));
  await expect(page.getByRole('button', { name: '서버 저장', exact: true })).toHaveCount(
    0,
  );
  await page.goto(`/#/game/${id}`);
  await expect(page.locator('#raw-0')).toBeVisible();
  await page.getByRole('button', { name: '순위·포인트 미리보기' }).click();
  await expect(page.getByRole('alert')).toContainText('0 이상의 정수');
  for (let index = 0; index < 3; index++) {
    await page.locator(`#raw-${index}`).fill(['500', '550', '400'][index]);
    await page.locator(`#actual-${index}-0`).fill(index === 0 ? '600' : '0');
  }
  await page.locator('#actual-0-1').fill('10');
  await page.getByRole('button', { name: '순위·포인트 미리보기' }).click();
  await expect(page.locator('#actual-0-0-error')).toContainText(
    '팀 원기록보다 클 수 없어요',
  );
  await page.locator('#actual-0-0').fill('20');
  await page.reload();
  await expect(page.locator('#raw-0')).toHaveValue('500');
  await expect(page.locator('#actual-0-0')).toHaveValue('20');
  await expect(page.locator('#actual-0-1')).toHaveValue('10');
  await page.getByRole('button', { name: '순위·포인트 미리보기' }).click();
  const cards = page.locator('.match-result');
  await expect(cards.nth(0).locator('.match-ranking-count dd')).toHaveText('550개');
  await expect(cards.nth(0).locator('.match-result-rank')).toContainText('공동 1위');
  await expect(cards.nth(1).locator('.match-result-rank')).toContainText('공동 1위');
  await expect(cards.nth(2).locator('.match-result-rank')).toContainText('3위');
  await expect(cards.nth(0).locator('.match-point-preview strong')).toHaveText('45P');
  await expect(cards.nth(0).locator('[data-point="participation"] dd')).toHaveText(
    '+20P',
  );
  await expect(cards.nth(0).locator('[data-point="ranking"] dd')).toHaveText('+15P');
  await expect(cards.nth(0).locator('[data-point="growth"] dd')).toHaveText('+10P');
  await expect(cards.nth(0).locator('[data-point="growth"]')).toContainText(
    '이번 시즌 기준 기록',
  );
  await expect(cards.nth(0).locator('.match-point-equation')).toHaveText(
    '20P+15P+10P=45P',
  );
  await page.getByRole('button', { name: '경기 결과 확정하기', exact: true }).click();
  await expect(page.getByText('경기 기록 장부 1개')).toBeVisible();
  await expect(page.getByText('공식 확정', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'artifacts/official-match-confirmed-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await expect(cards.nth(0).locator('.match-point-breakdown')).toBeVisible();
  await page.screenshot({
    path: 'artifacts/official-match-confirmed-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  const stored = await page.evaluate((classId) => {
    const value = JSON.parse(localStorage.getItem(`jre.practice-matches.v1.${classId}`)!);
    return {
      draft: value.draft,
      count: value.history.length,
      hasPoints: 'estimatedPoints' in value.history[0],
      keys: Object.keys(localStorage).sort(),
    };
  }, id);
  expect(stored).toEqual({
    draft: null,
    count: 1,
    hasPoints: false,
    keys: ['jre.practice-matches.v1.record-board-class', 'jre.preparations.v2'],
  });
  await page.getByRole('button', { name: '잘못 확정한 기록 취소', exact: true }).click();
  await page.getByLabel('취소 사유').fill('첫 경기 기록 입력 오류');
  await page.getByRole('button', { name: '기록 취소 확정', exact: true }).click();
  await expect(page.getByText('취소됨', { exact: true })).toBeVisible();
  await expect(page.getByText(/첫 경기 기록 입력 오류/)).toBeVisible();
  await page.getByRole('button', { name: '다음 경기 기록', exact: true }).click();
  for (let index = 0; index < 3; index++)
    await page.locator(`#jumper-${index}-0`).selectOption(`s-${index + 1}`);
  await page.getByRole('button', { name: '도전점퍼 정하고 기록 입력' }).click();
  for (let index = 0; index < 3; index++) {
    await page.locator(`#raw-${index}`).fill(['510', '540', '400'][index]);
    await page.locator(`#actual-${index}-0`).fill('0');
  }
  await page.getByRole('button', { name: '순위·포인트 미리보기' }).click();
  await expect(cards.nth(0).locator('.match-point-preview strong')).toHaveText('40P');
  await expect(cards.nth(0).locator('[data-point="growth"] dd')).toHaveText('+10P');
  await expect(cards.nth(1).locator('[data-point="growth"] dd')).toHaveText('+10P');
  await expect(cards.nth(2).locator('[data-point="growth"] dd')).toHaveText('+10P');
});

test('requires prepared teams and seasons and stays usable at mobile width', async ({
  page,
}) => {
  const id = await seedMatchClass(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/#/game/${id}`);
  await expect(page.locator('.match-practice-badge')).toHaveText('공식 경기 기록판');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('jre.preparations.v2')!);
    saved[0].teams[0].studentIds = [];
    localStorage.setItem('jre.preparations.v2', JSON.stringify(saved));
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '팀과 시즌을 먼저 확인해 주세요' }),
  ).toBeVisible();
  await page.goto(`/#/preparations/${id}`);
  await page.getByRole('button', { name: '경기 기록하기' }).click();
  await expect(page).toHaveURL(/\/roster$/);
  await expect(page.locator('.operation-roster-list').first()).toBeVisible();
});
