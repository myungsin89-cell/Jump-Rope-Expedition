import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { DEFENSE_TIMING } from './presentationTiming';
import type { BossAttackKind } from './bossPresentation';

function Arrow() {
  return (
    <svg className="battle-arrow-shape" viewBox="0 0 100 32">
      <path d="M10 15H78V19H10Z" fill="#bb8245" stroke="#523919" strokeWidth="1.5" />
      <path
        d="M75 8L96 17L75 26L80 17Z"
        fill="#fff1b4"
        stroke="#c99c49"
        strokeWidth="2"
      />
      <path
        d="M10 15L2 5L22 10L29 15M10 19L2 29L22 24L29 19"
        fill="#a9db8e"
        stroke="#51754d"
        strokeWidth="1.5"
      />
      <path d="M34 16H68" stroke="#fff4c5" strokeWidth="1.5" />
    </svg>
  );
}

function Rock({ ice = false }: { ice?: boolean }) {
  return (
    <svg className="battle-rock-shape" viewBox="0 0 100 100">
      <path
        d="M8 35L29 9L66 7L93 31L89 71L62 94L23 85L5 61Z"
        fill={ice ? '#7cbfdc' : '#9a8060'}
        stroke={ice ? '#e1fbff' : '#ead4a0'}
        strokeWidth="3"
      />
      <path
        d="M29 9L37 38L8 35M37 38L66 7L70 46L93 31M37 38L44 73L5 61M44 73L62 94L70 46L89 71"
        fill={ice ? '#c4edff' : '#b59b74'}
        stroke={ice ? '#4c96bd' : '#65533b'}
        strokeWidth="3"
      />
      <path
        d="M37 38L53 46L44 73M53 46L70 46"
        fill="none"
        stroke={ice ? '#fff' : '#ffc968'}
        strokeWidth="3"
      />
    </svg>
  );
}

function ElementalAttack({ kind }: { kind: 'wind' | 'vine' | 'fire' }) {
  return (
    <svg className={`battle-element-shape element-${kind}`} viewBox="0 0 120 90">
      {kind === 'wind' ? (
        <g fill="none" strokeLinecap="round">
          <path
            d="M7 25C28 1 96 2 108 28S70 70 29 50S35 10 82 23S103 62 62 68S22 77 19 66"
            stroke="#71d4c2"
            strokeWidth="15"
          />
          <path
            d="M9 25C42 9 99 11 105 32S57 66 31 46S47 19 82 30S83 56 56 56"
            stroke="#ecfff7"
            strokeWidth="5"
          />
          <path d="M40 77L64 80M5 50L15 54" stroke="#b7f4e5" strokeWidth="4" />
        </g>
      ) : kind === 'vine' ? (
        <g stroke="#233c24" strokeWidth="2" strokeLinejoin="round">
          <path
            d="M5 67Q22 66 40 40T79 30Q59 58 88 60L112 46Q103 81 76 74T53 48Q33 81 5 67Z"
            fill="#74a859"
          />
          <path
            d="M33 48L26 21L46 34M62 29L77 8L80 30M85 62L88 42L99 58M59 65L49 85L75 73"
            fill="#d5d58c"
          />
          <path d="M18 67Q43 57 50 43" fill="none" stroke="#b8d88a" strokeWidth="4" />
        </g>
      ) : (
        <g strokeLinejoin="round">
          <path
            d="M3 38L36 40L24 17L61 30L63 7Q121 25 113 56Q108 89 66 79L27 80L41 64L3 63L25 52Z"
            fill="#e45730"
            stroke="#ffe0a2"
            strokeWidth="3"
          />
          <path d="M28 49L61 45L55 28Q101 36 103 56T67 69L47 70L57 58Z" fill="#ffbe50" />
          <path d="M62 52Q93 39 96 58T62 64L74 58Z" fill="#fff6c7" />
        </g>
      )}
    </svg>
  );
}

