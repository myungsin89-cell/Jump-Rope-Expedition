import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createPreparation,
  fieldAttributes,
  readDraft,
  readPreparations,
  rosterNames,
  savePreparation,
  validatePreparation,
  writeDraft,
} from './model';
import type { FieldErrors, Preparation, SavedPreparation } from './model';
import { ErrorSummary, FieldError, ForestMap, PageFrame } from './PreparationUI';
import ExpeditionBoard from '../expedition/ExpeditionBoard';
import type { OperationPanel } from '../expedition/operations';
import { currentSeasonIndex } from '../expedition/operations';
import TeacherServerModal from '../backup/TeacherServerModal';
import {
  isTeacherBackupConfigured,
  listTeacherBackups,
  restoreTeacherBackups,
  saveTeacherBackup,
} from '../backup/teacherBackup';
import './preparation.css';
import '../expedition/operations.css';

function ClassRegistration() {
  const [initial] = useState(() => {
    try {
      return { plan: readDraft() ?? createPreparation(), error: '' };
    } catch {
      return {
        plan: createPreparation(),
        error:
          '작성 중인 명단을 읽을 수 없어요. 원본은 보관되어 있으니 표지로 돌아가 다시 시도해 주세요.',
      };
    }
  });
  const [plan, setPlan] = useState(initial.plan);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [storageError, setStorageError] = useState('');
  const [saving, setSaving] = useState(false);
  const update = (next: Preparation) => {
    setPlan(next);
    try {
      writeDraft(next);
      setStorageError('');
    } catch {
      setStorageError(
        '자동 저장하지 못했어요. 입력한 내용은 그대로예요. 브라우저 저장 공간을 확인해 주세요.',
      );
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validatePreparation(plan, 'class');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    let saved: SavedPreparation;
    try {
      saved = savePreparation(plan);
    } catch {
      setSaving(false);
      setStorageError(
        '학생 명단을 저장하지 못했어요. 내용을 남겨 두었으니 저장 공간을 확인하고 다시 시도해 주세요.',
      );
      return;
    }
    if (isTeacherBackupConfigured()) {
      try {
        await saveTeacherBackup(saved);
      } catch (reason) {
        setStorageError(
          `브라우저에는 명단을 저장했지만 서버 저장을 마치지 못했어요. ${
            reason instanceof Error ? reason.message : '잠시 후 다시 시도해 주세요.'
          }`,
        );
      }
    }
    window.location.assign(`#/preparations/${saved.id}`);
  };
  return (
    <PageFrame
      compact
      title="새 원정을 만들어요"
      subtitle="학생 명단부터 넣어 주세요. 원정대와 시즌은 들어가서 정하면 돼요."
      backHref="#/preparations"
      backLabel="원정 목록"
      brandSubtitle="선생님 원정실"
      aside={
        <div className="preparation-registration-guide">
          <strong>처음에는 명단만 준비해요</strong>
          <p>
            팀 이름과 팀원 배정은
            <br />
            게임 준비 화면에서 정할 수 있어요.
          </p>
        </div>
      }
    >
      {initial.error ? (
        <p className="preparation-storage-error" role="alert">
          {initial.error}
        </p>
      ) : (
        <form onSubmit={submit} noValidate>
          <ErrorSummary errors={errors} />
          {storageError && (
            <p className="preparation-storage-error" role="alert">
              {storageError}
            </p>
          )}
          <div className="preparation-fields">
            <details className="operation-optional-name">
              <summary>목록에서 구분할 이름 정하기 (선택)</summary>
              <label htmlFor="class-name">목록 표시 이름</label>
              <input
                id="class-name"
                maxLength={60}
                placeholder="예: 5학년 2반의 원정"
                autoComplete="off"
                value={plan.className}
                onChange={(event) => update({ ...plan, className: event.target.value })}
                {...fieldAttributes('class-name', errors)}
              />
              <FieldError id="class-name" errors={errors} />
            </details>
            <label htmlFor="class-roster">
              전체 학생 명단 <span>{rosterNames(plan.roster).length}명</span>
            </label>
            <p className="preparation-hint" id="class-roster-hint">
              이름을 한 줄에 한 명씩 입력하거나, 명단을 붙여 넣어 주세요. 같은 이름도 각각
              다른 줄에 입력해요.
            </p>
            <textarea
              className="preparation-class-roster"
              id="class-roster"
              rows={9}
              placeholder={'김민준\n이서윤\n박도윤'}
              value={plan.roster}
              onChange={(event) => update({ ...plan, roster: event.target.value })}
              {...fieldAttributes('class-roster', errors)}
              aria-describedby={`class-roster-hint${errors['class-roster'] ? ' class-roster-error' : ''}`}
            />
            <FieldError id="class-roster" errors={errors} />
          </div>
          <div className="preparation-actions">
            <a className="preparation-secondary" href="#/preparations">
              나중에 이어하기
            </a>
            <button className="preparation-primary" type="submit" disabled={saving}>
              {saving ? '저장 중…' : '원정 만들기'}
            </button>
          </div>
          <p className="preparation-save-hint">
            입력 내용은 먼저 이 브라우저에 저장되고, 서버 연결 시 교사 계정에도 저장돼요.
          </p>
        </form>
      )}
    </PageFrame>
  );
}

function PreparationLibrary({
  id,
  panel = 'overview',
}: {
  id?: string;
  panel?: OperationPanel;
}) {
  const [loaded, setLoaded] = useState(() => {
    try {
      return { all: readPreparations(), draft: readDraft(), error: '' };
    } catch {
      return {
        all: [] as SavedPreparation[],
        draft: null,
        error:
          '저장한 원정을 읽을 수 없어요. 원본은 그대로 보관되어 있어요. 표지로 돌아가 다시 시도해 주세요.',
      };
    }
  });
  const [restoring, setRestoring] = useState(false);
  const [serverNotice, setServerNotice] = useState(() =>
    isTeacherBackupConfigured()
      ? '서버 자료를 확인하고 있어요…'
      : '이 브라우저에 저장한 원정을 보여주고 있어요.',
  );
  useEffect(() => {
    let active = true;
    if (!isTeacherBackupConfigured()) return;
    void listTeacherBackups()
      .then((backups) => {
        if (!active) return;
        const all = restoreTeacherBackups(backups);
        setLoaded((current) => ({ ...current, all }));
        setServerNotice(
          backups.length
            ? `교사 계정의 원정 ${backups.length}개를 동기화했어요.`
            : '이 계정에 저장된 원정이 아직 없어요.',
        );
      })
      .catch((reason) => {
        if (!active) return;
        setServerNotice(
          reason instanceof Error ? reason.message : '서버 자료를 불러오지 못했어요.',
        );
      });
    return () => {
      active = false;
    };
  }, []);
  const saved = id ? loaded.all.find((plan) => plan.id === id) : undefined;
  if (saved)
    return (
      <ExpeditionBoard
        key={`${saved.id}-${panel}`}
        initial={saved}
        initialPanel={panel}
      />
    );
  return (
    <PageFrame
      compact
      title="우리의 원정"
      subtitle="함께할 원정을 선택해 주세요."
      landscape
      headingAside={
        <div className="teacher-server-heading-actions">
          <button
            type="button"
            className="preparation-secondary"
            onClick={() => setRestoring(true)}
          >
            백업 불러오기
          </button>
          <a className="preparation-primary" href="#/prepare">
            {loaded.draft ? '명단 이어하기' : '원정 만들기'}
          </a>
        </div>
      }
      brandSubtitle="선생님 원정실"
      aside={
        <p className="preparation-sidebar-copy">
          친구들을 먼저 만나고,
          <br />
          함께 팀을 꾸려요.
        </p>
      }
    >
      <p className="operation-local-note" role="status">
        {serverNotice}
      </p>
      {loaded.error ? (
        <p className="preparation-storage-error" role="alert">
          {loaded.error}
        </p>
      ) : id ? (
        <div className="preparation-empty">
          <h2>이 원정을 찾을 수 없어요</h2>
          <p>현재 브라우저에 저장한 원정 목록을 확인해 주세요.</p>
          <a className="preparation-primary" href="#/preparations">
            원정 목록
          </a>
        </div>
      ) : (
        <>
          {loaded.draft && (
            <a className="preparation-draft-card" href="#/prepare">
              <span>명단 작성 중</span>
              <h2>{loaded.draft.className || '새 원정'}</h2>
              <p>작성하던 학생 명단 이어서 입력하기</p>
            </a>
          )}
          {loaded.all.length ? (
            <ul className="preparation-library-list operation-library">
              {loaded.all.map((plan) => (
                <li key={plan.id}>
                  <a
                    href={`#/preparations/${plan.id}`}
                    className="operation-library-entry"
                  >
                    <span className="operation-library-emblem" aria-hidden="true">
                      <svg viewBox="0 0 40 40" fill="none">
                        <path
                          d="M10 29C8 14 17 9 30 10c1 13-4 22-19 20m-2 2 15-15"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <div>
                      <h2>{plan.className}</h2>
                      <p>
                        대원 {plan.students.length}명 · 원정대 {plan.teams.length}개
                      </p>
                    </div>
                    <span className="operation-library-season">
                      시즌 {currentSeasonIndex(plan) + 1}
                    </span>
                    <span className="operation-library-open">원정 열기</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            !loaded.draft && (
              <div className="preparation-empty">
                <ForestMap />
                <h2>첫 원정을 만들어 볼까요?</h2>
                <p>
                  학생 명단만 있으면 시작할 수 있어요.
                  <br />
                  원정대 이름과 대원 배정은 나중에 정해도 돼요.
                </p>
              </div>
            )
          )}
        </>
      )}
      {restoring && (
        <TeacherServerModal
          mode="restore"
          onClose={() => setRestoring(false)}
          onRestored={(all) =>
            setLoaded((current) => ({ ...current, all, error: '' }))
          }
        />
      )}
    </PageFrame>
  );
}

export default function PreparationWorkspace({ route }: { route: string }) {
  if (route === '/prepare') return <ClassRegistration />;
  const parts = route.slice('/preparations/'.length).split('/');
  const id = route.startsWith('/preparations/') ? parts[0] : undefined;
  const panel: OperationPanel =
    parts[1] === 'roster' || parts[1] === 'seasons' ? parts[1] : 'overview';
  return <PreparationLibrary key={route} id={id} panel={panel} />;
}
