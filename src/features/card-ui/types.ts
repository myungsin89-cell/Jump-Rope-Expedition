export type UnitRole = '원거리 공격' | '근거리 공격' | '물리 방어' | '마법 방어';

export interface UnitDefinition {
  id: 'UNIT_01' | 'UNIT_02' | 'UNIT_03' | 'UNIT_04';
  name: string;
  role: UnitRole;
  description: string;
  price: 30;
  imageSrc: string;
}

export type HeroRarity = 'common' | 'rare' | 'legendary';

export interface HeroDefinition {
  id: string;
  name: string;
  rarity: HeroRarity;
  effect: string;
  imageSrc: string;
}

export interface UnitCardProps {
  unit: UnitDefinition;
  /** 보유 수량이 주어지면 표시하고, undefined이면 수량 뱃지를 숨김 */
  ownedCount?: number;
  className?: string;
}

export type HeroCardProps =
  | {
      state: 'sealed';
      className?: string;
    }
  | {
      state: 'revealed';
      hero: HeroDefinition;
      className?: string;
    };

export type BossSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'special';

export interface BossDefinition {
  id: string;
  season: BossSeason;
  seasonLabel: string;
  name: string;
  title: string;
  theme: string;
  attackType: string;
  weakness: string;
  description: string;
  hints: string[];
  imageSrc: string;
}

export type BossCardProps =
  | {
      state: 'hidden';
      hintsRevealed?: string[];
      selected?: boolean;
      onSelect?: () => void;
      className?: string;
    }
  | {
      state: 'revealed';
      boss: BossDefinition;
      selected?: boolean;
      onSelect?: () => void;
      className?: string;
    };
