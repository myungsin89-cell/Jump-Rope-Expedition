import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BossCard from './BossCard';
import { BOSSES_CATALOG } from './boss-catalog';

describe('BOSSES_CATALOG (보스 5종 데이터 무결성 검증)', () => {
  it('정확히 5종의 보스가 등록되어 있어야 한다', () => {
    expect(BOSSES_CATALOG).toHaveLength(5);
  });

  it('모든 보스는 중복되지 않는 고유 ID와 이름을 가져야 한다', () => {
    const ids = new Set(BOSSES_CATALOG.map((b) => b.id));
    const names = new Set(BOSSES_CATALOG.map((b) => b.name));

    expect(ids.size).toBe(5);
    expect(names.size).toBe(5);
  });

  it('각 보스는 이미지 소스와 3개의 힌트 목록을 가져야 한다', () => {
    BOSSES_CATALOG.forEach((boss) => {
      expect(boss.imageSrc).toBeTruthy();
      expect(typeof boss.imageSrc).toBe('string');
      expect(boss.hints).toHaveLength(3);
      expect(boss.attackType).toBeTruthy();
      expect(boss.weakness).toBeTruthy();
    });
  });
});

describe('BossCard (보스 카드 컴포넌트 검증)', () => {
  it('공개된 보스 카드는 이름, 공격 성향, 약점, 설명을 정확히 렌더링해야 한다', () => {
    const rockGolem = BOSSES_CATALOG[0];
    render(<BossCard boss={rockGolem} state="revealed" />);

    expect(screen.getByText('바위 골렘')).toBeInTheDocument();
    expect(screen.getByText(rockGolem.seasonLabel)).toBeInTheDocument();
    expect(screen.getByText(rockGolem.attackType)).toBeInTheDocument();
    expect(screen.getByText(rockGolem.weakness)).toBeInTheDocument();
    expect(screen.getByText(rockGolem.description)).toBeInTheDocument();
  });

  it('비밀 상태(hidden)에서는 보스 이름과 약점이 DOM에 노출되지 않아야 한다', () => {
    const { container } = render(
      <BossCard
        hintsRevealed={[
          '땅속 깊은 잠에서 깨어난 거인은 가벼운 바람이나 작은 화살에는 눈 하나 깜짝하지 않네.',
        ]}
        state="hidden"
      />,
    );

    expect(screen.getByText('비밀 보스')).toBeInTheDocument();
    expect(screen.getByText(/땅속 깊은 잠에서 깨어난 거인/)).toBeInTheDocument();

    // 보스 실명이나 약점 텍스트가 DOM에 없어야 함
    expect(container.textContent).not.toContain('바위 골렘');
    expect(container.textContent).not.toContain('물리 80%');
  });

  it('비밀 상태에서는 3개의 단서 슬롯이 고정 표시되며 해금 상태와 잠금 상태가 구분되어야 한다', () => {
    render(
      <BossCard
        hintsRevealed={[
          '땅속 깊은 잠에서 깨어난 거인은 가벼운 바람이나 작은 화살에는 눈 하나 깜짝하지 않네.',
        ]}
        state="hidden"
      />,
    );

    // 진행률 표시
    expect(screen.getByText('1 / 3 해금')).toBeInTheDocument();

    // 1번 슬롯: 해금됨
    expect(screen.getByText('단서 1')).toBeInTheDocument();
    expect(screen.getByText('해금됨')).toBeInTheDocument();
    expect(screen.getByText(/땅속 깊은 잠에서 깨어난 거인/)).toBeInTheDocument();

    // 2번, 3번 슬롯: 잠김
    expect(screen.getByText('🔒 단서 2')).toBeInTheDocument();
    expect(screen.getByText('🔒 단서 3')).toBeInTheDocument();
    const lockedLabels = screen.getAllByText('잠김');
    expect(lockedLabels).toHaveLength(2);
    const lockedNotices = screen.getAllByText(
      '줄넘기 협동 포인트로 수수께끼를 풀어보세요',
    );
    expect(lockedNotices).toHaveLength(2);
  });
});
