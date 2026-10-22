import { useCallback, useEffect, useRef, useState } from 'react';
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
import { mergeStudentBoardPurchases, readEconomy } from '../economy/model';
import type { EconomyStore } from '../economy/model';
import TeamEconomyModal from '../economy/TeamEconomyModal';
import { saveTeacherBackup } from '../backup/teacherBackup';
import { readHeroes, reconcileHeroRewards, revokeHeroReward } from '../heroes/model';
import { recordOfficialHeroCorrection } from '../heroes/officialHeroes';
import type { HeroStore } from '../heroes/model';
import HeroVaultModal from '../heroes/HeroVaultModal';
import {
  beginSeasonClose,
  isSeasonBattleLocked,
  readBattles,
  seasonBattle,
} from '../battle/model';
import type { BattleStore } from '../battle/model';
import FinalBattleModal from '../battle/FinalBattleModal';
import {
  fetchStudentBoardPurchases,
  readStudentLinks,
  syncPublishedStudentBoards,
} from '../student/studentBoardClient';
import {
  revealHeroWithAuthority,
  syncHeroRewardsWithAuthority,
  usesGameAuthority,
} from '../../shared/lib/gameAuthorityClient';

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
  const [serverStatus, setServerStatus] = useState('교사 계정 동기화 준비 중…');
  const [economyTeam, setEconomyTeam] = useState<number | null>(null);
  const [heroTeam, setHeroTeam] = useState<number | null>(null);
  const [battleSeason, setBattleSeason] = useState<number | null>(null);
  const [economy, setEconomy] = useState(() => {
    try {
      return { store: readEconomy(initial.id) as EconomyStore | null, error: '' };
    } catch (reason) {
      return {
        store: null,
        error:
          reason instanceof Error
            ? reason.message
            : '포인트·구매 기록을 읽지 못했어요. 원본은 보존했어요.',
      };
    }
  });
  const [heroes, setHeroes] = useState(() => {
    try {
      const store =
        loaded.store && medals.store && economy.store
          ? reconcileHeroRewards(initial, {
              practice: loaded.store,
              medals: medals.store,
              economy: economy.store,
            })
          : readHeroes(initial.id);
      return { store: store as HeroStore | null, error: '' };
    } catch (reason) {
      return {
        store: null,
        error:
          reason instanceof Error
            ? reason.message
            : '영웅 기록을 읽지 못했어요. 원본은 보존했어요.',
      };
    }
  });
  const [battles, setBattles] = useState(() => {
    try {
      return { store: readBattles(initial.id) as BattleStore | null, error: '' };
    } catch (reason) {
      return {
        store: null,
        error:
          reason instanceof Error
            ? reason.message
            : '최종 대전 기록을 읽지 못했어요. 원본은 보존했어요.',
      };
    }
  });
  const authorityFingerprint = useRef('');
  const updateHeroes = useCallback(
    (store: HeroStore) => {
      setHeroes({ store, error: '' });
      if (!loaded.store || !medals.store || !economy.store) return;
      void syncPublishedStudentBoards(
        plan,
        store,
        loaded.store,
        medals.store,
        economy.store,
      )
        .then((synced) => {
          if (synced) setServerStatus('학생 영웅 화면까지 갱신 완료');
        })
        .catch(() =>
          setServerStatus(
            '학생 영웅 화면 갱신을 기다리고 있어요. QR 게시에서 다시 시도하세요.',
          ),
        );
    },
    [economy.store, loaded.store, medals.store, plan],
  );
  useEffect(() => {
    if (!heroes.store || !usesGameAuthority()) return;
    const fingerprint = heroes.store.rewards
      .map((reward) => reward.achievementId)
      .sort()
      .join('|');
    if (!fingerprint || authorityFingerprint.current === fingerprint) return;
    authorityFingerprint.current = fingerprint;
    let active = true;
    setServerStatus('새 영웅을 서버에서 확정하는 중…');
    void syncHeroRewardsWithAuthority(plan.id, heroes.store)
      .then((store) => {
        if (!active) return;
        updateHeroes(store);
        setServerStatus('영웅 추첨 서버 확정 완료');
      })
      .catch(() => {
        if (!active) return;
        authorityFingerprint.current = '';
        setServerStatus('영웅 서버 확정을 기다리고 있어요. 잠시 후 다시 시도하세요.');
      });
    return () => {
      active = false;
    };
  }, [heroes.store, plan.id, updateHeroes]);
  const reconcileHeroes = (medalStore: MedalStore, economyStore: EconomyStore) => {
    if (!loaded.store) return;
    try {
      updateHeroes(
        reconcileHeroRewards(plan, {
          practice: loaded.store,
          medals: medalStore,
          economy: economyStore,
        }),
      );
    } catch (reason) {
      setHeroes({
        store: null,
        error:
          reason instanceof Error ? reason.message : '영웅 임무를 계산하지 못했어요.',
      });
    }
  };
  const updateMedals = (store: MedalStore) => {
    setMedals({ store, error: '' });
    if (economy.store) reconcileHeroes(store, economy.store);
  };
  const updateEconomy = (store: EconomyStore) => {
    setEconomy({ store, error: '' });
    if (medals.store) reconcileHeroes(medals.store, store);
  };
  const purchaseFingerprint =
    economy.store?.purchases.map((item) => item.id).join('|') ?? '';
  useEffect(() => {
    if (
      !loaded.store ||
      !medals.store ||
      !economy.store ||
      readStudentLinks(plan.id).length !== plan.teams.length
    )
      return;
    let active = true;
    let controller = new AbortController();
    const sync = async () => {
      try {
        const rows = await fetchStudentBoardPurchases(plan.id, controller.signal);
        if (!active) return;
        const next = mergeStudentBoardPurchases(plan, rows);
        const fingerprint = next.purchases.map((item) => item.id).join('|');
        if (fingerprint === purchaseFingerprint) return;
        setEconomy({ store: next, error: '' });
        setHeroes({
          store: reconcileHeroRewards(plan, {
            practice: loaded.store!,
            medals: medals.store!,
            economy: next,
          }),
          error: '',
        });
        setServerStatus('학생 상점 구매 기록까지 동기화 완료');
      } catch {
        if (active) setServerStatus('학생 구매 기록 동기화를 기다리고 있어요.');
      }
    };
    void sync();
    const interval = window.setInterval(() => {
      controller.abort();
      controller = new AbortController();
      void sync();
    }, 8_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [economy.store, loaded.store, medals.store, plan, purchaseFingerprint]);
  const revealTeamHero = async (rewardId: string) => {
    if (!heroes.store) throw new Error('영웅 기록을 먼저 확인해 주세요.');
    const next = await revealHeroWithAuthority(plan.id, heroes.store, rewardId);
    updateHeroes(next);
    return next;
  };
  const revokeTeamHero = async (rewardId: string, reason: string) => {
    if (!heroes.store) throw new Error('영웅 기록을 먼저 확인해 주세요.');
    const requestId = crypto.randomUUID();
    const next = revokeHeroReward(plan.id, rewardId, requestId, reason);
    void recordOfficialHeroCorrection(plan, rewardId, requestId, reason).catch(() => {
      /* Server recording is best-effort alongside local authoritative store */
    });
    updateHeroes(next);
    return next;
  };
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [student, setStudent] = useState<StudentPlan | null>(null);
  const [seasonEditor, setSeasonEditor] = useState(() => currentSeasonIndex(initial));
  useEffect(() => {
    if (loaded.error || medals.error || economy.error || heroes.error || battles.error)
      return;
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setServerStatus('변경 내용을 서버에 저장하는 중…');
      void saveTeacherBackup(plan)
        .then(() => {
          if (active) setServerStatus('교사 계정 자동 저장 완료');
        })
        .catch(() => {
          if (active) setServerStatus('교사 계정 자동 저장을 재시도하고 있어요.');
        });
    }, 900);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [
    plan,
    loaded.error,
    medals.error,
    medals.store,
    economy.error,
    economy.store,
    heroes.error,
    heroes.store,
    battles.error,
    battles.store,
  ]);
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
    if (battles.store && isSeasonBattleLocked(battles.store, currentSeasonIndex(plan))) {
      setNotice('최종 대전 계산이 끝난 시즌에는 새 경기를 기록할 수 없어요.');
      return;
    }
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
  const openBattle = (seasonIndex: number) => {
    if (!loaded.store || !economy.store || !heroes.store || !battles.store) {
      setStorageError('경기·병력·영웅 기록을 모두 읽은 뒤 최종 대전을 열 수 있어요.');
      return;
    }
    try {
      const existing = seasonBattle(battles.store, seasonIndex);
      const nextStore = existing
        ? battles.store
        : beginSeasonClose({ ...plan, currentSeasonIndex: seasonIndex }, loaded.store);
      setBattles({ store: nextStore, error: '' });
      setBattleSeason(seasonIndex);
      setStorageError('');
    } catch (reason) {
      setStorageError(
        reason instanceof Error ? reason.message : '시즌 종료를 준비하지 못했어요.',
      );
    }
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
        <div className="teacher-server-heading-actions">
          <button
            type="button"
            className="preparation-secondary"
            disabled={!heroes.store}
            onClick={() => setSharing(true)}
          >
            학생 화면 공유
          </button>
        </div>
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
      {economy.error && (
        <p className="preparation-storage-error" role="alert">
          {economy.error}
        </p>
      )}
      {heroes.error && (
        <p className="preparation-storage-error" role="alert">
          {heroes.error}
        </p>
      )}
      {battles.error && (
        <p className="preparation-storage-error" role="alert">
          {battles.error}
        </p>
      )}
      {initialPanel === 'overview' ? (
        <ExpeditionOverview
          plan={plan}
          store={loaded.store}
          onRecord={openRecords}
          onStudent={setStudent}
          medals={medals.store}
          economy={economy.store}
          onEconomy={setEconomyTeam}
          heroes={heroes.store}
          onHeroes={setHeroTeam}
          battles={battles.store}
          onBattle={openBattle}
        />
      ) : initialPanel === 'roster' ? (
        <OperationRoster
          plan={plan}
          store={loaded.store}
          onSave={save}
          onStudent={setStudent}
          medals={medals.store}
          onManageMedals={() => setManagingMedals(true)}
          hasEconomyEntries={Boolean(
            economy.error ||
            economy.store?.purchases.length ||
            economy.store?.reversals.length,
          )}
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
              medals.error ||
              economy.error ||
              economy.store?.purchases.length ||
              economy.store?.reversals.length ||
              battles.store?.battles.length,
            )}
            minSeasonCount={Math.max(
              1,
              ...(loaded.store?.history.map((entry) => entry.seasonIndex + 1) ?? []),
              loaded.store?.draft ? loaded.store.draft.seasonIndex + 1 : 1,
              ...(medals.store?.awards.map((award) => award.seasonIndex + 1) ?? []),
              ...(economy.store?.purchases.map((purchase) => purchase.seasonIndex + 1) ??
                []),
              ...(battles.store?.battles.map((battle) => battle.seasonIndex + 1) ?? []),
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
          plan={plan}
          store={medals.store}
          onChange={updateMedals}
          onClose={() => setManagingMedals(false)}
        />
      )}
      {sharing && heroes.store && loaded.store && medals.store && economy.store && (
        <StudentSharing
          plan={plan}
          heroes={heroes.store}
          practice={loaded.store}
          medals={medals.store}
          economy={economy.store}
          onClose={() => setSharing(false)}
        />
      )}
      {economyTeam !== null && loaded.store && medals.store && economy.store && (
        <TeamEconomyModal
          key={`${economyTeam}-${currentSeasonIndex(plan)}`}
          plan={plan}
          practice={loaded.store}
          medals={medals.store}
          store={economy.store}
          teamIndex={economyTeam}
          onChange={updateEconomy}
          onClose={() => setEconomyTeam(null)}
        />
      )}
      {heroTeam !== null && heroes.store && (
        <HeroVaultModal
          key={`${heroTeam}-${currentSeasonIndex(plan)}`}
          plan={plan}
          store={heroes.store}
          teamIndex={heroTeam}
          onReveal={revealTeamHero}
          onRevoke={revokeTeamHero}
          onClose={() => setHeroTeam(null)}
        />
      )}
      {battleSeason !== null &&
        loaded.store &&
        economy.store &&
        heroes.store &&
        battles.store &&
        seasonBattle(battles.store, battleSeason) && (
          <FinalBattleModal
            key={`${battleSeason}-${seasonBattle(battles.store, battleSeason)?.status}`}
            plan={{ ...plan, currentSeasonIndex: battleSeason }}
            practice={loaded.store}
            economy={economy.store}
            heroes={heroes.store}
            store={battles.store}
            seasonIndex={battleSeason}
            onStore={(store) => setBattles({ store, error: '' })}
            onHeroes={updateHeroes}
            onPlan={save}
            onClose={() => setBattleSeason(null)}
          />
        )}
      <p className="operation-save-note">
        변경 내용은 이 브라우저와 교사 계정에 자동 저장돼요. {serverStatus}
      </p>
    </PageFrame>
  );
}
