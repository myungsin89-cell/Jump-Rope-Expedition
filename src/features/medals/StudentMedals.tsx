import { useState } from 'react';
import type { Preparation, StudentPlan } from '../preparation/model';
import { awardBlockReason, awardMedal, studentMedals } from './model';
import type { MedalStore } from './model';
import MedalIcon from './MedalIcon';

export default function StudentMedals({
  plan,
  student,
  store,
  error: loadError,
  onChange,
}: {
  plan: Preparation;
  student: StudentPlan;
  store: MedalStore | null;
  error: string;
  onChange: (store: MedalStore) => void;
}) {
  const [selected, setSelected] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false);
  const blocked = awardBlockReason(plan, student.id);
  const medals = store ? studentMedals(store, student.id) : [];
  const active = store?.definitions.filter((item) => item.active) ?? [];
  const team = plan.teams.find((item) => item.studentIds.includes(student.id));
  return (
    <details className="operation-detail-section" aria-label="학생 훈장">
      <summary>
        <h3>
          받은 훈장{' '}
          <small>
            {medals.reduce((sum, item) => sum + item.awards.length, 0)}개 · 연습 ·
            이력/수여
          </small>
        </h3>
      </summary>
      {loadError ? (
        <p role="alert">{loadError}</p>
      ) : (
        <>
          <ul className="medal-student-list">
            {medals.map(({ medal, awards }) => (
              <li key={medal.id}>
                <MedalIcon medal={medal} />
                <div>
                  <strong>
                    {medal.name} · {awards.length}회
                  </strong>
                  <p>{medal.description}</p>
                  <details>
                    <summary>수여 이력</summary>
                    <ul>
                      {[...awards].reverse().map((award) => (
                        <li key={award.id}>
                          <time dateTime={award.awardedAt}>
                            {new Date(award.awardedAt).toLocaleString('ko-KR')}
                          </time>
                          <br />
                          시즌 {award.seasonIndex + 1} · {award.teamName} +10P
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </li>
            ))}
          </ul>
          {!medals.length && <p>아직 받은 훈장이 없어요.</p>}
          {!active.length ? (
            <p>명단의 ‘훈장 관리’에서 사용할 훈장을 만들어 주세요.</p>
          ) : (
            <>
              <label htmlFor="student-medal">수여할 훈장</label>
              <select
                id="student-medal"
                disabled={Boolean(blocked)}
                value={selected}
                onChange={(event) => {
                  setSelected(event.target.value);
                  setConfirming(false);
                  setError('');
                  setNotice('');
                }}
              >
                <option value="">훈장 선택</option>
                {active.map((medal) => (
                  <option key={medal.id} value={medal.id}>
                    {medal.name}
                  </option>
                ))}
              </select>
              {blocked ? (
                <p className="preparation-hint">{blocked}</p>
              ) : (
                <p className="preparation-hint">
                  경기 기록 없이도 수여해요. {team?.name}에 연습 포인트 10P가 반영돼요.
                </p>
              )}
              {confirming && (
                <p className="preparation-hint" role="status">
                  {student.name} 학생에게 ‘
                  {active.find((item) => item.id === selected)?.name}’ 훈장을 주고{' '}
                  {team?.name}에 +10P를 반영할까요? 반복 수여도 각각 10P예요.
                </p>
              )}
              <div className="medal-award-actions">
                <button
                  type="button"
                  className="operation-outline-button"
                  disabled={!selected || Boolean(blocked)}
                  onClick={() => {
                    if (!confirming) {
                      setConfirming(true);
                      return;
                    }
                    try {
                      const result = awardMedal(plan, student.id, selected, requestId);
                      onChange(result);
                      setRequestId(crypto.randomUUID());
                      setConfirming(false);
                      setSelected('');
                      setError('');
                      setNotice(
                        `${student.name} 학생에게 훈장을 주었어요. ${team?.name} 연습 +10P`,
                      );
                    } catch (reason) {
                      setError(
                        reason instanceof Error
                          ? `수여하지 못했어요. ${reason.message}`
                          : '수여하지 못했어요. 다시 시도해 주세요.',
                      );
                    }
                  }}
                >
                  {confirming ? '수여 확정 (+10P)' : '훈장 주기'}
                </button>
                {confirming && (
                  <button
                    type="button"
                    className="operation-quiet-button"
                    onClick={() => setConfirming(false)}
                  >
                    수여 취소
                  </button>
                )}
              </div>
            </>
          )}
          {notice && <p role="status">{notice}</p>}
          {error && (
            <p role="alert" className="preparation-field-error">
              {error}
            </p>
          )}
        </>
      )}
    </details>
  );
}
