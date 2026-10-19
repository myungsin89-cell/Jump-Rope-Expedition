# 카드 UI 컴포넌트 구현 및 인계 문서

> 작성일: 2026-10-20  
> 담당 모듈: `src/features/card-ui/`  
> 대상: 메인 앱 개발자, 학생 팀 보드/상점 담당자, 교사 시즌 운영 담당자  

본 문서는 `docs/card-ui-agent-development-brief.md` 및 사용자 피드백에 따라 제작된 **병력 4종, 영웅 15종, 시즌 보스 5종 카드 컴포넌트(`UnitCard`, `HeroCard`, `BossCard`)**와 **수수께끼 단서 3단계 순차 해금 시스템**, 그리고 **독립 미리보기 화면(`CardPreview`)**의 최종 구현 및 인계 명세서입니다.

---

## 1. 구현된 컴포넌트 및 기능 요약

### 1) 병력 카드 (`UnitCard`)
- **대상**: 4대 정예 병력 (도토리 탐험가, 숲속 해머단, 잎사귀 수호자, 별빛 요정)
- **디자인**: 클래식 보드게임(러브레터 스타일)의 앤틱 월넛 우드 테두리(`border: 2.5px solid #3c2918`), 일러스트 하단 가로 구분선, 따뜻한 갈색 양피지 영역 분리.
- **표시 정보**: 고정 가격(`30P`), 역할 뱃지, 전투 설명, 전신 일러스트(100% contain, 잘림 방지).
- **보유 수량 지원**: `ownedCount` prop 지원 (미전달 시 숨김, `0` 전달 시 '보유: 0' 명시).
- **폴백 UI**: 이미지 로드 실패 시에도 카드 레이아웃과 텍스트를 온전히 보존하는 Fallback UI 내장.

### 2) 영웅 카드 (`HeroCard`)
- **대상**: 15대 영웅 (일반 8종, 희귀 5종, 전설 2종)
- **등급별 프레임 차별화 (학생들의 몰입감과 환호 유도)**:
  - **일반(Common)**: 단정하고 고풍스러운 클래식 앤틱 우드 테두리
  - **희귀(Rare)**: 신비로운 마법 사파이어/청록 테두리(`border: 2.5px solid #16536e`)와 크리스탈 구분선, 푸른빛 그림자 오라
  - **전설(Legendary)**: 압도적인 환호를 이끄는 황금 금박(Gold Foil) 엠보싱 3px 테두리(`border: 3px solid #b87c10`), 화려한 2중 골드 인라인 및 보석 구분선
- **상태 분리 (`state: 'revealed' | 'sealed'`)**:
  - `revealed`: 영웅 이름, 등급 뱃지(일반/희귀/전설 한글 표기), 전투 효과 문구 및 일러스트 렌더링.
  - `sealed`: 미공개 봉인 카드. 카드 뒷면 전용 잠금 그래픽과 안내 문구만 노출하며, 영웅 이름·등급·효과·이미지 소스가 DOM 트리에 일절 노출되지 않음 (치팅 방지).
- **긴 문구 가변 레이아웃**: 루미(H13), 레온(H15) 등 3~4줄 길이의 긴 특수 효과 텍스트도 줄바꿈과 여백이 온전히 유지됨.

### 3) 보스 카드 (`BossCard`)
- **대상**: 5대 시즌 보스 (바위 골렘, 바람 익룡, 가시 덩굴 트렌트, 얼음 설인, 화산 드래곤 카이저)
- **공개 상태 (`state: 'revealed'`)**:
  - 교사용 시즌 설정 화면 또는 시즌 마지막 날 대결 공개 시 사용.
  - 보스 이름, 시즌 뱃지, 전신 일러스트(가로형 와이번/드래곤 날개 포함 100% 온전한 contain 렌더링), 공격 성향(물리/마법 비율), 공략 열쇠 뱃지, 상세 설명 렌더링.
  - `selected`, `onSelect` prop을 지원하여 교사 화면에서 클릭 한 번으로 시즌 보스를 지정/해제 가능.
- **학생용 실루엣 상태 (`state: 'hidden'`)**:
  - 시즌 진행 중 학생 팀 보드에서 사용.
  - 짙은 다크 앤틱 안개 실루엣 처리, 보스 실명/약점 완전 은닉 (DOM에 미노출).
  - **3단계 순차 해금 수수께끼 단서 슬롯 시스템**:
    - 한 번에 다 보여주지 않고, 고정 3칸 슬롯 중 줄넘기 포인트로 해금한 개수만큼만 오픈.
    - `[단서 N/3 해금]` 카운터 제공.
    - **해금된 슬롯**: 밝은 황금빛 양피지 위에 동화풍 수수께끼 본문 표시.
    - **미해금 슬롯**: 🔒 자물쇠 아이콘과 함께 *"줄넘기 협동 포인트로 수수께끼를 풀어보세요"* 잠금 안내문 표시.

