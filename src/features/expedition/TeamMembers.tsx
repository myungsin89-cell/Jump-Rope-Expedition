import type { Preparation, StudentPlan } from '../preparation/model';
import { studentMedals } from '../medals/model';
import type { MedalStore } from '../medals/model';
import MedalIcon from '../medals/MedalIcon';

/** A shared, numbered roster: roles stay in the list instead of repeating names. */
export default function TeamMembers({
  plan,
  teamIndex,
  onStudent,
  medals,
}: {
  plan: Preparation;
  teamIndex: number | null;
  onStudent: (student: StudentPlan) => void;
  medals?: MedalStore | null;
}) {
  const team = teamIndex === null ? undefined : plan.teams[teamIndex];
  const members = plan.students.filter((student) =>
    team
      ? team.studentIds.includes(student.id)
      : !plan.teams.some((item) => item.studentIds.includes(student.id)),
  );
  return (
    <ol
      className="operation-roster-list"
      aria-label={`${team?.name ?? '미배정'} 대원 명단`}
    >
      {members.map((student) => {
        const number = plan.students.findIndex((item) => item.id === student.id) + 1;
        const captain = team?.captainId === student.id;
        const received = medals ? studentMedals(medals, student.id) : [];
        const jumper =
          teamIndex !== null &&
          plan.jumpers?.[teamIndex]?.some((item) => item.studentId === student.id);
        return (
          <li key={student.id}>
            <button
              type="button"
              className={`operation-student-name${jumper ? ' is-jumper' : ''}`}
              aria-label={`${number}번 ${student.name}${captain ? ' 원정대장' : ''}${jumper ? ' 도전점퍼' : ''}${received.length ? ` 훈장 ${received.map((item) => item.medal.name).join(', ')}` : ''} 상세`}
              onClick={() => onStudent(student)}
            >
              <span className="operation-student-number" aria-hidden="true">
                {String(number).padStart(2, '0')}
              </span>
              <span className="operation-member-name">
                <span>{student.name}</span>
                {received.length > 0 && (
                  <span className="medal-name-icons">
                    {received.map(({ medal }) => (
                      <span key={medal.id} title={medal.name}>
                        <MedalIcon medal={medal} decorative />
                      </span>
                    ))}
                  </span>
                )}
              </span>
              {captain && <span className="operation-captain-tag">원정대장</span>}
              {jumper && (
                <span
                  className="operation-jumper-mark"
                  aria-hidden="true"
                  title="도전점퍼"
                >
                  도전
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function RosterLegend() {
  return (
    <p className="operation-roster-legend">
      <span aria-hidden="true" />
      테두리 표시: 도전점퍼 · 이름을 누르면 상세와 배수를 확인해요.
    </p>
  );
}
