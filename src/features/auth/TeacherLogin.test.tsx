import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

import TeacherLogin from './TeacherLogin';

const auth = vi.hoisted(() => ({
  status: 'anonymous' as const,
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => auth,
}));

describe('TeacherLogin', () => {
  beforeEach(() => {
    auth.signIn.mockReset();
    auth.signUp.mockReset();
    auth.signUp.mockResolvedValue(undefined);
  });

  it('uses an ID and asks for password confirmation when signing up', () => {
    render(<TeacherLogin />);

    fireEvent.click(screen.getByRole('tab', { name: '처음 한 번만 가입' }));

    expect(screen.getByLabelText('아이디')).toHaveAttribute('type', 'text');
    expect(screen.getByText('영문 소문자와 숫자 4~20자')).toBeInTheDocument();
    expect(screen.getByText('6자 이상 · 숫자만 사용해도 돼요')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호 확인')).toBeInTheDocument();
    expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument();
  });

  it('blocks mismatched passwords and submits a normalized ID after confirmation', async () => {
    render(<TeacherLogin />);
    fireEvent.click(screen.getByRole('tab', { name: '처음 한 번만 가입' }));

    fireEvent.change(screen.getByLabelText('아이디'), {
      target: { value: 'Forest01' },
    });
    fireEvent.change(
      screen.getByLabelText('비밀번호', { selector: '#teacher-password' }),
      {
        target: { value: '123456' },
      },
    );
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: '123457' },
    });
    fireEvent.click(screen.getByRole('button', { name: '가입하고 바로 시작' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '비밀번호 확인이 일치하지 않아요.',
    );
    expect(auth.signUp).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: '가입하고 바로 시작' }));

    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith('forest01', '123456'));
  });
});
