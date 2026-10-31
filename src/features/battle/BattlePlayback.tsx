import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import battleBgmUrl from '../../../assets/audio/web/bgm/bgm_final_battle_main_loop.m4a';
import acornAttackUrl from '../../../assets/audio/sfx/battle/sfx_acorn_ranged_attack.wav';
import bossDefeatUrl from '../../../assets/audio/stingers/st_boss_defeat.wav';
import bossMagicUrl from '../../../assets/audio/sfx/battle/sfx_boss_magic_telegraph.wav';
import bossPhysicalUrl from '../../../assets/audio/sfx/battle/sfx_boss_physical_telegraph.wav';
import hammerAttackUrl from '../../../assets/audio/sfx/battle/sfx_hammer_melee_attack.wav';
import heroUltimateUrl from '../../../assets/audio/sfx/battle/sfx_hero_ultimate.wav';
import leafGuardUrl from '../../../assets/audio/sfx/battle/sfx_leaf_guard_raise.wav';
import leafGuardHitUrl from '../../../assets/audio/sfx/battle/sfx_leaf_guard_hit.wav';
import starBarrierUrl from '../../../assets/audio/sfx/battle/sfx_star_barrier_cast.wav';
import starBarrierHitUrl from '../../../assets/audio/sfx/battle/sfx_star_barrier_hit.wav';
import unitEnterUrl from '../../../assets/audio/sfx/battle/sfx_unit_enter.wav';
import { HEROES_CATALOG, UNITS_CATALOG } from '../card-ui/catalog';
import type { BossDefinition } from '../card-ui/types';
import type { BattleInventory, SeasonBattle } from './model';
import BattleUnitVisual from './BattleUnitVisual';
import BattleScoreboard from './BattleScoreboard';
import BattleEffects from './BattleEffects';
import BattleMuster from './BattleMuster';
import { BOSS_PRESENTATIONS } from './bossPresentation';
import { DEFENSE_TIMING, type DefensePhase } from './presentationTiming';
import { battleUnitAtlases } from './unitSprites';
import { buildBattlePresentation, type BattlePresentationCue } from './presentation';

const teamFlagColors = ['#52b788', '#f2b44f', '#7aa6d8', '#d78b69'] as const;

function cueSounds(cue: BattlePresentationCue) {
  if (cue.type === 'deployment') return [unitEnterUrl];
  if (cue.type === 'unit-attack')
    return [cue.unitId === 'UNIT_01' ? acornAttackUrl : hammerAttackUrl];
  if (cue.type === 'hero-attack') return [heroUltimateUrl];
  if (cue.type === 'victory') return [bossDefeatUrl];
  return [];
}

function cueMessage(
  cue: BattlePresentationCue,
  battle: SeasonBattle,
  cueResolved = true,
  defensePhase: DefensePhase = 'impact',
) {
  const team = battle.teams?.find((item) => item.teamIndex === cue.teamIndex);
  const unit = UNITS_CATALOG.find((item) => item.id === cue.unitId);
  if (cue.type === 'boss-intro') return '비밀 보스가 모습을 드러냅니다!';
  if (cue.type === 'deployment')
    return `${battle.teams?.length ?? 0}개 원정대, 최종 대전 준비 완료!`;
  if (cue.type === 'defense') {
    const uptime = Math.round((team?.actionUptime ?? 0) * 100);
    const attack = cue.defenseType === 'physical' ? '물리 공격' : '마법 공격';
    const defenderCount = cue.unitId
      ? (team?.inventory[cue.unitId as keyof BattleInventory] ?? 0)
      : 0;
    if (defensePhase === 'telegraph')
      return `보스가 ${team?.teamName ?? '원정대'}를 향해 ${attack}을 준비합니다!`;
    if (defensePhase === 'incoming')
      return `${team?.teamName ?? '원정대'}를 향해 보스의 공격이 날아옵니다!`;
    if (defensePhase === 'guard')
      return defenderCount
        ? `${team?.teamName ?? '원정대'}의 ${unit?.name ?? '방어 병력'}이 앞으로 나서서 막습니다!`
        : `${team?.teamName ?? '원정대'}가 보스의 공격에 대비합니다!`;
    if (!defenderCount)
      return `${team?.teamName ?? '원정대'} 피격! 방어 병력이 없어 공격 기회가 줄었습니다. 최종 공격 기회 ${uptime}%`;
    return `${team?.teamName ?? '원정대'}의 ${unit?.name ?? '방어 병력'}이 보스의 ${attack}을 막았습니다!`;
  }
  if (cue.type === 'unit-attack')
    return cueResolved
      ? `${team?.teamName ?? '원정대'}의 ${unit?.name ?? '병력'} 공격 · ${(cue.amount ?? 0).toLocaleString()} 피해`
      : `${team?.teamName ?? '원정대'}의 ${unit?.name ?? '병력'}이 공격을 준비합니다!`;
  if (cue.type === 'hero-attack')
    return cueResolved && cue.amount
      ? `${team?.teamName ?? '원정대'} 영웅 필살기 · ${cue.amount.toLocaleString()} 피해!`
      : `${team?.teamName ?? '원정대'}의 영웅이 등장해 다음 공격을 지원합니다!`;
  if (cue.type === 'cooperation')
    return `모든 원정대의 협동 마무리 · ${(cue.amount ?? 0).toLocaleString()} 피해!`;
  return '보스를 쓰러뜨렸습니다! 최종 결과를 공개합니다.';
}

