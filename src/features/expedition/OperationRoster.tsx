import { useState } from 'react';
import type { Preparation, StudentPlan } from '../preparation/model';
import { rosterNames } from '../preparation/model';
import type { PracticeStore } from '../matches/practiceModel';
import { arrangeTeam, hasPracticeInputs, resizeTeams } from './operations';
import OperationModal from './OperationModal';
import TeamMembers, { RosterLegend } from './TeamMembers';
import type { MedalStore } from '../medals/model';

function AddStudents({
  plan,
  onSave,
  onClose,
}: {
  plan: Preparation;
  onSave: (plan: Preparation) => boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const close = () => {
    if (!text.trim() || window.confirm('입력한 학생을 추가하지 않고 닫을까요?'))
      onClose();
  };
  return (
    <OperationModal title="학생 추가" onClose={close}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const names = rosterNames(text);
          if (!names.length || names.some((name) => name.length > 60)) {
            setError('학생 이름을 한 줄에 한 명씩, 60자 이내로 입력해 주세요.');
            return;
          }
          const students = [
            ...plan.students,
            ...names.map((name) => ({ id: crypto.randomUUID(), name })),
          ];
          if (
            onSave({
              ...plan,
              students,
              roster: students.map((student) => student.name).join('\n'),
            })
          )
            onClose();
          else setError('저장하지 못했어요. 입력 내용은 유지돼요. 다시 추가해 주세요.');
        }}
      >
        <label htmlFor="add-students-names">추가할 학생 이름</label>
        <p className="preparation-hint" id="add-students-hint">
          한 줄에 한 명씩 입력해요. 같은 이름도 다른 줄에 적으면 각각 등록돼요.
        </p>
        <textarea
          id="add-students-names"
          rows={7}
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-describedby={`add-students-hint${error ? ' add-students-error' : ''}`}
          aria-invalid={Boolean(error)}
        />
        {error && (
          <p role="alert" id="add-students-error" className="preparation-field-error">
            {error}
          </p>
        )}
        <div className="preparation-actions">
          <button type="button" className="preparation-secondary" onClick={close}>
            취소
          </button>
          <button type="submit" className="preparation-primary">
            {rosterNames(text).length
              ? `${rosterNames(text).length}명 추가하기`
              : '학생 추가하기'}
          </button>
        </div>
      </form>
    </OperationModal>
  );
}

function EditTeam({
  plan,
  index,
  onSave,
  onClose,
}: {
  plan: Preparation;
  index: number;
  onSave: (plan: Preparation) => boolean;
  onClose: () => void;
}) {
  const team = plan.teams[index];
  const [name, setName] = useState(team.name);
  const [captain, setCaptain] = useState(team.captainId ?? '');
  const [error, setError] = useState('');
  const close = () => {
    if (
      (name !== team.name || captain !== (team.captainId ?? '')) &&
      !window.confirm('변경 내용을 저장하지 않고 닫을까요?')
    )
      return;
    onClose();
  };
  return (
    <OperationModal title={`${index + 1} 원정대 설정`} onClose={close}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (
            !name.trim() ||
            plan.teams.some(
              (item, at) => at !== index && item.name.trim() === name.trim(),
            )
          ) {
            setError('다른 원정대와 겹치지 않는 이름을 입력해 주세요.');
            return;
          }
          if (
            onSave({
              ...plan,
              teams: plan.teams.map((item, at) =>
                at === index
                  ? { ...item, name: name.trim(), captainId: captain || undefined }
                  : item,
              ),
            })
          )
            onClose();
          else
            setError(
              '설정을 저장하지 못했어요. 입력 내용은 유지돼요. 다시 저장해 주세요.',
            );
        }}
      >
        <label htmlFor="operation-team-name">원정대 이름</label>
        <input
          id="operation-team-name"
          maxLength={40}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'operation-team-name-error' : undefined}
        />
        {error && (
          <p
            role="alert"
            id="operation-team-name-error"
            className="preparation-field-error"
          >
            {error}
          </p>
        )}
        <label htmlFor="operation-team-captain">원정대장</label>
        <select
          id="operation-team-captain"
          value={captain}
          onChange={(event) => setCaptain(event.target.value)}
        >
          <option value="">나중에 정하기</option>
          {team.studentIds.map((id) => (
            <option key={id} value={id}>
              {plan.students.find((student) => student.id === id)?.name}
            </option>
          ))}
        </select>
        <p className="preparation-hint">
          원정대장은 대표 학생 표시예요. 특별한 로그인이나 구매 권한이 생기지 않아요.
        </p>
        <div className="preparation-actions">
          <button type="button" className="preparation-secondary" onClick={close}>
            취소
          </button>
          <button type="submit" className="preparation-primary">
            원정대 저장
          </button>
        </div>
      </form>
    </OperationModal>
  );
}

