import type { Preparation, StudentPlan } from '../preparation/model';
import {
  readySeasonIndices,
  validateJumpers,
  validatePreparation,
} from '../preparation/model';
import type { PracticeStore } from '../matches/practiceModel';
import { currentSeasonIndex, operationHref, previewHistory } from './operations';
import TeamMembers, { RosterLegend } from './TeamMembers';
import { companionProgress, medalPoints } from '../medals/model';
import type { MedalStore } from '../medals/model';
import type { EconomyStore } from '../economy/model';
import { teamEconomySummary } from '../economy/model';

export default function ExpeditionOverview({
  plan,
  store,
  onRecord,
  onStudent,
  medals,
  economy,
  onEconomy,
}: {
  plan: Preparation;
  store: PracticeStore | null;
  onRecord: () => void;
  onStudent: (student: StudentPlan) => void;
  medals: MedalStore | null;
  economy: EconomyStore | null;
  onEconomy: (teamIndex: number) => void;
}) {
  const seasonIndex = currentSeasonIndex(plan);
  const season = plan.seasons[seasonIndex];
  const ready = readySeasonIndices(plan).includes(seasonIndex);
  const rosterReady =
    !Object.keys(validatePreparation(plan, 'teams')).length &&
    !Object.keys(validateJumpers(plan)).length;
  const summary = previewHistory(store?.history ?? [], seasonIndex);
  const assigned = new Set(plan.teams.flatMap((team) => team.studentIds));
  return (
    <section aria-labelledby="operation-overview-heading">
      <div className="operation-season-banner">
        <div>
          <h2 id="operation-overview-heading" tabIndex={-1}>
            시즌 {seasonIndex + 1}
            <small>
              {!ready
                ? '시즌 설정 필요'
                : rosterReady
                  ? '기록 가능 · 연습'
                  : '대원 구성 필요'}
            </small>
          </h2>
          <p>
            {season.startDate && season.endDate
              ? `${season.startDate.replaceAll('-', '.')} — ${season.endDate.replaceAll('-', '.')}`
              : '시즌 설정에서 이번 시즌의 기간과 보스를 정해 주세요.'}
          </p>
          <span className="operation-season-count">
            {summary.entries.length}경기 기록 · {plan.teams.length}개 원정대 ·{' '}
            {plan.students.length}명
          </span>
        </div>
        <div className="operation-record-action">
          <button type="button" className="preparation-primary" onClick={onRecord}>
            경기 기록하기
          </button>
          <span>
            {!rosterReady
              ? '먼저 명단에서 대원과 도전점퍼를 정해 주세요.'
              : !ready
                ? '먼저 이번 시즌의 기간과 보스를 정해 주세요.'
                : store?.draft
                  ? '작성 중인 입력은 이어서 열려요.'
                  : '개수 입력 후 순위와 포인트 확인'}
          </span>
        </div>
      </div>
      <div className="operation-section-heading">
        <div>
          <h2>함께하는 원정대</h2>
        </div>
        <a className="operation-text-link" href={operationHref(plan.id, 'roster')}>
          명단에서 구성하기
        </a>
      </div>
      <RosterLegend />
      <div className="operation-teams" data-count={plan.teams.length}>
        {plan.teams.map((team, index) => {
          const latest = summary.latest.find(
            (result) => result.teamKey === `team-${index}`,
          );
          const points = summary.points.get(`team-${index}`);
          const medalTotal = medals ? medalPoints(medals, index, seasonIndex) : null;
          const progress = medals ? companionProgress(medals, index) : null;
          const economySummary = teamEconomySummary(
            plan,
            { practice: store, medals },
            economy,
            index,
            seasonIndex,
          );
          const total =
            points === null || medalTotal === null ? null : (points ?? 0) + medalTotal;
          const jumpers = (plan.jumpers?.[index] ?? []).filter((jumper) =>
            team.studentIds.includes(jumper.studentId),
          );
          return (
            <article className={`operation-team team-color-${index}`} key={index}>
              <header>
                <div>
                  <h3>{team.name}</h3>
                  <span className="operation-team-meta">
                    대원 {team.studentIds.length}명 · 도전점퍼 {jumpers.length}명
                  </span>
                </div>
              </header>
              <dl className="operation-team-stats">
                <div>
                  <dt>최근 연습 순위</dt>
                  <dd>{latest ? `${latest.rank}위` : '—'}</dd>
                </div>
                <div>
                  <dt>연습 획득 합계</dt>
                  <dd>
                    {medalTotal === null
                      ? '확인 필요'
                      : total === null
                        ? '일부 미정'
                        : points === undefined && !medalTotal
                          ? '—'
                          : `${total.toLocaleString()}P`}
                  </dd>
                </div>
              </dl>
              <TeamMembers
                plan={plan}
                teamIndex={index}
                onStudent={onStudent}
                medals={medals}
                featureCaptain
              />
              {!team.studentIds.length && (
                <p className="operation-empty-roster">
                  <a href={operationHref(plan.id, 'roster')}>
                    명단에서 대원을 편성해 주세요.
                  </a>
                </p>
              )}
              {medalTotal !== null && medalTotal > 0 && (
                <p className="medal-team-note">훈장 +{medalTotal}P 포함</p>
              )}
              {progress && progress.distinct > 0 && (
                <p className="medal-team-note">
                  빛나는 동료들: 서로 다른 수상자 {progress.distinct}명 · 다음 기준{' '}
                  {progress.next}명
                  {progress.earned > 0
                    ? ` · 조건 달성 ${progress.earned}회 (영웅 추첨은 다음 단계)`
                    : ''}
                </p>
              )}
              <button
                type="button"
                className="preparation-secondary economy-team-button"
                disabled={!store || !medals || !economy}
                onClick={() => onEconomy(index)}
              >
                팀 준비 · 잔액{' '}
                {economySummary.balance === null
                  ? '확인 필요'
                  : `${economySummary.balance.toLocaleString()}P`}
              </button>
            </article>
          );
        })}
      </div>
      {assigned.size < plan.students.length && (
        <p className="operation-fine-print">
          아직 원정대에 배정하지 않은 학생이 {plan.students.length - assigned.size}명
          있어요. 명단에서 배정할 수 있어요.
        </p>
      )}
      <p className="operation-local-note">
        이 브라우저의 경기·훈장·구매 연습 기록 기준이에요. 팀 준비의 잔액과 구매는 로컬
        기능 검증용이며 서버 공식 장부·누적 승점은 아직 연결 전이에요.
      </p>
      <section className="operation-history" aria-labelledby="operation-history-heading">
        <div className="operation-section-heading">
          <h2 id="operation-history-heading">
            최근 경기 기록 <small>연습</small>
          </h2>
          <span>{summary.entries.length}개</span>
        </div>
        {summary.entries.length ? (
          <ol>
            {[...summary.entries].reverse().map((entry, index) => (
              <li key={entry.id}>
                <details>
                  <summary>
                    <span>{summary.entries.length - index}번째 기록</span>
                    <time dateTime={entry.savedAt}>{entry.savedAt.slice(0, 10)}</time>
                    <span>결과 보기</span>
                  </summary>
                  <ul>
                    {entry.teams.map((team) => (
                      <li key={team.key}>
                        <strong>{team.name}</strong>
                        <span>팀 원기록 {Number(team.raw).toLocaleString()}개</span>
                        <span>
                          {team.jumpers
                            .map(
                              (jumper) =>
                                `${team.members.find((member) => member.id === jumper.studentId)?.name} ${jumper.actual}개`,
                            )
                            .join(' / ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ol>
        ) : (
          <p className="operation-empty">
            아직 경기 기록이 없어요. 위의 ‘경기 기록하기’에서 시작해 보세요.
          </p>
        )}
      </section>
    </section>
  );
}