function FlagMark({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" className="battle-flag-mark" viewBox="0 0 40 48">
      <path d="M10 4V44" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M11 6H34L28 16L34 26H11Z" fill={color} stroke="currentColor" />
    </svg>
  );
}

function teamDamageAt(
  cues: BattlePresentationCue[],
  cueIndex: number,
  teamIndex: number,
) {
  for (let index = cueIndex; index >= 0; index -= 1) {
    const cue = cues[index];
    if (cue.teamIndex === teamIndex) return cue.teamCumulative;
  }
  return 0;
}

function cueActionLabel(cue: BattlePresentationCue) {
  if (cue.type === 'defense') return '보스 공격 · 원정대 방어';
  if (cue.type === 'unit-attack') return '원정대 공격';
  if (cue.type === 'hero-attack') return '영웅 필살기';
  if (cue.type === 'cooperation') return '전 원정대 협동 공격';
  if (cue.type === 'victory') return '전투 종료';
  if (cue.type === 'deployment') return '원정대 전투 배치';
  return '비밀 보스 등장';
}

export default function BattlePlayback({
  battle,
  boss,
  seasonIndex,
  fullscreenActive = false,
  fullscreenAvailable = false,
  onComplete,
  onSkip,
  onToggleFullscreen = () => {},
}: {
  battle: SeasonBattle;
  boss?: BossDefinition;
  seasonIndex: number;
  fullscreenActive?: boolean;
  fullscreenAvailable?: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onToggleFullscreen?: () => void;
}) {
  const cues = useMemo(() => buildBattlePresentation(battle), [battle]);
  const [cueIndex, setCueIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5>(1);
  const [resolvedCueId, setResolvedCueId] = useState<string | null>(null);
  const [defenseState, setDefenseState] = useState<{
    id: string;
    phase: DefensePhase;
  } | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);
  const cue = cues[cueIndex];
  const reducedMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  );
  const bossPresentation = BOSS_PRESENTATIONS[battle.bossId];
  const introVideo = bossPresentation?.introVideo;
  const showIntroVideo =
    cue.type === 'boss-intro' && Boolean(introVideo) && !videoFailed && !reducedMotion;
  const activeTeam = battle.teams?.find((team) => team.teamIndex === cue.teamIndex);
  const actionUnit = UNITS_CATALOG.find((unit) => unit.id === cue.unitId);
  const actionHeroes = (cue.heroIds ?? [])
    .slice(0, 3)
    .flatMap((id) => HEROES_CATALOG.filter((hero) => hero.id === id));
  const actionActor = cue.type === 'hero-attack' ? actionHeroes[0] : actionUnit;
  const hasDefender = Boolean(
    cue.type === 'defense' &&
    actionUnit &&
    activeTeam?.inventory[actionUnit.id as keyof BattleInventory],
  );
  const isDamageCue =
    cue.amount !== undefined &&
    ['unit-attack', 'hero-attack', 'cooperation'].includes(cue.type);
  const cueResolved = !isDamageCue || reducedMotion || resolvedCueId === cue.id;
  const resolvedCueIndex =
    isDamageCue && !cueResolved ? Math.max(0, cueIndex - 1) : cueIndex;
  const resolvedCue = cues[resolvedCueIndex];
  const remainingHp = Math.max(0, (battle.bossHp ?? 0) - resolvedCue.globalDamage);
  const hpScale = battle.bossHp ? remainingHp / battle.bossHp : 0;
  const liveRanking = (battle.teams ?? [])
    .map((team) => ({
      team,
      damage: teamDamageAt(cues, resolvedCueIndex, team.teamIndex),
    }))
    .sort(
      (left, right) =>
        right.damage - left.damage || left.team.teamIndex - right.team.teamIndex,
    );
  const activeRank = activeTeam
    ? 1 +
      liveRanking.filter(
        (entry) =>
          entry.damage > teamDamageAt(cues, resolvedCueIndex, activeTeam.teamIndex),
      ).length
    : undefined;
  const isActiveAttack = cue.type === 'unit-attack' || cue.type === 'hero-attack';
  const activeTeamSlot = activeTeam
    ? (battle.teams ?? []).findIndex((team) => team.teamIndex === activeTeam.teamIndex)
    : -1;
  const teamCount = battle.teams?.length ?? 0;
  const actionOriginY = (() => {
    const origins: Record<number, string[]> = {
      2: ['48%', '78%'],
      3: ['43%', '66%', '87%'],
      4: ['34%', '53%', '72%', '90%'],
    };
    return origins[teamCount]?.[activeTeamSlot] ?? '58%';
  })();
  const activeTeamColor = activeTeam
    ? (teamFlagColors[activeTeam.teamIndex] ?? '#52b788')
    : '#52b788';
  const isFocusedAction = cue.type === 'defense' || isActiveAttack;
  const defensePhase: DefensePhase = reducedMotion
    ? 'impact'
    : defenseState?.id === cue.id
      ? defenseState.phase
      : 'telegraph';
  const showGuard =
    cue.type === 'defense' &&
    hasDefender &&
    (defensePhase === 'guard' || defensePhase === 'impact');
  const actionStateLabel =
    cue.type === 'defense'
      ? defensePhase === 'telegraph'
        ? '보스 공격 예고'
        : defensePhase === 'incoming'
          ? '보스 공격!'
          : defensePhase === 'guard'
            ? '방어 전개'
            : hasDefender
              ? '방어 성공'
              : '직격! 공격 기회 감소'
      : cueResolved
        ? '공격 적중'
        : '공격 준비';

  const advance = useCallback(
    () => setCueIndex((current) => Math.min(current + 1, cues.length - 1)),
    [cues.length],
  );

  useEffect(() => {
    if (cue.type === 'boss-intro' && showIntroVideo) {
      // Do not cut off a playing video just because its initial download was slow.
      // Continue only if playback has made no progress for twelve seconds.
      let lastTime = videoRef.current?.currentTime ?? 0;
      let lastProgressAt = Date.now();
      const safetyTimer = window.setInterval(() => {
        const currentTime = videoRef.current?.currentTime ?? 0;
        if (currentTime > lastTime) {
          lastTime = currentTime;
          lastProgressAt = Date.now();
        }
        if (Date.now() - lastProgressAt >= 12_000) advance();
      }, 500);
      return () => window.clearInterval(safetyTimer);
    }
    const timeout = window.setTimeout(
      () => {
        if (cue.type === 'victory') onComplete();
        else advance();
      },
      reducedMotion ? 280 : cue.durationMs / playbackRate,
    );
    return () => window.clearTimeout(timeout);
  }, [
    advance,
    cue.id,
    cue.durationMs,
    cue.type,
    onComplete,
    playbackRate,
    reducedMotion,
    showIntroVideo,
  ]);

  useEffect(() => {
    if (!isDamageCue || reducedMotion) return;
    const impactDelay =
      cue.type === 'hero-attack'
        ? 4_100
        : cue.type === 'cooperation'
          ? 2_300
          : cue.unitId === 'UNIT_01'
            ? 2_100
            : 1_700;
    const timeout = window.setTimeout(
      () => setResolvedCueId(cue.id),
      impactDelay / playbackRate,
    );
    return () => window.clearTimeout(timeout);
  }, [cue.id, cue.type, cue.unitId, isDamageCue, playbackRate, reducedMotion]);

  useEffect(() => {
    if (cue.type !== 'defense' || reducedMotion) return;
    const steps: [number, DefensePhase][] = [
      [DEFENSE_TIMING.launch, 'incoming'],
      [DEFENSE_TIMING.guard, 'guard'],
      [DEFENSE_TIMING.impact, 'impact'],
    ];
    const timers = steps.map(([delay, phase]) =>
      window.setTimeout(
        () => setDefenseState({ id: cue.id, phase }),
        delay / playbackRate,
      ),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [cue.id, cue.type, playbackRate, reducedMotion]);

  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;
    bgm.volume = 0.28;
    if (!soundOn || cue.type === 'boss-intro') {
      bgm.pause();
      return;
    }
    void bgm.play().catch(() => {});
  }, [cue.type, soundOn]);

  useEffect(() => {
    if (!soundOn || cue.type === 'boss-intro') return;
    const audio: HTMLAudioElement[] = [];
    const soundDelay =
      cue.type === 'unit-attack' ? (cue.unitId === 'UNIT_01' ? 1_496 : 1_700) : 0;
    const sounds =
      cue.type === 'defense'
        ? [
            {
              url: cue.defenseType === 'physical' ? bossPhysicalUrl : bossMagicUrl,
              delay: 0,
            },
            ...(hasDefender
              ? [
                  {
                    url: cue.defenseType === 'physical' ? leafGuardUrl : starBarrierUrl,
                    delay: DEFENSE_TIMING.guard,
                  },
                  {
                    url:
                      cue.defenseType === 'physical'
                        ? leafGuardHitUrl
                        : starBarrierHitUrl,
                    delay: DEFENSE_TIMING.impact,
                  },
                ]
              : []),
          ]
        : cueSounds(cue).map((url) => ({ url, delay: soundDelay }));
    const timers = sounds.map(({ url, delay }) =>
      window.setTimeout(() => {
        const item = new Audio(url);
        item.volume = cue.type === 'victory' ? 0.8 : 0.58;
        void item.play().catch(() => {});
        audio.push(item);
      }, delay / playbackRate),
    );
    return () => {
      timers.forEach(window.clearTimeout);
      audio.forEach((item) => item.pause());
    };
  }, [cue, hasDefender, playbackRate, soundOn]);

  useEffect(() => {
    if (!showIntroVideo || !videoRef.current) return;
    videoRef.current.muted = !soundOn;
    videoRef.current.playbackRate = playbackRate;
    void videoRef.current.play().catch(() => {
      if (!videoRef.current) return;
      videoRef.current.muted = true;
      void videoRef.current.play().catch(() => setVideoFailed(true));
    });
  }, [playbackRate, showIntroVideo, soundOn]);

  useEffect(() => {
    const bgm = bgmRef.current;
    const video = videoRef.current;
    return () => {
      bgm?.pause();
      video?.pause();
    };
  }, []);

  useEffect(() => {
    // Load the two atlases while the full-screen boss entrance is playing.
    Object.values(battleUnitAtlases).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  return (
    <div
      className={`battle-arena cue-${cue.type} ${playbackRate === 1.5 ? 'is-fast' : ''}`}
      data-cue={cue.type}
      data-boss={battle.bossId}
      data-phase={cueResolved ? 'impact' : 'prepare'}
      data-defense-phase={cue.type === 'defense' ? defensePhase : undefined}
      style={
        {
          '--battle-guard-duration': `${(cue.durationMs - DEFENSE_TIMING.guard) / playbackRate}ms`,
          ...(cue.type === 'unit-attack'
            ? {
                '--battle-impact-delay': `${(cue.unitId === 'UNIT_01' ? 2_080 : 1_680) / playbackRate}ms`,
              }
            : {}),
        } as CSSProperties
      }
    >
      <audio
        loop
        preload="none"
        ref={bgmRef}
        src={cue.type === 'boss-intro' ? undefined : battleBgmUrl}
      />
      {showIntroVideo && (
        <video
          autoPlay
          className="battle-intro-video"
          onEnded={advance}
          onError={() => setVideoFailed(true)}
          playsInline
          preload="auto"
          ref={videoRef}
          src={introVideo ?? undefined}
        />
      )}
      {cue.type === 'boss-intro' && !showIntroVideo && boss && (
        <div className="battle-intro-fallback">
          <img alt={boss.name} src={boss.imageSrc} />
        </div>
      )}

      <header className="battle-arena-header">
        <div>
          <span>시즌 {seasonIndex + 1} 최종 대전</span>
          <strong>{boss?.name ?? '비밀 보스'}</strong>
        </div>
        <div className="battle-playback-controls">
          {fullscreenAvailable && (
            <button
              aria-pressed={fullscreenActive}
              type="button"
              onClick={onToggleFullscreen}
            >
              {fullscreenActive ? '전체화면 종료' : '전체화면'}
            </button>
          )}
          <button
            aria-label={`재생 속도 ${playbackRate}배속`}
            type="button"
            onClick={() => setPlaybackRate((current) => (current === 1 ? 1.5 : 1))}
          >
            {playbackRate}배속
          </button>
          <button type="button" onClick={() => setSoundOn((current) => !current)}>
            {soundOn ? '소리 끄기' : '소리 켜기'}
          </button>
          <button type="button" onClick={onSkip}>
            건너뛰기
          </button>
        </div>
      </header>

      {cue.type !== 'boss-intro' && (
        <>
          <div
            aria-label={`보스 체력 ${remainingHp}`}
            className="battle-hp"
            style={{ '--battle-hp-scale': hpScale } as CSSProperties}
          >
            <span />
            <strong>
              {remainingHp.toLocaleString()} / {(battle.bossHp ?? 0).toLocaleString()}
            </strong>
          </div>
          {cue.type !== 'deployment' && (
            <BattleScoreboard
              entries={liveRanking}
              activeTeamIndex={cue.teamIndex}
              latestAmount={isActiveAttack && cueResolved ? cue.amount : undefined}
              colors={teamFlagColors}
            />
          )}
          {activeTeam && (cue.type === 'defense' || isActiveAttack) && (
            <div
              className={`battle-action-callout action-${cue.type}`}
              key={`callout:${cue.id}`}
              style={
                {
                  '--battle-team-color': activeTeamColor,
                } as CSSProperties
              }
            >
              <FlagMark color={activeTeamColor} />
              <div>
                <small>
                  {cue.roundNumber ? `${cue.roundNumber} / ${cue.roundTotal} 라운드` : ''}
                </small>
                <strong>{activeTeam.teamName}</strong>
              </div>
              <b>{actionStateLabel}</b>
            </div>
          )}
          <div
            className={`battle-field team-count-${teamCount} ${isFocusedAction ? 'has-active-team' : ''}`}
            data-unguarded-hit={
              cue.type === 'defense' && !hasDefender && defensePhase === 'impact'
                ? 'true'
                : undefined
            }
            data-team-count={teamCount}
            style={
              {
                '--battle-action-y': actionOriginY,
                '--battle-active-team-color': activeTeamColor,
                '--battle-team-count': teamCount,
              } as CSSProperties
            }
          >
            <div aria-hidden="true" className="battle-combat-corridor" />

            {cue.type === 'defense' &&
              !hasDefender &&
              defensePhase === 'impact' &&
              activeTeam && (
                <aside
                  className="battle-exposure-notice"
                  aria-label="방어 부재로 인한 공격 기회 감소"
                >
                  <b>방어 병력 없음 · 직격!</b>
                  <strong>공격 기회 감소</strong>
                  <div className="battle-uptime-meter" aria-hidden="true">
                    <span
                      style={{ width: `${Math.round(activeTeam.actionUptime * 100)}%` }}
                    />
                  </div>
                  <small>
                    최종 공격 기회 {Math.round(activeTeam.actionUptime * 100)}%
                  </small>
                </aside>
              )}

            {cue.type === 'deployment' && (
              <BattleMuster
                teams={battle.teams ?? []}
                colors={teamFlagColors}
                playbackRate={playbackRate}
                onContinue={advance}
              />
            )}

            <div className="battle-boss-stage">
              <span className="battle-boss-label">BOSS</span>
              <span aria-hidden="true" className="battle-boss-shadow" />
              {boss && (
                <img
                  alt={boss.name}
                  className="battle-boss-image"
                  key={`${boss.id}:${cue.id}`}
                  src={boss.imageSrc}
                />
              )}
              {cueResolved && cue.amount !== undefined && cue.type !== 'cooperation' && (
                <output className="battle-damage-number" key={`damage:${cue.id}`}>
                  -{cue.amount.toLocaleString()}
                </output>
              )}
              {['hero-attack', 'cooperation'].includes(cue.type) && (
                <span
                  aria-hidden="true"
                  className="battle-impact"
                  key={`impact:${cue.id}`}
                />
              )}
            </div>

            {activeTeam && actionActor && (showGuard || isActiveAttack) && (
              <figure
                aria-label={`${activeTeam.teamName} ${actionActor.name}`}
                className={`battle-action-unit action-${cue.type} ${cue.type === 'unit-attack' ? `action-${cue.unitId === 'UNIT_01' ? 'ranged' : 'melee'}` : ''}`}
                key={`actor:${cue.id}`}
                style={
                  {
                    '--battle-team-color': activeTeamColor,
                  } as CSSProperties
                }
              >
                <span aria-hidden="true" className="battle-unit-shadow" />
                <BattleUnitVisual
                  animated={cue.type === 'unit-attack'}
                  imageSrc={actionActor.imageSrc}
                  unitId={cue.type === 'unit-attack' ? cue.unitId : undefined}
                />
                <figcaption>
                  <strong>{actionActor.name}</strong>
                  <small>{activeTeam.teamName}</small>
                </figcaption>
              </figure>
            )}

            <section className="battle-formation-grid" aria-label="원정대 전투 진형">
              {battle.teams?.map((team) => {
                const cumulative = teamDamageAt(cues, resolvedCueIndex, team.teamIndex);
                const active = team.teamIndex === cue.teamIndex;
                const color = teamFlagColors[team.teamIndex] ?? '#52b788';
                const teamHeroes = team.heroIds
                  .slice(0, 3)
                  .flatMap((id) => HEROES_CATALOG.filter((hero) => hero.id === id));
                return (
                  <article
                    aria-label={`${team.teamName}, 영웅 ${team.heroIds.length}명, 누적 피해 ${cumulative}`}
                    className={`battle-squad ${active ? 'is-active' : ''} ${active && showGuard ? 'is-defending' : ''} ${active && isActiveAttack ? 'is-attacking' : ''} ${cue.type === 'deployment' ? 'is-deploying' : ''} ${active && cue.type === 'defense' && defensePhase === 'impact' && !hasDefender ? 'is-hit' : ''}`}
                    key={team.teamIndex}
                    style={{ '--battle-team-color': color } as CSSProperties}
                  >
                    <div className="battle-squad-name">
                      <FlagMark color={color} />
                      <strong>{team.teamName}</strong>
                    </div>
                    {active && (cue.type === 'defense' || isActiveAttack) && (
                      <span className="battle-squad-state">{actionStateLabel}</span>
                    )}
                    <div className="battle-squad-force">
                      <div aria-hidden="true" className="battle-squad-units">
                        {UNITS_CATALOG.map((unit) => {
                          const count = team.inventory[unit.id as keyof BattleInventory];
                          return count ? (
                            <span
                              className={
                                active && cue.unitId === unit.id ? 'is-acting' : undefined
                              }
                              key={unit.id}
                            >
                              <BattleUnitVisual
                                imageSrc={unit.imageSrc}
                                unitId={unit.id}
                              />
                              <b>×{count}</b>
                            </span>
                          ) : null;
                        })}
                      </div>
                      <div
                        aria-label={`${team.teamName} 소속 영웅`}
                        className="battle-squad-heroes"
                      >
                        <b>영웅</b>
                        {teamHeroes.length ? (
                          <div>
                            {teamHeroes.map((hero) => (
                              <figure key={hero.id} title={hero.name}>
                                <img alt={hero.name} src={hero.imageSrc} />
                                <figcaption>{hero.name}</figcaption>
                              </figure>
                            ))}
                            {team.heroIds.length > teamHeroes.length && (
                              <span>+{team.heroIds.length - teamHeroes.length}</span>
                            )}
                          </div>
                        ) : (
                          <span>없음</span>
                        )}
                      </div>
                    </div>
                    <small>
                      누적 <b>{cumulative.toLocaleString()}</b>
                    </small>
                  </article>
                );
              })}
            </section>

            {showGuard && (
              <span
                key={`guard:${cue.id}`}
                className={`battle-guard-effect guard-${cue.defenseType}`}
                aria-hidden="true"
              />
            )}
            {(cue.type === 'unit-attack' || cue.type === 'defense') && (
              <BattleEffects
                key={`effects:${cue.id}`}
                kind={
                  cue.type === 'defense'
                    ? (bossPresentation?.attackKind ?? 'magic')
                    : cue.unitId === 'UNIT_01'
                      ? 'arrow'
                      : 'hammer'
                }
                originY={actionOriginY}
                playbackRate={playbackRate}
                guarded={hasDefender}
                attackLabel={bossPresentation?.attackLabel}
              />
            )}
            {cue.type === 'hero-attack' && (
              <div
                className="battle-hero-cutin"
                key={`hero:${cue.id}`}
                style={
                  {
                    '--battle-team-color': activeTeam
                      ? (teamFlagColors[activeTeam.teamIndex] ?? '#52b788')
                      : '#52b788',
                  } as CSSProperties
                }
              >
                <header>
                  <small>{activeTeam?.teamName}</small>
                  <strong>{cue.amount ? '영웅 필살기' : '영웅 지원 발동'}</strong>
                </header>
                <div className="battle-hero-lineup">
                  {actionHeroes.map((hero) => (
                    <figure key={hero.id}>
                      <img alt="" src={hero.imageSrc} />
                      <figcaption>{hero.name}</figcaption>
                    </figure>
                  ))}
                </div>
                <footer>
                  {cue.amount
                    ? cueResolved
                      ? `${cue.amount.toLocaleString()} 피해`
                      : '필살기 충전 중…'
                    : '원정대 공격 강화'}
                </footer>
              </div>
            )}
            {cue.type === 'cooperation' && (
              <div className="battle-cooperation-flags" aria-hidden="true">
                <div className="battle-cooperation-lineup">
                  {battle.teams?.map((team) => {
                    const hero = HEROES_CATALOG.find(
                      (item) => item.id === team.heroIds[0],
                    );
                    const fighter = hero ?? UNITS_CATALOG[0];
                    return (
                      <figure
                        key={team.teamIndex}
                        style={
                          {
                            '--battle-team-color':
                              teamFlagColors[team.teamIndex] ?? '#52b788',
                          } as CSSProperties
                        }
                      >
                        <img alt="" src={fighter.imageSrc} />
                        <FlagMark color={teamFlagColors[team.teamIndex] ?? '#52b788'} />
                      </figure>
                    );
                  })}
                </div>
                {cueResolved && <output>-{(cue.amount ?? 0).toLocaleString()}</output>}
              </div>
            )}
          </div>
        </>
      )}

      <div className="battle-announcement" aria-atomic="true" aria-live="polite">
        {cue.type !== 'boss-intro' && (
          <span>
            {cue.roundNumber && `ROUND ${cue.roundNumber} · `}
            {cueActionLabel(cue)}
          </span>
        )}
        <strong>{cueMessage(cue, battle, cueResolved, defensePhase)}</strong>
        {activeTeam &&
          cueResolved &&
          cue.type !== 'defense' &&
          cue.teamCumulative > 0 && (
            <small>
              팀 누적 {cue.teamCumulative.toLocaleString()} 피해
              {activeRank ? ` · 현재 ${activeRank}위` : ''}
            </small>
          )}
      </div>
    </div>
  );
}
