import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Preparation } from '../preparation/model';
import type { HeroStore } from '../heroes/model';
import OperationModal from '../expedition/OperationModal';
import { publishStudentBoards, readStudentLinks } from './studentBoardClient';
import './student.css';
function TeamQr({ url }: { url: string }) {
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then((value) => {
        if (!cancelled) setImage(value);
      })
      .catch(() => {
        if (!cancelled) setError('QR을 만들지 못했어요. 아래 링크를 이용해 주세요.');
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return image ? (
    <img src={image} width={240} height={240} alt="학생 읽기 전용 원정대 QR" />
  ) : error ? (
    <p role="alert">{error}</p>
  ) : (
    <p role="status">QR 생성 중…</p>
  );
}
export default function StudentSharing({
  plan,
  heroes,
  onClose,
}: {
  plan: Preparation;
  heroes: HeroStore;
  onClose: () => void;
}) {
  const [links, setLinks] = useState(() => readStudentLinks(plan.id));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const apiUrl = import.meta.env.VITE_BOARD_API_URL?.trim();
  const baseUrl =
    import.meta.env.VITE_PUBLIC_APP_URL?.trim() || location.origin + location.pathname;
  const publish = async (rotate: boolean) => {
    if (!apiUrl) return;
    if (rotate && !window.confirm('이전 학생 QR을 무효화하고 새 QR을 만들까요?')) return;
    setBusy(true);
    setError('');
    setNotice('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const next = await publishStudentBoards(plan, heroes, rotate, controller.signal);
      setLinks(next);
      setNotice(
        '학생 화면에 현재 명단을 게시했어요. 학생은 새로고침하면 확인할 수 있어요.',
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : '게시하지 못했어요. 다시 시도해 주세요.',
      );
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  };
  return (
    <OperationModal
      title="학생 화면 공유"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="preparation-hint">
        학생용 읽기 전용 화면이에요. 명단과 병력·영웅 카드만 볼 수 있고, 명단
        수정·구매·기록 입력은 제공하지 않아요.
      </p>
      <p className="preparation-hint">
        팀 구성을 바꾼 뒤에는 ‘현재 명단 게시’를 눌러 학생 화면을 갱신해 주세요.
      </p>
      {!apiUrl ? (
        <p className="preparation-hint">
          서버 연결 전이에요. 아래 미리보기는 이 브라우저에서만 열립니다. 다른 기기에
          공유할 QR은 서버 설정 후 만들 수 있어요.
        </p>
      ) : (
        <>
          <p className="preparation-hint">
            게시 변경은 로그인한 교사만 할 수 있어요. 학생에게는 원정대 QR만 공유합니다.
          </p>
          <div className="preparation-actions">
            <button
              type="button"
              className="preparation-primary"
              disabled={busy}
              onClick={() => void publish(false)}
            >
              {busy ? '게시 중…' : '현재 명단 게시'}
            </button>
            {links.length > 0 && (
              <button
                type="button"
                className="preparation-secondary"
                disabled={busy}
                onClick={() => void publish(true)}
              >
                QR 재발급
              </button>
            )}
          </div>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="preparation-field-error">
          {error}
        </p>
      )}
      <ul className="student-share-list">
        {plan.teams.map((team, index) => {
          const link = links.find((item) => item.teamIndex === index);
          const url = link
            ? `${baseUrl.replace(/#.*$/, '').replace(/\/$/, '')}/#/team/${link.token}`
            : '';
          return (
            <li key={index}>
              <h3>{team.name}</h3>
              <a href={`#/student-preview/${plan.id}/${index}`}>학생 화면 미리보기</a>
              {link && (
                <>
                  <TeamQr url={url} />
                  <label htmlFor={`team-link-${index}`}>학생용 읽기 전용 링크</label>
                  <input
                    id={`team-link-${index}`}
                    readOnly
                    value={url}
                    onFocus={(event) => event.target.select()}
                  />
                  <a href={`#/team/${link.token}`}>게시된 학생 화면 열기</a>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <div className="preparation-actions">
        <button
          type="button"
          className="preparation-secondary"
          disabled={busy}
          onClick={onClose}
        >
          닫기
        </button>
      </div>
    </OperationModal>
  );
}
