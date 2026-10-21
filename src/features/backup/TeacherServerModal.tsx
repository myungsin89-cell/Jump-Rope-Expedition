import { useState } from 'react';
import type { FormEvent } from 'react';
import OperationModal from '../expedition/OperationModal';
import type { Preparation, SavedPreparation } from '../preparation/model';
import {
  isTeacherBackupConfigured,
  listTeacherBackups,
  restoreTeacherBackups,
  saveTeacherBackup,
} from './teacherBackup';
import './teacher-server.css';

type Props =
  | {
      mode: 'save';
      plan: Preparation;
      onClose: () => void;
      onRestored?: never;
    }
  | {
      mode: 'restore';
      plan?: never;
      onClose: () => void;
      onRestored: (plans: SavedPreparation[]) => void;
    };

export default function TeacherServerModal(props: Props) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const configured = isTeacherBackupConfigured();
  const saving = props.mode === 'save';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setWorking(true);
    try {
      if (saving) {
        await saveTeacherBackup(props.plan);
        setMessage('명단·경기·포인트·훈장을 교사 계정에 저장했어요.');
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
      setWorking(false);
    }
  };

  return (
    <OperationModal
      title={saving ? '서버에 명단 저장' : '서버 명단 불러오기'}
      onClose={props.onClose}
    >
      <form className="teacher-server-form" onSubmit={submit}>
        <p>
          {saving
            ? '현재 명단과 경기·훈장·포인트·구매 기록을 로그인한 교사 계정에 저장해요.'
            : '로그인한 교사 계정의 원정을 이 브라우저로 불러와요. 더 최근 자료를 유지합니다.'}
        </p>
        {!configured && (
          <p className="teacher-server-error" role="alert">
            서버 저장 주소가 아직 앱에 연결되지 않았어요.
          </p>
        )}
        <small>현재 로그인한 교사만 이 원정 자료를 읽고 수정할 수 있어요.</small>
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
          <button
            type="submit"
            className="preparation-primary"
            disabled={!configured || working}
          >
            {working ? '처리 중…' : saving ? '서버에 저장' : '서버에서 불러오기'}
          </button>
        </div>
      </form>
    </OperationModal>
  );
}
