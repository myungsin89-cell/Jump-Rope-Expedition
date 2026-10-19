import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import scene1Img from '../../assets/illustrations/intro/intro-scene-1-expedition-teams.png';
import scene2Img from '../../assets/illustrations/intro/intro-scene-2-secret-bosses-seasons.png';
import scene3Img from '../../assets/illustrations/intro/intro-scene-3-jump-rope-hints.png';
import scene4Img from '../../assets/illustrations/intro/intro-scene-4-troops-and-heroes.png';
import scene5Img from '../../assets/illustrations/intro/intro-scene-5-final-battle-cooperation.png';
import bgmUrl from '../../assets/audio/bgm/bgm_title_forest_departure_loop.wav';
import tapUrl from '../../assets/audio/sfx/ui/sfx_ui_tap.wav';
import pageUrl from '../../assets/audio/sfx/ui/sfx_ui_confirm.wav';
import openUrl from '../../assets/audio/stingers/st_title_start.wav';
import finishUrl from '../../assets/audio/stingers/st_class_finish.wav';
import './IntroStorybook.css';

interface ScrollItem {
  icon?: string;
  label?: string;
  text: string;
}

interface ScrollRules {
  title: string;
  items: ScrollItem[];
}

interface IntroScene {
  id: number;
  chapter: string;
  image: string;
  imageAlt: string;
  /** 이야기꾼이 읽어 주는 자막(한 줄씩 넘어감) */
  lines: string[];
  /** 규칙 양피지가 등장하는 시점 (앞선 자막 줄 수). 없으면 양피지 없음 */
  scrollAfter?: number;
  scroll?: ScrollRules;
  /** 같은 장면에서 한 번 더 나오는 두 번째 양피지 */
  extraScrollAfter?: number;
  extraScroll?: ScrollRules;
}

