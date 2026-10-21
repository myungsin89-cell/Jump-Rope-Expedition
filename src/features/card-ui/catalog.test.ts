import { describe, expect, it } from 'vitest';
import { HEROES_CATALOG, RARITY_LABELS, UNITS_CATALOG } from './catalog';

describe('UNITS_CATALOG (병력 4종 카탈로그 검증)', () => {
  it('정확히 4종의 병력이 정의되어 있어야 한다', () => {
    expect(UNITS_CATALOG).toHaveLength(4);
  });

  it('모든 병력의 가격은 30P이고 고유한 ID를 가져야 한다', () => {
    const ids = new Set(UNITS_CATALOG.map((u) => u.id));
    expect(ids.size).toBe(4);

    UNITS_CATALOG.forEach((unit) => {
      expect(unit.price).toBe(30);
      expect(unit.name).toBeTruthy();
      expect(unit.role).toBeTruthy();
      expect(unit.description).toBeTruthy();
      expect(unit.imageSrc).toBeTruthy();
    });
  });

  it('지시서의 4대 병력 이름과 일치해야 한다', () => {
    const names = UNITS_CATALOG.map((u) => u.name);
    expect(names).toEqual(['도토리 탐험가', '숲속 해머단', '잎사귀 수호자', '별빛 요정']);
  });
});

describe('HEROES_CATALOG (영웅 15종 카탈로그 검증)', () => {
  it('정확히 15종의 영웅이 정의되어 있어야 한다', () => {
    expect(HEROES_CATALOG).toHaveLength(15);
  });

  it('일반 8종, 희귀 5종, 전설 2종의 등급 구성을 만족해야 한다', () => {
    const common = HEROES_CATALOG.filter((h) => h.rarity === 'common');
    const rare = HEROES_CATALOG.filter((h) => h.rarity === 'rare');
    const legendary = HEROES_CATALOG.filter((h) => h.rarity === 'legendary');

    expect(common).toHaveLength(8);
    expect(rare).toHaveLength(5);
    expect(legendary).toHaveLength(2);
  });

  it('모든 영웅은 고유 ID, 이름, 효과 문구, 이미지 경로를 가져야 한다', () => {
    const ids = new Set(HEROES_CATALOG.map((h) => h.id));
    expect(ids.size).toBe(15);

    HEROES_CATALOG.forEach((hero) => {
      expect(hero.id).toMatch(/^H(0[1-9]|1[0-5])$/);
      expect(hero.name).toBeTruthy();
      expect(hero.effect).toBeTruthy();
      expect(hero.imageSrc).toBeTruthy();
      expect(RARITY_LABELS[hero.rarity]).toBeTruthy();
    });
  });
});
