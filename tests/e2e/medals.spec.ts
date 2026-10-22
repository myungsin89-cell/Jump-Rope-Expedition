import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { seedOperation } from './operation-fixture';

async function createMedal(page: Page) {
  await page.getByRole('link', { name: '명단', exact: true }).click();
  await page.getByRole('button', { name: '훈장 만들기·수여', exact: true }).click();
  await expect(page.getByText('아직 만든 훈장이 없어요.', { exact: true })).toBeVisible();
  await page.getByLabel('훈장 이름', { exact: true }).fill('도움의 손길');
  await page.getByLabel('설명·수여 기준', { exact: true }).fill('함께 준비한 친구에게');
  await page.getByRole('button', { name: '포도 보라 훈장', exact: true }).click();
  await page.getByRole('button', { name: '훈장 저장', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '도움의 손길 수정', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
}
async function openStudent(page: Page, number: number) {
  await page
    .getByRole('button', { name: new RegExp(`^${number}번 가상학생 ${number} .*상세$`) })
    .click();
}
async function giveMedal(page: Page) {
  await page.getByRole('button', { name: '도움의 손길 훈장 수여', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    '훈장을 주었어요',
  );
}
test('creates a custom medal and gives repeated awards with icons, history and exactly ten points each', async ({
  page,
}) => {
  await seedOperation(page);
  await createMedal(page);
  await page.getByRole('button', { name: '훈장 만들기·수여', exact: true }).click();
  await page.getByRole('tab', { name: '2. 학생에게 수여', exact: true }).click();
  await page.screenshot({ path: 'artifacts/medal-quick-award-desktop.png' });
  for (let count = 0; count < 2; count++) {
    await page
      .getByLabel('받을 학생', { exact: true })
      .selectOption({ label: '1번 가상학생 1 · 초록 원정대' });
    await page
      .getByRole('button', {
        name: '가상학생 1에게 훈장 수여 (+10P)',
        exact: true,
      })
      .click();
    await expect(page.getByRole('dialog').getByRole('status')).toContainText(
      '훈장을 주었어요',
    );
  }
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await openStudent(page, 1);
  await expect(page.getByText('도움의 손길 · 2회', { exact: true })).toBeVisible();
  await page.getByText('수여 이력', { exact: true }).click();
  await expect(
    page.getByRole('dialog').locator('.medal-student-list details li'),
  ).toHaveCount(2);
  await page.screenshot({ path: 'artifacts/medal-awarded-desktop.png' });
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: '원정대 수', exact: true }),
  ).toBeDisabled();
  await expect(
    page.locator('.operation-student-name').first().locator('.medal-icon'),
  ).toHaveCount(1);
  await expect(
    page.locator('.operation-student-name').first().locator('[fill="#8064a8"]'),
  ).toHaveCount(2);
  await page.getByRole('link', { name: '현황', exact: true }).click();
  await expect(page.locator('.operation-team').first()).toContainText('20P');
  await expect(page.locator('.operation-team').first()).toContainText(
    '서로 다른 수상자 1명',
  );
  await page.reload();
  await expect(page.locator('.operation-team').first()).toContainText('20P');
  expect(
    await page.evaluate(() => {
      const store = JSON.parse(
        localStorage.getItem('jre.practice-medals.v1.operation-sample')!,
      );
      return {
        awards: store.awards.length,
        points: store.entries.reduce(
          (sum: number, entry: { delta: number }) => sum + entry.delta,
          0,
        ),
        match: localStorage.getItem('jre.practice-matches.v1.operation-sample'),
      };
    }),
  ).toEqual({ awards: 2, points: 20, match: null });
  await page.getByRole('button', { name: '경기 기록하기', exact: true }).click();
  for (let index = 0; index < 3; index++) {
    await page.locator(`#raw-${index}`).fill(String(100 - index * 10));
    await page.locator(`#actual-${index}-0`).fill('0');
  }
  await page.getByRole('button', { name: '순위·포인트 미리보기', exact: true }).click();
  await page.getByRole('button', { name: '경기 결과 확정하기', exact: true }).click();
  await page.getByRole('link', { name: '현황으로 돌아가기', exact: true }).click();
  await expect(
    page.locator('.operation-team').first().locator('.operation-team-stats'),
  ).toContainText('80P');
  await page.reload();
  await expect(
    page.locator('.operation-team').first().locator('.operation-team-stats'),
  ).toContainText('80P');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('jre.practice-medals.v1.operation-sample')!)
          .entries.length,
    ),
  ).toBe(2);
});

