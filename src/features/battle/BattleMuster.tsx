import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

import { HEROES_CATALOG, UNITS_CATALOG } from '../card-ui/catalog';
import type { BattleTeamResult } from './model';
import BattleUnitVisual from './BattleUnitVisual';

export default function BattleMuster({
  teams,
  colors,
  playbackRate,
  onContinue,
}: {
  teams: BattleTeamResult[];
  colors: readonly string[];
  playbackRate: number;
  onContinue: () => void;
}) {
  const rosterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window.matchMedia('(max-width: 520px)').matches) return;
    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(index + 1, teams.length - 1);
      const roster = rosterRef.current;
      const panel = roster?.children[index] as HTMLElement | undefined;
      if (roster && panel)
        roster.scrollTo({ left: panel.offsetLeft, behavior: 'instant' });
    }, 2400 / playbackRate);
    return () => window.clearInterval(timer);
  }, [playbackRate, teams.length]);

  return (
    <section className="battle-muster" aria-label="원정대 출전 병력 확인">
      <header>
        <div>
          <h2>원정대, 전투 배치!</h2>
          <p>각 원정대의 병력과 영웅을 확인하세요.</p>
        </div>
        <button onClick={onContinue} type="button">
          전투 시작
        </button>
      </header>
      <div
        className="battle-muster-grid"
        ref={rosterRef}
        style={{ '--muster-team-count': teams.length } as CSSProperties}
      >
        {teams.map((team) => (
          <article
            className="battle-muster-team"
            key={team.teamIndex}
            style={
              { '--muster-color': colors[team.teamIndex] ?? '#52b788' } as CSSProperties
            }
          >
            <h3>{team.teamName}</h3>
            <ul className="battle-muster-units">
              {UNITS_CATALOG.map((unit) => (
                <li className={team.inventory[unit.id] ? '' : 'is-empty'} key={unit.id}>
                  <div>
                    <BattleUnitVisual unitId={unit.id} imageSrc={unit.imageSrc} />
                  </div>
                  <b>{unit.name}</b>
                  <strong>
                    {team.inventory[unit.id]}
                    <small>명</small>
                  </strong>
                </li>
              ))}
            </ul>
            <div
              className="battle-muster-heroes"
              aria-label={`${team.teamName} 출전 영웅`}
            >
              <b>영웅</b>
              {team.heroIds.length ? (
                team.heroIds.map((id) => {
                  const hero = HEROES_CATALOG.find((item) => item.id === id);
                  return hero ? (
                    <span key={id}>
                      <img alt="" src={hero.imageSrc} />
                      {hero.name}
                    </span>
                  ) : null;
                })
              ) : (
                <span>출전 영웅 없음</span>
              )}
            </div>
          </article>
        ))}
      </div>
      <small className="battle-muster-hint">
        잠시 후 전투가 시작됩니다. 작은 화면에서는 다음 원정대를 차례로 보여줍니다.
      </small>
    </section>
  );
}
