import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { calculateMatchPreview } from '../../shared/domain/matchScoring';
import type { JumperMultiplier, MatchPreview } from '../../shared/domain/matchScoring';
import {
  fieldAttributes,
  readPreparations,
  validatePreparation,
  readySeasonIndices,
  validateJumpers,
} from '../preparation/model';
import type { FieldErrors, Preparation } from '../preparation/model';
import { ErrorSummary, FieldError } from '../preparation/PreparationUI';
import {
  createPractice,
  parseCount,
  practiceInputs,
  readPracticeStore,
  saveOfficialPractice,
  validatePractice,
  voidOfficialPractice,
  writePracticeDraft,
} from './practiceModel';
import type {
  PracticeDraft,
  PracticeJumper,
  PracticeStore,
  SavedPractice,
} from './practiceModel';
import '../preparation/preparation.css';
import './matches.css';
import TeacherSessionButton from '../auth/TeacherSessionButton';
import { saveTeacherBackup } from '../backup/teacherBackup';
import { confirmOfficialMatch, voidOfficialMatch } from './officialMatches';
import { currentSeasonIndex } from '../expedition/operations';
import { isSeasonBattleLocked, readBattles } from '../battle/model';

type Phase = 'jumpers' | 'records' | 'review' | 'saved';
const PHASE_TITLES: Record<Phase, string> = {
  jumpers: '이번 도전의 주인공을 정해요',
  records: '함께 넘은 개수를 기록해요',
  review: '원정대의 도전을 확인해요',
  saved: '공식 경기 결과를 확정했어요',
};
const formatCount = (value: number) => value.toLocaleString('ko-KR');
const testBypass =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_TEST_BYPASS === 'true';

function MatchFrame({ plan, children }: { plan?: Preparation; children: ReactNode }) {
  return (
    <main className="preparation-screen match-screen">
      <a
        className="skip-link"
        href="#match-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('match-content')?.focus();
        }}
      >
        기록판 내용으로 이동
      </a>
      <header className="preparation-header match-header">
        <a className="preparation-brand" href="#/">
          줄넘기 원정대<span>선생님 기록판</span>
        </a>
        <div className="preparation-header-actions">
          <a
            className="preparation-home"
            href={plan ? `#/preparations/${plan.id}` : '#/preparations'}
          >
            현황으로
          </a>
          <TeacherSessionButton />
        </div>
      </header>
      <div id="match-content" className="match-content" tabIndex={-1}>
        {children}
      </div>
    </main>
  );
}

function Results({
  results,
  draft,
  confirmed,
  voided,
}: {
  results: MatchPreview[];
  draft: PracticeDraft;
  confirmed: boolean;
  voided: boolean;
}) {
  const status = voided ? '취소된' : confirmed ? '확정' : '예상';
  return (
    <div
      className="match-results"
      data-count={results.length}
      aria-label={`${status} 경기 결과`}
    >
      {results.map((result, index) => (
        <section className={`match-result team-color-${index}`} key={result.teamKey}>
          <div className="match-team-title">
            <span className="preparation-team-number">{index + 1}</span>
            <h2>{draft.teams[index].name}</h2>
          </div>
          <p className="match-result-rank">
            {results.filter((other) => other.rank === result.rank).length > 1
              ? '공동 '
              : ''}
            {result.rank}위 <small>{status} 순위</small>
          </p>
          <dl>
            <div>
              <dt>팀 원기록</dt>
              <dd>{formatCount(result.rawCount)}개</dd>
            </div>
            <div>
              <dt>도전점퍼 추가분</dt>
              <dd>+{formatCount(result.extraCount)}개</dd>
            </div>
            <div className="match-ranking-count">
              <dt>순위 기록</dt>
              <dd>{formatCount(result.rankingCount)}개</dd>
            </div>
          </dl>
          <p className="match-growth">
            {result.previousRawCount === null
              ? '첫 경기 기록 · 성장 보너스 없음'
              : `직전 경기 원기록 ${formatCount(result.previousRawCount)}개 → ${formatCount(result.rawCount)}개`}
          </p>
          <div className="match-point-preview">
            <span>
              {voided
                ? '회수된 팀 포인트'
                : confirmed
                  ? '지급 팀 포인트'
                  : '확정 예정 포인트'}
            </span>
            <strong>
              {result.estimatedPoints}
              <small>P</small>
            </strong>
          </div>
          <p className="match-point-breakdown">
            참가 {result.participationPoints} + 순위 {result.rankingPoints} + 성장{' '}
            {result.growthPoints}
          </p>
        </section>
      ))}
    </div>
  );
}

