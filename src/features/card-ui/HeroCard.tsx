import { useState } from 'react';
import { RARITY_LABELS } from './catalog';
import type { HeroCardProps } from './types';
import './cards.css';

export default function HeroCard(props: HeroCardProps) {
  const [imageError, setImageError] = useState(false);

  // 미공개 봉인 카드 (Sealed)
  if (props.state === 'sealed') {
    return (
      <article
        aria-label="미공개 영웅 카드"
        className={`jre-card jre-card-sealed ${props.className || ''}`.trim()}
      >
        <div className="jre-card-sealed-inner">
          <span className="jre-card-sealed-symbol" aria-hidden="true">
            🗝️
          </span>
          <h3 className="jre-card-sealed-title">미공개 영웅</h3>
          <p className="jre-card-sealed-hint">
            시즌 임무를 달성하면
            <br />
            비밀 영웅이 깨어납니다
          </p>
        </div>
      </article>
    );
  }

  // 공개 카드 (Revealed)
  const { hero, className = '' } = props;
  const rarityLabel = RARITY_LABELS[hero.rarity];

  return (
    <article
      aria-label={`${hero.name} (${rarityLabel}) 영웅 카드`}
      className={`jre-card jre-card-hero jre-card-${hero.rarity} rarity-${hero.rarity} ${className}`.trim()}
    >
      <header className="jre-card-header">
        <div className="jre-card-title-group">
          <h3 className="jre-card-name">{hero.name}</h3>
        </div>
        <span className="jre-card-tag">{rarityLabel}</span>
      </header>

      <div className="jre-card-media">
        {imageError ? (
          <div className="jre-card-image-fallback" role="img" aria-label="이미지를 불러오지 못했어요">
            <span aria-hidden="true">🍃</span>
            <span>이미지를 불러오지 못했어요</span>
          </div>
        ) : (
          <img
            alt=""
            aria-hidden="true"
            className="jre-card-image"
            loading="lazy"
            onError={() => setImageError(true)}
            src={hero.imageSrc}
          />
        )}
      </div>

      <div className="jre-card-divider" aria-hidden="true" />

      <div className="jre-card-body">
        <p className="jre-card-description">{hero.effect}</p>
      </div>
    </article>
  );
}
