import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import coverImage from '../assets/illustrations/title-screen-cover-v1.png';
import bgmTitleUrl from '../assets/audio/bgm/bgm_title_forest_departure_loop.wav';
import ExpeditionTitleLogo from './components/ExpeditionTitleLogo';
import IntroStorybookModal from './components/IntroStorybookModal';
import { useAuth } from './features/auth/AuthContext';

const PreparationWorkspace = lazy(
  () => import('./features/preparation/PreparationWorkspace'),
);
const MatchWorkspace = lazy(() => import('./features/matches/MatchWorkspace'));
const StudentBoard = lazy(() => import('./features/student/StudentBoard'));
const TeacherLogin = lazy(() => import('./features/auth/TeacherLogin'));

function currentRoute() {
  return window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '/';
}

function ExpeditionMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48">
      <path
        d="M8 31.5C17.5 30.8 21.3 24.8 24 15.4C26.8 24.8 30.5 30.8 40 31.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M24 13.5C20.4 8.8 15.9 8.8 12.8 11.4C16 12.6 18.7 15.2 19.8 18.3"
        fill="var(--mint-accent)"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path
        d="M24 13.5C27.6 8.8 32.1 8.8 35.2 11.4C32 12.6 29.3 15.2 28.2 18.3"
        fill="var(--sun-highlight)"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path d="M14 36.5H34" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M5 12H19"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M14 7L19 12L14 17"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function App() {
  const { status } = useAuth();
  const [route, setRoute] = useState(currentRoute);
  const [introOpen, setIntroOpen] = useState(false);
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const titleBgmRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleRoute = () => setRoute(currentRoute());
    window.addEventListener('hashchange', handleRoute);
    return () => window.removeEventListener('hashchange', handleRoute);
  }, []);

  // 메인 타이틀 화면 BGM (사용자가 BGM 켜기를 눌렀을 때만 재생)
  useEffect(() => {
    const audio = titleBgmRef.current;
    if (!audio) return;

    if (!bgmPlaying || route !== '/' || introOpen) {
      audio.pause();
      return;
    }

    audio.volume = 0.55;
    // BGM 켜기 클릭 시 4.6초의 조용한 도입부를 건너뛰고 메인 테마 멜로디부터 즉시 재생
    if (audio.currentTime < 4.615) {
      audio.currentTime = 4.615;
    }
    audio.play().catch(() => {});
  }, [bgmPlaying, route, introOpen]);

  const openPreparation = (path: string) => {
    titleBgmRef.current?.pause();
    window.location.assign(`#${path}`);
  };

  const openIntro = () => {
    setIntroOpen(true);
  };

  if (route.startsWith('/team/')) {
    return (
      <Suspense
        fallback={
          <main className="preparation-loading" role="status">
            원정대를 열고 있어요…
          </main>
        }
      >
        <StudentBoard key={route} route={route} />
      </Suspense>
    );
  }

  const teacherRoute =
    route === '/prepare' ||
    route === '/preparations' ||
    route.startsWith('/preparations/') ||
    route.startsWith('/game/') ||
    route.startsWith('/student-preview/');

  if (route === '/login' || (teacherRoute && status !== 'authenticated')) {
    return (
      <Suspense
        fallback={
          <main className="preparation-loading" role="status">
            로그인 화면을 열고 있어요…
          </main>
        }
      >
        <TeacherLogin />
      </Suspense>
    );
  }

  if (teacherRoute) {
    return (
      <Suspense
        fallback={
          <main className="preparation-loading" role="status">
            원정을 열고 있어요…
          </main>
        }
      >
        {route.startsWith('/student-preview/') ? (
          <StudentBoard key={route} route={route} />
        ) : route.startsWith('/game/') ? (
          <MatchWorkspace key={route} classId={route.slice('/game/'.length)} />
        ) : (
          <PreparationWorkspace route={route} />
        )}
      </Suspense>
    );
  }

  return (
    <main className="title-screen">
      <audio loop preload="auto" ref={titleBgmRef} src={bgmTitleUrl} />
      <a className="skip-link" href="#title-content">
        시작 화면 내용으로 이동
      </a>

      <img
        alt="세 팀의 숲속 병력이 멀리 있는 비밀 보스를 향해 출발하는 줄넘기 원정대"
        className="title-art"
        fetchPriority="high"
        height="941"
        src={coverImage}
        width="1672"
      />
      <div className="title-vignette" aria-hidden="true" />
      <div className="paper-grain" aria-hidden="true" />

      <header className="title-header">
        <a
          className="mini-brand"
          href="#title-content"
          aria-label="줄넘기 원정대 처음으로"
        >
          <span className="mini-brand-mark">
            <ExpeditionMark />
          </span>
          <span>JUMP ROPE EXPEDITION</span>
        </a>
        <div className="title-header-actions">
          <button
            aria-label={bgmPlaying ? '배경음악 끄기' : '배경음악 켜기'}
            className={`title-bgm-button ${bgmPlaying ? 'is-playing' : ''}`}
            onClick={() => setBgmPlaying((prev) => !prev)}
            type="button"
          >
            <span>{bgmPlaying ? '⏸' : '🎵'}</span>
            <span>{bgmPlaying ? 'BGM 끄기' : 'BGM 켜기'}</span>
          </button>
          <span className="season-chip">우리 반 협력 모험</span>
        </div>
      </header>

      <section className="title-content" id="title-content" aria-labelledby="game-title">
        <p className="title-kicker">
          <span aria-hidden="true" />
          함께 넘을수록 길이 열리는 숲속 원정
        </p>
        <h1 className="game-title" aria-label="줄넘기 원정대" id="game-title">
          <ExpeditionTitleLogo />
        </h1>
        <p className="title-story">
          함께 쌓은 기록이 힘이 되고, 모은 병력과 영웅이 비밀 보스를 향해 나아갑니다.
        </p>

        <div className="title-actions">
          <div className="title-buttons-group">
            <button
              className="enter-button"
              onClick={() => openPreparation('/preparations')}
              type="button"
            >
              <span>원정 시작하기</span>
              <ArrowIcon />
            </button>
            <button className="intro-trigger-button" onClick={openIntro} type="button">
              <span>🍃 세계관 이야기 (인트로)</span>
            </button>
          </div>
          <p>
            학생은 선생님이 보여 준 <strong>팀 QR</strong>로 바로 입장해요.
          </p>
        </div>
      </section>

      <div className="world-hint" aria-hidden="true">
        <span>함께 나아가는 길 끝에서</span>
        <strong>비밀 보스가 기다리고 있어요</strong>
      </div>

      {introOpen && (
        <IntroStorybookModal isOpen={introOpen} onClose={() => setIntroOpen(false)} />
      )}
    </main>
  );
}

export default App;
