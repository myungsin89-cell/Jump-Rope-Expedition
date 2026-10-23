import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Preparation } from '../preparation/model';
import type { HeroStore } from '../heroes/model';
import type { MedalStore } from '../medals/model';
import type { PracticeStore } from '../matches/practiceModel';
import type { EconomyStore } from '../economy/model';
import OperationModal from '../expedition/OperationModal';
import { publishStudentBoards, readStudentLinks } from './studentBoardClient';
import './student.css';
function qrFileName(expeditionName: string, teamName: string) {
  return `${expeditionName}-${teamName}-원정대-게시판-QR.png`.replace(
    /[<>:"/\\|?*]/g,
    '-',
  );
}

async function labeledQr(url: string, expeditionName: string, teamName: string) {
  const qr = await QRCode.toDataURL(url, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('QR image load failed'));
    image.src = qr;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 480;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('QR 이미지를 만들 수 없어요.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#173e2c';
  context.textAlign = 'center';
  context.font = '700 24px sans-serif';
  context.fillText(teamName, canvas.width / 2, 38, 380);
  context.fillStyle = '#5b6b62';
  context.font = '15px sans-serif';
  context.fillText(expeditionName, canvas.width / 2, 65, 380);
  context.drawImage(image, 30, 82, 360, 360);
  context.fillStyle = '#173e2c';
  context.font = '700 14px sans-serif';
  context.fillText('줄넘기 원정대 게시판', canvas.width / 2, 466, 380);
  return canvas.toDataURL('image/png');
}

function TeamQr({
  url,
  expeditionName,
  teamName,
}: {
  url: string;
  expeditionName: string;
  teamName: string;
}) {
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    labeledQr(url, expeditionName, teamName)
      .then((value) => {
        if (!cancelled) setImage(value);
      })
      .catch(() => {
        if (!cancelled) setError('QR을 만들지 못했어요. 아래 링크를 이용해 주세요.');
      });
    return () => {
      cancelled = true;
    };
  }, [expeditionName, teamName, url]);
  return image ? (
    <div className="student-qr-download">
      <img src={image} width={210} height={240} alt={`${teamName} 학생용 원정대 QR`} />
      <a download={qrFileName(expeditionName, teamName)} href={image}>
        {teamName} QR 다운로드
      </a>
    </div>
  ) : error ? (
    <p role="alert">{error}</p>
  ) : (
    <p role="status">QR 생성 중…</p>
  );
}
export default function StudentSharing({
  plan,
  heroes,
  practice,
  medals,
  economy,
  onClose,
}: {
  plan: Preparation;
  heroes: HeroStore;
  practice: PracticeStore;
  medals: MedalStore;
  economy: EconomyStore;
  onClose: () => void;
}) {
  const [links, setLinks] = useState(() => readStudentLinks(plan.id));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const apiUrl = import.meta.env.VITE_BOARD_API_URL?.trim();
  const hasPublishedBoards = links.length === plan.teams.length;
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
      const next = await publishStudentBoards(
        plan,
        heroes,
        practice,
        medals,
        economy,
        rotate,
        controller.signal,
      );
      setLinks(next);
      setNotice(
        '학생 화면에 현재 자료를 게시했어요. 열어 둔 학생 화면도 자동으로 새 내용을 확인해요.',
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
        학생용 원정대 게시판이에요. 명단 수정과 기록 입력은 할 수 없고, 각 원정대는 자기
        QR로 들어가 보유 포인트를 사용해 병력과 힌트를 구매할 수 있어요.
      </p>
      <p className="preparation-hint">
        처음에는 ‘원정대 게시판 만들기’를 눌러 실제 링크와 QR을 만들어 주세요. 팀 구성을
        바꾼 뒤에는 같은 버튼으로 학생 화면을 갱신할 수 있어요. 학생 화면은 연결이
        유지되는 동안 새 내용을 자동으로 확인합니다.
      </p>
      {!apiUrl ? (
        <p className="preparation-hint">
          서버 연결 전이에요. 아래 미리보기는 이 브라우저에서만 열립니다. 다른 기기에
          공유할 QR은 서버 설정 후 만들 수 있어요.
        </p>
      ) : (
        <>
          <p className="preparation-hint">
            <strong>서버 연결됨</strong> · 게시 변경은 로그인한 교사만 할 수 있어요.
            학생에게는 원정대 QR만 공유합니다.
          </p>
          <div className="preparation-actions">
            <button
              type="button"
              className="preparation-primary"
              disabled={busy}
              onClick={() => void publish(false)}
            >
              {busy
                ? '게시 중…'
                : hasPublishedBoards
                  ? '현재 명단 다시 게시'
                  : '원정대 게시판 만들기'}
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
              {!link && apiUrl && (
                <p className="student-share-pending">
                  아직 게시 전이에요. 위의 ‘원정대 게시판 만들기’를 눌러 주세요.
                </p>
              )}
              {link && (
                <>
                  <TeamQr
                    url={url}
                    expeditionName={plan.className}
                    teamName={team.name}
                  />
                  <span className="student-share-link-label">학생용 원정대 링크</span>
                  <a
                    className="student-share-open"
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${team.name} 게시판 새 탭에서 열기`}
                  >
                    <strong>{team.name} 게시판 바로 열기</strong>
                    <small>{url}</small>
                  </a>
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
