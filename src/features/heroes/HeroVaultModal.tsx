import { useMemo, useState } from 'react';
import HeroCard from '../card-ui/HeroCard';
import { HEROES_CATALOG, RARITY_LABELS } from '../card-ui/catalog';
import OperationModal from '../expedition/OperationModal';
import { currentSeasonIndex } from '../expedition/operations';
import type { Preparation } from '../preparation/model';
import { HERO_MISSIONS, heroMissionIds, teamHeroRewards } from './model';
import type { HeroReward, HeroStore } from './model';
import './heroes.css';

function contributorLabel(reward: HeroReward): string {
  return reward.contributorNames.length
    ? `함께 만든 기록: ${reward.contributorNames.join(', ')}`
    : '원정대가 함께 만든 기록';
}

export default function HeroVaultModal({
  plan,
  store,
  teamIndex,
  onReveal,
  onRevoke,
  onClose,
}: {
  plan: Preparation;
  store: HeroStore;
  teamIndex: number;
  onReveal: (rewardId: string) => Promise<HeroStore>;
  onRevoke?: (rewardId: string, reason: string) => Promise<HeroStore>;
  onClose: () => void;
}) {
  const seasonIndex = currentSeasonIndex(plan);
  const team = plan.teams[teamIndex];
  const current = teamHeroRewards(store, teamIndex, seasonIndex);
  const past = teamHeroRewards(store, teamIndex).filter(
    (reward) => reward.seasonIndex !== seasonIndex,
  );
  const sealed = current.filter((reward) => reward.heroId && !reward.revealedAt);
  const revealed = current.filter((reward) => reward.heroId && reward.revealedAt);
  const exhausted = current.filter((reward) => !reward.heroId);
  const [pending, setPending] = useState<string | null>(null);
  const [revealedReward, setRevealedReward] = useState<HeroReward | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revoking, setRevoking] = useState<HeroReward | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const teamCorrections = (store.corrections ?? []).filter((entry) => {
    const orig = store.rewards.find((r) => r.id === entry.rewardId);
    return orig?.teamIndex === teamIndex;
  });

  const confirmRevoke = async () => {
    if (!revoking || !onRevoke || busy) return;
    const cleanReason = revokeReason.trim();
    if (cleanReason.length < 3 || cleanReason.length > 200) {
      setError('회수 사유를 3자 이상 200자 이내로 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      await onRevoke(revoking.id, cleanReason);
      setNotice('영웅 카드를 회수하고 장부에 기록했어요.');
      setRevoking(null);
      setRevokeReason('');
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '영웅 카드를 회수하지 못했어요.',
      );
    } finally {
      setBusy(false);
    }
  };
  const achievementCounts = useMemo(
    () =>
      Object.fromEntries(
        heroMissionIds.map((missionId) => [
          missionId,
          teamHeroRewards(store, teamIndex).filter(
            (reward) => reward.missionId === missionId,
          ).length,
        ]),
      ),
    [store, teamIndex],
  );
  const reveal = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const next = await onReveal(pending);
      const reward = next.rewards.find((item) => item.id === pending);
      if (!reward?.heroId) throw new Error('공개할 영웅을 찾지 못했어요.');
      const delay = reward.revealedAt ? Date.parse(reward.revealedAt) - Date.now() : 0;
      if (delay > 0)
        await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
      setRevealedReward(reward);
      setPending(null);
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '영웅 카드를 공개하지 못했어요.',
      );
    } finally {
      setBusy(false);
    }
  };
  const revealedHero = revealedReward
    ? HEROES_CATALOG.find((hero) => hero.id === revealedReward.heroId)
    : null;

  return (
    <OperationModal
      title={`${team.name} · 영웅 보관함`}
      className="hero-vault-modal"
      onClose={onClose}
    >
      {revealedReward && revealedHero ? (
        <section
          className={`hero-reveal-stage rarity-${revealedHero.rarity}`}
          aria-live="assertive"
          aria-label="새 영웅 공개"
        >
          <div className="hero-reveal-light" aria-hidden="true" />
          <p>새로운 영웅이 원정대에 합류했습니다</p>
          <HeroCard hero={revealedHero} state="revealed" className="hero-reveal-card" />
          <strong>
            {RARITY_LABELS[revealedHero.rarity]} 영웅 ·{' '}
            {HERO_MISSIONS[revealedReward.missionId].name}
          </strong>
          <span>{contributorLabel(revealedReward)}</span>
          <button
            type="button"
            className="preparation-primary"
            onClick={() => setRevealedReward(null)}
          >
            영웅 보관함으로
          </button>
        </section>
      ) : (
        <>
          <section className="hero-vault-summary" aria-label="현재 시즌 영웅 현황">
            <div>
              <span>시즌 {seasonIndex + 1}</span>
              <strong>{current.filter((reward) => reward.heroId).length}장</strong>
            </div>
            <div>
              <span>함께 공개할 카드</span>
              <strong>{sealed.length}장</strong>
            </div>
            <p>획득한 영웅은 선택하지 않아도 이번 시즌 최종 대전에 모두 참여해요.</p>
          </section>

          {notice && (
            <p className="economy-notice" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="preparation-field-error" role="alert">
              {error}
            </p>
          )}

          {revoking && (
            <section className="hero-reveal-confirm" aria-labelledby="hero-revoke-title">
              <div>
                <h3 id="hero-revoke-title">영웅 카드 회수·정정</h3>
                <p>
                  오지급되거나 취소된 임무의 영웅 카드를 감사 사유와 함께 회수합니다.
                  회수된 카드는 이번 시즌 최종 대전에서 제외됩니다.
                </p>
                <label htmlFor="hero-revoke-reason" style={{ display: 'block', margin: '8px 0 4px', fontWeight: 'bold' }}>
                  회수 사유
                </label>
                <textarea
                  id="hero-revoke-reason"
                  maxLength={200}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="예: 경기 기록 오입력 취소에 따른 영웅 회수"
                  style={{ width: '100%', minHeight: '70px', padding: '8px' }}
                />
                <div className="preparation-actions" style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    className="preparation-secondary"
                    disabled={busy}
                    onClick={() => {
                      setRevoking(null);
                      setRevokeReason('');
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="preparation-primary"
                    disabled={busy}
                    onClick={() => void confirmRevoke()}
                  >
                    {busy ? '회수 처리 중…' : '회수 확정'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {pending && (
            <section className="hero-reveal-confirm" aria-labelledby="hero-confirm-title">
              <HeroCard state="sealed" />
              <div>
                <h3 id="hero-confirm-title">팀원들이 모두 함께 보고 있나요?</h3>
                <p>
                  영웅 카드는 한 번 공개하면 다시 닫을 수 없습니다. 모든 팀원이 화면을 볼
                  준비가 되었는지 확인해 주세요.
                </p>
                <div className="preparation-actions">
                  <button
                    type="button"
                    className="preparation-secondary"
                    disabled={busy}
                    onClick={() => setPending(null)}
                  >
                    아직이에요
                  </button>
                  <button
                    type="button"
                    className="preparation-primary"
                    disabled={busy}
                    onClick={() => void reveal()}
                  >
                    {busy ? '서버에서 공개 준비 중…' : '모두 함께 공개하기'}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="hero-vault-section" aria-labelledby="sealed-heroes-title">
            <div className="hero-vault-heading">
              <h3 id="sealed-heroes-title">미공개 영웅</h3>
              <span>{sealed.length}장</span>
            </div>
            {sealed.length ? (
              <ul className="hero-sealed-list">
                {sealed.map((reward) => (
                  <li key={reward.id}>
                    <div>
                      <strong>{HERO_MISSIONS[reward.missionId].name}</strong>
                      <span>시즌 {reward.seasonIndex + 1} 임무 달성</span>
                      <small>{contributorLabel(reward)}</small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="preparation-primary"
                        disabled={Boolean(pending) || Boolean(revoking)}
                        onClick={() => {
                          setPending(reward.id);
                          setError('');
                        }}
                      >
                        팀원과 공개하기
                      </button>
                      {onRevoke && (
                        <button
                          type="button"
                          className="operation-text-link"
                          disabled={Boolean(pending) || Boolean(revoking)}
                          onClick={() => {
                            setRevoking(reward);
                            setPending(null);
                            setError('');
                          }}
                        >
                          교사 회수
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hero-empty">공개를 기다리는 영웅 카드가 없어요.</p>
            )}
          </section>

          <section className="hero-vault-section" aria-labelledby="revealed-heroes-title">
            <div className="hero-vault-heading">
              <h3 id="revealed-heroes-title">이번 시즌 영웅</h3>
              <span>{revealed.length}장</span>
            </div>
            {revealed.length ? (
              <div className="hero-owned-grid">
                {revealed.map((reward) => {
                  const hero = HEROES_CATALOG.find((item) => item.id === reward.heroId);
                  return hero ? (
                    <div key={reward.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <HeroCard hero={hero} state="revealed" />
                      <small>{HERO_MISSIONS[reward.missionId].name}</small>
                      {onRevoke && (
                        <button
                          type="button"
                          className="operation-text-link"
                          style={{ marginTop: '4px' }}
                          disabled={Boolean(pending) || Boolean(revoking)}
                          onClick={() => {
                            setRevoking(reward);
                            setPending(null);
                            setError('');
                          }}
                        >
                          교사 회수
                        </button>
                      )}
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <p className="hero-empty">아직 공개한 영웅이 없어요.</p>
            )}
            {exhausted.length > 0 && (
              <p className="hero-empty">
                영웅 15종을 모두 모은 뒤 추가로 달성한 임무 {exhausted.length}회도
                기록했어요.
              </p>
            )}
          </section>

          {teamCorrections.length > 0 && (
            <details className="hero-mission-details">
              <summary>영웅 회수·정정 장부 {teamCorrections.length}건</summary>
              <ul className="hero-archive-list">
                {teamCorrections.map((entry) => {
                  const orig = store.rewards.find((r) => r.id === entry.rewardId);
                  const hero = orig?.heroId ? HEROES_CATALOG.find((h) => h.id === orig.heroId) : null;
                  return (
                    <li key={entry.id}>
                      <strong>{hero ? hero.name : '미공개 카드'} ({orig ? HERO_MISSIONS[orig.missionId].name : ''})</strong>
                      <span>회수됨 · {entry.reason}</span>
                      <small>{entry.correctedAt.slice(0, 10)}</small>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}

          <details className="hero-mission-details">
            <summary>영웅 임무 6개와 달성 기록</summary>
            <ul>
              {heroMissionIds.map((missionId) => (
                <li key={missionId}>
                  <div>
                    <strong>{HERO_MISSIONS[missionId].name}</strong>
                    <span>{HERO_MISSIONS[missionId].description}</span>
                  </div>
                  <b>{achievementCounts[missionId]}회</b>
                </li>
              ))}
            </ul>
          </details>

          {past.length > 0 && (
            <details className="hero-mission-details">
              <summary>
                지난 시즌 도감 · {past.filter((reward) => reward.heroId).length}장
              </summary>
              <ol className="hero-archive-list">
                {past
                  .filter((reward) => reward.heroId)
                  .map((reward) => {
                    const hero = HEROES_CATALOG.find((item) => item.id === reward.heroId);
                    return hero ? (
                      <li key={reward.id}>
                        <strong>{hero.name}</strong>
                        <span>
                          시즌 {reward.seasonIndex + 1} ·{' '}
                          {HERO_MISSIONS[reward.missionId].name}
                        </span>
                      </li>
                    ) : null;
                  })}
              </ol>
            </details>
          )}

          <p className="operation-save-note">
            서버가 연결되면 추첨 결과와 공개 시각을 서버에서 확정하고 같은 원정대 QR
            화면에 전달합니다.
          </p>
        </>
      )}
    </OperationModal>
  );
}
