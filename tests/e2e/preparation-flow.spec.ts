import { expect, test } from '@playwright/test';
import { seedOperation } from './operation-fixture';

test('shows 30 students compactly, uses add/edit modals and preserves team identities', async ({
  page,
}) => {
  const id = await seedOperation(page);
  await expect(page.locator('.operation-team')).toHaveCount(3);
  await expect(page.locator('.operation-team').first()).toContainText('원정대장');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: 'artifacts/operation-overview-refined-desktop.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: '명단', exact: true }).click();
  const rows = page.locator('.operation-roster-list > li');
  await expect(rows).toHaveCount(30);
  expect(
    await rows.first().evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(64);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.screenshot({
    path: 'artifacts/operation-roster-refined-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '학생 추가', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: '추가할 학생 이름', exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: 'artifacts/operation-add-student-refined-desktop.png',
    fullPage: false,
  });
  expect(
    await page.getByRole('dialog').evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      return (
        Math.abs(
          rect.x +
            rect.width / 2 -
            document.documentElement.getBoundingClientRect().width / 2,
        ) < 3 && Math.abs(rect.y + rect.height / 2 - innerHeight / 2) < 3
      );
    }),
  ).toBe(true);
  await page.locator('#add-students-names').fill('새 학생\n새 학생');
  await page.getByRole('button', { name: '2명 추가하기', exact: true }).click();
  await expect(rows).toHaveCount(32);
  await expect(
    page.getByRole('button', { name: '학생 추가', exact: true }),
  ).toBeFocused();
  const firstMember = page
    .locator('.operation-roster-groups .operation-team')
    .first()
    .locator('.operation-student-name')
    .first();
  await firstMember.click();
  await page.screenshot({
    path: 'artifacts/operation-student-detail-refined-desktop.png',
    fullPage: false,
  });
  await page.getByRole('textbox', { name: '학생 이름', exact: true }).fill('수정한 이름');
  await page.getByRole('button', { name: '학생 정보 저장', exact: true }).click();
  await page.reload();
  await expect(firstMember).toContainText('수정한 이름');
  await expect(firstMember).toContainText('원정대장');
  const original = await page.evaluate(
    () => JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0],
  );
  expect(original.teams[0].captainId).toBe('s-1');
  expect(original.teams[0].studentIds).toContain('s-1');
  expect(original.students[30].id).not.toBe(original.students[31].id);
  await page.getByRole('link', { name: '현황', exact: true }).click();
  await page.getByRole('button', { name: '경기 기록하기' }).click();
  await page.locator('#raw-0').fill('77');
  await page.locator('#actual-0-0').fill('11');
  await page.getByRole('link', { name: '현황으로', exact: true }).click();
  await page.getByRole('link', { name: '명단', exact: true }).click();
  await firstMember.click();
  await page.getByRole('combobox', { name: '기록 배수', exact: true }).selectOption('3');
  await page.getByRole('button', { name: '학생 정보 저장', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: '원정대 수', exact: true }),
  ).toBeDisabled();
  await page.goto(`/#/preparations/${id}`);
  await page.getByRole('button', { name: '경기 기록하기' }).click();
  await expect(page.locator('#raw-0')).toHaveValue('77');
  await expect(page.locator('#actual-0-0')).toHaveValue('11');
  await expect(page.locator('.match-jumper-record').first()).toContainText('2배');
});

