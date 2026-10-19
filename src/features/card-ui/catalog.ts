import type { HeroDefinition, UnitDefinition } from './types';

// 병력 4종 일러스트
import unitAcornImg from '../../../assets/illustrations/units/unit-acorn-explorer-v1.png';
import unitHammerImg from '../../../assets/illustrations/units/unit-forest-hammer-v1.png';
import unitLeafImg from '../../../assets/illustrations/units/unit-leaf-guardian-v1.png';
import unitFairyImg from '../../../assets/illustrations/units/unit-starlight-fairy-v1.png';

// 영웅 15종 일러스트
import heroH01Img from '../../../assets/illustrations/heroes/hero-h01-robin-common-v1.png';
import heroH02Img from '../../../assets/illustrations/heroes/hero-h02-goliath-common-v1.png';
import heroH03Img from '../../../assets/illustrations/heroes/hero-h03-sylphid-common-v1.png';
import heroH04Img from '../../../assets/illustrations/heroes/hero-h04-popo-common-v1.png';
import heroH05Img from '../../../assets/illustrations/heroes/hero-h05-clover-common-v1.png';
import heroH06Img from '../../../assets/illustrations/heroes/hero-h06-bruno-common-v1.png';
import heroH07Img from '../../../assets/illustrations/heroes/hero-h07-luna-common-v1.png';
import heroH08Img from '../../../assets/illustrations/heroes/hero-h08-zephy-common-v1.png';
import heroH09Img from '../../../assets/illustrations/heroes/hero-h09-arco-rare-v1.png';
import heroH10Img from '../../../assets/illustrations/heroes/hero-h10-noah-rare-v1.png';
import heroH11Img from '../../../assets/illustrations/heroes/hero-h11-bella-rare-v1.png';
import heroH12Img from '../../../assets/illustrations/heroes/hero-h12-quad-rare-v1.png';
import heroH13Img from '../../../assets/illustrations/heroes/hero-h13-lumi-rare-v1.png';
import heroH14Img from '../../../assets/illustrations/heroes/hero-h14-astra-legendary-v1.png';
import heroH15Img from '../../../assets/illustrations/heroes/hero-h15-leon-legendary-v1.png';

export const UNITS_CATALOG: readonly UnitDefinition[] = [
  {
    id: 'UNIT_01',
    name: '도토리 탐험가',
    role: '원거리 공격',
    description: '기본 공격 100',
    price: 30,
    imageSrc: unitAcornImg,
  },
  {
    id: 'UNIT_02',
    name: '숲속 해머단',
    role: '근거리 공격',
    description: '기본 공격 100',
    price: 30,
    imageSrc: unitHammerImg,
  },
  {
    id: 'UNIT_03',
    name: '잎사귀 수호자',
    role: '물리 방어',
    description: '직접 공격 없이 공격 병력의 행동 시간을 지켜요',
    price: 30,
    imageSrc: unitLeafImg,
  },
  {
    id: 'UNIT_04',
    name: '별빛 요정',
    role: '마법 방어',
    description: '직접 공격 없이 공격 병력의 행동 시간을 지켜요',
    price: 30,
    imageSrc: unitFairyImg,
  },
] as const;

export const HEROES_CATALOG: readonly HeroDefinition[] = [
  {
    id: 'H01',
    name: '로빈',
    rarity: 'common',
    effect: '도토리 탐험가 공격 +10%',
    imageSrc: heroH01Img,
  },
  {
    id: 'H02',
    name: '골리앗',
    rarity: 'common',
    effect: '숲속 해머단 공격 +10%',
    imageSrc: heroH02Img,
  },
  {
    id: 'H03',
    name: '실피드',
    rarity: 'common',
    effect: '별빛 요정의 마법 방어 기여 +10%',
    imageSrc: heroH03Img,
  },
  {
    id: 'H04',
    name: '포포',
    rarity: 'common',
    effect: '전체 기본 공격 +7%',
    imageSrc: heroH04Img,
  },
  {
    id: 'H05',
    name: '클로버',
    rarity: 'common',
    effect: '잎사귀 수호자의 물리 방어 기여 +10%',
    imageSrc: heroH05Img,
  },
  {
    id: 'H06',
    name: '브루노',
    rarity: 'common',
    effect: '전체 물리 방어 +7%',
    imageSrc: heroH06Img,
  },
  {
    id: 'H07',
    name: '루나',
    rarity: 'common',
    effect: '전체 마법 방어 +7%',
    imageSrc: heroH07Img,
  },
  {
    id: 'H08',
    name: '제피',
    rarity: 'common',
    effect: '행동 가능 시간 +7%, 상한 적용',
    imageSrc: heroH08Img,
  },
  {
    id: 'H09',
    name: '아르코',
    rarity: 'rare',
    effect: '두 공격 병력 공격 +15%',
    imageSrc: heroH09Img,
  },
  {
    id: 'H10',
    name: '노아',
    rarity: 'rare',
    effect: '두 방어 병력 기여 +15%',
    imageSrc: heroH10Img,
  },
  {
    id: 'H11',
    name: '벨라',
    rarity: 'rare',
    effect: '전체 공격 +15%, 보스 공격 유형에 맞는 방어 +15%',
    imageSrc: heroH11Img,
  },
  {
    id: 'H12',
    name: '쿼드',
    rarity: 'rare',
    effect: '네 병력을 모두 보유하면 모든 기여 +18%',
    imageSrc: heroH12Img,
  },
  {
    id: 'H13',
    name: '루미',
    rarity: 'rare',
    effect:
      '현재 시즌 최고 도전점퍼 추가 기록을 영웅 공격으로 전환, 기본 공격의 20% 상한',
    imageSrc: heroH13Img,
  },
  {
    id: 'H14',
    name: '아스트라',
    rarity: 'legendary',
    effect: '공격·물리 방어·마법 방어 +20%',
    imageSrc: heroH14Img,
  },
  {
    id: 'H15',
    name: '레온',
    rarity: 'legendary',
    effect:
      '더 강한 방어 수치의 25%를 공격에 추가. 방어는 소모하지 않으며 기본 공격의 25% 상한',
    imageSrc: heroH15Img,
  },
] as const;

export const RARITY_LABELS = {
  common: '일반',
  rare: '희귀',
  legendary: '전설',
} as const;
