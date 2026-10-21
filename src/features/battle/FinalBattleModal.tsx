import { useEffect, useMemo, useRef, useState } from 'react';
import { BOSSES_CATALOG } from '../card-ui/boss-catalog';
import { HEROES_CATALOG, UNITS_CATALOG } from '../card-ui/catalog';
import type { EconomyStore } from '../economy/model';
import type { HeroStore } from '../heroes/model';
import type { PracticeStore } from '../matches/practiceModel';
import type { Preparation } from '../preparation/model';
import {
  acceptAuthorityBattleResult,
  calculateSeasonBattle,
  cancelSeasonClose,
  createBattleAuthorityInput,
  finishSeasonBattle,
  seasonBattle,
} from './model';
import type { BattleEvent, BattleInventory, BattleStore, SeasonBattle } from './model';
import {
  calculateBattleWithAuthority,
  finishBattleWithAuthority,
  revealSeasonHeroesWithAuthority,
  syncHeroRewardsWithAuthority,
} from '../../shared/lib/gameAuthorityClient';
import './battle.css';

type BattleView = 'closing' | 'ready' | 'playing' | 'result';

function viewFor(battle: SeasonBattle): BattleView {
  if (battle.status === 'closing') return 'closing';
  if (battle.status === 'finished') return 'result';
  return 'ready';
}

function eventMessage(event: BattleEvent | undefined, battle: SeasonBattle) {
  if (!event) return '최종 대전을 준비하고 있어요.';
  const team = battle.teams?.find((item) => item.teamIndex === event.teamIndex);
  if (event.type === 'boss-reveal') return '비밀 보스가 모습을 드러냈습니다!';
  if (event.type === 'boss-attack')
    return `${team?.teamName ?? '원정대'}가 보스의 공격을 막아냅니다.`;
  if (event.type === 'team-attack')
    return `${team?.teamName ?? '원정대'} 공격 · ${event.amount?.toLocaleString() ?? 0} 피해`;
  if (event.type === 'cooperation')
    return '모든 원정대가 힘을 모아 마지막 일격을 준비합니다!';
  return '보스를 쓰러뜨렸습니다! 최종 결과를 공개합니다.';
}

