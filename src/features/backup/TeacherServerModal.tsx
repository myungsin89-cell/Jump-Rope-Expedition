import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';
import OperationModal from '../expedition/OperationModal';
import type { Preparation, SavedPreparation } from '../preparation/model';
import {
  isTeacherBackupConfigured,
  listTeacherBackups,
  restoreTeacherBackups,
  saveTeacherBackup,
} from './teacherBackup';
import {
  localBackupFilename,
  parseLocalBackupText,
  restoreLocalBackup,
  serializeLocalBackup,
} from './localBackup';
import type { LocalExpeditionBackup } from './localBackup';
import './teacher-server.css';

type Props =
  | {
      mode: 'save';
      plan: Preparation;
      onClose: () => void;
      onRestored?: never;
      onServerSaved?: (updatedAt: string) => void;
    }
  | {
      mode: 'restore';
      plan?: never;
      onClose: () => void;
      onRestored: (plans: SavedPreparation[]) => void;
      onServerSaved?: never;
    };

type Working = 'download' | 'local-restore' | 'server-save' | 'server-restore' | '';

export default function TeacherServerModal(props: Props) {
  const [working, setWorking] = useState<Working>('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<LocalExpeditionBackup | null>(null);
  const inputId = useId();
  const configured = isTeacherBackupConfigured();
  const saving = props.mode === 'save';

  const resetFeedback = () => {
    setError('');
    setMessage('');
  };

  const download = () => {
    if (!saving) return;
    resetFeedback();
    setWorking('download');
    try {
      const blob = new Blob([serializeLocalBackup(props.plan)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = localBackupFilename(props.plan);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage('원정 전체 백업 파일을 저장했어요.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `백업 파일을 만들지 못했어요. ${reason.message}`
          : '백업 파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setWorking('');
    }
  };

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    resetFeedback();
    setPreview(null);
    try {
      const backup = parseLocalBackupText(await file.text());
      setPreview(backup);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '백업 파일을 읽지 못했어요.',
      );
    }
  };

  const restoreFile = () => {
    if (saving || !preview) return;
    resetFeedback();
    setWorking('local-restore');
    try {
      const all = restoreLocalBackup(preview);
      props.onRestored(all);
      setPreview(null);
      setMessage('명단·경기·포인트·훈장·영웅·대전 기록을 복원했어요.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '백업을 복원하지 못했어요.');
    } finally {
      setWorking('');
    }
  };

  const runServer = async () => {
    resetFeedback();
    setWorking(saving ? 'server-save' : 'server-restore');
    try {
      if (saving) {
        const backup = await saveTeacherBackup(props.plan);
        props.onServerSaved?.(backup.updatedAt);
        setMessage('현재 원정 자료를 교사 계정에 저장했어요.');
      } else {
        const backups = await listTeacherBackups();
        const merged = restoreTeacherBackups(backups);
        props.onRestored(merged);
        setMessage(
          backups.length
            ? `서버 원정 ${backups.length}개를 이 브라우저에 불러왔어요.`
            : '서버에 저장된 원정이 아직 없어요.',
        );
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : '서버 작업을 마치지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setWorking('');
    }
  };

  return (
    <OperationModal
      title={saving ? '저장·백업 관리' : '백업 불러오기'}
      onClose={props.onClose}
      className="teacher-backup-modal"
    >
      <div className="teacher-server-form">
        {saving ? (
          <>
            <section className="teacher-backup-section">
              <div>
                <h3>파일로 안전하게 보관</h3>
                <p>현재 원정의 명단과 모든 경기·포인트·카드 기록을 한 파일에 담아요.</p>
              </div>
              <button
                type="button"
                className="preparation-primary"
                onClick={download}
                disabled={Boolean(working)}
              >
                {working === 'download' ? '파일 만드는 중…' : '전체 백업 파일 저장'}
              </button>
            </section>
            <section className="teacher-backup-section">
              <div>
                <h3>교사 계정에 지금 저장</h3>
                <p>자동 저장이 늦거나 실패했을 때 직접 다시 저장할 수 있어요.</p>
              </div>
              <button
                type="button"
                className="preparation-secondary"
                onClick={runServer}
                disabled={!configured || Boolean(working)}
              >
                {working === 'server-save' ? '서버에 저장 중…' : '지금 서버에 저장'}
              </button>
              {!configured && (
                <small>서버 연결 전이라 지금은 파일 백업을 이용할 수 있어요.</small>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="teacher-backup-section">
              <div>
                <h3>파일에서 원정 복원</h3>
                <p>파일을 먼저 검사하고, 복원할 원정 정보를 보여 드려요.</p>
              </div>
              <label className="teacher-backup-file" htmlFor={inputId}>
                백업 파일 선택
              </label>
              <input
                id={inputId}
                type="file"
                accept="application/json,.json"
                onChange={chooseFile}
                disabled={Boolean(working)}
              />
              {preview && (
                <div className="teacher-backup-preview" role="status">
                  <strong>{preview.snapshot.plan.className}</strong>
                  <span>
                    학생 {preview.snapshot.plan.students.length}명 · 원정대{' '}
                    {preview.snapshot.plan.teams.length}개
                  </span>
                  <small>
                    백업한 때 {new Date(preview.exportedAt).toLocaleString('ko-KR')}
                  </small>
                  <p>
                    같은 원정이 있으면 이 파일의 내용으로 바뀝니다. 다른 원정은 그대로
                    유지돼요.
                  </p>
                  <button
                    type="button"
                    className="preparation-primary"
                    onClick={restoreFile}
                    disabled={Boolean(working)}
                  >
                    {working === 'local-restore' ? '복원 중…' : '이 백업 복원'}
                  </button>
                </div>
              )}
            </section>
            <section className="teacher-backup-section teacher-backup-section--server">
              <div>
                <h3>교사 계정 자료 불러오기</h3>
                <p>서버에 더 최근에 저장된 원정만 이 브라우저와 합쳐요.</p>
              </div>
              <button
                type="button"
                className="preparation-secondary"
                onClick={runServer}
                disabled={!configured || Boolean(working)}
              >
                {working === 'server-restore'
                  ? '서버에서 불러오는 중…'
                  : '서버에서 불러오기'}
              </button>
            </section>
          </>
        )}
        <small className="teacher-backup-privacy">
          로그인 정보와 팀 QR 비밀 주소는 파일에 담지 않아요. 다른 기기에서 복원한 뒤 QR은
          다시 게시해 주세요.
        </small>
        {error && (
          <p className="teacher-server-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="teacher-server-success" role="status">
            {message}
          </p>
        )}
        <div className="teacher-server-actions">
          <button type="button" className="preparation-secondary" onClick={props.onClose}>
            닫기
          </button>
        </div>
      </div>
    </OperationModal>
  );
}
