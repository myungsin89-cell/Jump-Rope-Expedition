import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import App from './App';

vi.mock('./components/IntroStorybookModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="줄넘기 원정대 이야기책">
      <button onClick={onClose}>건너뛰기</button>
    </div>
  ),
}));
// This unit test covers title navigation. Real list loading is covered by Playwright.
vi.mock('./features/preparation/PreparationWorkspace', () => ({
  default: () => <h1>우리의 원정</h1>,
}));

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    localStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());
  it('shows the immersive expedition title screen', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '줄넘기 원정대' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '원정 시작하기' })).toBeInTheDocument();
    expect(screen.getByText(/팀 QR/)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src');
  });

  it('opens the expedition list directly without an intermediate gate', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '원정 시작하기' }));
    await waitFor(() => expect(window.location.hash).toBe('#/preparations'));
    expect(
      await screen.findByRole('heading', { name: '우리의 원정' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
