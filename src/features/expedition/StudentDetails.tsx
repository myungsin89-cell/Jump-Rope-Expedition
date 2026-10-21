import { useEffect, useRef, useState } from 'react';
import type { Preparation, StudentPlan } from '../preparation/model';
import type { PracticeStore } from '../matches/practiceModel';
import OperationModal from './OperationModal';
import { setJumper } from './operations';
import type { MedalStore } from '../medals/model';
import StudentMedals from '../medals/StudentMedals';

export default function StudentDetails({
  student,
  plan,
  store,
  onSave,
  onClose,
  medals,
  medalError,
  onMedalsChange,
}: {
  student: StudentPlan;
  plan: Preparation;
  store: PracticeStore | null;
  onSave: (plan: Preparation) => boolean;
  onClose: () => void;
  medals: MedalStore | null;
  medalError: string;
  onMedalsChange: (store: MedalStore) => void;
}) {
  const [name, setName] = useState(student.name);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const teamIndex = plan.teams.findIndex((team) => team.studentIds.includes(student.id));
  const team = plan.teams[teamIndex];
  const jumper = plan.jumpers?.[teamIndex]?.find((item) => item.studentId === student.id);
  const [isJumper, setIsJumper] = useState(Boolean(jumper));
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(jumper?.multiplier ?? 1);
  const jumperChanged =
    isJumper !== Boolean(jumper) ||
    (isJumper && multiplier !== (jumper?.multiplier ?? 1));
  const close = () => {
    const changed = name !== student.name || jumperChanged;
    if (changed && !window.confirm('변경 내용을 저장하지 않고 닫을까요?')) return;
    onClose();
  };
  const records =
    store?.history
      .filter((entry) => !entry.official?.voidedAt)
      .flatMap((entry) =>
        entry.teams.flatMap((item) =>
          item.jumpers
            .filter((choice) => choice.studentId === student.id)
            .map((choice) => ({
              id: entry.id,
              season: entry.seasonIndex + 1,
              date: entry.savedAt.slice(0, 10),
              count: choice.actual,
            })),
        ),
      ) ?? [];
  return (
    <OperationModal title={`${student.name} 학생 상세`} onClose={close}>
      <p className="preparation-hint">
        {team?.name ?? '원정대 미배정'}
        {team?.captainId === student.id ? ' · 원정대장' : ''}
        {jumper ? ` · 도전점퍼 ${jumper.multiplier}배` : ''}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) {
            setError('학생 이름을 입력해 주세요.');
            return;
          }
          const students = plan.students.map((item) =>
            item.id === student.id ? { ...item, name: name.trim() } : item,
          );
          try {
            const next = {
              ...plan,
              students,
              roster: students.map((item) => item.name).join('\n'),
            };
            if (
              onSave(
                teamIndex >= 0 && jumperChanged
                  ? setJumper(next, student.id, isJumper, multiplier)
                  : next,
              )
            )
              onClose();
            else
              setError(
                '정보를 저장하지 못했어요. 입력 내용은 유지돼요. 다시 저장해 주세요.',
              );
          } catch (reason) {
            setError(
              reason instanceof Error ? reason.message : '학생 정보를 확인해 주세요.',
            );
          }
        }}
      >
        <label htmlFor="student-detail-name">학생 이름</label>
        <input
          id="student-detail-name"
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(error) && !name.trim()}
          aria-describedby={error ? 'student-detail-name-error' : undefined}
        />
        <div className="operation-jumper-settings">
          <label className="operation-jumper-toggle">
            <input
              type="checkbox"
              checked={isJumper}
              disabled={!team}
              onChange={(event) => setIsJumper(event.target.checked)}
            />
            도전점퍼로 지정
          </label>
          {isJumper && (
            <div>
              <label htmlFor="student-detail-multiplier">기록 배수</label>
              <select
                id="student-detail-multiplier"
                value={multiplier}
                onChange={(event) =>
                  setMultiplier(Number(event.target.value) as 1 | 2 | 3)
                }
              >
                {[1, 2, 3].map((value) => (
                  <option key={value} value={value}>
                    {value}배
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="preparation-hint">
            {team
              ? '원정대별 1~2명을 지정해요. 개인 기록은 그대로 보관하고, 배수는 순위 계산에만 반영해요.'
              : '먼저 명단에서 원정대를 편성해 주세요.'}
          </p>
        </div>
        {error && (
          <p
            id="student-detail-name-error"
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="preparation-field-error"
          >
            {error}
          </p>
        )}
        <StudentMedals
          plan={plan}
          student={student}
          store={medals}
          error={medalError}
          onChange={onMedalsChange}
        />
        <details className="operation-detail-section" open={records.length > 0}>
          <summary>
            <h3>
              도전점퍼 성장 기록 <small>{records.length}건 · 경기</small>
            </h3>
          </summary>
          {records.length ? (
            <ul className="operation-student-records">
              {records.map((record) => (
                <li key={record.id}>
                  <span>
                    시즌 {record.season} · {record.date}
                  </span>
                  <strong>{record.count}개</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>도전점퍼로 기록한 개인 경기 기록이 아직 없어요.</p>
          )}
        </details>
        <div className="preparation-actions">
          <button type="button" className="preparation-secondary" onClick={close}>
            닫기
          </button>
          <button type="submit" className="preparation-primary">
            학생 정보 저장
          </button>
        </div>
      </form>
    </OperationModal>
  );
}
