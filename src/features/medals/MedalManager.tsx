import { useRef, useState } from 'react';
import OperationModal from '../expedition/OperationModal';
import MedalIcon from './MedalIcon';
import { medalSymbols, saveMedal } from './model';
import type { MedalDefinition, MedalStore, MedalSymbol } from './model';

const draft = (): MedalDefinition => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  symbol: 'star',
  image: '',
  active: true,
});
export default function MedalManager({
  store,
  onChange,
  onClose,
}: {
  store: MedalStore;
  onChange: (store: MedalStore) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(draft);
  const [baseline, setBaseline] = useState(editing);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRequest = useRef(0);
  const dirty = JSON.stringify(editing) !== JSON.stringify(baseline);
  const discard = () => !dirty || window.confirm('작성한 훈장을 저장하지 않고 닫을까요?');
  const close = () => {
    if (discard()) {
      fileRequest.current++;
      onClose();
    }
  };
  const choose = (medal: MedalDefinition) => {
    if (discard()) {
      fileRequest.current++;
      setUploading(false);
      setEditing(medal);
      setBaseline(medal);
      setError('');
    }
  };
  const commit = (medal: MedalDefinition, reset: boolean) => {
    try {
      const next = saveMedal(store.expeditionId, medal);
      onChange(next);
      if (!reset && editing.id === medal.id) {
        setEditing((value) => ({ ...value, active: medal.active }));
        setBaseline((value) => ({ ...value, active: medal.active }));
      }
      if (reset) {
        const blank = draft();
        setEditing(blank);
        setBaseline(blank);
      }
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `저장하지 못했어요. ${reason.message}`
          : '저장하지 못했어요. 입력은 유지돼요. 다시 시도해 주세요.',
      );
    }
  };
  return (
    <OperationModal title="훈장 관리" onClose={close}>
      <p className="preparation-hint">
        선생님이 훈장을 직접 만들어요. 기본 제공 훈장은 없으며, 수여할 때마다 소속
        원정대에 10P가 반영돼요. 현재는 로컬 연습이에요.
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          commit(editing, true);
        }}
      >
        <h3>
          {store.definitions.some((item) => item.id === editing.id)
            ? '훈장 수정'
            : '새 훈장 만들기'}
        </h3>
        <label htmlFor="medal-name">훈장 이름</label>
        <input
          id="medal-name"
          maxLength={40}
          value={editing.name}
          onChange={(event) => setEditing({ ...editing, name: event.target.value })}
        />
        <label htmlFor="medal-description">설명</label>
        <textarea
          id="medal-description"
          rows={2}
          maxLength={300}
          value={editing.description}
          onChange={(event) =>
            setEditing({ ...editing, description: event.target.value })
          }
        />
        <label htmlFor="medal-symbol">아이콘</label>
        <select
          id="medal-symbol"
          value={editing.symbol}
          onChange={(event) =>
            setEditing({
              ...editing,
              symbol: event.target.value as MedalSymbol,
              image: '',
            })
          }
        >
          {medalSymbols.map((symbol, index) => (
            <option key={symbol} value={symbol}>
              {['별', '잎', '하트', '깃발'][index]}
            </option>
          ))}
        </select>
        <label htmlFor="medal-image">직접 만든 이미지 (선택)</label>
        <input
          id="medal-image"
          key={editing.id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={uploading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const request = ++fileRequest.current;
            if (
              !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
              file.size > 200 * 1024
            ) {
              setError('PNG·JPG·WebP 이미지 200KB 이하만 사용할 수 있어요.');
              event.target.value = '';
              return;
            }
            setUploading(true);
            try {
              const bitmap = await createImageBitmap(file);
              const valid = bitmap.width <= 2048 && bitmap.height <= 2048;
              bitmap.close();
              if (!valid)
                throw new Error('이미지 가로·세로는 각각 2048px 이하여야 해요.');
              const data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('이미지를 읽지 못했어요.'));
                reader.onload = () => resolve(String(reader.result));
                reader.readAsDataURL(file);
              });
              if (fileRequest.current === request) {
                setEditing((value) => ({ ...value, image: data }));
                setError('');
              }
            } catch (reason) {
              if (fileRequest.current === request)
                setError(
                  reason instanceof Error
                    ? reason.message
                    : '올바른 이미지 파일을 선택해 주세요.',
                );
            } finally {
              if (fileRequest.current === request) setUploading(false);
            }
          }}
        />
        <p className="preparation-hint">PNG·JPG·WebP · 200KB 이하 · 최대 2048×2048px</p>
        <div className="medal-preview">
          <MedalIcon medal={editing} decorative />
          <span>{editing.name || '훈장 미리보기'}</span>
          {editing.image && (
            <button
              type="button"
              className="operation-quiet-button"
              onClick={() => setEditing({ ...editing, image: '' })}
            >
              이미지 대신 아이콘 사용
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="preparation-field-error">
            {error}
          </p>
        )}
        <div className="preparation-actions">
          <button
            type="button"
            className="preparation-secondary"
            onClick={() => choose(draft())}
          >
            새로 작성
          </button>
          <button type="submit" disabled={uploading} className="preparation-primary">
            {uploading ? '이미지 확인 중' : '훈장 저장'}
          </button>
        </div>
      </form>
      <section className="operation-detail-section" aria-label="만든 훈장">
        <h3>
          만든 훈장 <small>{store.definitions.length}개</small>
        </h3>
        {!store.definitions.length && <p>아직 만든 훈장이 없어요.</p>}
        <ul className="medal-definition-list">
          {store.definitions.map((medal) => (
            <li key={medal.id}>
              <MedalIcon medal={medal} />
              <div>
                <strong>{medal.name}</strong>
                <p>{medal.description}</p>
                <small>{medal.active ? '사용 중' : '사용 중지'}</small>
              </div>
              <button
                type="button"
                className="operation-quiet-button"
                aria-label={`${medal.name} 수정`}
                onClick={() => choose(medal)}
              >
                수정
              </button>
              <button
                type="button"
                className="operation-quiet-button"
                aria-label={`${medal.name} ${medal.active ? '사용 중지' : '다시 사용'}`}
                onClick={() => {
                  if (
                    medal.active &&
                    !window.confirm(
                      '새 수여에 사용하지 않도록 중지할까요? 기존 수여 이력은 유지돼요.',
                    )
                  )
                    return;
                  commit({ ...medal, active: !medal.active }, false);
                }}
              >
                {medal.active ? '사용 중지' : '다시 사용'}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <div className="preparation-actions">
        <button type="button" className="preparation-secondary" onClick={close}>
          닫기
        </button>
      </div>
    </OperationModal>
  );
}
