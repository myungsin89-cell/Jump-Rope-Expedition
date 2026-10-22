import { expect, test } from '@playwright/test';

test('downloads, previews and restores a complete expedition backup', async ({
  page,
}) => {
  await page.goto('/#/prepare');
  await page.getByText('목록에서 구분할 이름 정하기').click();
  await page.getByLabel('목록 표시 이름').fill('우리의 숲속 원정');
  await page
    .getByLabel(/전체 학생 명단/)
    .fill('가상학생 1\n가상학생 2\n가상학생 3\n가상학생 4\n가상학생 5\n가상학생 6');
  await page.getByRole('button', { name: '원정 만들기', exact: true }).click();
  await expect(page).toHaveURL(/#\/preparations\/[0-9a-f-]+$/);
  await expect(page.getByText('저장 상태', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '저장·백업 관리', exact: true }).click();
  const downloadPromise = Promise.race([
    page.waitForEvent('download'),
    page
      .getByRole('alert')
      .waitFor()
      .then(async () => {
        throw new Error(await page.getByRole('alert').innerText());
      }),
  ]);
  await page.getByRole('button', { name: '전체 백업 파일 저장' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^줄넘기원정대_우리의 숲속 원정_\d{4}-\d{2}-\d{2}\.json$/,
  );
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByRole('button', { name: '닫기', exact: true }).click();

  await page.evaluate(() => localStorage.clear());
  await page.goto('/#/preparations');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: '백업 불러오기', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(path!);
  const dialog = page.getByRole('dialog', { name: '백업 불러오기' });
  await expect(dialog).toContainText('우리의 숲속 원정');
  await expect(dialog).toContainText('학생 6명 · 원정대 3개');
  expect(
    await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.getByRole('button', { name: '이 백업 복원', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('복원했어요');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.getByRole('link', { name: /우리의 숲속 원정/ })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const plan = JSON.parse(localStorage.getItem('jre.preparations.v2')!)[0];
        const practice = JSON.parse(
          localStorage.getItem(`jre.practice-matches.v1.${plan.id}`)!,
        );
        return { name: plan.className, history: practice.history.length };
      }),
    )
    .toEqual({ name: '우리의 숲속 원정', history: 0 });
});