test('retains modal input on storage failure and retries without duplicate students', async ({
  page,
}) => {
  await seedOperation(page);
  await page.getByRole('link', { name: '명단', exact: true }).click();
  await page.getByRole('button', { name: '학생 추가', exact: true }).click();
  await page.locator('#add-students-names').fill('재시도 학생');
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
  await page.getByRole('button', { name: '1명 추가하기', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    '저장하지 못했어요',
  );
  await expect(page.locator('#add-students-names')).toHaveValue('재시도 학생');
  await expect(page.locator('.operation-roster-list > li')).toHaveCount(30);
  await page.getByRole('button', { name: '1명 추가하기', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.operation-roster-list > li')).toHaveCount(31);
  await page.reload();
  await expect(page.locator('.operation-roster-list > li')).toHaveCount(31);
  await page.getByRole('button', { name: '학생 추가', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: '학생 추가', exact: true }),
  ).toBeFocused();
});

test('keeps future seasons optional and the three operating menus responsive', async ({
  page,
}) => {
  await seedOperation(page);
  await page.getByRole('link', { name: '시즌 설정', exact: true }).click();
  await page.getByText('전체 시즌 수 미리 정하기 (선택)', { exact: true }).click();
  await page.getByRole('radio', { name: '5시즌', exact: true }).check();
  await expect(page.locator('#boss-4')).toHaveCount(0);
  await page.getByRole('button', { name: '이 시즌으로 기록하기' }).click();
  for (const size of [
    { width: 375, height: 812 },
    { width: 812, height: 375 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    for (const name of ['현황', '명단', '시즌 설정']) {
      await page.getByRole('link', { name, exact: true }).click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
      if (size.width === 375) {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: `artifacts/operation-${name}-refined-mobile.png`,
          fullPage: true,
        });
      }
    }
  }
  await page.getByRole('link', { name: '현황', exact: true }).click();
  await page.getByRole('button', { name: '경기 기록하기' }).click();
  await expect(page.locator('#practice-season option')).toHaveCount(1);
  await page.getByRole('link', { name: '현황으로', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('link', { name: '명단', exact: true }).click();
  await page.getByRole('button', { name: '학생 추가', exact: true }).click();
  expect(
    await page
      .getByRole('dialog')
      .evaluate((dialog) => dialog.getBoundingClientRect().width <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: 'artifacts/operation-add-student-refined-mobile.png',
    fullPage: false,
  });
  expect(
    await page.getByRole('dialog').evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      return (
        Math.abs(
          rect.x +
            rect.width / 2 -
            document.documentElement.getBoundingClientRect().width / 2,
        ) < 3 && Math.abs(rect.y + rect.height / 2 - innerHeight / 2) < 3
      );
    }),
  ).toBe(true);
});

for (const count of [2, 4])
  test(`confirms ${count} expedition teams with the decided rank bonuses`, async ({
    page,
  }) => {
    const id = await seedOperation(page, 8, false);
    await page.getByRole('link', { name: '명단', exact: true }).click();
    await page
      .getByRole('combobox', { name: '원정대 수', exact: true })
      .selectOption(String(count));
    if (count === 4) {
      await page.getByRole('button', { name: '4 원정대 대원 편성', exact: true }).click();
      await page
        .getByRole('checkbox', { name: '4번 가상학생 4 편성', exact: true })
        .check();
      await page.getByRole('button', { name: '1명 편성 저장', exact: true }).click();
    }
    for (let index = 1; index <= count; index++) {
      await page
        .getByRole('button', {
          name: new RegExp(`^${index}번 가상학생 ${index} .*상세$`),
        })
        .click();
      await page.getByRole('checkbox', { name: '도전점퍼로 지정', exact: true }).check();
      await page.getByRole('button', { name: '학생 정보 저장', exact: true }).click();
    }
    await page.getByRole('link', { name: '현황', exact: true }).click();
    await expect(page.locator('.operation-team')).toHaveCount(count);
    await page.getByRole('button', { name: '경기 기록하기' }).click();
    await expect(page.locator('.match-team-card')).toHaveCount(count);
    for (let index = 0; index < count; index++) {
      await page.locator(`#raw-${index}`).fill(String(500 - index * 100));
      await page.locator(`#actual-${index}-0`).fill('0');
    }
    await page.getByRole('button', { name: '순위·포인트 미리보기' }).click();
    if (count === 4) {
      await expect(
        page.locator('.match-result').last().locator('.match-point-preview strong'),
      ).toHaveText('30P');
    }
    await page.getByRole('button', { name: '경기 결과 확정하기', exact: true }).click();
    await page.getByRole('link', { name: '현황으로 돌아가기', exact: true }).click();
    await expect(
      page.locator('.operation-team').last().locator('.operation-team-stats'),
    ).toContainText(count === 4 ? '30P' : '50P');
    await page.reload();
    await expect(page.locator('.operation-team')).toHaveCount(count);
    expect(
      await page.evaluate(
        (id) =>
          JSON.parse(localStorage.getItem(`jre.practice-matches.v1.${id}`)!).history[0]
            .teams.length,
        id,
      ),
    ).toBe(count);
  });