export default function BattleEffects({
  kind,
  originY,
  playbackRate,
  guarded,
  attackLabel,
}: {
  kind: 'arrow' | 'hammer' | 'magic' | BossAttackKind;
  originY: string;
  playbackRate: number;
  guarded: boolean;
  attackLabel?: string;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({
    width: 1000,
    height: 400,
    mobile: false,
    actorX: 560,
    actorY: 180,
    victimX: 800,
    victimY: 200,
  });
  useEffect(() => {
    const element = layerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const field = element.parentElement;
      const fieldBox = element.getBoundingClientRect();
      const actor = field?.querySelector<HTMLElement>('.battle-action-unit');
      const victim = field
        ?.querySelector('.battle-squad.is-active .battle-squad-units')
        ?.getBoundingClientRect();
      setArea({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
        mobile: window.matchMedia('(max-width: 520px)').matches,
        actorX: actor
          ? actor.offsetLeft + actor.offsetWidth * 0.16
          : entry.contentRect.width * 0.56,
        actorY: actor
          ? actor.offsetTop + actor.offsetHeight * 0.46
          : entry.contentRect.height * 0.28,
        victimX: victim
          ? victim.left - fieldBox.left + victim.width * 0.5
          : entry.contentRect.width * 0.8,
        victimY: victim
          ? victim.top - fieldBox.top + victim.height * 0.5
          : entry.contentRect.height * 0.5,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { width, height, mobile } = area;
  const attacking = kind === 'arrow' || kind === 'hammer';
  const actionY = (parseFloat(originY) / 100) * height;
  const from = attacking
    ? { x: area.actorX, y: area.actorY }
    : { x: width * 0.27, y: height * (mobile ? 0.31 : 0.54) };
  const to = attacking
    ? { x: width * 0.25, y: height * (mobile ? 0.33 : 0.57) }
    : !guarded
      ? { x: area.victimX, y: area.victimY }
      : {
          x: width * (mobile ? 0.6 : 0.44),
          y: mobile ? height * 0.22 : Math.max(8, actionY - 220) + 110,
        };
  const delay =
    kind === 'arrow' ? 1496 : kind === 'hammer' ? 1700 : DEFENSE_TIMING.launch;
  const duration = kind === 'arrow' ? 604 : DEFENSE_TIMING.impact - DEFENSE_TIMING.launch;
  const impact = kind === 'hammer' ? 1700 : delay + duration;
  const flightStyle = {
    left: from.x,
    top: from.y,
    '--flight-x': `${to.x - from.x}px`,
    '--flight-y': `${to.y - from.y}px`,
    '--flight-angle': `${Math.atan2(to.y - from.y, to.x - from.x)}rad`,
    '--flight-delay': `${delay / playbackRate}ms`,
    '--flight-duration': `${duration / playbackRate}ms`,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`battle-effects-layer effect-${kind}`}
      ref={layerRef}
    >
      {!attacking && (
        <span
          className="battle-boss-warning"
          style={
            {
              left: from.x,
              top: from.y - 54,
              '--warning-duration': `${DEFENSE_TIMING.launch / playbackRate}ms`,
            } as CSSProperties
          }
        >
          {attackLabel ?? (kind === 'rock' ? '바위 투척!' : '마법탄!')}
        </span>
      )}
      {kind !== 'hammer' && (
        <div className={`battle-flight flight-${kind}`} style={flightStyle}>
          <div className="battle-flight-object">
            {kind === 'arrow' ? (
              <Arrow />
            ) : kind === 'rock' || kind === 'ice' ? (
              <Rock ice={kind === 'ice'} />
            ) : kind === 'wind' || kind === 'vine' || kind === 'fire' ? (
              <ElementalAttack kind={kind} />
            ) : (
              <span className="battle-magic-orb" />
            )}
          </div>
        </div>
      )}
      <div
        className={`battle-hit-burst burst-${kind} ${!attacking && !guarded ? 'is-unguarded' : ''}`}
        style={
          {
            left: to.x,
            top: to.y,
            '--burst-delay': `${impact / playbackRate}ms`,
          } as CSSProperties
        }
      >
        <span className="battle-hit-flare" />
        {[0, 1, 2, 3, 4, 5].map((fragment) => (
          <i
            key={fragment}
            style={{ '--fragment-angle': `${fragment * 60 + 20}deg` } as CSSProperties}
          />
        ))}
        {kind === 'hammer' && <span className="battle-hammer-arc" />}
        {!attacking && <b>{guarded ? '방어 성공' : '직격!'}</b>}
      </div>
    </div>
  );
}
