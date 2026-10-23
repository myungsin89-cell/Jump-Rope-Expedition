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
  featureCaptain = false,
}: {
  plan: Preparation;
  teamIndex: number | null;
  onStudent: (student: StudentPlan) => void;
  medals?: MedalStore | null;
  featureCaptain?: boolean;
}) {
  const team = teamIndex === null ? undefined : plan.teams[teamIndex];
  const members = plan.students.filter((student) =>
    team
      ? team.studentIds.includes(student.id)
      : !plan.teams.some((item) => item.studentIds.includes(student.id)),
  );
  const captain = team?.captainId
    ? members.find((student) => student.id === team.captainId)
    : undefined;
  const rosterMembers = featureCaptain
    ? members.filter((student) => student.id !== captain?.id)
    : members;

  const memberButton = (student: StudentPlan, featured = false) => {
    const number = plan.students.findIndex((item) => item.id === student.id) + 1;
    const isCaptain = team?.captainId === student.id;
    const received = medals ? studentMedals(medals, student.id) : [];
    const jumper =
      teamIndex !== null &&
      plan.jumpers?.[teamIndex]?.some((item) => item.studentId === student.id);

    return (
      <button
        type="button"
        className={`operation-student-name${jumper ? ' is-jumper' : ''}${featured ? ' operation-captain-student' : ''}`}
        aria-label={`${number}번 ${student.name}${isCaptain ? ' 원정대장' : ''}${jumper ? ' 도전점퍼' : ''}${received.length ? ` 훈장 ${received.map((item) => item.medal.name).join(', ')}` : ''} 상세`}
        onClick={() => onStudent(student)}
      >
        <span className="operation-student-number" aria-hidden="true">
          {String(number).padStart(2, '0')}
        </span>
        <span className="operation-member-name">
          <span className="operation-member-name-row">
            <span className="operation-member-label">{student.name}</span>
            {received.length > 0 && (
              <span className="medal-name-icons">
                {received.map(({ medal }) => (
                  <span key={medal.id} title={medal.name}>
                    <MedalIcon
                      medal={
                        medals?.definitions.find((item) => item.id === medal.id) ?? medal
                      }
                      decorative
                    />
                  </span>
                ))}
              </span>
            )}
          </span>
        </span>
        {isCaptain && !featured && (
          <span className="operation-captain-tag">원정대장</span>
        )}
      </button>
    );
  };

  return (
    <>
      {team && featureCaptain && (
        <div className="operation-captain-feature">
          <span className="operation-captain-heading">원정대장</span>
          {captain ? (
            memberButton(captain, true)
          ) : (
            <p className="operation-captain-empty">아직 원정대장을 정하지 않았어요.</p>
          )}
        </div>
      )}
      <ol
        className="operation-roster-list"
        aria-label={`${team?.name ?? '미배정'} 대원 명단`}
      >
        {rosterMembers.map((student) => (
          <li key={student.id}>{memberButton(student)}</li>
        ))}
      </ol>
    </>
  );
}

export function RosterLegend() {
  return (
    <p className="operation-roster-legend">
      <span aria-hidden="true" />
      이름 아래 금색 선: 도전점퍼 · 이름을 누르면 훈장 수여와 상세 기록을 확인해요.
    </p>
  );
}