### 4) 동화풍 수수께끼 단서 3단계 (스탯 직접 노출 배제)
아이들이 스탯 수치("물리 80%")를 직접 보는 것이 아니라, 동화 속 예언/암호처럼 학급에서 토론하고 추리할 수 있도록 문구를 구성했습니다:
- **바위 골렘**: (1) 바람/화살 무효 ➡️ (2) 둔탁한 통나무 충격(해머단 연상) ➡️ (3) 푸른 잎사귀 방패(잎사귀 수호자 방어)
- **바람 익룡**: (1) 공중 비행 ➡️ (2) 도토리 화살만이 닿음(원거리 저격) ➡️ (3) 별빛 요정의 마법 장막(마법 방어)
- **가시 덩굴 트렌트**: (1) 신비로운 보랏빛 고목 ➡️ (2) 해머단과 요정의 협동 ➡️ (3) 숲의 차가운 주술(마법 공격 위주)
- **얼음 설인**: (1) 혹한의 설인 ➡️ (2) 얼음 틈새 관절 저격 ➡️ (3) 바위눈 투척(잎사귀 수호자 물리 방어)
- **화산 드래곤 카이저**: (1) 태고의 날갯짓 ➡️ (2) 발톱과 화염의 복합 공격 ➡️ (3) 전 병력 & 전설 영웅 총력전

---

## 2. 모듈 구조 및 파일 목록

모든 코드는 `src/features/card-ui/` 내부에 완전 격리되어 있으며, 기존 앱 소스나 전역 스타일을 오염시키지 않습니다.

```
src/features/card-ui/
├── types.ts                  # 병력, 영웅, 보스 인터페이스 및 Props 타입 정의
├── catalog.ts                # 병력 4종, 영웅 15종 메타데이터 카탈로그 (Vite 정적 import)
├── boss-catalog.ts           # 5대 시즌 보스 메타데이터 및 3단계 수수께끼 단서 카탈로그
├── cards.css                 # 네임스페이스(.jre-card-*) 격리된 전용 CSS & @font-face (Jua 서체)
├── UnitCard.tsx              # 병력 카드 컴포넌트
├── HeroCard.tsx              # 영웅 카드 컴포넌트 (공개/봉인)
├── BossCard.tsx              # 보스 카드 컴포넌트 (공개 대결/학생용 수수께끼 실루엣)
├── CardPreview.tsx           # 개발 검토용 독립 미리보기 화면 컴포넌트
├── preview-main.tsx          # 독립 미리보기 마운트 스크립트
├── index.ts                  # 외부 공개 export 통합 진입점
├── catalog.test.ts           # 병력/영웅 데이터 무결성 단위 테스트 (6 passed)
├── cards.test.tsx            # 병력/영웅 카드 렌더링 & 보안 은닉 단위 테스트 (9 passed)
└── boss-catalog.test.tsx     # 보스 데이터 및 3단계 슬롯 은닉 단위 테스트 (6 passed)
```

---

## 3. 메인 담당자 연동 가이드 (Quick Start)

메인 앱이나 학생 팀 보드, 교사용 시즌 설정 화면을 만드는 담당자는 `src/features/card-ui`에서 필요한 컴포넌트와 카탈로그를 한 줄로 가져와 사용할 수 있습니다.

### 1) 모듈 Import
```typescript
import {
  UnitCard,
  HeroCard,
  BossCard,
  UNITS_CATALOG,
  HEROES_CATALOG,
  BOSSES_CATALOG,
} from './features/card-ui';

import type {
  UnitDefinition,
  HeroDefinition,
  BossDefinition,
} from './features/card-ui';
```

### 2) 학생 팀 보드: 병력 상점 연동 예시
```tsx
import { UnitCard, UNITS_CATALOG } from './features/card-ui';

function TroopShopGrid({ teamTroops }: { teamTroops: Record<string, number> }) {
  return (
    <div className="troop-shop-grid">
      {UNITS_CATALOG.map((unit) => (
        <div key={unit.id} className="troop-shop-item">
          <UnitCard unit={unit} ownedCount={teamTroops[unit.id] ?? 0} />
          {/* 구매 버튼 및 모달은 상위에서 감싸서 처리 */}
          <button type="button" onClick={() => handleBuyTroop(unit.id)}>
            30P로 영입하기
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 3) 학생 팀 보드: 비밀 보스 & 수수께끼 힌트 슬롯 연동 예시
```tsx
import { BossCard, BOSSES_CATALOG } from './features/card-ui';

