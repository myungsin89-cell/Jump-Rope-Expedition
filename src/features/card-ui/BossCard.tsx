import { useState } from 'react';
import type { BossCardProps } from './types';
import './cards.css';

export default function BossCard(props: BossCardProps) {
  const [imageError, setImageError] = useState(false);
  const { className = '', selected, onSelect } = props;

  // 1. 미공개 실루엣 상태 (학생용 시즌 진행 중)
  if (props.state === 'hidden') {
    const { hintsRevealed = [] } = props;

    return (
      <article
        aria-label="비밀 보스 카드"
        className={`jre-card jre-card-boss jre-card-boss-hidden ${selected ? 'is-selected' : ''} ${className}`.trim()}
        onClick={onSelect}
      >
        <header className="jre-card-header">
          <div className="jre-card-title-group">
            <h3 className="jre-card-name">비밀 보스</h3>
          </div>
          <span className="jre-card-tag jre-tag-boss-secret">미지의 상대</span>
        </header>

        <div className="jre-card-media jre-card-media-boss-hidden">
          <div className="jre-boss-silhouette-wrap" aria-hidden="true">
            <span className="jre-boss-silhouette-icon">🌫️</span>
            <span className="jre-boss-silhouette-symbol">❓</span>
          </div>
        </div>

        <div className="jre-card-divider jre-card-divider-boss" aria-hidden="true" />

        <div className="jre-card-body jre-card-body-boss">
          <div className="jre-boss-hints-list">
            <div className="jre-boss-hints-header">
              <span className="jre-boss-hints-title">📜 수수께끼 단서</span>
              <span className="jre-boss-hints-counter">
                {hintsRevealed.length} / 3 해금
              </span>
            </div>

            {/* 3단계 고정 단서 슬롯 */}
            {[0, 1, 2].map((slotIdx) => {
              const isUnlocked = slotIdx < hintsRevealed.length;
              const hintText = hintsRevealed[slotIdx];

              return isUnlocked ? (
                <div key={slotIdx} className="jre-boss-hint-slot is-unlocked">
                  <div className="jre-boss-hint-slot-header">
                    <span className="jre-boss-hint-badge">단서 {slotIdx + 1}</span>
                    <span className="jre-boss-hint-status">해금됨</span>
                  </div>
                  <p className="jre-boss-hint-text">“{hintText}”</p>
                </div>
              ) : (
                <div key={slotIdx} className="jre-boss-hint-slot is-locked">
                  <div className="jre-boss-hint-slot-header">
                    <span className="jre-boss-hint-badge is-locked">
                      🔒 단서 {slotIdx + 1}
                    </span>
                    <span className="jre-boss-hint-status is-locked">잠김</span>
                  </div>
                  <p className="jre-boss-hint-locked-text">
                    줄넘기 협동 포인트로 수수께끼를 풀어보세요
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {onSelect && (
          <footer className="jre-card-footer jre-card-footer-boss">
            <button
              type="button"
              className={`jre-boss-select-btn ${selected ? 'is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {selected ? '✓ 이번 시즌 보스' : '보스로 선택하기'}
            </button>
          </footer>
        )}
      </article>
    );
  }

  // 2. 공개 상태 (시즌 마지막 날 대공개 또는 교사용 선택 화면)
  const { boss } = props;

  return (
    <article
      aria-label={`${boss.name} (${boss.seasonLabel}) 보스 카드`}
      className={`jre-card jre-card-boss jre-card-boss-revealed season-${boss.season} ${selected ? 'is-selected' : ''} ${className}`.trim()}
      onClick={onSelect}
    >
      <header className="jre-card-header">
        <div className="jre-card-title-group">
          <h3 className="jre-card-name">{boss.name}</h3>
        </div>
        <span className="jre-card-tag jre-tag-boss">{boss.seasonLabel}</span>
      </header>

      <div className="jre-card-media jre-card-media-boss">
        {imageError ? (
          <div
            className="jre-card-image-fallback"
            role="img"
            aria-label="보스 이미지를 불러오지 못했어요"
          >
            <span aria-hidden="true">🌋</span>
            <span>보스 이미지를 불러오지 못했어요</span>
          </div>
        ) : (
          <img
            alt=""
            aria-hidden="true"
            className="jre-card-image jre-card-image-boss"
            loading="lazy"
            onError={() => setImageError(true)}
            src={boss.imageSrc}
          />
        )}
      </div>

      <div className="jre-card-divider jre-card-divider-boss" aria-hidden="true" />

      <div className="jre-card-body jre-card-body-boss">
        <div className="jre-boss-stat-badge">
          <span className="jre-boss-stat-label">⚔️ 공격 성향:</span>
          <strong>{boss.attackType}</strong>
        </div>
        <div className="jre-boss-weakness-badge">
          <span className="jre-boss-weakness-label">🎯 공략 열쇠:</span>
          <strong>{boss.weakness}</strong>
        </div>
        <p className="jre-card-description jre-card-description-boss">
          {boss.description}
        </p>
      </div>

      {onSelect && (
        <footer className="jre-card-footer jre-card-footer-boss">
          <button
            type="button"
            className={`jre-boss-select-btn ${selected ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {selected ? '✓ 이번 시즌 보스' : '보스로 선택하기'}
          </button>
        </footer>
      )}
    </article>
  );
}
