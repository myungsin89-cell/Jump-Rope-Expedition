import { BOSS_OPTIONS, fieldAttributes as errorAttributes } from './model';
import type { Preparation, FieldErrors } from './model';
import { FieldError } from './PreparationUI';

export default function SeasonSettings({
  plan,
  errors,
  onChange,
  selectedIndex = 0,
  onSelect = () => {},
  lockOrder = false,
  minSeasonCount = 1,
}: {
  plan: Preparation;
  errors: FieldErrors;
  onChange: (plan: Preparation) => void;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  lockOrder?: boolean;
  minSeasonCount?: number;
}) {
  const update = onChange;
  const updateSeason = (
    index: number,
    field: 'bossId' | 'startDate' | 'endDate',
    value: string,
  ) => {
    update({
      ...plan,
      seasonsConfirmed: false,
      seasons: plan.seasons.map((season, at) =>
        at === index ? { ...season, [field]: value } : season,
      ),
    });
  };
  const reorderSeason = (index: number, direction: number) => {
    const seasons = [...plan.seasons];
    [seasons[index], seasons[index + direction]] = [
      seasons[index + direction],
      seasons[index],
    ];
    update({ ...plan, seasonsConfirmed: false, seasons });
    onSelect(index + direction);
  };
  return (
    <div className="preparation-seasons">
      <div className="preparation-section-heading">
        <h2 id="season-settings-heading" tabIndex={-1}>
          이번 시즌만 준비하면 돼요
        </h2>
        <span className="preparation-label">최대 5시즌</span>
      </div>
      <p className="preparation-hint">
        처음에는 시즌 1로 시작해요. 다음 시즌은 필요할 때 추가하거나 준비해 주세요. 미리
        계획한 시즌이 비어 있어도 준비된 시즌의 기록판은 열려요.
      </p>
      <nav className="game-season-tabs" aria-label="설정할 시즌">
        {plan.seasons.slice(0, plan.seasonCount).map((_, index) => (
          <button
            type="button"
            key={index}
            aria-pressed={selectedIndex === index}
            onClick={() => onSelect(index)}
          >
            시즌 {index + 1}
          </button>
        ))}
        {plan.seasonCount < 5 && (
          <button
            type="button"
            onClick={() => {
              update({ ...plan, seasonCount: plan.seasonCount + 1 });
              onSelect(plan.seasonCount);
            }}
          >
            + 시즌 추가
          </button>
        )}
      </nav>
      <details className="game-season-plan">
        <summary>전체 시즌 수 미리 정하기 (선택)</summary>
        <fieldset className="preparation-season-count" id="season-count" tabIndex={-1}>
          <legend>총 몇 시즌을 계획하나요?</legend>
          <div>
            {[1, 2, 3, 4, 5].map((count) => (
              <label key={count}>
                <input
                  type="radio"
                  name="season-count"
                  value={count}
                  disabled={count < minSeasonCount}
                  checked={plan.seasonCount === count}
                  onChange={() => {
                    const seasons = Array.from(
                      { length: 5 },
                      (_, index) =>
                        plan.seasons[index] ?? {
                          bossId: '',
                          startDate: '',
                          endDate: '',
                        },
                    );
                    update({ ...plan, seasonCount: count, seasons });
                    onSelect(Math.min(selectedIndex, count - 1));
                  }}
                />
                <span>{count}시즌</span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="preparation-hint">
          계획만 정해도 돼요. 모든 시즌의 보스와 날짜를 한꺼번에 입력할 필요는 없어요.
        </p>
      </details>
      {plan.seasons.slice(0, plan.seasonCount).map((season, index) =>
        index !== selectedIndex ? null : (
          <fieldset key={index} className="preparation-season-fieldset">
            <legend>시즌 {index + 1}</legend>
            <div className="preparation-season-order">
              <button
                type="button"
                aria-label={`시즌 ${index + 1} 위로`}
                disabled={index === 0 || lockOrder}
                onClick={() => reorderSeason(index, -1)}
              >
                위로
              </button>
              <button
                type="button"
                aria-label={`시즌 ${index + 1} 아래로`}
                disabled={index === plan.seasonCount - 1 || lockOrder}
                onClick={() => reorderSeason(index, 1)}
              >
                아래로
              </button>
            </div>
            <label htmlFor={`boss-${index}`}>이번 시즌의 비밀 보스</label>
            <select
              id={`boss-${index}`}
              value={season.bossId}
              onChange={(event) => updateSeason(index, 'bossId', event.target.value)}
              {...errorAttributes(`boss-${index}`, errors)}
            >
              <option value="">보스를 선택해 주세요</option>
              {BOSS_OPTIONS.map((boss) => {
                const used = plan.seasons
                  .slice(0, plan.seasonCount)
                  .some((other, at) => at !== index && other.bossId === boss.id);
                return (
                  <option key={boss.id} value={boss.id} disabled={used}>
                    {boss.name}
                    {used ? ' (다른 시즌에 선택됨)' : ''}
                  </option>
                );
              })}
            </select>
            <FieldError id={`boss-${index}`} errors={errors} />
            <div className="preparation-dates">
              <div>
                <label htmlFor={`start-${index}`}>시작일</label>
                <input
                  type="date"
                  id={`start-${index}`}
                  value={season.startDate}
                  onChange={(event) =>
                    updateSeason(index, 'startDate', event.target.value)
                  }
                  {...errorAttributes(`start-${index}`, errors)}
                />
                <FieldError id={`start-${index}`} errors={errors} />
              </div>
              <div>
                <label htmlFor={`end-${index}`}>종료 예정일</label>
                <input
                  type="date"
                  id={`end-${index}`}
                  value={season.endDate}
                  min={season.startDate || undefined}
                  onChange={(event) => updateSeason(index, 'endDate', event.target.value)}
                  {...errorAttributes(`end-${index}`, errors)}
                />
                <FieldError id={`end-${index}`} errors={errors} />
              </div>
            </div>
          </fieldset>
        ),
      )}
      <div className="preparation-note">
        <h2>수업의 속도에 맞춰 진행해요</h2>
        <p>
          경기 시간과 총 경기 수는 정하지 않아요. 종료 예정일에도 자동으로 끝나지 않고,
          선생님이 시즌 종료 버튼으로 마무리해요.
        </p>
      </div>
    </div>
  );
}
