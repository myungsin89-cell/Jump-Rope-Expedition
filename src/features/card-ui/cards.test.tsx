import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CardPreview from './CardPreview';
import HeroCard from './HeroCard';
import UnitCard from './UnitCard';
import { HEROES_CATALOG, UNITS_CATALOG } from './catalog';
import type { HeroDefinition, UnitDefinition } from './types';

describe('UnitCard (병력 카드 컴포넌트 검증)', () => {
  const sampleUnit: UnitDefinition = UNITS_CATALOG[0]; // 도토리 탐험가

  it('병력의 이름, 역할, 설명, 고정 가격(30P)을 정확히 렌더링해야 한다', () => {
    render(<UnitCard unit={sampleUnit} />);

    expect(screen.getByRole('heading', { level: 3, name: '도토리 탐험가' })).toBeInTheDocument();
    expect(screen.getByText('원거리 공격')).toBeInTheDocument();
    expect(screen.getByText('기본 공격 100')).toBeInTheDocument();
    expect(screen.getByText('30P')).toBeInTheDocument();
  });

  it('보유 수량(ownedCount)이 전달되지 않으면 수량 영역을 렌더링하지 않아야 한다', () => {
    render(<UnitCard unit={sampleUnit} />);
    expect(screen.queryByText(/보유:/)).not.toBeInTheDocument();
  });

  it('보유 수량이 0으로 전달되면 "보유: 0"을 정상 표시해야 한다', () => {
    render(<UnitCard ownedCount={0} unit={sampleUnit} />);
    expect(screen.getByText('보유:')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('이미지 로드 오류 발생 시 fallback을 표시하면서도 텍스트 정보는 그대로 보존해야 한다', () => {
    render(<UnitCard unit={sampleUnit} />);
    const img = document.querySelector('img.jre-card-image');
    expect(img).toBeInTheDocument();

    // 이미지 에러 이벤트 발생
    if (img) fireEvent.error(img);

    expect(screen.getByText('이미지를 불러오지 못했어요')).toBeInTheDocument();
    expect(screen.getByText('도토리 탐험가')).toBeInTheDocument();
    expect(screen.getByText('30P')).toBeInTheDocument();
  });
});

describe('HeroCard (영웅 카드 컴포넌트 검증)', () => {
  const commonHero: HeroDefinition = HEROES_CATALOG[0]; // 로빈 (일반)
  const rareHero: HeroDefinition = HEROES_CATALOG.find((h) => h.rarity === 'rare')!; // 아르코
  const legendaryHero: HeroDefinition = HEROES_CATALOG.find((h) => h.rarity === 'legendary')!; // 아스트라

  it('공개된 카드는 이름, 한글 등급(일반/희귀/전설), 효과 문구를 정확히 렌더링해야 한다', () => {
    const { rerender } = render(<HeroCard hero={commonHero} state="revealed" />);
    expect(screen.getByText('로빈')).toBeInTheDocument();
    expect(screen.getByText('일반')).toBeInTheDocument();
    expect(screen.getByText(commonHero.effect)).toBeInTheDocument();

    rerender(<HeroCard hero={rareHero} state="revealed" />);
    expect(screen.getByText(rareHero.name)).toBeInTheDocument();
    expect(screen.getByText('희귀')).toBeInTheDocument();
    expect(screen.getByText(rareHero.effect)).toBeInTheDocument();

    rerender(<HeroCard hero={legendaryHero} state="revealed" />);
    expect(screen.getByText(legendaryHero.name)).toBeInTheDocument();
    expect(screen.getByText('전설')).toBeInTheDocument();
    expect(screen.getByText(legendaryHero.effect)).toBeInTheDocument();
  });

  it('미공개 카드(sealed)는 영웅 이름, 등급, 효과, 이미지가 DOM에 전혀 노출되지 않아야 한다', () => {
    render(<HeroCard state="sealed" />);

    expect(screen.getByText('미공개 영웅')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: '미공개 영웅 카드' })).toBeInTheDocument();

    // 어떤 영웅 정보도 DOM에 없어야 함 (보안 검증)
    expect(screen.queryByText('로빈')).not.toBeInTheDocument();
    expect(screen.queryByText('아스트라')).not.toBeInTheDocument();
    expect(screen.queryByText('공격 +10%')).not.toBeInTheDocument();
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });
});

describe('CardPreview (독립 미리보기 화면 검증)', () => {
  it('상단 배너 및 안내 문구가 표시되어야 한다', () => {
    render(<CardPreview />);
    expect(screen.getByText(/카드 디자인 미리보기/)).toBeInTheDocument();
    expect(screen.getByText(/실제 팀 정보가 아닙니다/)).toBeInTheDocument();
  });

  it('병력 4종과 영웅 15종 및 특수 상태 카드가 렌더링되어야 한다', () => {
    render(<CardPreview />);

    // 병력 4종 존재
    UNITS_CATALOG.forEach((u) => {
      expect(screen.getByText(u.name)).toBeInTheDocument();
    });

    // 기본 전체 필터 상태에서 영웅 15종 존재
    expect(screen.getByText('전체 (15)')).toBeInTheDocument();
    HEROES_CATALOG.forEach((h) => {
      expect(screen.getByText(h.name)).toBeInTheDocument();
    });

    // 미공개 카드 존재
    expect(screen.getByText('미공개 영웅')).toBeInTheDocument();
  });

  it('등급 필터 클릭 시 해당하는 영웅 카드만 필터링되어야 한다', () => {
    render(<CardPreview />);

    // 희귀 필터 클릭
    const rareBtn = screen.getByRole('button', { name: '희귀 (5)' });
    fireEvent.click(rareBtn);

    expect(rareBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('아르코')).toBeInTheDocument();
    expect(screen.getByText('노아')).toBeInTheDocument();

    // 일반 및 전설 영웅은 숨겨져야 함
    expect(screen.queryByText('로빈')).not.toBeInTheDocument();
    expect(screen.queryByText('아스트라')).not.toBeInTheDocument();
  });
});
