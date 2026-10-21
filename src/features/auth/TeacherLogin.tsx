import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from './AuthContext';
import {
  getPasswordError,
  getTeacherIdError,
  normalizeTeacherId,
} from './teacherCredentials';
import './auth.css';

type Mode = 'signin' | 'signup';

function friendlyMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message.toLowerCase() : '';
  if (message.includes('invalid login credentials'))
    return '아이디 또는 비밀번호가 맞지 않아요.';
  if (message.includes('email not confirmed'))
    return '계정 확인이 끝나지 않았어요. 잠시 후 다시 시도해 주세요.';
  if (message.includes('user already registered'))
    return '이미 사용 중인 아이디예요. 로그인 탭을 이용해 주세요.';
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
  const [teacherId, setTeacherId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
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

    const teacherIdError = getTeacherIdError(teacherId);
    if (teacherIdError) {
      setError(teacherIdError);
      setWorking(false);
      return;
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      setWorking(false);
      return;
    }

    if (mode === 'signup' && password !== passwordConfirmation) {
      setError('비밀번호 확인이 일치하지 않아요.');
      setWorking(false);
      return;
    }

    const normalizedTeacherId = normalizeTeacherId(teacherId);
    try {
      if (mode === 'signin') {
        await signIn(normalizedTeacherId, password);
      } else {
        await signUp(normalizedTeacherId, password);
        setNotice('가입됐어요. 바로 원정실을 열고 있어요…');
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
            : '아이디와 비밀번호만 만들고 바로 시작해요.'}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="로그인 방식">
          <button
            aria-selected={mode === 'signin'}
            className={mode === 'signin' ? 'is-active' : ''}
            onClick={() => {
              setMode('signin');
              setPasswordConfirmation('');
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
            처음 한 번만 가입
          </button>
        </div>

        <form id="teacher-login-form" noValidate onSubmit={submit}>
          <label htmlFor="teacher-id">아이디</label>
          <input
            id="teacher-id"
            aria-describedby="teacher-id-hint"
            autoCapitalize="none"
            autoComplete="username"
            maxLength={20}
            onChange={(event) => setTeacherId(event.target.value.toLowerCase())}
            placeholder="예: forestteacher"
            required
            type="text"
            value={teacherId}
          />
          <span className="auth-field-hint" id="teacher-id-hint">
            영문 소문자와 숫자 4~20자
          </span>
          <label htmlFor="teacher-password">비밀번호</label>
          <input
            id="teacher-password"
            aria-describedby="teacher-password-hint"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            maxLength={72}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <span className="auth-field-hint" id="teacher-password-hint">
            6자 이상 · 숫자만 사용해도 돼요
          </span>
          {mode === 'signup' && (
            <>
              <label htmlFor="teacher-password-confirmation">비밀번호 확인</label>
              <input
                id="teacher-password-confirmation"
                autoComplete="new-password"
                minLength={6}
                maxLength={72}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                required
                type="password"
                value={passwordConfirmation}
              />
            </>
          )}
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
                : '가입하고 바로 시작'}
          </button>
        </form>
        <p className="auth-student-note">
          학생은 가입하지 않아요. 선생님이 공유한 원정대 QR로 바로 들어갑니다.
        </p>
      </section>
    </main>
  );
}