test('retries failed awards once and preserves individual history when a student transfers teams', async ({
  page,
}) => {
  await seedOperation(page);
  await createMedal(page);
  await openStudent(page, 1);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let failOnce = true;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith('jre.practice-medals.') && failOnce) {
        failOnce = false;
        throw new DOMException('test quota', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '도움의 손길 훈장 수여', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    '수여하지 못했어요',
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('jre.practice-medals.v1.operation-sample')!)
          .entries,
    ),
  ).toEqual([]);
  await page.getByRole('button', { name: '도움의 손길 훈장 수여', exact: true }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '2 원정대 대원 편성', exact: true }).click();
  await page.getByRole('checkbox', { name: '1번 가상학생 1 편성', exact: true }).check();
  await page.getByRole('button', { name: '11명 편성 저장', exact: true }).click();
  await expect(page.locator('.operation-team').nth(1).locator('.medal-icon')).toHaveCount(
    1,
  );
  await openStudent(page, 1);
  await expect(page.getByText('도움의 손길 · 1회', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('link', { name: '현황', exact: true }).click();
  await expect(page.locator('.operation-team').first()).toContainText('10P');
  await expect(
    page.locator('.operation-team').nth(1).locator('.operation-team-stats'),
  ).not.toContainText('10P');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('jre.practice-medals.v1.operation-sample')!)
          .entries.length,
    ),
  ).toBe(1);
});

test('edits and deactivates definitions without rewriting historical awards', async ({
  page,
}) => {
  await seedOperation(page);
  await createMedal(page);
  await openStudent(page, 1);
  await giveMedal(page);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '훈장 만들기·수여', exact: true }).click();
  await page.getByRole('button', { name: '도움의 손길 수정', exact: true }).click();
  await page.getByLabel('훈장 이름', { exact: true }).fill('따뜻한 도움');
  await page.getByRole('button', { name: '노을 주황 훈장', exact: true }).click();
  await expect(page.locator('.medal-large-preview .medal-icon')).toBeVisible();
  await page.getByRole('button', { name: '변경 저장', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '따뜻한 도움 사용 중지', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '따뜻한 도움 다시 사용', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(
    page.locator('.operation-student-name').first().locator('[fill="#c96f3d"]'),
  ).toHaveCount(2);
  await openStudent(page, 1);
  await expect(page.getByText('도움의 손길 · 1회', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '따뜻한 도움 훈장 수여', exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      const value = JSON.parse(
        localStorage.getItem('jre.practice-medals.v1.operation-sample')!,
      );
      return {
        snapshot: value.awards[0].medal.name,
        active: value.definitions[0].active,
        color: value.definitions[0].color,
      };
    }),
  ).toEqual({ snapshot: '도움의 손길', active: false, color: '#c96f3d' });
});

test('keeps medal flows usable on mobile and does not guess points for unassigned students', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await seedOperation(page);
  await createMedal(page);
  await page.getByRole('button', { name: '학생 추가', exact: true }).click();
  await page.getByLabel('추가할 학생 이름', { exact: true }).fill('미배정 친구');
  await page.getByRole('button', { name: '1명 추가하기', exact: true }).click();
  await page.getByRole('button', { name: '31번 미배정 친구 상세', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '도움의 손길 훈장 수여', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('미배정 학생의 포인트 귀속');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await openStudent(page, 1);
  await giveMedal(page);
  await page.screenshot({ path: 'artifacts/medal-awarded-mobile.png' });
  expect(
    await page
      .getByRole('dialog')
      .evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
  ).toBe(true);
});

test('protects malformed local medal records and leaves other expedition data readable', async ({
  page,
}) => {
  const id = await seedOperation(page);
  await page.evaluate(
    (id) => localStorage.setItem(`jre.practice-medals.v1.${id}`, '{broken'),
    id,
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('원본');
  await expect(page.locator('.operation-team').first()).toContainText('확인 필요');
  await page.getByRole('link', { name: '명단', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '훈장 만들기·수여', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('.operation-roster-list > li')).toHaveCount(30);
  expect(
    await page.evaluate((id) => localStorage.getItem(`jre.practice-medals.v1.${id}`), id),
  ).toBe('{broken');
});
