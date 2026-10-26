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
import { reverseStudentBoardPurchase } from '../student/studentBoardClient';
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
  const [working, setWorking] = useState(false);
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
  const studentHistory = history.filter((purchase) => purchase.actor === 'student-board');
  const activeStudentPurchaseCount = studentHistory.filter(
    (purchase) => !reversedIds.has(purchase.id),
  ).length;

  const beginReversal = (purchase: EconomyPurchase) => {
    setReversing({ purchase, requestId: crypto.randomUUID() });
    setPending(null);
    setReason('');
    setError('');
    setNotice('');
  };

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

  const confirmReversal = async () => {
    if (!reversing || working) return;
    setWorking(true);
    try {
      let serverRecorded = true;
      if (reversing.purchase.actor === 'student-board') {
        serverRecorded = await reverseStudentBoardPurchase(
          plan.id,
          reversing.purchase.id,
          reversing.requestId,
          reason,
        );
      }
      const next = reversePurchase(
        plan.id,
        reversing.purchase.id,
        reversing.requestId,
        reason,
      );
      onChange(next);
      setNotice(
        serverRecorded
          ? `${reversing.purchase.itemName} 구매를 취소하고 ${reversing.purchase.price}P를 환불했어요.`
          : `${reversing.purchase.itemName} 구매를 취소하고 ${reversing.purchase.price}P를 환불했어요. 교사 계정에 연결되면 서버 장부도 자동으로 맞춰요.`,
      );
      setError('');
      setReason('');
      setReversing(null);
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : '구매 취소 내용을 확인해 주세요.',
      );
    } finally {
      setWorking(false);
    }
  };

  const balanceLabel =
    summary.balance === null ? '확인 필요' : `${summary.balance.toLocaleString()}P`;

  return (
    <OperationModal title={`${team.name} · 포인트·구매 관리`} onClose={onClose}>
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
              disabled={working}
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
          <h3 id="economy-reversal-title">{reversing.purchase.itemName} 구매 취소</h3>
          <p>
            교사만 실수 구매를 취소할 수 있어요. 원래 구매 기록은 삭제하지 않고 취소
            내역을 함께 남깁니다.
          </p>
          {reversing.purchase.actor === 'student-board' && (
            <p className="economy-reversal-student-note">
              학생이 원정대 게시판에서 구매한 내역이에요. 취소하면{' '}
              {reversing.purchase.price}P가 팀 잔액으로 환불되고 병력·힌트 반영도
              취소됩니다.
            </p>
          )}
          <label htmlFor="economy-reversal-reason">취소 사유</label>
          <textarea
            id="economy-reversal-reason"
            aria-describedby="economy-reversal-help"
            minLength={3}
            maxLength={200}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="예: 다른 병력을 잘못 선택함"
          />
          <small id="economy-reversal-help" className="economy-reversal-help">
            3자 이상 입력해 주세요. 취소 사유는 구매 기록과 함께 보관됩니다.
          </small>
          <div className="preparation-actions">
            <button
              type="button"
              className="preparation-secondary"
              onClick={() => {
                setReversing(null);
                setReason('');
              }}
            >
              돌아가기
            </button>
            <button
              type="button"
              className="preparation-primary economy-danger-action"
              disabled={working || reason.trim().length < 3}
              aria-busy={working}
              onClick={() => void confirmReversal()}
            >
              {working
                ? '구매 취소 처리 중…'
                : `구매 취소 · ${reversing.purchase.price}P 환불`}
            </button>
          </div>
        </section>
      )}

      <section
        className="economy-section economy-student-ledger"
        aria-labelledby="economy-student-ledger-heading"
      >
        <div className="economy-student-ledger-heading">
          <div>
            <h3 id="economy-student-ledger-heading">학생 구매 내역</h3>
            <p>
              학생이 원정대 QR에서 구매한 병력과 힌트예요. 실수 구매는 교사가 취소합니다.
            </p>
          </div>
          <strong>{activeStudentPurchaseCount}건 취소 가능</strong>
        </div>
        {studentHistory.length ? (
          <ol>
            {studentHistory.map((purchase) => {
              const reversed = reversedIds.has(purchase.id);
              const reversal = store.reversals.find(
                (entry) => entry.purchaseId === purchase.id,
              );
              return (
                <li key={purchase.id} data-state={reversed ? 'cancelled' : 'active'}>
                  <div>
                    <strong>{purchase.itemName}</strong>
                    <span>
                      {purchase.purchasedAt.slice(0, 10)} · {purchase.price}P 사용
                    </span>
                    {reversal && <small>취소됨 · {reversal.reason}</small>}
                  </div>
                  {reversed ? (
                    <span className="economy-cancelled-label">취소 완료</span>
                  ) : (
                    <button
                      type="button"
                      className="economy-danger-link"
                      aria-label={`${purchase.itemName} 학생 구매 취소`}
                      onClick={() => beginReversal(purchase)}
                    >
                      구매 취소
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="economy-student-empty">이번 시즌에는 학생 구매 내역이 없어요.</p>
        )}
      </section>

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
        <summary>전체 구매·취소 기록 {history.length}건</summary>
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
                    {reversal && <small>취소됨 · {reversal.reason}</small>}
                    {purchase.actor === 'student-board' && (
                      <small>원정대 게시판에서 구매</small>
                    )}
                  </div>
                  {!reversed && purchase.actor !== 'student-board' && (
                    <button
                      type="button"
                      className="operation-text-link"
                      onClick={() => beginReversal(purchase)}
                    >
                      교사 구매 취소
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
        원정대 게시판에서 구매한 기록도 자동으로 이 장부와 최종 대전에 반영됩니다.
      </p>
    </OperationModal>
  );
}
