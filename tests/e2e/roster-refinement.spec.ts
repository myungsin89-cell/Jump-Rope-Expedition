import { expect, test } from '@playwright/test';
import { seedOperation } from './operation-fixture';

test('uses outlined rosters, hides multipliers until student detail, and limits jumpers', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seedOperation(page);
  await expect(
    page.getByRole('button', { name: '경기 기록하기', exact: true }),
  ).toHaveText('경기 기록하기');
  await expect(page.getByText('2배', { exact: true })).toHaveCount(0);
  await expect(page.locator('.operation-student-name.is-jumper')).toHaveCount(3);
  expect(
    await page
      .locator('.operation-team')
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return (
          style.borderTopWidth === style.borderLeftWidth &&
          style.borderTopColor === style.borderLeftColor &&
          style.boxShadow === 'none'
        );
      }),
  ).toBe(true);
  expect(
    await page.locator('.operation-season-banner').evaluate((element) => {
      const style = getComputedStyle(element);
      return style.borderTopWidth === style.borderLeftWidth;
    }),
  ).toBe(true);
  await page
    .getByRole('button', { name: '1번 가상학생 1 원정대장 도전점퍼 상세', exact: true })
    .click();
  await expect(
    page.getByRole('combobox', { name: '기록 배수', exact: true }),
  ).toHaveValue('2');
  await expect(
    page.getByRole('button', { name: '학생 정보 저장', exact: true }),
  ).toBeInViewport();
  await page.getByRole('combobox', { name: '기록 배수', exact: true }).selectOption('3');
  await page.getByRole('button', { name: '학생 정보 저장', exact: true }).click();
  await expect(page.getByText('3배', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: '명단', exact: true }).click();
  await expect(page.getByRole('combobox')).toHaveCount(1); // only team count, not 30 team dropdowns
  await page.getByRole('button', { name: '4번 가상학생 4 상세', exact: true }).click();
  await page.getByRole('checkbox', { name: '도전점퍼로 지정', exact: true }).check();
  await page.getByRole('button', { name: '학생 정보 저장', exact: true }).click();
  await page.getByRole('button', { name: '7번 가상학생 7 상세', exact: true }).click();
  await page.getByRole('checkbox', { name: '도전점퍼로 지정', exact: true }).check();
  await page.getByRole('button', { name: '학생 정보 저장', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('최대 2명');
  await expect(page.getByRole('dialog').getByRole('alert')).toBeFocused();
  await page.getByRole('checkbox', { name: '도전점퍼로 지정', exact: true }).uncheck();
  await page.getByRole('button', { name: '학생 정보 저장', exact: true }).click();
  await page.reload();
  await expect(
    page
      .locator('.operation-roster-groups .operation-team')
      .first()
      .locator('.is-jumper'),
  ).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('selects a team together and safely retries a failed transfer without losing identities', async ({
  page,
}) => {
  await seedOperation(page);
  await page.getByRole('link', { name: '명단', exact: true }).click();
  const original = await page.evaluate(
    () => JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0],
  );
  await page.getByRole('button', { name: '1 원정대 대원 편성', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('checkbox')).toHaveCount(30);
  await expect(
    page.getByRole('checkbox', { name: '1번 가상학생 1 편성', exact: true }),
  ).toBeChecked();
  await page.getByRole('checkbox', { name: '2번 가상학생 2 편성', exact: true }).check();
  await page
    .getByRole('checkbox', { name: '4번 가상학생 4 편성', exact: true })
    .uncheck();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    '다른 원정대에서 1명 이동',
  );
  await page.screenshot({ path: 'artifacts/operation-arrange-refined-desktop.png' });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let failOnce = true;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'jre.preparations.v2' && failOnce) {
        failOnce = false;
        throw new DOMException('test quota', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '10명 편성 저장', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    '선택은 유지돼요',
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0],
    ),
  ).toEqual(original);
  await expect(
    page.getByRole('checkbox', { name: '2번 가상학생 2 편성', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: '10명 편성 저장', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '1 원정대 대원 편성', exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator('.operation-team').first()).toContainText('가상학생 2');
  await expect(page.locator('.operation-waiting')).toContainText('가상학생 4');
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0],
  );
  expect(stored.students).toEqual(original.students);
  expect(stored.teams[0].captainId).toBe('s-1');
  expect(stored.teams[1].captainId).toBeUndefined();
  expect(stored.jumpers[1]).toEqual([]);
  expect(
    new Set(stored.teams.flatMap((team: { studentIds: string[] }) => team.studentIds))
      .size,
  ).toBe(29);
});

test('supports mobile team selection, cancellation and student details without overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedOperation(page);
  await page.getByRole('link', { name: '명단', exact: true }).click();
  await page.getByRole('button', { name: '2 원정대 대원 편성', exact: true }).click();
  await page
    .getByRole('checkbox', { name: '30번 가상학생 30 편성', exact: true })
    .check();
  await expect(
    page.getByRole('button', { name: '11명 편성 저장', exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: 'artifacts/operation-arrange-refined-mobile.png' });
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0],
  );
  expect(stored.teams[1].studentIds).not.toContain('s-30');
  await page
    .getByRole('button', { name: '2번 가상학생 2 원정대장 도전점퍼 상세', exact: true })
    .click();
  await page.screenshot({
    path: 'artifacts/operation-student-detail-refined-mobile.png',
  });
  expect(
    await page
      .getByRole('dialog')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await expect(
    page.getByRole('button', { name: '학생 정보 저장', exact: true }),
  ).toBeInViewport();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: '2번 가상학생 2 원정대장 도전점퍼 상세',
      exact: true,
    }),
  ).toBeFocused();
});
