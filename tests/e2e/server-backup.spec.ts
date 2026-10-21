import { expect, test } from '@playwright/test';

const endpoint = 'http://127.0.0.1:9998/rest/v1/teacher_expeditions**';

test('saves the complete expedition and restores it automatically for the teacher', async ({
  page,
}) => {
  let serverSnapshot: Record<string, unknown> | null = null;
  const updatedAt = '2026-10-21T02:30:00.000Z';
  await page.route(endpoint, async (route) => {
    const request = route.request();
    expect(request.headers().authorization).toBe('Bearer e2e-test-session');
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as {
        owner_id: string;
        snapshot: Record<string, unknown>;
      };
      expect(body.owner_id).toBe('00000000-0000-4000-8000-000000000001');
      serverSnapshot = body.snapshot;
      await route.fulfill({
        json: [{ snapshot: serverSnapshot, updated_at: updatedAt }],
      });
      return;
    }
    await route.fulfill({
      json: serverSnapshot ? [{ snapshot: serverSnapshot, updated_at: updatedAt }] : [],
    });
  });

  await page.goto('/#/prepare');
  await page.getByText('목록에서 구분할 이름 정하기').click();
  await page.getByLabel('목록 표시 이름').fill('5학년 2반 명단');
  await page.getByLabel(/전체 학생 명단/).fill('김민준\n이서윤\n박도윤');
  await page.getByRole('button', { name: '원정 만들기', exact: true }).click();
  await expect(page).toHaveURL(/#\/preparations\/[0-9a-f-]+$/);
  expect((serverSnapshot?.plan as Record<string, unknown>).className).toBe(
    '5학년 2반 명단',
  );
  expect((serverSnapshot?.plan as { students: unknown[] }).students).toHaveLength(3);

  await page.evaluate(() => localStorage.clear());
  await page.goto('/#/preparations');
  await expect(page.getByRole('status')).toContainText('1개를 동기화');
  await expect(page.getByRole('link', { name: /5학년 2반 명단/ })).toBeVisible();
});
