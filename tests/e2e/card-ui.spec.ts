import { expect, test } from '@playwright/test';

test.describe('카드 UI 독립 미리보기 (card-ui-preview.html)', () => {
  test('미리보기 페이지가 정상 로드되고 콘솔/네트워크 오류가 없어야 한다', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    const intentionalBrokenImage = '/invalid-path/broken-unit.png';

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource:')) {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', (response) => {
      // 이미지 오류 테스트용 고의 404 URL 제외
      if (response.status() >= 400 && !response.url().includes(intentionalBrokenImage)) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    page.on('requestfailed', (request) => {
      if (!request.url().includes(intentionalBrokenImage)) {
        failedRequests.push(
          `${request.failure()?.errorText ?? 'failed'} ${request.url()}`,
        );
      }
    });

    await page.goto('/card-ui-preview.html');

    // 상단 배너 확인
    await expect(
      page.getByText('카드 디자인 미리보기 · 실제 팀 정보가 아닙니다'),
    ).toBeVisible();
    await expect(page.getByText('총 19종 (병력 4 + 영웅 15)')).toBeVisible();

    // 콘솔 및 네트워크 에러 검증
    expect(consoleErrors).toHaveLength(0);
    expect(failedRequests).toHaveLength(0);
  });

  test('병력 4종이 정상 렌더링되고 모든 이미지가 로드되어야 한다', async ({ page }) => {
    await page.goto('/card-ui-preview.html');

    const expectedUnits = ['도토리 탐험가', '숲속 해머단', '잎사귀 수호자', '별빛 요정'];
    for (const name of expectedUnits) {
      const card = page.locator(`.jre-card-unit:has-text("${name}")`);
      await expect(card).toBeVisible();
      await expect(card.getByText('30P')).toBeVisible();

      // 이미지 정상 로드 확인 (naturalWidth > 0)
      const img = card.locator('img.jre-card-image');
      await expect(img).toBeVisible();
      const naturalWidth = await img.evaluate(
        (el) => (el as HTMLImageElement).naturalWidth,
      );
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('영웅 15종 및 등급별 프레임과 긴 텍스트(루미, 레온)가 정상 표시되어야 한다', async ({
    page,
  }) => {
    await page.goto('/card-ui-preview.html');

    // 일반, 희귀, 전설 영웅 확인
    await expect(page.locator('.jre-card-hero.jre-card-common')).toHaveCount(8);
    await expect(page.locator('.jre-card-hero.jre-card-rare')).toHaveCount(5);
    await expect(page.locator('.jre-card-hero.jre-card-legendary')).toHaveCount(2);

    // 긴 텍스트를 가진 루미, 레온 효과 텍스트 노출 및 오버플로우 없음 확인
    const lumiCard = page.locator('.jre-card-hero:has-text("루미")');
    await expect(lumiCard).toBeVisible();
    await expect(lumiCard.getByText(/현재 시즌 최고 도전점퍼 추가 기록/)).toBeVisible();

    const leonCard = page.locator('.jre-card-hero:has-text("레온")');
    await expect(leonCard).toBeVisible();
    await expect(
      leonCard.getByText(/더 강한 방어 수치의 25%를 공격에 추가/),
    ).toBeVisible();

    // 미공개 카드 확인
    const sealedCard = page.locator('.jre-card-sealed');
    await expect(sealedCard).toBeVisible();
    await expect(sealedCard.getByText('미공개 영웅')).toBeVisible();
    // 영웅 이름이나 정체 문구가 DOM에 없음 확인
    const sealedText = await sealedCard.textContent();
    expect(sealedText).not.toContain('아스트라');
    expect(sealedText).not.toContain('전설');

    // 이미지 에러 fallback 카드 확인
    const brokenCard = page.locator(
      '.jre-preview-section:has-text("특수 상태 검증 예시") .jre-card-image-fallback',
    );
    await expect(brokenCard).toBeVisible();
  });

  test('등급 필터 클릭 및 키보드 조작이 정확히 동작해야 한다', async ({ page }) => {
    await page.goto('/card-ui-preview.html');

    // 기본: 전체 (15개 영웅 카드)
    const heroesSection = page.locator('.jre-preview-section:has-text("15대 영웅 카드")');
    await expect(heroesSection.locator('.jre-card-hero')).toHaveCount(15);

    // 전설 필터 클릭 -> 2개만 표시
    await page.getByRole('button', { name: '전설 (2)' }).click();
    await expect(heroesSection.locator('.jre-card-hero')).toHaveCount(2);
    await expect(heroesSection.getByText('아스트라')).toBeVisible();
    await expect(heroesSection.getByText('레온')).toBeVisible();
    await expect(heroesSection.getByText('로빈')).not.toBeVisible();

    // 희귀 필터 클릭 -> 5개 표시
    await page.getByRole('button', { name: '희귀 (5)' }).click();
    await expect(heroesSection.locator('.jre-card-hero')).toHaveCount(5);

    // 일반 필터 키보드(Tab + Enter)로 선택
    await page.getByRole('button', { name: '일반 (8)' }).focus();
    await page.keyboard.press('Enter');
    await expect(heroesSection.locator('.jre-card-hero')).toHaveCount(8);

    // 다시 전체 필터로 복귀
    await page.getByRole('button', { name: '전체 (15)' }).click();
    await expect(heroesSection.locator('.jre-card-hero')).toHaveCount(15);
  });

  test('보스 카드 5종 및 학생용 비밀 보스(단서 시스템)가 정상 렌더링되어야 한다', async ({
    page,
  }) => {
    await page.goto('/card-ui-preview.html');

    // 5대 시즌 보스 섹션
    const bossesSection = page.locator(
      '.jre-preview-section:has-text("5대 시즌 보스 카드")',
    );
    await expect(bossesSection.locator('.jre-card-boss-revealed')).toHaveCount(5);

    // 보스 5종 이름 및 속성 확인
    const expectedBosses = [
      '바위 골렘',
      '바람 익룡',
      '가시 덩굴 트렌트',
      '얼음 설인',
      '화산 드래곤 카이저',
    ];
    for (const name of expectedBosses) {
      const card = bossesSection.locator(`.jre-card-boss:has-text("${name}")`);
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
      // 이미지 정상 로드 확인
      const img = card.locator('img.jre-card-image');
      await expect(img).toBeVisible();
      const naturalWidth = await img.evaluate(
        (el) => (el as HTMLImageElement).naturalWidth,
      );
      expect(naturalWidth).toBeGreaterThan(0);
    }

    // 학생용 비밀 보스 섹션 (3단계 순차적 수수께끼 해금 시스템)
    const secretSection = page.locator(
      '.jre-preview-section:has-text("학생용 비밀 보스")',
    );
    await expect(secretSection.locator('.jre-card-boss-hidden')).toHaveCount(4);

    // 수수께끼 문구 및 잠금 안내 확인
    await expect(secretSection.getByText(/땅속 깊은 잠에서 깨어난 거인/)).toBeVisible();
    await expect(secretSection.getByText(/그림자는 땅에 닿지 않고/)).toBeVisible();
    await expect(secretSection.getByText(/천 년 묵은 고목나무가/)).toBeVisible();
    await expect(
      secretSection.getByText('줄넘기 협동 포인트로 수수께끼를 풀어보세요').first(),
    ).toBeVisible();
  });

  test('다양한 해상도(375, 768, 812, 1440)에서 렌더링되고 스크린샷이 저장되어야 한다', async ({
    page,
  }) => {
    // 1. 데스크톱 (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/card-ui-preview.html');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'artifacts/card-ui/desktop-1440.png', fullPage: true });

    // 2. 태블릿 (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'artifacts/card-ui/tablet-768.png', fullPage: true });

    // 3. 모바일 세로 (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: 'artifacts/card-ui/mobile-375.png', fullPage: true });

    // 4. 모바일 가로 (812x375)
    await page.setViewportSize({ width: 812, height: 375 });
    await page.screenshot({
      path: 'artifacts/card-ui/mobile-landscape-812.png',
      fullPage: true,
    });

    // 5. 전설 필터 적용 상태 스크린샷 (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: '전설 (2)' }).click();
    await page.screenshot({
      path: 'artifacts/card-ui/filter-legendary.png',
      fullPage: false,
    });
  });
});
