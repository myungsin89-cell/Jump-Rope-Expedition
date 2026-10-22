import { useEffect, useRef, useState } from 'react';
import { readPreparations } from '../preparation/model';
import { parseStudentBoard, studentBoardData } from '../../shared/domain/studentBoard';
import type {
  StudentBoardData,
  StudentBoardMember,
  StudentHeroRevealEvent,
} from '../../shared/domain/studentBoard';
import UnitCard from '../card-ui/UnitCard';
import HeroCard from '../card-ui/HeroCard';
import { HEROES_CATALOG, UNITS_CATALOG } from '../card-ui/catalog';
import { readHeroes } from '../heroes/model';
import { readMedals } from '../medals/model';
import { readPracticeStore } from '../matches/practiceModel';
import { readEconomy } from '../economy/model';
import type { EconomyItemId, EconomyUnitId } from '../economy/model';
import MedalIcon from '../medals/MedalIcon';
import { purchaseStudentItem, revealStudentHero } from './studentBoardClient';
import forest from '../../../assets/illustrations/title-screen-cover-v1.png';
import './student.css';

function MemberMedals({ member }: { member: StudentBoardMember }) {
  if (!member.medals.length) return null;
  return (
    <span
      className="student-name-medals"
      aria-label={`받은 훈장 ${member.medals.length}개`}
    >
      {member.medals.slice(0, 3).map((medal, index) => (
        <span title={medal.name} key={`${medal.awardedAt}-${medal.name}-${index}`}>
          <MedalIcon
            decorative
            medal={{
              id: `${medal.name}-${index}`,
              name: medal.name,
              description: medal.description,
              symbol: medal.symbol,
              image: '',
              color: medal.color,
              active: true,
            }}
          />
        </span>
      ))}
      {member.medals.length > 3 && <b>+{member.medals.length - 3}</b>}
    </span>
  );
}