function ArrangeTeam({
  plan,
  index,
  onSave,
  onClose,
}: {
  plan: Preparation;
  index: number;
  onSave: (plan: Preparation) => boolean;
  onClose: () => void;
}) {
  const team = plan.teams[index];
  const [selected, setSelected] = useState(() => new Set(team.studentIds));
  const [error, setError] = useState('');
  const changed =
    selected.size !== team.studentIds.length ||
    team.studentIds.some((id) => !selected.has(id));
  const close = () => {
    if (!changed || window.confirm('변경 내용을 저장하지 않고 닫을까요?')) onClose();
  };
  const incoming = plan.teams
    .flatMap((item, at) => (at === index ? [] : item.studentIds))
    .filter((id) => selected.has(id));
  const removed = team.studentIds.filter((id) => !selected.has(id));
  return (
    <OperationModal title={`${team.name} 대원 편성`} onClose={close}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            if (onSave(arrangeTeam(plan, index, [...selected]))) onClose();
            else
              setError('편성을 저장하지 못했어요. 선택은 유지돼요. 다시 저장해 주세요.');
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : '편성을 확인해 주세요.');
          }
        }}
      >
        <p className="preparation-hint" id="arrange-hint">
          이 원정대에 함께할 학생을 골라 주세요. 다른 원정대의 학생을 고르면 소속이
          이동해요.
        </p>
        <fieldset className="operation-assignment-list" aria-describedby="arrange-hint">
          <legend>
            대원 선택 <strong>{selected.size}명</strong>
          </legend>
          <div className="operation-assignment-options">
            {plan.students.map((student, at) => {
              const source = plan.teams.find((item) =>
                item.studentIds.includes(student.id),
              );
              return (
                <label
                  key={student.id}
                  className={selected.has(student.id) ? 'is-selected' : ''}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(student.id)}
                    aria-label={`${at + 1}번 ${student.name} 편성`}
                    onChange={(event) => {
                      const next = new Set(selected);
                      if (event.target.checked) next.add(student.id);
                      else next.delete(student.id);
                      setSelected(next);
                    }}
                  />
                  <span className="operation-student-number">
                    {String(at + 1).padStart(2, '0')}
                  </span>
                  <span>{student.name}</span>
                  <small>{source?.name ?? '미배정'}</small>
                </label>
              );
            })}
          </div>
        </fieldset>
        {(incoming.length > 0 || removed.length > 0) && (
          <p className="operation-fine-print" role="status">
            다른 원정대에서 {incoming.length}명 이동 · 선택 해제한 {removed.length}명은
            미배정으로 이동해요. 이동한 학생의 기존 원정대장·도전점퍼 지정은 해제돼요.
          </p>
        )}
        {error && (
          <p className="preparation-field-error" role="alert">
            {error}
          </p>
        )}
        <div className="preparation-actions">
          <button type="button" className="preparation-secondary" onClick={close}>
            취소
          </button>
          <button type="submit" className="preparation-primary">
            {selected.size}명 편성 저장
          </button>
        </div>
      </form>
    </OperationModal>
  );
}

