import { useState } from 'react';
import type { FormEvent } from 'react';
import OperationModal from '../expedition/OperationModal';
import type { Preparation } from '../preparation/model';
import MedalIcon from './MedalIcon';
import {
  awardBlockReason,
  awardMedal,
  DEFAULT_MEDAL_COLOR,
  medalColors,
  saveMedal,
} from './model';
import type { MedalDefinition, MedalStore } from './model';

const draft = (): MedalDefinition => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  symbol: 'star',
  image: '',
  color: DEFAULT_MEDAL_COLOR,
  active: true,
});

export default function MedalManager({
  plan,
  store,
  onChange,
  onClose,
}: {
  plan: Preparation;
  store: MedalStore;
  onChange: (store: MedalStore) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'create' | 'award'>('create');
  const [editing, setEditing] = useState(draft);
  const [baseline, setBaseline] = useState(editing);
  const [selectedMedalId, setSelectedMedalId] = useState(
    () => store.definitions.find((item) => item.active)?.id ?? '',
  );
  const [studentId, setStudentId] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = JSON.stringify(editing) !== JSON.stringify(baseline);
  const active = store.definitions.filter((item) => item.active);
  const selected = active.find((item) => item.id === selectedMedalId) ?? active[0];
  const student = plan.students.find((item) => item.id === studentId);
  const blocked = student ? awardBlockReason(plan, student.id) : '';

  const discard = () =>
    !dirty || window.confirm('작성한 훈장을 저장하지 않고 이동할까요?');
  const close = () => {
    if (discard()) onClose();
  };
  const changeMode = (next: 'create' | 'award') => {
    if (next === mode || discard()) {
      setMode(next);
      setError('');
      setNotice('');
    }
  };
  const choose = (medal: MedalDefinition) => {
    if (!discard()) return;
    setEditing({ ...medal, color: medal.color ?? DEFAULT_MEDAL_COLOR });
    setBaseline({ ...medal, color: medal.color ?? DEFAULT_MEDAL_COLOR });
    setMode('create');
    setError('');
    setNotice('');
  };
  const commit = (medal: MedalDefinition, reset: boolean) => {
    try {
      const next = saveMedal(store.expeditionId, medal);
      onChange(next);
      if (!reset && editing.id === medal.id) {
        setEditing((value) => ({ ...value, active: medal.active }));
        setBaseline((value) => ({ ...value, active: medal.active }));
      }
      if (reset) {
        const blank = draft();
        setEditing(blank);
        setBaseline(blank);
        setSelectedMedalId(medal.id);
        setNotice(`‘${medal.name.trim()}’ 훈장을 저장했어요.`);
      }
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `저장하지 못했어요. ${reason.message}`
          : '저장하지 못했어요. 입력은 유지돼요. 다시 시도해 주세요.',
      );
    }
  };
  const award = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !student) return;
    try {
      const next = awardMedal(plan, student.id, selected.id, requestId);
      onChange(next);
      setRequestId(crypto.randomUUID());
      setStudentId('');
      setError('');
      setNotice(
        `${student.name} 학생에게 ‘${selected.name}’ 훈장을 주었어요. 소속 원정대 +10P`,
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
    <OperationModal title="훈장 만들기·수여" onClose={close}>
      <div className="medal-manager-tabs" role="tablist" aria-label="훈장 작업">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'create'}
          onClick={() => changeMode('create')}
        >
          1. 훈장 만들기
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'award'}
          onClick={() => changeMode('award')}
        >
          2. 학생에게 수여
        </button>
      </div>

      {mode === 'create' ? (
        <>
          <p className="preparation-hint">
            완성된 훈장 모양에서 색상만 고르면 돼요. 이미지 파일을 준비할 필요가 없어요.
            수여할 때마다 소속 원정대에 10P가 반영돼요.
          </p>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              commit(editing, true);
            }}
          >
            <div className="medal-large-preview">
              <MedalIcon medal={editing} decorative />
              <div>
                <small>훈장 미리보기</small>
                <strong>{editing.name.trim() || '새 칭찬 훈장'}</strong>
                <p>
                  {editing.description.trim() ||
                    '훈장을 주고 싶은 멋진 모습을 적어 주세요.'}
                </p>
              </div>
            </div>
            <label htmlFor="medal-name">훈장 이름</label>
            <input
              id="medal-name"
              maxLength={40}
              placeholder="예: 따뜻한 도움"
              value={editing.name}
              onChange={(event) => setEditing({ ...editing, name: event.target.value })}
            />
            <fieldset className="medal-color-fieldset">
              <legend>훈장 색상</legend>
              <div className="medal-color-options">
                {medalColors.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={`${option.name} 훈장`}
                    aria-pressed={(editing.color ?? DEFAULT_MEDAL_COLOR) === option.value}
                    onClick={() =>
                      setEditing({ ...editing, color: option.value, image: '' })
                    }
                  >
                    <span style={{ backgroundColor: option.value }} aria-hidden="true" />
                    <small>{option.name}</small>
                  </button>
                ))}
              </div>
            </fieldset>
            <label htmlFor="medal-description">설명·수여 기준</label>
            <textarea
              id="medal-description"
              rows={2}
              maxLength={300}
              placeholder="예: 친구의 준비를 먼저 도와주었을 때"
              value={editing.description}
              onChange={(event) =>
                setEditing({ ...editing, description: event.target.value })
              }
            />
            {error && (
              <p role="alert" className="preparation-field-error">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="medal-success">
                {notice}
              </p>
            )}
            <div className="preparation-actions">
              <button
                type="button"
                className="preparation-secondary"
                onClick={() => choose(draft())}
              >
                새 훈장
              </button>
              <button type="submit" className="preparation-primary">
                {store.definitions.some((item) => item.id === editing.id)
                  ? '변경 저장'
                  : '훈장 저장'}
              </button>
            </div>
          </form>
          <section className="operation-detail-section" aria-label="만든 훈장">
            <h3>
              만든 훈장 <small>{store.definitions.length}개</small>
            </h3>
            {!store.definitions.length && <p>아직 만든 훈장이 없어요.</p>}
            <ul className="medal-definition-list">
              {store.definitions.map((medal) => (
                <li key={medal.id}>
                  <MedalIcon medal={medal} />
                  <div>
                    <strong>{medal.name}</strong>
                    <p>{medal.description}</p>
                    <small>{medal.active ? '사용 중' : '사용 중지'}</small>
                  </div>
                  <div className="medal-definition-actions">
                    {medal.active && (
                      <button
                        type="button"
                        className="operation-outline-button"
                        onClick={() => {
                          if (!discard()) return;
                          setSelectedMedalId(medal.id);
                          setMode('award');
                          setError('');
                          setNotice('');
                        }}
                      >
                        이 훈장 수여
                      </button>
                    )}
                    <button
                      type="button"
                      className="operation-quiet-button"
                      aria-label={`${medal.name} 수정`}
                      onClick={() => choose(medal)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="operation-quiet-button"
                      aria-label={`${medal.name} ${medal.active ? '사용 중지' : '다시 사용'}`}
                      onClick={() => {
                        if (
                          medal.active &&
                          !window.confirm(
                            '새 수여에 사용하지 않도록 중지할까요? 기존 수여 이력은 유지돼요.',
                          )
                        )
                          return;
                        commit({ ...medal, active: !medal.active }, false);
                      }}
                    >
                      {medal.active ? '사용 중지' : '다시 사용'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <form className="medal-quick-award" onSubmit={award}>
          <p className="preparation-hint">
            만들어 둔 훈장과 학생을 고른 뒤 한 번만 누르면 바로 수여돼요.
          </p>
          {!active.length ? (
            <div className="medal-empty-action">
              <p>먼저 사용할 훈장을 하나 만들어 주세요.</p>
              <button
                type="button"
                className="preparation-primary"
                onClick={() => changeMode('create')}
              >
                훈장 만들기
              </button>
            </div>
          ) : (
            <>
              <label htmlFor="manager-medal">수여할 훈장</label>
              <select
                id="manager-medal"
                value={selected?.id}
                onChange={(event) => {
                  setSelectedMedalId(event.target.value);
                  setError('');
                  setNotice('');
                }}
              >
                {active.map((medal) => (
                  <option key={medal.id} value={medal.id}>
                    {medal.name}
                  </option>
                ))}
              </select>
              {selected && (
                <div className="medal-large-preview medal-award-preview">
                  <MedalIcon medal={selected} decorative />
                  <div>
                    <small>수여할 훈장</small>
                    <strong>{selected.name}</strong>
                    <p>{selected.description}</p>
                  </div>
                </div>
              )}
              <label htmlFor="manager-student">받을 학생</label>
              <select
                id="manager-student"
                required
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value);
                  setError('');
                  setNotice('');
                }}
              >
                <option value="">학생을 선택해 주세요</option>
                {plan.students.map((item, index) => {
                  const team = plan.teams.find((value) =>
                    value.studentIds.includes(item.id),
                  );
                  return (
                    <option key={item.id} value={item.id}>
                      {index + 1}번 {item.name} · {team?.name ?? '미배정'}
                    </option>
                  );
                })}
              </select>
              {blocked && <p className="preparation-field-error">{blocked}</p>}
              {notice && (
                <p role="status" className="medal-success">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="preparation-field-error">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="preparation-primary medal-award-submit"
                disabled={!student || Boolean(blocked)}
              >
                {student ? `${student.name}에게 훈장 수여 (+10P)` : '학생에게 훈장 수여'}
              </button>
            </>
          )}
        </form>
      )}
      <div className="preparation-actions">
        <button type="button" className="preparation-secondary" onClick={close}>
          닫기
        </button>
      </div>
    </OperationModal>
  );
}
