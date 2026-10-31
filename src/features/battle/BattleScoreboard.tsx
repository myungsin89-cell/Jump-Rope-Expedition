import type { CSSProperties } from 'react';

import type { BattleTeamResult } from './model';

export default function BattleScoreboard({
  entries,
  activeTeamIndex,
  latestAmount,
  colors,
}: {
  entries: { team: BattleTeamResult; damage: number }[];
  activeTeamIndex?: number;
  latestAmount?: number;
  colors: readonly string[];
}) {
  const maximum = Math.max(1, ...entries.map((entry) => entry.damage));
  return (
    <aside className="battle-scoreboard" aria-label="실시간 누적 피해 순위">
      <header>
        <strong>누적 피해 순위</strong>
        <span>공격 적중 시 갱신</span>
      </header>
      <ol style={{ '--scoreboard-teams': entries.length } as CSSProperties}>
        {entries.map(({ team, damage }) => {
          const rank = 1 + entries.filter((entry) => entry.damage > damage).length;
          const active = team.teamIndex === activeTeamIndex;
          return (
            <li
              className={`${active ? 'is-active' : ''} ${damage > 0 && rank === 1 ? 'is-leader' : ''}`}
              key={team.teamIndex}
              style={
                {
                  '--scoreboard-color': colors[team.teamIndex] ?? '#52b788',
                  '--scoreboard-progress': damage / maximum,
                } as CSSProperties
              }
            >
              <span className="battle-scoreboard-rank">{damage ? `${rank}위` : '–'}</span>
              <b className="battle-scoreboard-name">{team.teamName}</b>
              <div className="battle-scoreboard-total">
                <strong>{damage.toLocaleString()}</strong>
                <span>피해</span>
                {active && Boolean(latestAmount) && (
                  <em key={`${team.teamIndex}:${damage}`}>
                    +{latestAmount!.toLocaleString()}
                  </em>
                )}
              </div>
              <i aria-hidden="true" className="battle-scoreboard-bar" />
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