export default function OperationRoster({
  plan,
  store,
  onSave,
  onStudent,
  medals,
  onManageMedals,
  hasEconomyEntries,
}: {
  plan: Preparation;
  store: PracticeStore | null;
  onSave: (plan: Preparation) => boolean;
  onStudent: (student: StudentPlan) => void;
  medals: MedalStore | null;
  onManageMedals: () => void;
  hasEconomyEntries: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [arrangingTeam, setArrangingTeam] = useState<number | null>(null);
  const [error, setError] = useState('');
  const run = (create: () => Preparation) => {
    try {
      if (onSave(create())) setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '입력 내용을 확인해 주세요.');
    }
  };
  const locked =
    !store ||
    hasPracticeInputs(store) ||
    !medals ||
    medals.awards.length > 0 ||
    hasEconomyEntries;
  const waiting = plan.students.filter(
    (student) => !plan.teams.some((team) => team.studentIds.includes(student.id)),
  );
  return (
    <section aria-labelledby="operation-roster-heading">
      <div className="operation-section-heading">
        <div>
          <h2 id="operation-roster-heading" tabIndex={-1}>
            학생 명단 <small>{plan.students.length}명</small>
          </h2>
        </div>
        <div className="medal-roster-actions">
          <button
            type="button"
            className="preparation-secondary"
            disabled={!medals}
            onClick={onManageMedals}
          >
            훈장 만들기·수여
          </button>
          <button
            type="button"
            className="preparation-primary"
            onClick={() => setAdding(true)}
          >
            학생 추가
          </button>
        </div>
      </div>
      <div className="operation-team-settings">
        <label className="operation-team-count">
          원정대 수
          <select
            aria-label="원정대 수"
            value={plan.teams.length}
            disabled={locked}
            onChange={(event) =>
              run(() =>
                resizeTeams(
                  plan,
                  Number(event.target.value),
                  store!,
                  Boolean(medals?.awards.length),
                ),
              )
            }
          >
            {[2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count}개
              </option>
            ))}
          </select>
        </label>
        <p>‘대원 편성’에서 여러 명을 함께 선택해요.</p>
      </div>
      {locked && (
        <p className="operation-fine-print">
          원정대 수는 경기 기록·훈장 수여·구매 전에 정해 주세요. 기존 기록을 지우지 않도록
          기록 이후의 수 변경은 아직 지원하지 않아요.
        </p>
      )}
      {error && (
        <p role="alert" className="preparation-storage-error">
          {error}
        </p>
      )}
      <RosterLegend />
      {waiting.length > 0 && (
        <section className="operation-waiting" aria-labelledby="waiting-heading">
          <div className="operation-section-heading">
            <h3 id="waiting-heading">
              미배정 학생 <small>{waiting.length}명</small>
            </h3>
            <span>아래 원정대의 ‘대원 편성’에서 선택해 주세요.</span>
          </div>
          <TeamMembers
            plan={plan}
            teamIndex={null}
            onStudent={onStudent}
            medals={medals}
          />
        </section>
      )}
      <div
        className="operation-teams operation-roster-groups"
        data-count={plan.teams.length}
      >
        {plan.teams.map((team, index) => (
          <article key={index} className={`operation-team team-color-${index}`}>
            <header>
              <div>
                <h3>{team.name}</h3>
                <span className="operation-team-meta">
                  대원 {team.studentIds.length}명 · 도전점퍼{' '}
                  {plan.jumpers?.[index]?.filter((item) =>
                    team.studentIds.includes(item.studentId),
                  ).length ?? 0}
                  명
                </span>
              </div>
            </header>
            <div className="operation-team-actions">
              <button
                type="button"
                className="operation-outline-button"
                aria-label={`${index + 1} 원정대 대원 편성`}
                onClick={() => setArrangingTeam(index)}
              >
                대원 편성
              </button>
              <button
                type="button"
                className="operation-quiet-button"
                aria-label={`${index + 1} 원정대 이름과 대장 설정`}
                onClick={() => setEditingTeam(index)}
              >
                이름·대장 설정
              </button>
            </div>
            <TeamMembers
              plan={plan}
              teamIndex={index}
              onStudent={onStudent}
              medals={medals}
            />
            {!team.studentIds.length && (
              <p className="operation-empty-roster">
                ‘대원 편성’에서 함께할 학생을 골라 주세요.
              </p>
            )}
          </article>
        ))}
      </div>
      {adding && (
        <AddStudents plan={plan} onSave={onSave} onClose={() => setAdding(false)} />
      )}
      {editingTeam !== null && (
        <EditTeam
          key={editingTeam}
          plan={plan}
          index={editingTeam}
          onSave={onSave}
          onClose={() => setEditingTeam(null)}
        />
      )}
      {arrangingTeam !== null && (
        <ArrangeTeam
          plan={plan}
          index={arrangingTeam}
          onSave={onSave}
          onClose={() => setArrangingTeam(null)}
        />
      )}
    </section>
  );
}
