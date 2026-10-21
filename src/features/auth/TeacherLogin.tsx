import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from './AuthContext';
import './auth.css';

type Mode = 'signin' | 'signup';

function friendlyMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message.toLowerCase() : '';
  if (message.includes('invalid login credentials'))
    return '이메일 또는 비밀번호가 맞지 않아요.';
  if (message.includes('email not confirmed'))
    return '이메일 확인을 마친 뒤 로그인해 주세요.';
  if (message.includes('user already registered'))
    return '이미 가입된 이메일이에요. 로그인 탭을 이용해 주세요.';
  if (message.includes('signup') && message.includes('disabled'))
    return '현재 새 교사 가입이 닫혀 있어요. Supabase 관리자에게 계정 생성을 요청해 주세요.';
  if (message.includes('password')) return '비밀번호는 6자 이상 입력해 주세요.';
  return reason instanceof Error
    ? reason.message
    : '로그인을 마치지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export default function TeacherLogin() {
  const { status, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (status === 'authenticated') window.location.assign('#/preparations');
  }, [status]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        const result = await signUp(email.trim(), password);
        if (result === 'confirmation-sent') {
          setNotice('확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.');
          setMode('signin');
          setPassword('');
        }
      }
    } catch (reason) {
      setError(friendlyMessage(reason));
    } finally {
      setWorking(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <main className="auth-screen" role="status">
        <div className="auth-card auth-card--loading">교사 계정을 확인하고 있어요…</div>
      </main>
    );
  }

  if (status === 'unconfigured') {
    return (
      <main className="auth-screen">
        <section className="auth-card" aria-labelledby="auth-title">
          <span className="auth-kicker">TEACHER LOGIN</span>
          <h1 id="auth-title">로그인 연결이 필요해요</h1>
          <p>
            Vercel에 <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>
            를 설정한 뒤 다시 배포해 주세요.
          </p>
          <a className="auth-secondary" href="#/">
            표지로 돌아가기
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <a className="skip-link" href="#teacher-login-form">
        로그인으로 이동
      </a>
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="auth-brand" href="#/">
          줄넘기 원정대
        </a>
        <span className="auth-kicker">선생님 원정실</span>
        <h1 id="auth-title">{mode === 'signin' ? '교사 로그인' : '교사 계정 만들기'}</h1>
        <p>
          {mode === 'signin'
            ? '학생 명단과 원정 기록을 안전하게 이어서 관리해요.'
            : '교사 데이터는 계정별로 분리해 저장할 예정이에요.'}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="로그인 방식">
          <button
            aria-selected={mode === 'signin'}
            className={mode === 'signin' ? 'is-active' : ''}
            onClick={() => {
              setMode('signin');
              setError('');
              setNotice('');
            }}
            role="tab"
            type="button"
          >
            로그인
          </button>
          <button
            aria-selected={mode === 'signup'}
            className={mode === 'signup' ? 'is-active' : ''}
            onClick={() => {
              setMode('signup');
              setError('');
              setNotice('');
            }}
            role="tab"
            type="button"
          >
            처음 가입
          </button>
        </div>

        <form id="teacher-login-form" onSubmit={submit}>
          <label htmlFor="teacher-email">이메일</label>
          <input
            id="teacher-email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teacher@example.com"
            required
            type="email"
            value={email}
          />
          <label htmlFor="teacher-password">비밀번호</label>
          <input
            id="teacher-password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            maxLength={72}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="auth-notice" role="status">
              {notice}
            </p>
          )}
          <button className="auth-primary" disabled={working} type="submit">
            {working
              ? '확인 중…'
              : mode === 'signin'
                ? '원정실 들어가기'
                : '교사 계정 만들기'}
          </button>
        </form>
        <p className="auth-student-note">
          학생은 가입하지 않아요. 선생님이 공유한 원정대 QR로 바로 들어갑니다.
        </p>
      </section>
    </main>
  );
}