const INTRO_SCENES: IntroScene[] = [
  {
    id: 1,
    chapter: '첫 번째 이야기 · 숲의 부름',
    image: scene1Img,
    imageAlt: '아침 안개 낀 신비로운 숲 입구에서 출발 준비를 하는 세 원정대 탐험가들',
    lines: [
      '옛날 옛적, 안개 너머 아주 깊은 곳에 마법의 숲이 있었단다.',
      '그 숲이 다시 깨어나던 어느 아침,',
      '세 개의 원정대 팀이 숲길 앞에 나란히 섰지.',
      '3개의 원정대 팀이 숲속 모험을 시작합니다!',
    ],
    scrollAfter: 4,
    scroll: {
      title: '원정대의 약속',
      items: [
        { icon: '🌿', text: '우리 반은 3개의 원정대 팀으로 모험을 떠나요.' },
        { icon: '🤝', text: '팀끼리 겨루지 않아요. 함께 숲을 구하는 한 편이에요.' },
      ],
    },
  },
  {
    id: 2,
    chapter: '두 번째 이야기 · 잠든 비밀 보스들',
    image: scene2Img,
    imageAlt: '신비로운 밤하늘 별자리와 고대 제단에 드러난 5대 시즌 보스의 실루엣',
    lines: [
      '그런데 말이다, 숲속 깊은 곳에는 비밀이 하나 있었단다.',
      '바위 골렘, 바람 익룡, 가시 덩굴 트렌트, 얼음 설인, 그리고 불꽃의 드래곤까지…',
      '수많은 비밀 보스들이 숲 곳곳에서 잠들어 있었지.',
      '한 보스를 잠재우면 새로운 시즌이 열리고, 또 다른 비밀 보스를 찾아 원정은 계속된단다.',
    ],
    scrollAfter: 4,
    scroll: {
      title: '시즌의 규칙',
      items: [
        { icon: '🌙', text: '시즌마다 비밀 보스가 한 명씩 나타나요.' },
        { icon: '⭐', text: '보스를 잠재우면 그 시즌이 끝나요.' },
        { icon: '🗝️', text: '다음 시즌에는 새로운 비밀 보스를 만나요.' },
        { icon: '📜', text: '한 원정대는 1~5개의 시즌을 모험해요.' },
      ],
    },
  },
  {
    id: 3,
    chapter: '세 번째 이야기 · 함께 넘는 8자 줄넘기',
    image: scene3Img,
    imageAlt: '두 친구가 긴 줄을 돌리고 팀원들이 차례로 달려 들어가 8자를 그리며 함께 넘는 8자 줄넘기',
    lines: [
      '그럼 원정대의 힘은 어디에서 나올까?',
      '바로 여러분이 다 함께 넘는 8자 줄넘기란다!',
      '두 친구가 긴 줄을 돌리면, 한 명씩 달려 들어가 8자를 그리며 힘차게 넘는 거야.',
      '경기가 끝나면 팀마다 반짝이는 팀 포인트(P)를 받는단다.',
      '모은 포인트는 병력을 부르거나, 비밀 힌트를 여는 데 쓸 수 있지.',
    ],
    scrollAfter: 4,
    scroll: {
      title: '팀 포인트(P) 얻는 법',
      items: [
        { icon: '🪢', label: '경기 참가', text: '8자 줄넘기 경기에 참가하면 세 팀 모두 30P' },
        { icon: '🏆', label: '순위 보너스', text: '1위 +30P · 2위 +20P · 3위 +10P' },
        { icon: '🌱', label: '성장 보너스', text: '지난 경기보다 기록이 오르면 +20P' },
        { icon: '🎖️', label: '메달', text: '선생님이 주신 메달 1개마다 +10P' },
      ],
    },
    extraScrollAfter: 5,
    extraScroll: {
      title: '포인트 쓰는 곳',
      items: [
        { icon: '⚔️', label: '병력 구매', text: '병력 한 명에 30P (몇 명이든 살 수 있어요)' },
        { icon: '🔍', label: '비밀 힌트', text: '100P · 시즌마다 한 번만 살 수 있어요' },
        { icon: '🔄', label: '새 시즌', text: '시즌이 바뀌면 포인트는 0P부터 다시 시작해요' },
      ],
    },
  },
  {
    id: 4,
    chapter: '네 번째 이야기 · 용감한 병력과 영웅',
    image: scene4Img,
    imageAlt: '도열한 4대 정예 병력과 상공에 떠오른 황금빛 영웅 카드 소환진',
    lines: [
      '모은 포인트로는 용감한 병력을 한 명에 30P씩 불러 모을 수 있단다.',
      '그리고 아주 가끔, 전설의 영웅이 나타나 도와주기도 하지.',
      '쉿, 이건 비밀인데… 어떤 보스냐에 따라 유난히 큰 힘을 발휘하는 강한 병사가 있단다!',
      '하지만 공격만 해선 안 돼. 보스의 거센 공격을 막아낼 방어 병사도 꼭 함께 있어야 하지.',
      '어떤 병사를 모아야 할지 궁금하다면, 비밀 힌트 두루마리를 열어보렴!',
    ],
    scrollAfter: 2,
    scroll: {
      title: '4대 병력과 영웅 카드',
      items: [
        { icon: '🏹', label: '도토리 탐험가', text: '멀리서 활을 쏘는 날쌘 원거리 공격수' },
        { icon: '🔨', label: '숲속 해머단', text: '통나무 망치를 든 묵직한 근접 공격수' },
        { icon: '🛡️', label: '잎사귀 수호자', text: '넓은 잎사귀 방패로 물리 공격을 막아요' },
        { icon: '✨', label: '별빛 요정', text: '신비로운 별빛 보호막으로 마법 공격을 막아요' },
        { icon: '🃏', label: '영웅 카드', text: '소환하면 원정대 전체에 강력한 축복이 내려요' },
      ],
    },
    extraScrollAfter: 5,
    extraScroll: {
      title: '원정대장의 전략 메모',
      items: [
        { icon: '⚔️', label: '공격 상성', text: '어떤 보스냐에 따라 유난히 큰 힘을 발휘하는 병사가 있어요!' },
        { icon: '🛡️', label: '방어 병사 필수', text: '공격뿐 아니라 보스의 공격을 막아낼 방패와 보호막도 꼭 챙겨야 해요!' },
        { icon: '📜', label: '비밀 힌트(100P)', text: '보스의 주 공격 유형과 알맞은 방어 병력을 미리 엿볼 수 있어요!' },
      ],
    },
  },
  {
    id: 5,
    chapter: '마지막 이야기 · 함께 잠재우는 날',
    image: scene5Img,
    imageAlt: '세 원정대 팀이 협동하여 거대한 보스를 온화하게 정화하는 감동적인 최종 대전',
    lines: [
      '마침내, 비밀 보스가 모습을 드러내는 날이 왔단다.',
      '걱정하지 마렴. 보스는 못된 괴물이 아니라, 잠이 덜 깬 숲의 친구거든.',
      '세 팀은 서로 겨루지 않아. 힘을 합쳐 다 함께 보스를 잠재운단다.',
      '그러면 숲에는 따뜻한 평화가 찾아오고, 다음 시즌의 문이 열리지.',
      '자, 이제 너희의 이야기를 시작할 시간이다!',
    ],
    scrollAfter: 4,
    scroll: {
      title: '최종 대전',
      items: [
        { icon: '⚔️', text: '세 팀의 병력과 점수가 하나로 모여요.' },
        { icon: '🌸', text: '함께 보스를 잠재우면 모두가 승리해요.' },
        { icon: '🚪', text: '승리 뒤에는 다음 시즌의 문이 열려요.' },
      ],
    },
  },
];

