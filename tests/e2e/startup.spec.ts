import { expect, test } from '@playwright/test';

test('opens the expedition list directly from the immersive cover', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('줄넘기 원정대');
  await expect(page.getByRole('heading', { name: '줄넘기 원정대' })).toBeVisible();
  await page.getByRole('button', { name: '원정 시작하기', exact: true }).click();
  await expect(page).toHaveURL(/#\/preparations$/);
  await expect(
    page.getByRole('heading', { name: '우리의 원정', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: '원정 만들기', exact: true }),
  ).toBeVisible();
});
