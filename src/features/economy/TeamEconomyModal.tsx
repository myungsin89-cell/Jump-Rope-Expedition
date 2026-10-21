import { useMemo, useState } from 'react';
import OperationModal from '../expedition/OperationModal';
import { currentSeasonIndex } from '../expedition/operations';
import { UNITS_CATALOG } from '../card-ui/catalog';
import type { MedalStore } from '../medals/model';
import type { PracticeStore } from '../matches/practiceModel';
import type { Preparation } from '../preparation/model';
import {
  HINT_PRICE,
  purchaseItem,
  purchasedHint,
  reversePurchase,
  teamEconomySummary,
} from './model';
import type { EconomyItemId, EconomyPurchase, EconomyStore } from './model';
import './economy.css';

interface PendingPurchase {
  itemId: EconomyItemId;
  itemName: string;
  price: number;
  requestId: string;
}

interface PendingReversal {
  purchase: EconomyPurchase;
  requestId: string;
}

export default function TeamEconomyModal({
  plan,
  practice,
  medals,
  store,
  teamIndex,
  onChange,
  onClose,
}: {
  plan: Preparation;
  practice: PracticeStore;
  medals: MedalStore;
  store: EconomyStore;
  teamIndex: number;
  onChange: (store: EconomyStore) => void;
  onClose: () => void;
}) {
  const seasonIndex = currentSeasonIndex(plan);
  const sources = useMemo(() => ({ practice, medals }), [practice, medals]);
  const summary = teamEconomySummary(plan, sources, store, teamIndex, seasonIndex);
  const team = plan.teams[teamIndex];
  const [pending, setPending] = useState<PendingPurchase | null>(null);
  const [reversing, setReversing] = useState<PendingReversal | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const reversedIds = new Set(store.reversals.map((entry) => entry.purchaseId));
  const history = store.purchases
    .filter(
      (purchase) =>
        purchase.teamKey === `team-${teamIndex}` && purchase.seasonIndex === seasonIndex,
    )
    .slice()
    .reverse();

  const beginPurchase = (itemId: EconomyItemId, itemName: string, price: number) => {
    setPending({ itemId, itemName, price, requestId: crypto.randomUUID() });
    setReversing(null);
    setReason('');
    setError('');
    setNotice('');
  };

  const confirmPurchase = () => {
    if (!pending) return;
    try {
      const next = purchaseItem(
        plan,
        sources,
        teamIndex,
        seasonIndex,
        pending.itemId,
        pending.requestId,
      );
      onChange(next);
      setNotice(`${pending.itemName} 구매를 기록했어요.`);
      setError('');
      setPending(null);
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error ? reasonValue.message : '구매 내용을 확인해 주세요.',
      );
    }
  };

  const confirmReversal = () => {
    if (!reversing) return;
    try {
      const next = reversePurchase(
        plan.id,
        reversing.purchase.id,
        reversing.requestId,
        reason,
      );
      onChange(next);
      setNotice(`${reversing.purchase.itemName} 구매를 복구하고 포인트를 돌려줬어요.`);
      setError('');
      setReason('');
      setReversing(null);
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error ? reasonValue.message : '복구 내용을 확인해 주세요.',
      );
    }
  };

  const balanceLabel =
    summary.balance === null ? '확인 필요' : `${summary.balance.toLocaleString()}P`;

  return (
    <OperationModal
      title={`${team.name} · 시즌 ${seasonIndex + 1} 준비`}
      onClose={onClose}
    >
      <p className="economy-local-label">교사 계정에 동기화되는 원정대 장부</p>
      <dl className="economy-summary">
        <div>
          <dt>경기 획득</dt>
          <dd>
            {summary.matchEarned === null
              ? '일부 미정'
              : `${summary.matchEarned.toLocaleString()}P`}
          </dd>
        </div>
        <div>
          <dt>훈장 획득</dt>
          <dd>
            {summary.medalEarned === null
              ? '확인 필요'
              : `${summary.medalEarned.toLocaleString()}P`}
          </dd>
        </div>
        <div>
          <dt>사용</dt>
          <dd>{summary.spent.toLocaleString()}P</dd>
        </div>
        <div className="economy-balance">
          <dt>현재 잔액</dt>
          <dd>{balanceLabel}</dd>
        </div>
      </dl>

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

      {pending && (
        <section className="economy-confirm" aria-labelledby="economy-confirm-title">
          <h3 id="economy-confirm-title">{pending.itemName} 구매 확인</h3>
          <p>
            현재 {balanceLabel} · 가격 {pending.price}P · 구매 후{' '}
            <strong>
              {summary.balance === null
                ? '확인 필요'
                : `${summary.balance - pending.price}P`}
            </strong>
          </p>
          <p className="economy-confirm-question">
            팀원들과 충분히 상의했나요?
            <br />
            학생은 구매를 취소할 수 없습니다.
          </p>
          <div className="preparation-actions">
            <button
              type="button"
              className="preparation-secondary"
              onClick={() => setPending(null)}
            >
              아니요, 더 상의하기
            </button>
            <button
              type="button"
              className="preparation-primary"
              onClick={confirmPurchase}
            >
              네, 함께 결정했어요
            </button>
          </div>
        </section>
      )}

      {reversing && (
        <section className="economy-confirm" aria-labelledby="economy-reversal-title">
          <h3 id="economy-reversal-title">{reversing.purchase.itemName} 구매 복구</h3>
          <p>
            교사만 오입력·오구매를 반대 거래로 복구할 수 있어요. 기존 구매 기록은 삭제하지
            않습니다.
          </p>
          <label htmlFor="economy-reversal-reason">복구 사유</label>
          <textarea
            id="economy-reversal-reason"
            maxLength={200}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="예: 다른 병력을 잘못 선택함"
          />
          <div className="preparation-actions">
            <button
              type="button"
              className="preparation-secondary"
              onClick={() => {
                setReversing(null);
                setReason('');
              }}
            >
              취소
            </button>
            <button
              type="button"
              className="preparation-primary"
              onClick={confirmReversal}
            >
              복구 확정
            </button>
          </div>
        </section>
      )}

      <section className="economy-section" aria-labelledby="economy-units-heading">
        <div className="economy-section-heading">
          <div>
            <h3 id="economy-units-heading">병력 준비</h3>
            <p>한 명당 30P · 구매하면 최종 대전에 자동 배치돼요.</p>
          </div>
        </div>
        <div className="economy-unit-grid">
          {UNITS_CATALOG.map((unit) => (
            <article
              className="economy-unit-choice"
              aria-label={`${unit.name} 병력 구매`}
              key={unit.id}
            >
              <img src={unit.imageSrc} alt="" aria-hidden="true" loading="lazy" />
              <div>
                <h4>{unit.name}</h4>
                <span>{unit.role}</span>
                <p>{unit.description}</p>
                <strong aria-label={`보유 수량 ${summary.inventory[unit.id]}명`}>
                  보유 {summary.inventory[unit.id]}명 · {unit.price}P
                </strong>
              </div>
              <button
                type="button"
                className="preparation-secondary"
                disabled={summary.balance === null || summary.balance < unit.price}
                onClick={() => beginPurchase(unit.id, unit.name, unit.price)}
              >
                {summary.balance !== null && summary.balance < unit.price
                  ? '잔액 부족'
                  : `${unit.name} 1명 구매`}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section
        className="economy-section economy-hint"
        aria-labelledby="economy-hint-heading"
      >
        <div>
          <h3 id="economy-hint-heading">비밀 보스 힌트</h3>
          <p>시즌당 원정대별 한 번 · 보스 이름은 공개하지 않아요.</p>
        </div>
        {summary.hintPurchased ? (
          <div className="economy-hint-reveal">
            <strong>구매한 힌트</strong>
            <p>{purchasedHint(plan, seasonIndex)}</p>
          </div>
        ) : (
          <button
            type="button"
            className="preparation-secondary"
            disabled={summary.balance === null || summary.balance < HINT_PRICE}
            onClick={() => beginPurchase('BOSS_HINT', '비밀 보스 힌트', HINT_PRICE)}
          >
            {summary.balance !== null && summary.balance < HINT_PRICE
              ? '힌트 구매 · 잔액 부족'
              : `힌트 구매 · ${HINT_PRICE}P`}
          </button>
        )}
      </section>

      <details className="economy-ledger">
        <summary>구매·복구 장부 {history.length}건</summary>
        {history.length ? (
          <ol>
            {history.map((purchase) => {
              const reversed = reversedIds.has(purchase.id);
              const reversal = store.reversals.find(
                (entry) => entry.purchaseId === purchase.id,
              );
              return (
                <li key={purchase.id}>
                  <div>
                    <strong>{purchase.itemName}</strong>
                    <span>
                      {purchase.purchasedAt.slice(0, 10)} · -{purchase.price}P
                    </span>
                    {reversal && <small>복구됨 · {reversal.reason}</small>}
                  </div>
                  {!reversed && (
                    <button
                      type="button"
                      className="operation-text-link"
                      onClick={() => {
                        setReversing({
                          purchase,
                          requestId: crypto.randomUUID(),
                        });
                        setPending(null);
                        setReason('');
                        setError('');
                        setNotice('');
                      }}
                    >
                      교사 복구
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p>아직 구매 기록이 없어요.</p>
        )}
      </details>

      <p className="operation-save-note">
        학생 공개 화면은 아직 읽기 전용이에요. 구매 기록은 교사 계정 서버 자료에 함께
        동기화됩니다.
      </p>
    </OperationModal>
  );
}