export default function StudentBoard({ route }: { route: string }) {
  const [panel, setPanel] = useState<'teams' | 'shop' | 'forces'>('teams');
  const [shopView, setShopView] = useState<'menu' | 'units' | 'hint'>('menu');
  const [data, setData] = useState<StudentBoardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [activeReveal, setActiveReveal] = useState<StudentHeroRevealEvent | null>(null);
  const [unlockedRevealId, setUnlockedRevealId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<{
    teamName: string;
    member: StudentBoardMember;
  } | null>(null);
  const [revealingSlot, setRevealingSlot] = useState<number | null>(null);
  const [purchasingItem, setPurchasingItem] = useState<EconomyItemId | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const preview = route.startsWith('/student-preview/');
  const previewParts = route.split('/');
  const teamToken = preview ? '' : route.slice('/team/'.length);
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
            studentBoardData(plan, Number(index), new Date().toISOString(), {
              heroes: readHeroes(plan.id),
              medals: readMedals(plan.id),
              practice: readPracticeStore(plan.id),
              economy: readEconomy(plan.id),
            }),
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
    if (preview) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') setRefresh((value) => value + 1);
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [preview]);
  const revealEventId = data?.heroReveal?.eventId;
  const revealSlot = data?.heroReveal?.slot;
  const revealHeroId = data?.heroReveal?.heroId;
  const revealStartedAt = data?.heroReveal?.startedAt;
  useEffect(() => {
    if (
      preview ||
      !revealEventId ||
      revealSlot === undefined ||
      !revealHeroId ||
      !revealStartedAt
    )
      return;
    const reveal: StudentHeroRevealEvent = {
      eventId: revealEventId,
      slot: revealSlot,
      heroId: revealHeroId,
      startedAt: revealStartedAt,
    };
    const seenKey = `jre.student-reveal-seen.${route.slice('/team/'.length)}`;
    if (localStorage.getItem(seenKey) === reveal.eventId) {
      queueMicrotask(() => setUnlockedRevealId(reveal.eventId));
      return;
    }
    const delay = Date.parse(reveal.startedAt) - Date.now();
    if (delay < -12_000) {
      localStorage.setItem(seenKey, reveal.eventId);
      queueMicrotask(() => setUnlockedRevealId(reveal.eventId));
      return;
    }
    let clearTimer = 0;
    const startTimer = window.setTimeout(
      () => {
        localStorage.setItem(seenKey, reveal.eventId);
        setUnlockedRevealId(reveal.eventId);
        setActiveReveal(reveal);
        clearTimer = window.setTimeout(() => setActiveReveal(null), 8_000);
      },
      Math.max(0, delay),
    );
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(clearTimer);
    };
  }, [preview, revealEventId, revealHeroId, revealSlot, revealStartedAt, route]);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [data]);
  const openSealedHero = async (slot: number) => {
    if (preview) {
      setActionError('미리보기에서는 개봉할 수 없어요. 실제 원정대 QR로 들어가 주세요.');
      return;
    }
    setRevealingSlot(slot);
    setActionError('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      await revealStudentHero(teamToken, slot, controller.signal);
      setRefresh((value) => value + 1);
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : '영웅 카드를 개봉하지 못했어요.',
      );
    } finally {
      window.clearTimeout(timeout);
      setRevealingSlot(null);
    }
  };
  const buyItem = async (itemId: EconomyItemId, itemName: string, price: number) => {
    if (preview) {
      setActionError('미리보기에서는 구매할 수 없어요. 실제 원정대 QR로 들어가 주세요.');
      return;
    }
    if (!window.confirm(`${itemName}을(를) ${price}P에 구매할까요?`)) return;
    setPurchasingItem(itemId);
    setActionError('');
    setActionNotice('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      await purchaseStudentItem(
        teamToken,
        itemId,
        crypto.randomUUID(),
        controller.signal,
      );
      setActionNotice(`${itemName} 구매 완료! 원정대 병력에 반영했어요.`);
      setRefresh((value) => value + 1);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : '구매하지 못했어요.');
    } finally {
      window.clearTimeout(timeout);
      setPurchasingItem(null);
    }
  };
  const sealedHeroes = data?.heroes.filter((hero) => !hero.revealed).length ?? 0;
  const tabs = [
    { id: 'teams', name: '원정대 현황' },
    { id: 'shop', name: '상점' },
    { id: 'forces', name: '원정대 병력' },
  ] as const;
  return (
    <main className="student-board">
      {activeReveal && (
        <section className="student-live-reveal" aria-live="assertive">
          <div className="student-live-reveal-glow" aria-hidden="true" />
          <p>우리 원정대의 새 영웅</p>
          {(() => {
            const hero = HEROES_CATALOG.find((item) => item.id === activeReveal.heroId);
            return hero ? <HeroCard hero={hero} state="revealed" /> : null;
          })()}
          <strong>새로운 영웅이 합류했습니다!</strong>
        </section>
      )}
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
                  onClick={() => {
                    setPanel(tab.id);
                    if (tab.id === 'shop') setShopView('menu');
                  }}
                >
                  {tab.name}
                  {tab.id === 'forces' && sealedHeroes > 0 && (
                    <span
                      className="student-alert-badge"
                      aria-label={`미개봉 영웅 ${sealedHeroes}장`}
                    >
                      {sealedHeroes}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            {panel === 'teams' ? (
              <section className="student-all-teams">
                <div className="student-section-heading">
                  <h2>
                    원정대 현황 <small>{data.teams.length}팀</small>
                  </h2>
                  <button
                    onClick={() => {
                      setLoading(true);
                      setRefresh((value) => value + 1);
                    }}
                  >
                    현황 새로고침
                  </button>
                </div>
                <div className="student-team-grid">
                  {data.teams.map((team) => {
                    const captain = team.members.find((member) => member.captain);
                    const members = team.members.filter((member) => !member.captain);
                    return (
                      <section
                        key={team.teamIndex}
                        className={`student-team-card${team.teamIndex === data.teamIndex ? ' is-own-team' : ''}`}
                      >
                        <header>
                          <h3>{team.name}</h3>
                          {team.teamIndex === data.teamIndex && <span>우리 원정대</span>}
                        </header>
                        {captain && (
                          <div
                            className={`student-captain-slot${captain.jumper ? ' is-jumper' : ''}`}
                          >
                            <span className="student-captain-label">원정대장</span>
                            <button
                              type="button"
                              aria-label={`${captain.number}번 ${captain.name} 원정대장 기록 보기`}
                              onClick={() =>
                                setSelectedMember({
                                  teamName: team.name,
                                  member: captain,
                                })
                              }
                            >
                              <span>{String(captain.number).padStart(2, '0')}</span>
                              <strong className="student-member-name">
                                {captain.name}
                              </strong>
                              <MemberMedals member={captain} />
                              {(captain.medals.length > 0 ||
                                captain.growth.length > 0) && <small>기록 보기</small>}
                            </button>
                          </div>
                        )}
                        <ol>
                          {members.map((member) => (
                            <li
                              key={member.number}
                              className={member.jumper ? 'is-jumper' : ''}
                            >
                              <button
                                type="button"
                                aria-label={`${member.number}번 ${member.name}${member.jumper ? ' 도전점퍼' : ''} 기록 보기`}
                                onClick={() =>
                                  setSelectedMember({ teamName: team.name, member })
                                }
                              >
                                <span>{String(member.number).padStart(2, '0')}</span>
                                <strong className="student-member-name">
                                  {member.name}
                                </strong>
                                <MemberMedals member={member} />
                                {(member.medals.length > 0 ||
                                  member.growth.length > 0) && <small>기록 보기</small>}
                              </button>
                            </li>
                          ))}
                        </ol>
                      </section>
                    );
                  })}
                </div>
                <p className="student-help">
                  학생 이름을 누르면 받은 훈장과 성장 기록을 볼 수 있어요.
                </p>
                <p className="student-help">
                  {preview ? '미리보기 생성' : '명단 게시'}:{' '}
                  {new Date(data.publishedAt).toLocaleString('ko-KR')}
                </p>
              </section>
            ) : panel === 'shop' ? (
              <section aria-label="원정대 상점">
                <div className="student-section-heading">
                  <h2>상점</h2>
                </div>
                <div className="student-wallet" aria-label="우리 원정대 보유 포인트">
                  <span>우리 원정대 보유 포인트</span>
                  <strong>
                    {data.economy?.balance ?? 0}
                    <b>P</b>
                  </strong>
                  <small>구매하면 원정대 공용 포인트에서 차감됩니다.</small>
                </div>
                {actionNotice && (
                  <p className="student-action-notice" role="status">
                    {actionNotice}
                  </p>
                )}
                {actionError && (
                  <p className="student-action-error" role="alert">
                    {actionError}
                  </p>
                )}
                {shopView === 'menu' ? (
                  <div className="student-shop-menu">
                    <button type="button" onClick={() => setShopView('units')}>
                      <span aria-hidden="true">⚔</span>
                      <strong>병력 구매하기</strong>
                      <small>30P · 전투에 함께할 병력 카드를 골라요</small>
                    </button>
                    <button type="button" onClick={() => setShopView('hint')}>
                      <span aria-hidden="true">?</span>
                      <strong>힌트 구매하기</strong>
                      <small>100P · 이번 시즌 보스의 비밀을 확인해요</small>
                    </button>
                  </div>
                ) : shopView === 'units' ? (
                  <>
                    <div className="student-shop-subheading">
                      <button type="button" onClick={() => setShopView('menu')}>
                        ← 상점으로
                      </button>
                      <div>
                        <h3>병력 카드 구매</h3>
                        <p>원하는 병력을 골라 구매하세요. 한 장에 30P예요.</p>
                      </div>
                    </div>
                    <div className="student-card-grid student-shop-grid">
                      {UNITS_CATALOG.map((unit) => (
                        <div className="student-shop-item" key={unit.id}>
                          <UnitCard unit={unit} />
                          <button
                            type="button"
                            disabled={
                              preview ||
                              !data.economy ||
                              purchasingItem !== null ||
                              data.economy.balance < unit.price
                            }
                            onClick={() =>
                              void buyItem(
                                unit.id as EconomyItemId,
                                unit.name,
                                unit.price,
                              )
                            }
                          >
                            {preview
                              ? '실제 QR에서 구매'
                              : data.economy && data.economy.balance < unit.price
                                ? '포인트 부족'
                                : purchasingItem === unit.id
                                  ? '구매 중…'
                                  : `${unit.price}P 구매`}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="student-shop-subheading">
                      <button type="button" onClick={() => setShopView('menu')}>
                        ← 상점으로
                      </button>
                      <div>
                        <h3>비밀 보스 힌트</h3>
                        <p>한 시즌에 한 번, 구매한 원정대에게만 공개돼요.</p>
                      </div>
                    </div>
                    <article className="student-hint-card student-hint-purchase">
                      <span aria-hidden="true">?</span>
                      <strong>이번 시즌 비밀 힌트</strong>
                      <p>
                        구매 전에는 내용이 가려져 있어요. 구매하면 이 카드에서 바로 확인할
                        수 있어요.
                      </p>
                      {data.economy?.hintPurchased && data.economy.hint && (
                        <p className="student-hint-answer">{data.economy.hint}</p>
                      )}
                      <button
                        type="button"
                        disabled={
                          preview ||
                          !data.economy ||
                          data.economy.hintPurchased ||
                          purchasingItem !== null ||
                          data.economy.balance < 100
                        }
                        onClick={() => void buyItem('BOSS_HINT', '비밀 보스 힌트', 100)}
                      >
                        {data.economy?.hintPurchased
                          ? '구매 완료 · 힌트 공개됨'
                          : preview
                            ? '실제 QR에서 구매'
                            : data.economy && data.economy.balance < 100
                              ? '포인트 부족'
                              : purchasingItem === 'BOSS_HINT'
                                ? '구매 중…'
                                : '100P로 힌트 구매'}
                      </button>
                    </article>
                  </>
                )}
              </section>
            ) : (
              <section aria-label="우리 원정대 병력과 영웅">
                <div className="student-section-heading">
                  <h2>원정대 병력</h2>
                  <span>{preview ? '미리보기' : '자동 동기화 중'}</span>
                </div>
                <p className="student-help">
                  상점에서 구매한 병력과 우리 원정대가 획득한 영웅만 이곳에 모여요.
                </p>
                {data.economy &&
                Object.values(data.economy.inventory).some((count) => count > 0) ? (
                  <div className="student-card-grid student-owned-units">
                    {UNITS_CATALOG.flatMap((unit) => {
                      const count =
                        data.economy?.inventory[unit.id as EconomyUnitId] ?? 0;
                      return count > 0
                        ? [
                            <div className="student-owned-unit" key={unit.id}>
                              <UnitCard unit={unit} />
                              <strong aria-label={`${unit.name} ${count}장`}>
                                × {count}
                              </strong>
                            </div>,
                          ]
                        : [];
                    })}
                  </div>
                ) : (
                  <div className="student-empty-forces">
                    아직 구매한 병력이 없어요. 상점에서 병력 카드를 준비해 보세요.
                  </div>
                )}
                <div className="student-section-heading student-owned-heading">
                  <h2>
                    받은 영웅 <small>{data.heroes.length}장</small>
                  </h2>
                  {sealedHeroes > 0 && <span>미개봉 {sealedHeroes}장</span>}
                </div>
                {actionError && (
                  <p className="student-action-error" role="alert">
                    {actionError}
                  </p>
                )}
                {data.heroes.length ? (
                  <div className="student-card-grid student-owned-heroes">
                    {data.heroes.map((slot) => {
                      const waitingForScheduledReveal =
                        !preview &&
                        data.heroReveal?.slot === slot.slot &&
                        unlockedRevealId !== data.heroReveal.eventId;
                      const hero =
                        slot.heroId && !waitingForScheduledReveal
                          ? HEROES_CATALOG.find((item) => item.id === slot.heroId)
                          : null;
                      return hero ? (
                        <HeroCard key={slot.slot} hero={hero} state="revealed" />
                      ) : (
                        <button
                          type="button"
                          className="student-sealed-hero"
                          key={slot.slot}
                          disabled={revealingSlot !== null || waitingForScheduledReveal}
                          onClick={() => void openSealedHero(slot.slot)}
                        >
                          <span>?</span>
                          <strong>미개봉 영웅 카드</strong>
                          <small>
                            {revealingSlot === slot.slot || waitingForScheduledReveal
                              ? '개봉 준비 중…'
                              : '눌러서 함께 개봉해요'}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="student-empty-heroes">
                    아직 획득한 영웅이 없어요. 원정대의 도전을 이어가 보세요.
                  </p>
                )}
              </section>
            )}
            {selectedMember && (
              <div className="student-member-backdrop" role="presentation">
                <section
                  className="student-member-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="student-member-title"
                >
                  <button
                    type="button"
                    className="student-member-close"
                    aria-label="학생 기록 닫기"
                    onClick={() => setSelectedMember(null)}
                  >
                    ×
                  </button>
                  <p>{selectedMember.teamName}</p>
                  <h2 id="student-member-title">{selectedMember.member.name}</h2>
                  <section>
                    <h3>받은 훈장 · {selectedMember.member.medals.length}개</h3>
                    {selectedMember.member.medals.length ? (
                      <ul className="student-member-medals">
                        {selectedMember.member.medals.map((medal, index) => (
                          <li key={`${medal.awardedAt}-${medal.name}-${index}`}>
                            <MedalIcon
                              medal={{
                                id: `${medal.name}-${index}`,
                                name: medal.name,
                                description: medal.description,
                                symbol: medal.symbol,
                                image: '',
                                color: medal.color,
                                active: true,
                              }}
                            />
                            <span>
                              <strong>{medal.name}</strong>
                              <small>
                                {medal.description || '멋진 도전을 인정받았어요.'}
                              </small>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>아직 받은 훈장이 없어요.</p>
                    )}
                  </section>
                  <section>
                    <h3>도전점퍼 성장 기록 · {selectedMember.member.growth.length}건</h3>
                    {selectedMember.member.growth.length ? (
                      <ul className="student-member-growth">
                        {selectedMember.member.growth.map((record, index) => (
                          <li key={`${record.recordedAt}-${index}`}>
                            <span>
                              시즌 {record.seasonNumber} ·{' '}
                              {new Date(record.recordedAt).toLocaleDateString('ko-KR')}
                            </span>
                            <strong>{record.count}개</strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>아직 기록된 도전점퍼 성장이 없어요.</p>
                    )}
                  </section>
                </section>
              </div>
            )}
          </>
        )
      )}
    </main>
  );
}