type Beat =
  | { kind: 'line'; scene: number; text: string }
  | { kind: 'scroll'; scene: number; rules: ScrollRules };

function buildBeats(): Beat[] {
  const beats: Beat[] = [];
  INTRO_SCENES.forEach((scene, s) => {
    const scrolls: { after: number; rules: ScrollRules }[] = [];
    if (scene.scroll && scene.scrollAfter !== undefined) {
      scrolls.push({ after: scene.scrollAfter, rules: scene.scroll });
    }
    if (scene.extraScroll && scene.extraScrollAfter !== undefined) {
      scrolls.push({ after: scene.extraScrollAfter, rules: scene.extraScroll });
    }
    scene.lines.forEach((text, i) => {
      scrolls
        .filter((sc) => sc.after === i)
        .forEach((sc) => beats.push({ kind: 'scroll', scene: s, rules: sc.rules }));
      beats.push({ kind: 'line', scene: s, text });
    });
    scrolls
      .filter((sc) => sc.after >= scene.lines.length)
      .forEach((sc) => beats.push({ kind: 'scroll', scene: s, rules: sc.rules }));
  });
  return beats;
}

interface IntroStorybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface PageTurn {
  from: number;
  to: number;
  key: number;
}

const TURN_MS = 1000;
const TYPE_MS = 44;

function playOnce(src: string, volume: number) {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play()?.catch?.(() => {});
  } catch {
    /* 오디오 재생 실패는 무시 */
  }
}