function MatchBoard({ plan }: { plan: Preparation }) {
  const [loaded] = useState(() => {
    try {
      const store = readPracticeStore(plan.id);
      const pending = store.draft;
      const hasCounts = pending?.teams.some(
        (team) => team.raw.trim() || team.jumpers.some((jumper) => jumper.actual.trim()),
      );
      // Keep entered records intact. An empty old draft can safely use the latest setup.
      const sameRoster =
        pending?.teams.length === plan.teams.length &&
        pending.teams.every(
          (team, index) =>
            team.name === plan.teams[index].name &&
            team.members.length === plan.teams[index].studentIds.length &&
            team.members.every(
              (member, at) =>
                member.id === plan.teams[index].studentIds[at] &&
                member.name ===
                  plan.students.find((student) => student.id === member.id)?.name,
            ),
        );
      const draft =
        pending &&
        (hasCounts || (sameRoster && Object.keys(validateJumpers(plan)).length))
          ? pending
          : createPractice(plan, currentSeasonIndex(plan));
      return { store, draft, error: '', resumed: Boolean(pending && hasCounts) };
    } catch {
      return {
        store: null,
        draft: null,
        error:
          '작성 중인 경기 기록을 읽을 수 없어요. 원본을 그대로 보관했으니 게임 준비로 돌아가 다시 시도해 주세요.',
      };
    }
  });
  const [store, setStore] = useState<PracticeStore | null>(loaded.store);
  const [draft, setDraft] = useState<PracticeDraft | null>(loaded.draft);
  const [phase, setPhase] = useState<Phase>(loaded.draft?.locked ? 'records' : 'jumpers');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [storageError, setStorageError] = useState('');
  const [working, setWorking] = useState(false);
  const [voiding, setVoiding] = useState<SavedPractice | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [phase]);

  const update = (next: PracticeDraft) => {
    setDraft(next);
    try {
      setStore(writePracticeDraft(next));
      setStorageError('');
    } catch {
      setStorageError(
        '자동 저장하지 못했어요. 입력 내용은 화면에 남아 있으니 저장 공간을 확인한 뒤 다시 시도해 주세요.',
      );
    }
  };
  const updateTeam = (
    teamIndex: number,
    change: Partial<PracticeDraft['teams'][number]>,
  ) => {
    if (draft)
      update({
        ...draft,
        teams: draft.teams.map((team, index) =>
          index === teamIndex ? { ...team, ...change } : team,
        ),
      });
  };
  const updateJumper = (
    teamIndex: number,
    jumperIndex: number,
    change: Partial<PracticeJumper>,
  ) => {
    if (!draft) return;
    const jumpers = draft.teams[teamIndex].jumpers.map((jumper, index) =>
      index === jumperIndex ? { ...jumper, ...change } : jumper,
    );
    updateTeam(teamIndex, { jumpers });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || working) return;
    const nextErrors = validatePractice(draft, phase !== 'jumpers');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (phase === 'jumpers') {
      update({ ...draft, locked: true });
      setPhase('records');
    } else if (phase === 'records') setPhase('review');
    else if (phase === 'review') {
      const preview = calculateMatchPreview(
        practiceInputs(draft),
        previous ? practiceInputs(previous) : [],
      );
      setWorking(true);
      try {
        if (!testBypass) await saveTeacherBackup(plan);
        const confirmation = await confirmOfficialMatch(plan, draft, preview);
        setStore(saveOfficialPractice(draft, confirmation.confirmedAt));
        setStorageError('');
        setPhase('saved');
        if (!testBypass) {
          try {
            await saveTeacherBackup(plan);
          } catch {
            setStorageError(
              '공식 결과와 포인트는 서버에 확정했지만 원정 백업 동기화를 기다리고 있어요. 현황의 서버 저장으로 다시 시도할 수 있어요.',
            );
          }
        }
      } catch (reason) {
        setStorageError(
          reason instanceof Error
            ? reason.message
            : '공식 경기 결과를 확정하지 못했어요. 입력 내용은 그대로 남아 있어요.',
        );
      } finally {
        setWorking(false);
      }
    }
  };
  const previous = store?.history
    .filter(
      (entry) =>
        entry.id !== draft?.id && Boolean(entry.official) && !entry.official?.voidedAt,
    )
    .at(-1);
  const currentSaved = store?.history.find((entry) => entry.id === draft?.id);
  const results =
    draft && (phase === 'review' || phase === 'saved')
      ? calculateMatchPreview(
          practiceInputs(draft),
          previous ? practiceInputs(previous) : [],
        )
      : null;
  const newPractice = () => {
    if (!draft) return;
    const next = createPractice(plan, currentSeasonIndex(plan));
    update(next);
    setErrors({});
    setStorageError('');
    setVoiding(null);
    setVoidReason('');
    setPhase(next.locked ? 'records' : 'jumpers');
  };

  const cancelOfficialMatch = async () => {
    if (!voiding || working) return;
    try {
      if (isSeasonBattleLocked(readBattles(plan.id), voiding.seasonIndex)) {
        setStorageError('최종 대전 계산이 끝난 시즌의 공식 경기는 취소할 수 없어요.');
        return;
      }
    } catch (reason) {
      setStorageError(
        reason instanceof Error ? reason.message : '최종 대전 기록을 확인하지 못했어요.',
      );
      return;
    }
    const reason = voidReason.trim();
    if (reason.length < 3 || reason.length > 200) {
      setStorageError('취소 사유를 3자 이상 200자 이내로 입력해 주세요.');
      return;
    }
    setWorking(true);
    try {
      const cancellation = await voidOfficialMatch(plan.id, voiding.id, reason);
      if (!cancellation.voidedAt) throw new Error('경기 취소 시간을 확인하지 못했어요.');
      setStore(
        voidOfficialPractice(
          plan.id,
          voiding.id,
          cancellation.voidReason ?? reason,
          cancellation.voidedAt,
        ),
      );
      setVoiding(null);
      setVoidReason('');
      setStorageError('');
      if (!testBypass) {
        try {
          await saveTeacherBackup(plan);
        } catch {
          setStorageError(
            '포인트 회수는 서버에 반영했지만 원정 백업 동기화를 기다리고 있어요.',
          );
        }
      }
    } catch (reasonValue) {
      setStorageError(
        reasonValue instanceof Error
          ? reasonValue.message
          : '공식 경기 취소를 완료하지 못했어요.',
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <MatchFrame plan={plan}>
      <div className="match-heading">
        <div>
          <p className="match-class-name">{plan.className} · 선생님 직접 입력</p>
          <h1 ref={title} tabIndex={-1}>
            {PHASE_TITLES[phase]}
          </h1>
        </div>
        <span className="match-practice-badge">공식 경기 기록판</span>
      </div>
      <div className="match-preview-notice">
        <strong>
          {currentSaved?.official?.voidedAt
            ? '경기 취소와 포인트 회수를 완료했어요.'
            : phase === 'saved'
              ? '공식 결과와 팀 포인트를 서버에 기록했어요.'
              : '확정 전까지 입력 내용을 다시 확인할 수 있어요.'}
        </strong>
        <span>
          {phase === 'saved'
            ? '원본 기록은 장부에 보존돼요. 다음 경기를 입력하거나 현황으로 돌아갈 수 있어요.'
            : '결과를 확정하면 팀 포인트가 서버 원장에 지급돼요. 잘못 확정한 기록은 사유를 남기고 취소할 수 있어요.'}
        </span>
      </div>
      {loaded.error ? (
        <p role="alert" className="preparation-storage-error">
          {loaded.error}
        </p>
      ) : (
        draft &&
        store && (
          <>
            <ol className="match-steps" aria-label="기록 입력 순서">
              {['도전점퍼 정하기', '개수 입력하기', '결과 확정하기'].map(
                (label, index) => (
                  <li
                    key={label}
                    aria-current={
                      index === (phase === 'jumpers' ? 0 : phase === 'records' ? 1 : 2)
                        ? 'step'
                        : undefined
                    }
                  >
                    <span>{index + 1}</span>
                    {label}
                  </li>
                ),
              )}
            </ol>
            <div className="match-season-row">
              <div>
                <label htmlFor="practice-season">이번 경기 시즌</label>
                {phase === 'jumpers' ||
                (phase === 'records' &&
                  !draft.teams.some(
                    (team) =>
                      team.raw.trim() ||
                      team.jumpers.some((jumper) => jumper.actual.trim()),
                  )) ? (
                  <select
                    id="practice-season"
                    value={draft.seasonIndex}
                    onChange={(event) =>
                      update({ ...draft, seasonIndex: Number(event.target.value) })
                    }
                  >
                    <option value={currentSeasonIndex(plan)}>
                      시즌 {currentSeasonIndex(plan) + 1}
                    </option>
                  </select>
                ) : (
                  <strong>시즌 {draft.seasonIndex + 1}</strong>
                )}
              </div>
              <p>
                경기 시간과 세부 규칙은 현장에서 정해요.
                <br />
                기록판에는 줄넘기 개수만 입력해 주세요.
              </p>
            </div>
            {storageError && (
              <p role="alert" className="preparation-storage-error">
                {storageError}
              </p>
            )}
            <ErrorSummary errors={errors} />
            {loaded.resumed && draft.id === loaded.draft?.id && phase !== 'saved' && (
              <p className="match-result-note">
                이전에 입력하던 기록을 이어서 열었어요. 입력값 보호를 위해 당시 팀원과
                도전점퍼를 유지해요. 준비 메뉴의 변경은 다음 새 기록부터 적용돼요.
              </p>
            )}

            <form onSubmit={submit} noValidate>
              {results ? (
                <>
                  <Results
                    results={results}
                    draft={draft}
                    confirmed={Boolean(currentSaved?.official)}
                    voided={Boolean(currentSaved?.official?.voidedAt)}
                  />
                  <p className="match-result-note">
                    확정 포인트는 참가·순위·성장을 반영해요. 훈장 +10P는 별도 장부에서
                    합산돼요.
                  </p>
                </>
              ) : (
                <div className="match-team-grid" data-count={draft.teams.length}>
                  {draft.teams.map((team, teamIndex) => (
                    <section
                      key={team.key}
                      className={`match-team-card team-color-${teamIndex}`}
                      aria-labelledby={`match-team-${teamIndex}`}
                    >
                      <div className="match-team-title">
                        <span className="preparation-team-number">{teamIndex + 1}</span>
                        <h2 id={`match-team-${teamIndex}`}>{team.name}</h2>
                      </div>
                      <details className="match-member-list">
                        <summary>팀원 {team.members.length}명 확인하기</summary>
                        <p>
                          {team.members
                            .map((member) => `${member.number} · ${member.name}`)
                            .join(', ')}
                        </p>
                      </details>
                      {phase === 'jumpers' ? (
                        <>
                          <label htmlFor={`jumper-count-${teamIndex}`}>도전점퍼 수</label>
                          <select
                            id={`jumper-count-${teamIndex}`}
                            value={team.jumpers.length}
                            onChange={(event) =>
                              updateTeam(teamIndex, {
                                jumpers:
                                  Number(event.target.value) === 1
                                    ? team.jumpers.slice(0, 1)
                                    : [
                                        ...team.jumpers.slice(0, 1),
                                        { studentId: '', multiplier: 1, actual: '' },
                                      ],
                              })
                            }
                          >
                            <option value="1">1명</option>
                            <option value="2" disabled={team.members.length < 2}>
                              2명
                            </option>
                          </select>
                          <FieldError id={`jumper-count-${teamIndex}`} errors={errors} />
                          {team.jumpers.map((jumper, index) => (
                            <fieldset className="match-jumper-choice" key={index}>
                              <legend>도전점퍼 {index + 1}</legend>
                              <label htmlFor={`jumper-${teamIndex}-${index}`}>
                                담당 학생
                              </label>
                              <select
                                id={`jumper-${teamIndex}-${index}`}
                                value={jumper.studentId}
                                onChange={(event) =>
                                  updateJumper(teamIndex, index, {
                                    studentId: event.target.value,
                                    actual: '',
                                  })
                                }
                                {...fieldAttributes(
                                  `jumper-${teamIndex}-${index}`,
                                  errors,
                                )}
                              >
                                <option value="">학생을 선택해 주세요</option>
                                {team.members.map((member) => (
                                  <option
                                    key={member.id}
                                    value={member.id}
                                    disabled={team.jumpers.some(
                                      (other, at) =>
                                        at !== index && other.studentId === member.id,
                                    )}
                                  >
                                    {member.number} · {member.name}
                                  </option>
                                ))}
                              </select>
                              <FieldError
                                id={`jumper-${teamIndex}-${index}`}
                                errors={errors}
                              />
                              <label htmlFor={`multiplier-${teamIndex}-${index}`}>
                                이 학생의 배수
                              </label>
                              <select
                                id={`multiplier-${teamIndex}-${index}`}
                                value={jumper.multiplier}
                                onChange={(event) =>
                                  updateJumper(teamIndex, index, {
                                    multiplier: Number(
                                      event.target.value,
                                    ) as JumperMultiplier,
                                  })
                                }
                                {...fieldAttributes(
                                  `multiplier-${teamIndex}-${index}`,
                                  errors,
                                )}
                              >
                                {[1, 2, 3].map((number) => (
                                  <option key={number} value={number}>
                                    {number}배
                                  </option>
                                ))}
                              </select>
                              <FieldError
                                id={`multiplier-${teamIndex}-${index}`}
                                errors={errors}
                              />
                            </fieldset>
                          ))}
                        </>
                      ) : (
                        <>
                          <label htmlFor={`raw-${teamIndex}`}>팀 전체 원기록</label>
                          <div className="match-number-input">
                            <input
                              id={`raw-${teamIndex}`}
                              inputMode="numeric"
                              type="text"
                              placeholder="0"
                              value={team.raw}
                              onChange={(event) =>
                                updateTeam(teamIndex, { raw: event.target.value })
                              }
                              {...fieldAttributes(`raw-${teamIndex}`, errors)}
                            />
                            <span>개</span>
                          </div>
                          <FieldError id={`raw-${teamIndex}`} errors={errors} />
                          <p className="match-input-hint">
                            도전점퍼의 실제 기록도 포함된 전체 개수예요.
                          </p>
                          {team.jumpers.map((jumper, index) => (
                            <div className="match-jumper-record" key={index}>
                              <label htmlFor={`actual-${teamIndex}-${index}`}>
                                <span>
                                  {
                                    team.members.find(
                                      (member) => member.id === jumper.studentId,
                                    )?.name
                                  }{' '}
                                  실제 기록
                                </span>
                                <strong>{jumper.multiplier}배</strong>
                              </label>
                              <div className="match-number-input">
                                <input
                                  id={`actual-${teamIndex}-${index}`}
                                  inputMode="numeric"
                                  type="text"
                                  placeholder="0"
                                  value={jumper.actual}
                                  onChange={(event) =>
                                    updateJumper(teamIndex, index, {
                                      actual: event.target.value,
                                    })
                                  }
                                  {...fieldAttributes(
                                    `actual-${teamIndex}-${index}`,
                                    errors,
                                  )}
                                />
                                <span>개</span>
                              </div>
                              <FieldError
                                id={`actual-${teamIndex}-${index}`}
                                errors={errors}
                              />
                              <p className="match-input-hint">
                                순위 기록에 더할 추가분:{' '}
                                {parseCount(jumper.actual) === null
                                  ? '—'
                                  : formatCount(
                                      parseCount(jumper.actual)! *
                                        (jumper.multiplier - 1),
                                    )}
                                개
                              </p>
                            </div>
                          ))}
                        </>
                      )}
                    </section>
                  ))}
                </div>
              )}

              {phase === 'jumpers' && (
                <p className="match-result-note">
                  학생마다 1배~3배로 정할 수 있어요. 이름 옆 숫자는 명단 입력 순서예요.
                  개인 실제 기록은 성장 확인을 위해 따로 보관해요.
                </p>
              )}
              <div className="match-actions">
                <div>
                  {phase === 'jumpers' ? (
                    <a
                      className="preparation-secondary"
                      href={`#/preparations/${plan.id}`}
                    >
                      현황으로
                    </a>
                  ) : phase === 'records' ? (
                    <button
                      className="preparation-secondary"
                      type="button"
                      onClick={() => {
                        update({ ...draft, locked: false });
                        setErrors({});
                        setPhase('jumpers');
                      }}
                    >
                      도전점퍼 다시 정하기
                    </button>
                  ) : phase === 'review' ? (
                    <button
                      className="preparation-secondary"
                      type="button"
                      onClick={() => {
                        setErrors({});
                        setPhase('records');
                      }}
                    >
                      개수 다시 확인하기
                    </button>
                  ) : (
                    <button
                      className="preparation-secondary"
                      type="button"
                      onClick={newPractice}
                    >
                      다음 경기 기록
                    </button>
                  )}
                </div>
                {phase === 'saved' ? (
                  <a className="preparation-primary" href={`#/preparations/${plan.id}`}>
                    현황으로 돌아가기
                  </a>
                ) : (
                  <button
                    className="preparation-primary"
                    disabled={working}
                    type="submit"
                  >
                    {working
                      ? '서버에 확정 중…'
                      : phase === 'jumpers'
                        ? '도전점퍼 정하고 기록 입력'
                        : phase === 'records'
                          ? '순위·포인트 미리보기'
                          : '경기 결과 확정하기'}
                  </button>
                )}
              </div>
            </form>

            {store.history.length > 0 && (
              <details className="match-history" open={phase === 'saved'}>
                <summary>경기 기록 장부 {store.history.length}개</summary>
                <p>공식 기록은 서버 포인트 원장과 연결되며 취소해도 원본을 보존해요.</p>
                <ol>
                  {store.history.map((entry, index) => (
                    <li key={entry.id}>
                      <h3>
                        {index + 1}번째 경기 · 시즌 {entry.seasonIndex + 1}
                      </h3>
                      <span className="match-history-status">
                        {entry.official?.voidedAt
                          ? '취소됨'
                          : entry.official
                            ? '공식 확정'
                            : '이전 연습 기록'}
                      </span>
                      <ul>
                        {entry.teams.map((team) => (
                          <li key={team.key}>
                            <strong>{team.name}</strong>
                            <span>원기록 {formatCount(Number(team.raw))}개</span>
                            <span>
                              {team.jumpers
                                .map(
                                  (jumper) =>
                                    `${team.members.find((member) => member.id === jumper.studentId)?.name} ${jumper.actual}개 · ${jumper.multiplier}배`,
                                )
                                .join(' / ')}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {entry.official?.voidedAt ? (
                        <p className="match-voided-note">
                          {entry.official.voidedAt.slice(0, 10)} 취소 ·{' '}
                          {entry.official.voidReason}
                        </p>
                      ) : entry.official ? (
                        <button
                          type="button"
                          className="match-void-button"
                          onClick={() => {
                            setVoiding(entry);
                            setVoidReason('');
                            setStorageError('');
                          }}
                        >
                          잘못 확정한 기록 취소
                        </button>
                      ) : null}
                      {voiding?.id === entry.id && (
                        <div className="match-void-panel">
                          <label htmlFor={`match-void-reason-${entry.id}`}>
                            취소 사유
                          </label>
                          <textarea
                            id={`match-void-reason-${entry.id}`}
                            maxLength={200}
                            value={voidReason}
                            onChange={(event) => setVoidReason(event.target.value)}
                            placeholder="예: 2원정대 기록을 잘못 입력함"
                          />
                          <p>
                            기록은 삭제하지 않고 지급된 경기 포인트를 반대 거래로
                            회수해요.
                          </p>
                          <div>
                            <button
                              type="button"
                              className="preparation-secondary"
                              disabled={working}
                              onClick={() => {
                                setVoiding(null);
                                setVoidReason('');
                              }}
                            >
                              돌아가기
                            </button>
                            <button
                              type="button"
                              className="preparation-primary"
                              disabled={working}
                              onClick={() => void cancelOfficialMatch()}
                            >
                              {working ? '포인트 회수 중…' : '기록 취소 확정'}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <p className="match-save-hint">
              입력 중인 내용은 이 브라우저에 자동 보관돼요. 결과 확정과 취소는 교사 계정의
              서버 경기·포인트 장부에 기록됩니다.
            </p>
          </>
        )
      )}
    </MatchFrame>
  );
}

export default function MatchWorkspace({ classId }: { classId: string }) {
  const [loaded] = useState(() => {
    try {
      const plan = readPreparations().find((item) => item.id === classId);
      const locked = plan
        ? isSeasonBattleLocked(readBattles(plan.id), currentSeasonIndex(plan))
        : false;
      return { plan, error: '', locked };
    } catch {
      return {
        plan: undefined,
        error: '학급을 읽을 수 없어요. 저장된 원본은 그대로예요.',
        locked: false,
      };
    }
  });
  const plan = loaded.plan;
  const ready =
    plan &&
    !Object.keys(validatePreparation(plan, 'teams')).length &&
    readySeasonIndices(plan).includes(currentSeasonIndex(plan)) &&
    !loaded.locked;
  if (!ready || !plan)
    return (
      <MatchFrame plan={plan}>
        <div className="match-blocked">
          <h1>
            {loaded.error ||
              (loaded.locked
                ? '최종 대전 계산이 끝난 시즌이에요'
                : plan
                  ? '팀과 시즌을 먼저 확인해 주세요'
                  : '등록한 학급을 찾을 수 없어요')}
          </h1>
          <p>
            게임 준비에서 세 팀에 팀원을 배정하고, 기록할 시즌 하나의 보스와 기간만 정해
            주세요. 나머지 시즌은 나중에 준비해도 돼요.
          </p>
          <a
            className="preparation-primary"
            href={plan ? `#/preparations/${plan.id}` : '#/preparations'}
          >
            게임 준비로 돌아가기
          </a>
        </div>
      </MatchFrame>
    );
  return <MatchBoard plan={plan} />;
}
