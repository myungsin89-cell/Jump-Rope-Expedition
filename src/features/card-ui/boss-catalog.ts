import type { BossDefinition } from './types';

// 보스 5종 원본 고화질 PNG 정적 import
import rockGolemImg from '../../../assets/illustrations/bosses/boss-rock-golem-v1.png';
import windWyvernImg from '../../../assets/illustrations/bosses/boss-wind-wyvern-v1.png';
import thornTreantImg from '../../../assets/illustrations/bosses/boss-thorn-treant-v1.png';
import iceYetiImg from '../../../assets/illustrations/bosses/boss-ice-yeti-v1.png';
import dragonKaiserImg from '../../../assets/illustrations/bosses/boss-volcanic-dragon-kaiser-v1.png';

export const BOSSES_CATALOG: BossDefinition[] = [
  {
    id: 'BOSS_01',
    season: 'spring',
    seasonLabel: '봄 시즌',
    name: '바위 골렘',
    title: '대지의 거수',
    theme: '대지 속성',
    attackType: '물리 80% · 마법 20%',
    weakness: '숲속 해머단의 묵직한 타격',
    description:
      '단단한 암석 피부로 공격을 튕겨내지만, 해머단의 강력한 충격과 잎사귀 수호자의 방어가 주효합니다.',
    hints: [
      '땅속 깊은 잠에서 깨어난 거인은 가벼운 바람이나 작은 화살에는 눈 하나 깜짝하지 않네.',
      '묵직한 통나무가 부딪치는 둔탁한 소리에만 거인의 돌 피부가 덜컥 흔들린다네.',
      '주먹 한 번에 땅이 갈라지니, 푸른 잎사귀의 굳센 방패가 없다면 원정대가 버티기 어려우리라.',
    ],
    imageSrc: rockGolemImg,
  },
  {
    id: 'BOSS_02',
    season: 'summer',
    seasonLabel: '여름 시즌',
    name: '바람 익룡',
    title: '창공의 지배자',
    theme: '폭풍 속성',
    attackType: '마법 75% · 물리 25%',
    weakness: '도토리 탐험가의 원거리 화살',
    description:
      '거센 돌풍을 몰고 하늘을 비행합니다. 별빛 요정의 마법 방어와 높은 하늘을 찌르는 도토리 화살이 필요합니다.',
    hints: [
      '그림자는 땅에 닿지 않고, 푸른 하늘 높은 곳에서 구름을 가르며 맴돈다네.',
      '발아래 도끼와 망치는 허공만 가르고, 오직 저 높은 곳을 겨눈 도토리 화살만이 닿을 수 있도다.',
      '날개짓 한 번에 번뜩이는 마법 돌풍이 부니, 요정의 은은한 별빛 장막이 우리를 지켜주리라.',
    ],
    imageSrc: windWyvernImg,
  },
  {
    id: 'BOSS_03',
    season: 'autumn',
    seasonLabel: '가을 시즌',
    name: '가시 덩굴 트렌트',
    title: '고대 숲의 장로',
    theme: '덩굴 속성',
    attackType: '마법 65% · 물리 35%',
    weakness: '해머단과 마법 방어 협동',
    description:
      '고대 숲의 마법 덩굴을 휘두릅니다. 단단한 나무껍질을 깰 해머단과 마법 덩굴을 막을 요정의 수호가 요구됩니다.',
    hints: [
      '가을 숲 깊은 곳, 천 년 묵은 고목나무가 신비로운 보랏빛 이슬을 머금고 뒤틀린다네.',
      '질긴 덩굴을 걷어내려면 망치의 강한 힘과 함께, 얽히고설킨 주술을 달래줄 요정이 필요하리라.',
      '직접 주먹을 휘두르기보다 차가운 숲의 주술로 원정대의 발을 옥죄어 오노라.',
    ],
    imageSrc: thornTreantImg,
  },
  {
    id: 'BOSS_04',
    season: 'winter',
    seasonLabel: '겨울 시즌',
    name: '얼음 설인',
    title: '설원의 거인',
    theme: '빙결 속성',
    attackType: '물리 75% · 마법 25%',
    weakness: '얼음 관절을 노리는 원거리 공격',
    description:
      '혹한의 냉기와 거대한 눈덩이를 던집니다. 잎사귀 수호자로 돌진을 막고 드러난 얼음 관절을 원거리에서 공략해야 합니다.',
    hints: [
      '입김만 불어도 강물이 얼어붙고, 새하얀 털북숭이 거인의 서릿발 눈빛이 번뜩이네.',
      '가까이 다가가면 거대한 얼음 주먹에 휩쓸리니, 멀리서 얼음 틈새 관절을 꿰뚫는 매의 눈이 필요하도다.',
      '단단한 바위눈이 우박처럼 날아오니, 잎사귀 수호자가 굳건히 버텨주어야 하리라.',
    ],
    imageSrc: iceYetiImg,
  },
  {
    id: 'BOSS_05',
    season: 'special',
    seasonLabel: '비밀 결전',
    name: '화산 드래곤 카이저',
    title: '화산의 제왕',
    theme: '화산 속성',
    attackType: '마법 60% · 물리 40%',
    weakness: '전 병력과 전설 영웅의 총력전',
    description:
      '용암과 화염 숨결을 뿜어내는 궁극의 수호자입니다. 모든 공격과 방어 병력, 그리고 원정대 영웅들의 총력전이 요구됩니다.',
    hints: [
      '검은 화산재 너머, 황금빛 불꽃을 품은 태고의 날갯짓이 깊은 잠에서 깨어나도다.',
      '발톱의 일격과 지옥불 숨결이 함께 몰아치니, 어느 한쪽 방어만으로는 살아남지 못하리라.',
      '원정대 모두가 손을 맞잡고 전설의 용사를 앞세울 때, 비로소 불길이 잠잠해지리라.',
    ],
    imageSrc: dragonKaiserImg,
  },
];
