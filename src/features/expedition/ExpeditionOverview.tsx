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
import type { HeroStore } from '../heroes/model';
import { teamHeroRewards } from '../heroes/model';
import type { BattleStore } from '../battle/model';
import { expeditionStandings, isSeasonBattleLocked, seasonBattle } from '../battle/model';

export default function ExpeditionOverview({
  plan,
  store,
  onRecord,
  onStudent,
  medals,
  economy,
  onEconomy,
  heroes,
  onHeroes,
  battles,
  onBattle,
}: {
  plan: Preparation;
  store: PracticeStore | null;
  onRecord: () => void;
  onStudent: (student: StudentPlan) => void;
  medals: MedalStore | null;
  economy: EconomyStore | null;
  onEconomy: (teamIndex: number) => void;
  heroes: HeroStore | null;
  onHeroes: (teamIndex: number) => void;
  battles: BattleStore | null;
  onBattle: (seasonIndex: number) => void;
}) {
  const seasonIndex = currentSeasonIndex(plan);
  const season = plan.seasons[seasonIndex];
  const ready = readySeasonIndices(plan).includes(seasonIndex);
  const rosterReady =
    !Object.keys(validatePreparation(plan, 'teams')).length &&
    !Object.keys(validateJumpers(plan)).length;
  const summary = previewHistory(store?.history ?? [], seasonIndex);
  const activeBattle = battles ? seasonBattle(battles, seasonIndex) : null;
  const seasonLocked = battles ? isSeasonBattleLocked(battles, seasonIndex) : false;
  const standings = battles ? expeditionStandings(battles) : [];
  const assigned = new Set(plan.teams.flatMap((team) => team.studentIds));
  const reversedPurchaseIds = new Set(
    economy?.reversals.map((reversal) => reversal.purchaseId) ?? [],
  );
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
                  ? '공식 기록 가능'
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
          <button
            type="button"
            className="preparation-primary"
            onClick={onRecord}
            disabled={seasonLocked}
          >
            경기 기록하기
          </button>
          <button
            type="button"
            className="preparation-secondary operation-battle-button"
            disabled={!ready || !rosterReady || !store || !economy || !heroes || !battles}
            onClick={() => onBattle(seasonIndex)}
          >
            {activeBattle?.status === 'closing'
              ? '시즌 종료 계속하기'
              : activeBattle?.status === 'calculated'
                ? '최종 대전 재생하기'
                : activeBattle?.status === 'finished'
                  ? '최종 대전 결과 보기'
                  : '시즌 종료 · 최종 대전'}
          </button>
          <span>
            {seasonLocked
              ? '이 시즌은 전투 계산이 끝나 새 경기를 기록할 수 없어요.'
              : !rosterReady
                ? '명단에서 도전점퍼 설정을 확인해 주세요. 팀별로 0~2명까지 가능해요.'
                : !ready
                  ? '먼저 이번 시즌의 기간과 보스를 정해 주세요.'
                  : store?.draft
                    ? '작성 중인 입력은 이어서 열려요.'
                    : '설정한 도전점퍼로 바로 개수를 입력해요.'}
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
          const studentPurchaseCount =
            economy?.purchases.filter(
              (purchase) =>
                purchase.teamKey === `team-${index}` &&
                purchase.seasonIndex === seasonIndex &&
                purchase.actor === 'student-board' &&
                !reversedPurchaseIds.has(purchase.id),
            ).length ?? 0;
          const heroRewards = heroes
            ? teamHeroRewards(heroes, index, seasonIndex).filter(
                (reward) => reward.heroId,
              )
            : [];
          const sealedHeroes = heroRewards.filter((reward) => !reward.revealedAt).length;
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
                  <dt>최근 경기 순위</dt>
                  <dd>{latest ? `${latest.rank}위` : '—'}</dd>
                </div>
                <div>
                  <dt>경기 획득 합계</dt>
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
                    ? ` · 영웅 획득 조건 ${progress.earned}회 달성`
                    : ''}
                </p>
              )}
              <button
                type="button"
                className="preparation-secondary economy-team-button"
                disabled={!store || !medals || !economy || seasonLocked}
                onClick={() => onEconomy(index)}
              >
                포인트·구매 관리 · 잔액{' '}
                {economySummary.balance === null
                  ? '확인 필요'
                  : `${economySummary.balance.toLocaleString()}P`}
                {studentPurchaseCount > 0 ? ` · 학생 구매 ${studentPurchaseCount}건` : ''}
              </button>
              <button
                type="button"
                className="preparation-secondary hero-team-button"
                disabled={!heroes}
                onClick={() => onHeroes(index)}
              >
                영웅 보관함 · {heroRewards.length}장
                {sealedHeroes > 0 ? ` · 미공개 ${sealedHeroes}` : ''}
              </button>
            </article>
          );
        })}
      </div>
      {battles && battles.battles.length > 0 && (
        <section
          className="operation-battle-summary"
          aria-labelledby="battle-summary-heading"
        >
          <div className="operation-section-heading">
            <div>
              <h2 id="battle-summary-heading">최종 대전 기록</h2>
              <p>승점이 같으면 누적 실제 피해량으로 전체 순위를 정해요.</p>
            </div>
            <span>
              {battles.battles.filter((battle) => battle.status === 'finished').length}회
              완료
            </span>
          </div>
          {standings.length > 0 && (
            <ol className="operation-expedition-standings">
              {[...standings]
                .sort(
                  (left, right) =>
                    left.rank - right.rank || right.totalDamage - left.totalDamage,
                )
                .map((standing) => (
                  <li key={standing.teamIndex}>
                    <span>{standing.rank}위</span>
                    <strong>{standing.teamName}</strong>
                    <b>{standing.victoryPoints}승점</b>
                    <small>{standing.totalDamage.toLocaleString()} 누적 피해</small>
                  </li>
                ))}
            </ol>
          )}
          <div className="operation-battle-history">
            {battles.battles.map((battle) => (
              <button
                key={battle.id}
                type="button"
                className="preparation-secondary"
                onClick={() => onBattle(battle.seasonIndex)}
              >
                시즌 {battle.seasonIndex + 1} ·{' '}
                {battle.status === 'closing'
                  ? '종료 준비'
                  : battle.status === 'calculated'
                    ? '재생 대기'
                    : '결과 보기'}
              </button>
            ))}
          </div>
        </section>
      )}
      {assigned.size < plan.students.length && (
        <p className="operation-fine-print">
          아직 원정대에 배정하지 않은 학생이 {plan.students.length - assigned.size}명
          있어요. 명단에서 배정할 수 있어요.
        </p>
      )}
      <p className="operation-local-note">
        확정한 경기 포인트와 훈장·구매 기록을 합산한 현재 장부예요. 공식 경기의 확정과
        취소는 교사 계정의 서버 원장에도 기록됩니다.
      </p>
      <section className="operation-history" aria-labelledby="operation-history-heading">
        <div className="operation-section-heading">
          <h2 id="operation-history-heading">
            최근 경기 기록 <small>공식</small>
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
