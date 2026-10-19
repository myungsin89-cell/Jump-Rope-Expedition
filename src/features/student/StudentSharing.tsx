import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Preparation } from '../preparation/model';
import OperationModal from '../expedition/OperationModal';
import { isUuid } from '../../shared/domain/studentBoard';
import './student.css';

interface SharedLink {
  teamIndex: number;
  teamName: string;
  token: string;
}
function readLinks(id: string): SharedLink[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(`jre.student-links.v1.${id}`) ?? '[]',
    );
    return Array.isArray(value)
      ? value.filter(
          (item): item is SharedLink =>
            item &&
            Number.isInteger(item.teamIndex) &&
            item.teamIndex >= 0 &&
            item.teamIndex < 4 &&
            typeof item.teamName === 'string' &&
            isUuid(item.token),
        )
      : [];
  } catch {
    return [];
  }
}
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
  onClose,
}: {
  plan: Preparation;
  onClose: () => void;
}) {
  const [links, setLinks] = useState(() => readLinks(plan.id));
  const [ownerKey, setOwnerKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const apiUrl = import.meta.env.VITE_BOARD_API_URL?.trim();
  const baseUrl =
    import.meta.env.VITE_PUBLIC_APP_URL?.trim() || location.origin + location.pathname;
  const publish = async (rotate: boolean) => {
    if (!apiUrl) return;
    if (ownerKey.length < 32) {
      setError(
        '선생님 전용 게시 키를 입력해 주세요. 서버에 설정한 32자 이상의 비공개 키예요.',
      );
      return;
    }
    if (rotate && !window.confirm('이전 학생 QR을 무효화하고 새 QR을 만들까요?')) return;
    setBusy(true);
    setError('');
    setNotice('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const endpoint = new URL(apiUrl);
      if (
        endpoint.protocol !== 'https:' &&
        !['localhost', '127.0.0.1'].includes(endpoint.hostname)
      )
        throw new Error('게시 키 보호를 위해 HTTPS 서버 주소를 사용해 주세요.');
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'omit',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-classroom-owner-key': ownerKey,
        },
        body: JSON.stringify({ plan, rotate }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? '게시 키가 맞지 않아요. 학생에게 이 키를 공유하지 마세요.'
            : '게시하지 못했어요. 서버 설정과 네트워크를 확인해 주세요.',
        );
      const value: unknown = await response.json();
      if (
        !value ||
        typeof value !== 'object' ||
        !('links' in value) ||
        !Array.isArray(value.links)
      )
        throw new Error('서버 응답을 확인해 주세요.');
      const next = value.links.filter(
        (item): item is SharedLink =>
          item &&
          isUuid(item.token) &&
          Number.isInteger(item.teamIndex) &&
          typeof item.teamName === 'string',
      );
      if (
        next.length !== plan.teams.length ||
        new Set(next.map((item) => item.teamIndex)).size !== plan.teams.length ||
        next.some((item) => item.teamIndex < 0 || item.teamIndex >= plan.teams.length)
      )
        throw new Error('모든 원정대의 링크를 받지 못했어요. 다시 게시해 주세요.');
      setLinks(next);
      setNotice(
        '학생 화면에 현재 명단을 게시했어요. 학생은 새로고침하면 확인할 수 있어요.',
      );
      try {
        localStorage.setItem(`jre.student-links.v1.${plan.id}`, JSON.stringify(next));
      } catch {
        setNotice(
          '게시했지만 이 브라우저에 QR 목록을 보관하지 못했어요. 닫기 전에 링크를 복사해 주세요.',
        );
      }
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
          <label htmlFor="student-publish-key">선생님 전용 게시 키</label>
          <input
            id="student-publish-key"
            type="password"
            autoComplete="off"
            value={ownerKey}
            onChange={(event) => setOwnerKey(event.target.value)}
          />
          <p className="preparation-hint">
            로그인 대신 사용하는 임시 게시 보호 키예요. 브라우저에 저장하거나 학생 QR에
            넣지 않아요.
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