function TeamSecretBossSection({ currentSeasonBossId, unlockedHintCount }: {
  currentSeasonBossId: string;
  unlockedHintCount: number; // 0, 1, 2, 3
}) {
  const currentBoss = BOSSES_CATALOG.find((b) => b.id === currentSeasonBossId);
  // 해금된 개수만큼만 힌트 문자열 슬라이스 전달
  const hintsRevealed = currentBoss ? currentBoss.hints.slice(0, unlockedHintCount) : [];

  return (
    <div className="team-boss-section">
      {/* state="hidden"으로 전달하면 실명/스탯은 숨겨지고 3단계 슬롯이 자동 표시됨 */}
      <BossCard state="hidden" hintsRevealed={hintsRevealed} />
      
      {unlockedHintCount < 3 && (
        <button type="button" onClick={handleBuyNextHint}>
          단서 {unlockedHintCount + 1} 해금하기 ({[30, 50, 80][unlockedHintCount]}P)
        </button>
      )}
    </div>
  );
}
```

### 4) 교사용 시즌 설정: 시각적 보스 선택 화면 연동 예시
```tsx
import { BossCard, BOSSES_CATALOG } from './features/card-ui';

function BossSelector({ selectedBossId, onSelectBoss }: {
  selectedBossId: string;
  onSelectBoss: (bossId: string) => void;
}) {
  return (
    <div className="boss-gallery-grid">
      {BOSSES_CATALOG.map((boss) => (
        <BossCard
          key={boss.id}
          boss={boss}
          state="revealed"
          selected={selectedBossId === boss.id}
          onSelect={() => onSelectBoss(boss.id)}
        />
      ))}
    </div>
  );
}
```

### 5) 영웅 도감 / 보유 덱 연동 예시
```tsx
import { HeroCard, HEROES_CATALOG } from './features/card-ui';

function HeroDexGrid({ unlockedHeroIds }: { unlockedHeroIds: string[] }) {
  return (
    <div className="hero-dex-grid">
      {HEROES_CATALOG.map((hero) => {
        const isUnlocked = unlockedHeroIds.includes(hero.id);
        return isUnlocked ? (
          <HeroCard key={hero.id} state="revealed" hero={hero} />
        ) : (
          <HeroCard key={hero.id} state="sealed" />
        );
      })}
    </div>
  );
}
```

---

## 4. 검증 결과 및 테스트 스위트

| 검증 항목 | 명령어 | 결과 | 비고 |
| :--- | :--- | :---: | :--- |
| **TypeScript 타입 검사** | `npm run typecheck` | **통과 (0 error)** | 엄격 타입 검사 완료 |
| **단위 테스트 (Vitest)** | `npm test -- src/features/card-ui` | **21 passed** | 카탈로그, 보안 은닉, 3단계 슬롯 검증 |
| **E2E 브라우저 테스트** | `npx playwright test tests/e2e/card-ui.spec.ts --project=chromium` | **6 passed** | 데스크톱/태블릿/모바일 반응형 검증 |
| **프로덕션 빌드** | `npm run build` | **통과 (dist 정상 생성)** | 번들링 무결성 확인 |

### 검증 스크린샷 위치
- 전체 데스크톱 뷰 (1440×900): `artifacts/card-ui/desktop-1440.png`
- 태블릿 뷰 (768×1024): `artifacts/card-ui/tablet-768.png`
- 모바일 세로 뷰 (375×812): `artifacts/card-ui/mobile-375.png`
- 모바일 가로 뷰 (812×375): `artifacts/card-ui/mobile-landscape-812.png`
- 전설 필터 활성화 뷰: `artifacts/card-ui/filter-legendary.png`

---

## 5. 확인된 제약 사항 및 향후 고려 사항

1. **상점/장부 트랜잭션 로직 미포함**:
   - `UnitCard`, `HeroCard`, `BossCard`는 상태와 데이터를 받아 렌더링하는 순수 Presentation 컴포넌트입니다.
   - 포인트 차감, 학생 간 상의 확인 모달, 구매 취소 불가 규칙은 메인 앱/상점 담당 에이전트가 상위 컨테이너에서 처리해야 합니다.
2. **독립 미리보기 페이지**:
   - `http://127.0.0.1:4173/card-ui-preview.html`은 개발 및 검토 전용 화면이며 메인 사용자에게 노출되지 않습니다.
3. **일러스트 최적화**:
   - 현재 원본 고화질 PNG(장당 1~3MB)를 번들링하고 있으므로, 추후 정식 릴리즈 단계에서 WebP 변환 시 추가 성능 향상이 가능합니다.