export default function FinalBattleModal({
  plan,
  practice,
  economy,
  heroes,
  store,
  seasonIndex,
  onStore,
  onHeroes,
  onPlan,
  onClose,
}: {
  plan: Preparation;
  practice: PracticeStore;
  economy: EconomyStore;
  heroes: HeroStore;
  store: BattleStore;
  seasonIndex: number;
  onStore: (store: BattleStore) => void;
  onHeroes: (store: HeroStore) => void;
  onPlan: (plan: Preparation) => void;
  onClose: () => void;
}) {
  const initial = seasonBattle(store, seasonIndex);
  if (!initial) throw new Error('열어 볼 최종 대전을 찾지 못했어요.');
  const [battle, setBattle] = useState(initial);
  const [view, setView] = useState<BattleView>(() => viewFor(initial));
  const [eventIndex, setEventIndex] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const boss = BOSSES_CATALOG.find((item) => item.id === battle.bossId);
  const reducedMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  );
  const currentEvent = battle.events?.[eventIndex];
  const damageSoFar =
    battle.events
      ?.slice(0, eventIndex + 1)
      .reduce(
        (sum, event) =>
          sum +
          (event.type === 'team-attack' || event.type === 'cooperation'
            ? (event.amount ?? 0)
            : 0),
        0,
      ) ?? 0;
  const remainingHp = Math.max(0, (battle.bossHp ?? 0) - damageSoFar);

  useEffect(() => title.current?.focus({ preventScroll: true }), [view]);

  useEffect(() => {
    if (view !== 'playing' || !battle.events?.length) return;
    if (eventIndex >= battle.events.length - 1) {
      const timeout = window.setTimeout(
        () => setView('result'),
        reducedMotion ? 250 : 1_600,
      );
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(
      () => setEventIndex((index) => index + 1),
      reducedMotion ? 250 : currentEvent?.type === 'boss-reveal' ? 2_000 : 1_350,
    );
    return () => window.clearTimeout(timeout);
  }, [battle.events, currentEvent?.type, eventIndex, reducedMotion, view]);

  const calculate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const calculatedAt = new Date().toISOString();
      const authorityHeroes = await syncHeroRewardsWithAuthority(plan.id, heroes);
      onHeroes(authorityHeroes);
      const input = createBattleAuthorityInput(
        plan,
        practice,
        economy,
        authorityHeroes,
        seasonIndex,
        battle,
      );
      const authorityResult = await calculateBattleWithAuthority(
        plan.id,
        battle.id,
        input,
      );
      const nextStore = authorityResult
        ? acceptAuthorityBattleResult(plan.id, authorityResult)
        : calculateSeasonBattle(plan, practice, economy, heroes, calculatedAt);
      const nextBattle = seasonBattle(nextStore, seasonIndex);
      if (!nextBattle) throw new Error('계산한 최종 대전을 불러오지 못했어요.');
      const revealed = await revealSeasonHeroesWithAuthority(
        plan.id,
        authorityHeroes,
        seasonIndex,
      );
      setBattle(nextBattle);
      setView('ready');
      setError('');
      onStore(nextStore);
      onHeroes(revealed);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '최종 대전을 계산하지 못했어요.',
      );
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    try {
      onStore(cancelSeasonClose(plan.id, seasonIndex));
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '시즌 종료를 취소하지 못했어요.',
      );
    }
  };

  const play = () => {
    setEventIndex(0);
    setView('playing');
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const finishedAt = await finishBattleWithAuthority(plan.id, seasonIndex);
      const nextStore = finishSeasonBattle(
        plan.id,
        seasonIndex,
        finishedAt ?? new Date().toISOString(),
      );
      const nextBattle = seasonBattle(nextStore, seasonIndex);
      if (!nextBattle) throw new Error('완료한 최종 대전을 불러오지 못했어요.');
      const nextSeason = Math.min(seasonIndex + 1, plan.seasonCount - 1);
      const nextPlan =
        nextSeason === seasonIndex ? plan : { ...plan, currentSeasonIndex: nextSeason };
      setBattle(nextBattle);
      setError('');
      onStore(nextStore);
      onPlan(nextPlan);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '시즌 결과를 저장하지 못했어요.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="battle-overlay" role="presentation">
      <section
        className={`battle-modal battle-view-${view}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-title"
      >
        {view !== 'playing' && (
          <button
            type="button"
            className="battle-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        )}

        {view === 'closing' && (
          <div className="battle-confirmation">
            <span className="battle-season-mark">시즌 {seasonIndex + 1}</span>
            <div className="battle-secret-boss" aria-hidden="true">
              <span>?</span>
            </div>
            <h2 id="battle-title" ref={title} tabIndex={-1}>
              시즌을 마치고 최종 대전을 준비할까요?
            </h2>
            <p>
              확정 경기 {battle.matchCount}개의 결과와 현재 병력·영웅을 사용합니다. 계산
              전에는 종료를 취소할 수 있지만 계산 후에는 시즌을 다시 열 수 없습니다.
            </p>
            <ul className="battle-ready-list">
              {plan.teams.map((team, index) => {
                const units = economy.purchases.filter(
                  (purchase) =>
                    purchase.teamKey === `team-${index}` &&
                    purchase.seasonIndex === seasonIndex &&
                    !economy.reversals.some(
                      (reversal) => reversal.purchaseId === purchase.id,
                    ) &&
                    purchase.itemId !== 'BOSS_HINT',
                ).length;
                const teamHeroes = heroes.rewards.filter(
                  (reward) =>
                    reward.teamIndex === index &&
                    reward.seasonIndex === seasonIndex &&
                    reward.heroId,
                ).length;
                return (
                  <li key={team.name}>
                    <strong>{team.name}</strong>
                    <span>
                      병력 {units}명 · 영웅 {teamHeroes}명
                    </span>
                  </li>
                );
              })}
            </ul>
            {error && <p className="battle-error">{error}</p>}
            <div className="battle-actions">
              <button type="button" className="preparation-secondary" onClick={cancel}>
                종료 준비 취소
              </button>
              <button
                type="button"
                className="preparation-primary"
                disabled={busy}
                onClick={() => void calculate()}
              >
                {busy ? '서버에서 결과 확정 중…' : '전투 결과 계산하기'}
              </button>
            </div>
          </div>
        )}

        {view === 'ready' && (
          <div className="battle-ready-screen">
            <span className="battle-season-mark">계산 완료 · 결과 고정</span>
            <div className="battle-boss-portrait">
              {boss && <img src={boss.imageSrc} alt="" />}
            </div>
            <h2 id="battle-title" ref={title} tabIndex={-1}>
              최종 대전 · {boss?.name ?? '비밀 보스'}
            </h2>
            <p>
              병력과 영웅, 피해량, 승점이 확정됐습니다. 재생하거나 건너뛰어도 결과는
              바뀌지 않습니다.
            </p>
            {error && <p className="battle-error">{error}</p>}
            <div className="battle-actions">
              <button
                type="button"
                className="preparation-secondary"
                onClick={() => setView('result')}
              >
                애니메이션 건너뛰기
              </button>
              <button type="button" className="preparation-primary" onClick={play}>
                최종 대전 재생
              </button>
            </div>
          </div>
        )}

        {view === 'playing' && (
          <div className={`battle-arena event-${currentEvent?.type ?? 'waiting'}`}>
            <header className="battle-arena-header">
              <div>
                <span>시즌 {seasonIndex + 1} 최종 대전</span>
                <strong>{boss?.name ?? '비밀 보스'}</strong>
              </div>
              <button type="button" onClick={() => setView('result')}>
                건너뛰기
              </button>
            </header>
            <div className="battle-hp" aria-label={`보스 체력 ${remainingHp}`}>
              <span
                style={{
                  width: `${battle.bossHp ? (remainingHp / battle.bossHp) * 100 : 0}%`,
                }}
              />
              <strong>
                {remainingHp.toLocaleString()} / {(battle.bossHp ?? 0).toLocaleString()}
              </strong>
            </div>
            <div className="battle-field">
              <div className="battle-party-line">
                {battle.teams?.map((team) => (
                  <article
                    key={team.teamIndex}
                    className={
                      currentEvent?.teamIndex === team.teamIndex ? 'is-active' : undefined
                    }
                  >
                    <strong>{team.teamName}</strong>
                    <div className="battle-unit-line" aria-label="참여 병력">
                      {UNITS_CATALOG.map((unit) => {
                        const count = team.inventory[unit.id as keyof BattleInventory];
                        return count ? (
                          <span key={unit.id} title={`${unit.name} ${count}명`}>
                            <img src={unit.imageSrc} alt="" />
                            <b>{count}</b>
                          </span>
                        ) : null;
                      })}
                    </div>
                    <small>
                      영웅 {team.heroIds.length}명 · 누적 피해{' '}
                      {currentEvent?.teamIndex === team.teamIndex &&
                      currentEvent.type === 'team-attack'
                        ? team.actualDamage.toLocaleString()
                        : '—'}
                    </small>
                  </article>
                ))}
              </div>
              <div className="battle-boss-stage">
                {boss && <img src={boss.imageSrc} alt={boss.name} />}
                <span className="battle-impact" aria-hidden="true" />
              </div>
            </div>
            <p className="battle-announcement" aria-live="polite">
              {eventMessage(currentEvent, battle)}
            </p>
          </div>
        )}

        {view === 'result' && (
          <div className="battle-results">
            <span className="battle-season-mark">시즌 {seasonIndex + 1} 최종 결과</span>
            <h2 id="battle-title" ref={title} tabIndex={-1}>
              모든 원정대가 함께 승리했습니다!
            </h2>
            <p>
              {boss?.name ?? '비밀 보스'} 최종전의 순위는 실제 피해량, 승점은 최고 피해
              원정대를 기준으로 기록합니다.
            </p>
            <ol>
              {[...(battle.teams ?? [])]
                .sort(
                  (left, right) =>
                    left.rank - right.rank || right.actualDamage - left.actualDamage,
                )
                .map((team) => (
                  <li
                    key={team.teamIndex}
                    className={team.rank === 1 ? 'is-winner' : undefined}
                  >
                    <span>{team.rank}위</span>
                    <div>
                      <strong>{team.teamName}</strong>
                      <small>
                        병력{' '}
                        {Object.values(team.inventory).reduce(
                          (sum, count) => sum + count,
                          0,
                        )}
                        명{' · '}영웅 {team.heroIds.length}명
                      </small>
                    </div>
                    <b>{team.actualDamage.toLocaleString()} 피해</b>
                    <em>+{team.victoryPoints} 승점</em>
                  </li>
                ))}
            </ol>
            <div className="battle-cooperation-result">
              협동 마무리{' '}
              <strong>{(battle.cooperationDamage ?? 0).toLocaleString()}</strong> 피해
            </div>
            {battle.teams?.some((team) => team.heroIds.length) && (
              <details className="battle-hero-roster">
                <summary>최종 대전에 참여한 영웅 보기</summary>
                {battle.teams.map((team) => (
                  <p key={team.teamIndex}>
                    <strong>{team.teamName}</strong>{' '}
                    {team.heroIds.length
                      ? team.heroIds
                          .map(
                            (id) =>
                              HEROES_CATALOG.find((hero) => hero.id === id)?.name ?? id,
                          )
                          .join(', ')
                      : '참여 영웅 없음'}
                  </p>
                ))}
              </details>
            )}
            {error && <p className="battle-error">{error}</p>}
            <div className="battle-actions">
              <button type="button" className="preparation-secondary" onClick={play}>
                애니메이션 다시 보기
              </button>
              {battle.status === 'finished' ? (
                <button type="button" className="preparation-primary" onClick={onClose}>
                  현황으로 돌아가기
                </button>
              ) : (
                <button
                  type="button"
                  className="preparation-primary"
                  disabled={busy}
                  onClick={() => void finish()}
                >
                  {busy ? '서버에 완료 기록 중…' : '결과 저장하고 시즌 마치기'}
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
