import type { CSSProperties } from 'react';

import { battleUnitAtlases } from './unitSprites';

export default function BattleUnitVisual({
  unitId,
  imageSrc,
  animated = false,
}: {
  unitId?: string;
  imageSrc: string;
  animated?: boolean;
}) {
  const atlas = unitId ? battleUnitAtlases[unitId] : undefined;

  if (!atlas) return <img alt="" draggable="false" src={imageSrc} />;

  return (
    <span
      aria-hidden="true"
      className={`battle-unit-sprite ${animated ? 'is-animated' : ''} sprite-${unitId === 'UNIT_01' ? 'acorn' : 'hammer'}`}
      data-sprite-unit={unitId}
      style={{ backgroundImage: `url("${atlas}")` } as CSSProperties}
    />
  );
}
