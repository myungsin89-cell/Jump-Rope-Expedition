import { useMemo, useState } from 'react';
import BossCard from './BossCard';
import HeroCard from './HeroCard';
import UnitCard from './UnitCard';
import { BOSSES_CATALOG } from './boss-catalog';
import { HEROES_CATALOG, UNITS_CATALOG } from './catalog';
import type { HeroRarity, UnitDefinition } from './types';
import './cards.css';

type FilterType = 'all' | HeroRarity;

export default function CardPreview() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedBossId, setSelectedBossId] = useState<string>('BOSS_01');

  const filteredHeroes = useMemo(() => {
    if (filter === 'all') return HEROES_CATALOG;
    return HEROES_CATALOG.filter((h) => h.rarity === filter);
  }, [filter]);

  // 이미지 오류 테스트용 더미 유닛
  const brokenImageUnit: UnitDefinition = {
    id: 'UNIT_01',
    name: '오류 테스트 병력',
    role: '원거리 공격',
    description: '이미지 로드 실패 시 대체 텍스트가 정상 표시되는지 검증해요.',
    price: 30,
    imageSrc: '/invalid-path/broken-unit.png',
  };

  return (
    <div className="jre-preview-root">
      <div className="jre-preview-container">
        {/* 상단 배너 */}
        <header className="jre-preview-banner">
          <div className="jre-preview-banner-text">
            <strong>카드 디자인 미리보기 · 실제 팀 정보가 아닙니다</strong>
            <span>
              개발 검토용 카탈로그 화면이며, 실제 팀 잔액이나 획득 기록이 아닙니다.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="jre-card-tag" style={{ background: '#e8f5ed' }}>
              총 19종 (병력 4 + 영웅 15)
            </span>
            <span
              className="jre-card-tag"
              style={{ background: '#faebd0', color: '#6e4307' }}
            >
              보스 5종 추가
            </span>
          </div>
        </header>

        {/* 병력 4종 섹션 */}
        <section className="jre-preview-section" aria-labelledby="units-section-title">
          <div className="jre-preview-section-header">
            <h2 className="jre-preview-section-title" id="units-section-title">
              <span>🌲</span>
              <span>4대 정예 병력 카드</span>
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#556c5e' }}>
              *보유 수량 뱃지는 샘플 데이터입니다.
            </span>
          </div>

          <div className="jre-preview-grid">
            {UNITS_CATALOG.map((unit, index) => (
              <UnitCard
                key={unit.id}
                ownedCount={index === 0 ? 3 : index === 1 ? 0 : undefined}
                unit={unit}
              />
            ))}
          </div>
        </section>

        {/* 영웅 15종 섹션 */}
        <section className="jre-preview-section" aria-labelledby="heroes-section-title">
          <div className="jre-preview-section-header">
            <h2 className="jre-preview-section-title" id="heroes-section-title">
              <span>⭐</span>
              <span>15대 영웅 카드</span>
            </h2>

            {/* 등급 필터 버튼 그룹 */}
            <div aria-label="영웅 등급 필터" className="jre-preview-filters" role="group">
              <button
                aria-pressed={filter === 'all'}
                className="jre-preview-filter-btn"
                onClick={() => setFilter('all')}
                type="button"
              >
                전체 ({HEROES_CATALOG.length})
              </button>
              <button
                aria-pressed={filter === 'common'}
                className="jre-preview-filter-btn"
                onClick={() => setFilter('common')}
                type="button"
              >
                일반 ({HEROES_CATALOG.filter((h) => h.rarity === 'common').length})
              </button>
              <button
                aria-pressed={filter === 'rare'}
                className="jre-preview-filter-btn"
                onClick={() => setFilter('rare')}
                type="button"
              >
                희귀 ({HEROES_CATALOG.filter((h) => h.rarity === 'rare').length})
              </button>
              <button
                aria-pressed={filter === 'legendary'}
                className="jre-preview-filter-btn"
                onClick={() => setFilter('legendary')}
                type="button"
              >
                전설 ({HEROES_CATALOG.filter((h) => h.rarity === 'legendary').length})
              </button>
            </div>
          </div>

          <div className="jre-preview-grid">
            {filteredHeroes.map((hero) => (
              <HeroCard hero={hero} key={hero.id} state="revealed" />
            ))}
          </div>
        </section>

        {/* 특수 상태 검증 섹션 (미공개 및 이미지 오류) */}
        <section className="jre-preview-section" aria-labelledby="special-section-title">
          <div className="jre-preview-section-header">
            <h2 className="jre-preview-section-title" id="special-section-title">
              <span>🔒</span>
              <span>특수 상태 검증 예시</span>
            </h2>
          </div>

          <div className="jre-preview-grid">
            {/* 1. 미공개 영웅 카드 */}
            <HeroCard state="sealed" />

            {/* 2. 이미지 오류 상태 병력 카드 */}
            <UnitCard unit={brokenImageUnit} />
          </div>
        </section>

        {/* 5대 시즌 보스 카드 (시즌 최종 결전 및 교사용 선택) */}
        <section className="jre-preview-section" aria-labelledby="bosses-section-title">
          <div className="jre-preview-section-header">
            <h2 className="jre-preview-section-title" id="bosses-section-title">
              <span>🌋</span>
              <span>5대 시즌 보스 카드 (최종 결전 & 교사 선택)</span>
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#556c5e' }}>
              *카드를 클릭하면 이번 시즌 보스로 선택/해제됩니다.
            </span>
          </div>

          <div className="jre-preview-grid">
            {BOSSES_CATALOG.map((boss) => (
              <BossCard
                key={boss.id}
                boss={boss}
                onSelect={() => setSelectedBossId(boss.id)}
                selected={selectedBossId === boss.id}
                state="revealed"
              />
            ))}
          </div>
        </section>

        {/* 학생용 비밀 보스 & 3단계 순차 해금 시스템 예시 */}
        <section
          className="jre-preview-section"
          aria-labelledby="secret-boss-section-title"
        >
          <div className="jre-preview-section-header">
            <h2 className="jre-preview-section-title" id="secret-boss-section-title">
              <span>🌫️</span>
              <span>학생용 비밀 보스 (3단계 순차적 수수께끼 해금 시스템)</span>
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#556c5e' }}>
              *보스 정체와 약점은 숨겨져 있으며, 줄넘기 포인트로 1단계부터 순차적으로
              해금합니다.
            </span>
          </div>

          <div className="jre-preview-grid">
            {/* 1. 단서 0개 (시즌 시작 직후 - 모든 슬롯 잠김) */}
            <BossCard hintsRevealed={[]} state="hidden" />

            {/* 2. 단서 1개 해금 (바위 골렘 1단계 수수께끼 오픈) */}
            <BossCard
              hintsRevealed={[
                '땅속 깊은 잠에서 깨어난 거인은 가벼운 바람이나 작은 화살에는 눈 하나 깜짝하지 않네.',
              ]}
              state="hidden"
            />

            {/* 3. 단서 2개 해금 (바람 익룡 1, 2단계 수수께끼 오픈) */}
            <BossCard
              hintsRevealed={[
                '그림자는 땅에 닿지 않고, 푸른 하늘 높은 곳에서 구름을 가르며 맴돈다네.',
                '발아래 도끼와 망치는 허공만 가르고, 오직 저 높은 곳을 겨눈 도토리 화살만이 닿을 수 있도다.',
              ]}
              state="hidden"
            />

            {/* 4. 단서 3개 완전 해금 (가시 덩굴 트렌트 1, 2, 3단계 모두 오픈) */}
            <BossCard
              hintsRevealed={[
                '가을 숲 깊은 곳, 천 년 묵은 고목나무가 신비로운 보랏빛 이슬을 머금고 뒤틀린다네.',
                '질긴 덩굴을 걷어내려면 망치의 강한 힘과 함께, 얽히고설킨 주술을 달래줄 요정이 필요하리라.',
                '직접 주먹을 휘두르기보다 차가운 숲의 주술로 원정대의 발을 옥죄어 오노라.',
              ]}
              state="hidden"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