export default function IntroStorybookModal({
  isOpen,
  onClose,
  onComplete,
}: IntroStorybookModalProps) {
  const beats = useMemo(buildBeats, []);
  const [beatIdx, setBeatIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [turn, setTurn] = useState<PageTurn | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const turnTimer = useRef<number | null>(null);
  const turnKey = useRef(0);

  const beat = beats[beatIdx];
  const sceneIdx = beat.scene;
  const scene = INTRO_SCENES[sceneIdx];
  const text = beat.kind === 'line' ? beat.text : '';
  const typing = text.length > 0 && count < text.length;
  const isLast = beatIdx === beats.length - 1;

  // 자막 타자기 효과
  useEffect(() => {
    setCount(0);
    if (!text) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setCount(text.length);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          window.clearInterval(timer);
          return c;
        }
        return c + 1;
      });
    }, TYPE_MS);
    return () => window.clearInterval(timer);
  }, [beatIdx, text]);

  // 전체화면 + 배경음악 (열릴 때 시작, 닫힐 때 정리)
  useEffect(() => {
    if (!isOpen) return undefined;

    rootRef.current?.requestFullscreen?.().catch(() => {});
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);

    playOnce(openUrl, 0.5);
    const bgm = new Audio(bgmUrl);
    bgm.loop = true;
    bgm.volume = 0;
    bgmRef.current = bgm;

    const startBgm = () => {
      if (bgmRef.current && bgmRef.current.paused) {
        bgmRef.current.play()?.catch?.(() => {});
      }
    };
    bgm.play()?.catch?.(() => {});

    // 브라우저 정책으로 차단된 경우 첫 클릭/키 입력 시 즉시 재생
    const onUserInteraction = () => {
      startBgm();
      if (!document.fullscreenElement) {
        rootRef.current?.requestFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', onUserInteraction, { once: true });
    window.addEventListener('keydown', onUserInteraction, { once: true });

    const fadeIn = window.setInterval(() => {
      if (bgm.volume >= 0.34) {
        window.clearInterval(fadeIn);
        return;
      }
      bgm.volume = Math.min(0.35, bgm.volume + 0.02);
    }, 120);
    fadeRef.current = fadeIn;

    return () => {
      window.removeEventListener('pointerdown', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      document.removeEventListener('fullscreenchange', onFsChange);
      window.clearInterval(fadeIn);
      bgm.pause();
      bgmRef.current = null;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      if (turnTimer.current) window.clearTimeout(turnTimer.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = muted;
  }, [muted]);

  const goTo = useCallback(
    (next: number) => {
      const target = Math.max(0, Math.min(beats.length - 1, next));
      if (target === beatIdx) return;
      const fromScene = beats[beatIdx].scene;
      const toScene = beats[target].scene;
      if (fromScene !== toScene) {
        turnKey.current += 1;
        setTurn({ from: fromScene, to: toScene, key: turnKey.current });
        if (turnTimer.current) window.clearTimeout(turnTimer.current);
        turnTimer.current = window.setTimeout(() => setTurn(null), TURN_MS + 80);
        if (!muted) playOnce(pageUrl, 0.45);
      } else if (!muted) {
        playOnce(tapUrl, 0.22);
      }
      setBeatIdx(target);
    },
    [beatIdx, beats, muted],
  );

  const advance = useCallback(() => {
    if (turn) return;
    if (typing) {
      setCount(text.length);
      return;
    }
    if (isLast) {
      if (!muted) playOnce(finishUrl, 0.6);
      (onComplete ?? onClose)();
      return;
    }
    goTo(beatIdx + 1);
  }, [turn, typing, text.length, isLast, muted, onComplete, onClose, goTo, beatIdx]);

  const back = useCallback(() => {
    if (turn) return;
    goTo(beatIdx - 1);
  }, [turn, goTo, beatIdx]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advance();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, advance, back, onClose]);

  if (!isOpen) return null;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  // 페이지 넘김 중 아래에 깔리는 장면 / 넘어가는 장면 결정
  const baseScene = turn ? (turn.to > turn.from ? turn.to : turn.from) : sceneIdx;
  const overlayScene = turn ? (turn.to > turn.from ? turn.from : turn.to) : null;
  const overlayClass = turn ? (turn.to > turn.from ? 'sb-turn-out' : 'sb-turn-in') : '';
  const showScroll = beat.kind === 'scroll' && !turn;

  return (
    <div
      aria-label="줄넘기 원정대 이야기책"
      aria-modal="true"
      className="sb-root"
      ref={rootRef}
      role="dialog"
    >
      <div className={`sb-stage ${showScroll ? 'is-dim' : ''}`}>
        <img
          alt={INTRO_SCENES[baseScene].imageAlt}
          className={`sb-img sb-pan-${baseScene % 3}`}
          draggable={false}
          key={`base-${baseScene}`}
          src={INTRO_SCENES[baseScene].image}
        />
        {overlayScene !== null && turn && (
          <div className={`sb-page ${overlayClass}`} key={`turn-${turn.key}`}>
            <img
              alt=""
              className={`sb-img sb-pan-${overlayScene % 3}`}
              draggable={false}
              src={INTRO_SCENES[overlayScene].image}
            />
            <div className="sb-page-shade" />
          </div>
        )}
        <div className="sb-warm" aria-hidden="true" />
        <div className="sb-vignette" aria-hidden="true" />
        <div className="sb-grain" aria-hidden="true" />
      </div>

      <div className="sb-bar sb-bar-top" aria-hidden="true" />
      <div className="sb-bar sb-bar-bottom" aria-hidden="true" />

      {/* 장 제목 카드 */}
      <div className="sb-chapter" key={`chapter-${sceneIdx}`}>
        <span className="sb-chapter-orn" aria-hidden="true">❦</span>
        <span>{scene.chapter}</span>
      </div>

      {/* 클릭 영역: 왼쪽은 이전, 나머지는 다음 */}
      <button
        aria-label="이전 장면"
        className="sb-zone sb-zone-prev"
        disabled={beatIdx === 0}
        onClick={back}
        type="button"
      />
      <button
        aria-label={isLast ? '원정 시작하기' : '다음 이야기'}
        className="sb-zone sb-zone-next"
        onClick={advance}
        type="button"
      />

      {/* 자막 */}
      {beat.kind === 'line' && !turn && (
        <div className="sb-subtitle" key={`sub-${beatIdx}`}>
          <p aria-live="polite">
            <span>{text.slice(0, count)}</span>
            <span aria-hidden="true" className="sb-ghost">
              {text.slice(count)}
            </span>
          </p>
        </div>
      )}

      {/* 양피지 규칙 설명 */}
      {beat.kind === 'scroll' && !turn && (
        <div className="sb-scroll-wrap" key={`scroll-${beatIdx}`}>
          <section aria-label={beat.rules.title} className="sb-scroll">
            <span className="sb-rod sb-rod-top" aria-hidden="true" />
            <div className="sb-parchment">
              <h2>{beat.rules.title}</h2>
              <span className="sb-flourish" aria-hidden="true">❦ ❦ ❦</span>
              <ul>
                {beat.rules.items.map((item, i) => (
                  <li key={item.text} style={{ ['--i' as string]: i }}>
                    {item.icon && <span className="sb-seal" aria-hidden="true">{item.icon}</span>}
                    <span>
                      {item.label && <strong>{item.label}</strong>}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <span className="sb-rod sb-rod-bottom" aria-hidden="true" />
          </section>
        </div>
      )}

      {/* 하단 안내 */}
      <div className={`sb-hint ${typing ? 'is-hidden' : ''}`}>
        {isLast ? '▶ 눌러서 원정 떠나기' : '화면을 눌러 다음 이야기 ▸'}
      </div>

      {/* 상단 컨트롤 */}
      <div className="sb-controls">
        <div className="sb-progress" aria-hidden="true">
          {INTRO_SCENES.map((s, i) => (
            <span
              className={`sb-pip ${i === sceneIdx ? 'is-current' : ''} ${i < sceneIdx ? 'is-done' : ''}`}
              key={s.id}
            />
          ))}
        </div>
        <div className="sb-buttons">
          <button
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
            className="sb-ctl"
            onClick={() => setMuted((m) => !m)}
            type="button"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            aria-label={fullscreen ? '전체화면 해제' : '전체화면'}
            className="sb-ctl"
            onClick={toggleFullscreen}
            type="button"
          >
            {fullscreen ? '🗗' : '⛶'}
          </button>
          <button className="sb-ctl sb-skip" onClick={onClose} type="button">
            건너뛰기 ✕
          </button>
        </div>
      </div>

      <div className="sb-pageno" aria-hidden="true">
        — {sceneIdx + 1} —
      </div>
    </div>
  );
}
