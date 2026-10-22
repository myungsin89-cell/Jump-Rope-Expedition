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
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const blocked = awardBlockReason(plan, student.id);
  const medals = store ? studentMedals(store, student.id) : [];
  const active = store?.definitions.filter((item) => item.active) ?? [];
  const team = plan.teams.find((item) => item.studentIds.includes(student.id));
  const give = (medalId: string) => {
    try {
      const result = awardMedal(plan, student.id, medalId, requestId);
      const medal = active.find((item) => item.id === medalId);
      onChange(result);
      setRequestId(crypto.randomUUID());
      setError('');
      setNotice(
        `${student.name} 학생에게 ‘${medal?.name}’ 훈장을 주었어요. ${team?.name} +10P`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `수여하지 못했어요. ${reason.message}`
          : '수여하지 못했어요. 다시 시도해 주세요.',
      );
    }
  };
  return (
    <details className="operation-detail-section" aria-label="학생 훈장">
      <summary>
        <h3>
          훈장 수여{' '}
          <small>
            받은 훈장 {medals.reduce((sum, item) => sum + item.awards.length, 0)}개 ·
            눌러서 선택
          </small>
        </h3>
      </summary>
      {loadError ? (
        <p role="alert">{loadError}</p>
      ) : (
        <>
          {!active.length ? (
            <p>명단의 ‘훈장 만들기·수여’에서 사용할 훈장을 만들어 주세요.</p>
          ) : (
            <>
              <p className="preparation-hint">
                줄 훈장을 한 번 누르면 바로 수여돼요. 같은 훈장을 반복해서 줄 수도 있어요.
              </p>
              <div className="medal-award-grid" aria-label="수여할 훈장">
                {active.map((medal) => (
                  <button
                    key={medal.id}
                    type="button"
                    disabled={Boolean(blocked)}
                    aria-label={`${medal.name} 훈장 수여`}
                    onClick={() => give(medal.id)}
                  >
                    <MedalIcon medal={medal} decorative />
                    <span>
                      <strong>{medal.name}</strong>
                      <small>수여하기 · +10P</small>
                    </span>
                  </button>
                ))}
              </div>
              {blocked ? (
                <p className="preparation-hint">{blocked}</p>
              ) : (
                <p className="preparation-hint">
                  경기 기록 없이도 수여해요. {team?.name}에 연습 포인트 10P가 반영돼요.
                </p>
              )}
            </>
          )}
          {notice && <p role="status">{notice}</p>}
          {error && (
            <p role="alert" className="preparation-field-error">
              {error}
            </p>
          )}
          <h4 className="medal-history-heading">받은 훈장</h4>
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
        </>
      )}
    </details>
  );
}
