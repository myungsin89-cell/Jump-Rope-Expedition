import { useState } from 'react';
import type { FormEvent } from 'react';
import { PageFrame, ErrorSummary } from '../preparation/PreparationUI';
import {
  saveGamePreparation,
  validatePreparation,
  validateJumpers,
  validateSeason,
} from '../preparation/model';
import type {
  FieldErrors,
  Preparation,
  SavedPreparation,
  StudentPlan,
} from '../preparation/model';
import { readPracticeStore } from '../matches/practiceModel';
import SeasonSettings from '../preparation/SeasonSettings';
import OperationRoster from './OperationRoster';
import ExpeditionOverview from './ExpeditionOverview';
import StudentDetails from './StudentDetails';
import { currentSeasonIndex, hasPracticeInputs, operationHref } from './operations';
import type { OperationPanel } from './operations';
import './operations.css';
import { readMedals } from '../medals/model';
import type { MedalStore } from '../medals/model';
import MedalManager from '../medals/MedalManager';
import '../medals/medals.css';
import StudentSharing from '../student/StudentSharing';

export default function ExpeditionBoard({
  initial,
  initialPanel = 'overview',
}: {
  initial: SavedPreparation;
  initialPanel?: OperationPanel;
}) {
  const [plan, setPlan] = useState<Preparation>(initial);
  const [loaded] = useState(() => {
    try {
      return { store: readPracticeStore(initial.id), error: '' };
    } catch {
      return {
        store: null,
        error:
          '연습 기록을 읽을 수 없어요. 원본은 그대로 보관했으며 기록을 덮어쓰지 않아요.',
      };
    }
  });
  const [storageError, setStorageError] = useState('');
  const [medals, setMedals] = useState(() => {
    try {
      return { store: readMedals(initial.id) as MedalStore | null, error: '' };
    } catch (reason) {
      return {
        store: null,
        error:
          reason instanceof Error
            ? reason.message
            : '훈장을 읽지 못했어요. 원본은 보존했어요.',
      };
    }
  });
  const [managingMedals, setManagingMedals] = useState(false);
  const [sharing, setSharing] = useState(false);
  const updateMedals = (store: MedalStore) => setMedals({ store, error: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [student, setStudent] = useState<StudentPlan | null>(null);
  const [seasonEditor, setSeasonEditor] = useState(() => currentSeasonIndex(initial));
  const save = (next: Preparation) => {
    try {
      saveGamePreparation(next);
      setPlan(next);
      setStorageError('');
      setErrors({});
      return true;
    } catch {
      setStorageError(
        '저장하지 못했어요. 원본은 그대로예요. 저장 공간을 확인하고 다시 저장해 주세요.',
      );
      return false;
    }
  };
  const navigate = (panel: OperationPanel, next = plan) => {
    if (save(next)) window.location.assign(operationHref(plan.id, panel));
  };
  const openRecords = () => {
    if (loaded.error) {
      setStorageError(loaded.error);
      return;
    }
    const teamErrors = validatePreparation(plan, 'teams');
    const jumperErrors = validateJumpers(plan);
    const seasonErrors = validateSeason(plan, currentSeasonIndex(plan));
    if (Object.keys(teamErrors).length || Object.keys(jumperErrors).length) {
      setNotice('명단에서 각 원정대에 대원을 배정하고 도전점퍼를 1~2명씩 정해 주세요.');
      if (initialPanel !== 'roster') navigate('roster');
      return;
    }
    if (Object.keys(seasonErrors).length) {
      if (initialPanel !== 'seasons') navigate('seasons');
      else setErrors(seasonErrors);
      return;
    }
    if (save(plan)) window.location.assign(`#/game/${plan.id}`);
  };
  const chooseSeason = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateSeason(plan, seasonEditor);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length)
      navigate('overview', {
        ...plan,
        currentSeasonIndex: seasonEditor,
        seasonsConfirmed: true,
      });
  };
  const panels: { id: OperationPanel; label: string }[] = [
    { id: 'overview', label: '현황' },
    { id: 'roster', label: '명단' },
    { id: 'seasons', label: '시즌 설정' },
  ];
  return (
    <PageFrame
      compact
      title={plan.className}
      subtitle={
        initialPanel === 'overview'
          ? '우리 원정의 오늘을 한눈에 살펴봐요.'
          : initialPanel === 'roster'
            ? '대원과 원정대 구성은 이곳에서 함께 관리해요.'
            : '이번 시즌의 기간과 비밀 보스를 정해요.'
      }
      aside={null}
      backHref="#/preparations"
      backLabel="원정 목록"
      brandSubtitle="선생님 원정실"
      headingAside={
        <button
          type="button"
          className="preparation-secondary"
          onClick={() => setSharing(true)}
        >
          학생 화면 공유
        </button>
      }
    >
      <nav className="operation-nav" aria-label="원정 메뉴">
        {panels.map((panel) => (
          <a
            key={panel.id}
            href={operationHref(plan.id, panel.id)}
            aria-current={initialPanel === panel.id ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              navigate(panel.id);
            }}
          >
            {panel.label}
          </a>
        ))}
      </nav>
      {(storageError || loaded.error) && (
        <p className="preparation-storage-error" role="alert">
          {storageError || loaded.error}
        </p>
      )}
      {notice && (
        <p className="operation-local-note" role="status">
          {notice}
        </p>
      )}
      <ErrorSummary errors={errors} />
      {medals.error && (
        <p className="preparation-storage-error" role="alert">
          {medals.error}
        </p>
      )}
      {initialPanel === 'overview' ? (
        <ExpeditionOverview
          plan={plan}
          store={loaded.store}
          onRecord={openRecords}
          onStudent={setStudent}
          medals={medals.store}
        />
      ) : initialPanel === 'roster' ? (
        <OperationRoster
          plan={plan}
          store={loaded.store}
          onSave={save}
          onStudent={setStudent}
          medals={medals.store}
          onManageMedals={() => setManagingMedals(true)}
        />
      ) : (
        <form onSubmit={chooseSeason} noValidate>
          <SeasonSettings
            plan={plan}
            errors={errors}
            selectedIndex={seasonEditor}
            onSelect={(index) => {
              setSeasonEditor(index);
              setErrors({});
            }}
            onChange={(next) => {
              setPlan(next);
              save(next);
            }}
            lockOrder={Boolean(
              (loaded.store && hasPracticeInputs(loaded.store)) ||
              medals.store?.awards.length ||
              medals.error,
            )}
            minSeasonCount={Math.max(
              1,
              ...(loaded.store?.history.map((entry) => entry.seasonIndex + 1) ?? []),
              loaded.store?.draft ? loaded.store.draft.seasonIndex + 1 : 1,
              ...(medals.store?.awards.map((award) => award.seasonIndex + 1) ?? []),
            )}
          />
          <div className="preparation-actions">
            <button
              type="button"
              className="preparation-secondary"
              onClick={() => navigate('overview')}
            >
              현황으로
            </button>
            <button type="submit" className="preparation-primary">
              이 시즌으로 기록하기
            </button>
          </div>
        </form>
      )}
      {student && (
        <StudentDetails
          key={student.id}
          student={student}
          plan={plan}
          store={loaded.store}
          onSave={save}
          onClose={() => setStudent(null)}
          medals={medals.store}
          medalError={medals.error}
          onMedalsChange={updateMedals}
        />
      )}
      {managingMedals && medals.store && (
        <MedalManager
          store={medals.store}
          onChange={updateMedals}
          onClose={() => setManagingMedals(false)}
        />
      )}
      {sharing && <StudentSharing plan={plan} onClose={() => setSharing(false)} />}
      <p className="operation-save-note">
        변경 내용은 이 브라우저에 자동 저장돼요. 기기 간 연결과 공식 보상은 아직 준비
        중이에요.
      </p>
    </PageFrame>
  );
}
