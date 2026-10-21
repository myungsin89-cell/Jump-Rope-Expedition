import { useEffect, useRef, useState } from 'react';
import { readPreparations } from '../preparation/model';
import { parseStudentBoard, studentBoardData } from '../../shared/domain/studentBoard';
import type { StudentBoardData } from '../../shared/domain/studentBoard';
import UnitCard from '../card-ui/UnitCard';
import HeroCard from '../card-ui/HeroCard';
import { HEROES_CATALOG, UNITS_CATALOG } from '../card-ui/catalog';
import { readHeroes } from '../heroes/model';
import forest from '../../../assets/illustrations/title-screen-cover-v1.png';
import './student.css';

export default function StudentBoard({ route }: { route: string }) {
  const [panel, setPanel] = useState<'team' | 'units' | 'heroes'>('team');
  const [data, setData] = useState<StudentBoardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const title = useRef<HTMLHeadingElement>(null);
  const preview = route.startsWith('/student-preview/');
  const previewParts = route.split('/');
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        if (preview) {
          const [, , id, index] = route.split('/');
          const plan = readPreparations().find((item) => item.id === id);
          if (!plan || !/^[0-3]$/.test(index ?? ''))
            throw new Error('이 브라우저에서 미리 볼 원정대를 찾을 수 없어요.');
          setData(
            studentBoardData(
              plan,
              Number(index),
              new Date().toISOString(),
              readHeroes(plan.id),
            ),
          );
        } else {
          const endpoint = import.meta.env.VITE_BOARD_API_URL?.trim();
          if (!endpoint)
            throw new Error(
              '학생 화면 서버가 아직 연결되지 않았어요. 선생님께 확인해 주세요.',
            );
          const url = new URL(endpoint);
          url.searchParams.set('token', route.slice('/team/'.length));
          const response = await fetch(url, {
            signal: controller.signal,
            cache: 'no-store',
            credentials: 'omit',
          });
          if (!response.ok)
            throw new Error(
              response.status === 404
                ? '만료되었거나 잘못된 팀 링크예요. 새 QR을 받아 주세요.'
                : '학생 화면을 열지 못했어요. 잠시 후 새로고침해 주세요.',
            );
          const value: unknown = await response.json();
          if (!controller.signal.aborted) setData(parseStudentBoard(value));
        }
        if (!controller.signal.aborted) setError('');
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error ? reason.message : '학생 화면을 열지 못했어요.',
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [route, preview, refresh]);
  useEffect(() => {
    if (preview || panel !== 'heroes') return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') setRefresh((value) => value + 1);
    }, 2_500);
    return () => window.clearInterval(interval);
  }, [panel, preview]);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [data]);
  const tabs = [
    { id: 'team', name: '우리 원정대' },
    { id: 'units', name: '병력 카드' },
    { id: 'heroes', name: '영웅 카드' },
  ] as const;
  return (
    <main className="student-board">
      <header className="student-top">
        <a href="#/">줄넘기 원정대</a>
        <span>둘러보기 · 읽기 전용</span>
        {preview && <a href={`#/preparations/${previewParts[2]}`}>교사 화면으로</a>}
      </header>
      {preview && (
        <p className="student-preview-notice">
          선생님 브라우저의 미리보기예요. 학생에게는 ‘학생 화면 공유’에서 만든 QR을 전달해
          주세요.
        </p>
      )}
      {loading ? (
        <p role="status" className="student-message">
          원정대를 불러오는 중이에요…
        </p>
      ) : error ? (
        <section className="student-message">
          <h1>원정대를 열 수 없어요</h1>
          <p role="alert">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setRefresh((value) => value + 1);
            }}
          >
            다시 불러오기
          </button>
        </section>
      ) : (
        data && (
          <>
            <section
              className="student-hero"
              style={{
                backgroundImage: `linear-gradient(90deg, #183e2dee 10%, #183e2d33 100%), url(${forest})`,
              }}
            >
              <p>{data.expeditionName}</p>
              <h1 ref={title} tabIndex={-1}>
                {data.teamName}
              </h1>
              <p>우리의 첫 모험을 준비해요.</p>
            </section>
            <nav className="student-tabs" aria-label="학생 원정대 메뉴">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={panel === tab.id}
                  onClick={() => setPanel(tab.id)}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
            {panel === 'team' ? (
              <section className="student-roster">
                <div className="student-section-heading">
                  <h2>
                    함께하는 대원 <small>{data.members.length}명</small>
                  </h2>
                  <button
                    onClick={() => {
                      setLoading(true);
                      setRefresh((value) => value + 1);
                    }}
                  >
                    명단 새로고침
                  </button>
                </div>
                <ol>
                  {data.members.map((member) => (
                    <li key={member.number} className={member.jumper ? 'is-jumper' : ''}>
                      <span>{String(member.number).padStart(2, '0')}</span>
                      <strong>{member.name}</strong>
                      {member.captain && <span className="student-role">원정대장</span>}
                      {member.jumper && <span className="student-role">도전점퍼</span>}
                    </li>
                  ))}
                </ol>
                {!data.members.length && <p>선생님이 대원을 편성하면 여기에 표시돼요.</p>}
                <p className="student-help">이름과 대원 구성은 선생님이 변경해요.</p>
                <p className="student-help">
                  {preview ? '미리보기 생성' : '명단 게시'}:{' '}
                  {new Date(data.publishedAt).toLocaleString('ko-KR')}
                </p>
              </section>
            ) : panel === 'heroes' ? (
              <section aria-label="우리 원정대 영웅">
                <div className="student-section-heading">
                  <h2>
                    우리 영웅 <small>{data.heroes.length}장</small>
                  </h2>
                  <span>{preview ? '미리보기' : '자동 동기화 중'}</span>
                </div>
                <p className="student-help">
                  봉인된 카드는 팀원들과 함께 공개하면 이 화면에도 자동으로 나타나요.
                </p>
                {data.heroes.length ? (
                  <div className="student-card-grid student-owned-heroes">
                    {data.heroes.map((slot) => {
                      const hero = slot.heroId
                        ? HEROES_CATALOG.find((item) => item.id === slot.heroId)
                        : null;
                      return hero ? (
                        <HeroCard key={slot.slot} hero={hero} state="revealed" />
                      ) : (
                        <article className="student-sealed-hero" key={slot.slot}>
                          <span>?</span>
                          <strong>봉인된 영웅 카드</strong>
                          <small>팀원들과 함께 공개해요</small>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="student-empty-heroes">
                    아직 획득한 영웅이 없어요. 원정대의 도전을 이어가 보세요.
                  </p>
                )}
                <div className="student-section-heading student-catalog-heading">
                  <h2>영웅 도감</h2>
                  <span>15종</span>
                </div>
                <p className="student-help">
                  아직 만나지 못한 영웅까지 능력을 미리 살펴볼 수 있어요.
                </p>
                <div className="student-card-grid">
                  {HEROES_CATALOG.map((hero) => (
                    <HeroCard key={hero.id} hero={hero} state="revealed" />
                  ))}
                </div>
              </section>
            ) : (
              <section aria-label="카드 도감">
                <div className="student-section-heading">
                  <h2>함께할 병력</h2>
                  <span>카드 구경</span>
                </div>
                <p className="student-help">
                  어떤 힘을 가진 카드인지 미리 살펴봐요. 실제 보유 카드가 아니며, 이
                  화면에서는 구매할 수 없어요.
                </p>
                <div className="student-card-grid">
                  {UNITS_CATALOG.map((unit) => (
                    <UnitCard key={unit.id} unit={unit} />
                  ))}
                </div>
              </section>
            )}
          </>
        )
      )}
    </main>
  );
}
