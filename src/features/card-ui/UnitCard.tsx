import { useState } from 'react';
import type { UnitCardProps } from './types';
import './cards.css';

export default function UnitCard({ unit, ownedCount, className = '' }: UnitCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <article
      aria-label={`${unit.name} 병력 카드`}
      className={`jre-card jre-card-unit ${className}`.trim()}
    >
      <header className="jre-card-header">
        <div className="jre-card-title-group">
          <h3 className="jre-card-name">{unit.name}</h3>
        </div>
        <span className="jre-card-tag">{unit.role}</span>
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
            src={unit.imageSrc}
          />
        )}
      </div>

      <div className="jre-card-divider" aria-hidden="true" />

      <div className="jre-card-body">
        <p className="jre-card-description">{unit.description}</p>
      </div>

      <footer className="jre-card-footer">
        <span className="jre-card-price">
          <span aria-hidden="true">🪙</span>
          <span>{unit.price}P</span>
        </span>

        {ownedCount !== undefined && (
          <span className="jre-card-owned" aria-label={`보유 수량 ${ownedCount}명`}>
            <span>보유:</span>
            <strong>{ownedCount}</strong>
          </span>
        )}
      </footer>
    </article>
  );
}
