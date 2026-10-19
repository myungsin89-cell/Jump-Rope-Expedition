import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { FieldErrors } from './model';
import forestCover from '../../../assets/illustrations/title-screen-cover-v1.png';

export function ForestMap() {
  return (
    <svg aria-hidden="true" className="preparation-map" viewBox="0 0 320 250" fill="none">
      <path
        d="M50 211C27 175 90 167 95 139C102 106 58 91 102 67C140 47 184 68 204 45"
        stroke="currentColor"
        strokeDasharray="5 8"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M144 218C203 214 177 178 203 153C227 130 268 132 266 96C264 67 233 63 219 46"
        stroke="currentColor"
        strokeDasharray="5 8"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M241 219C274 204 262 177 247 159"
        stroke="currentColor"
        strokeDasharray="5 8"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M206 54V14L244 26L206 37"
        fill="#f6d979"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      {[
        { x: 50, y: 210 },
        { x: 144, y: 218 },
        { x: 241, y: 219 },
      ].map(({ x, y }, index) => (
        <g key={index} transform={`translate(${x} ${y})`}>
          <path
            d="M-18-13L0-22L18-13V12L0 22L-18 12Z"
            fill={['#b7e4c7', '#f6d979', '#b7d9e9'][index]}
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <text
            y="5"
            textAnchor="middle"
            fill="currentColor"
            fontSize="18"
            fontFamily="Jua"
          >
            {index + 1}
          </text>
        </g>
      ))}
      <path
        d="M31 72L46 41L62 72ZM262 170L277 139L292 170Z"
        fill="#b7e4c7"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path
        d="M46 72V83M277 170V181"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M139 95C138 80 151 72 164 75C165 88 154 98 139 95Z"
        fill="#52b788"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function PageFrame({
  children,
  aside,
  title,
  subtitle,
  compact = false,
  backHref = '#/',
  backLabel = '표지로 돌아가기',
  brandSubtitle = '선생님 준비실',
  headingAside,
  landscape = false,
}: {
  children: ReactNode;
  aside: ReactNode;
  title: string;
  subtitle: string;
  compact?: boolean;
  backHref?: string;
  backLabel?: string;
  brandSubtitle?: string;
  headingAside?: ReactNode;
  landscape?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <main
      className={`preparation-screen${compact ? ' preparation-screen--compact' : ''}`}
    >
      <a
        className="skip-link"
        href="#preparation-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('preparation-content')?.focus();
        }}
      >
        내용으로 이동
      </a>
      <header className="preparation-header">
        <a className="preparation-brand" href="#/">
          줄넘기 원정대<span>{brandSubtitle}</span>
        </a>
        <a className="preparation-home" href={backHref}>
          {backLabel}
        </a>
      </header>
      <div className="preparation-layout">
        <aside className="preparation-sidebar">
          <span className="preparation-label">모험을 준비하는 시간</span>
          <h2>
            함께 넘고,
            <br />
            함께 나아가요.
          </h2>
          <ForestMap />
          {aside}
          <p className="preparation-local-note">
            지금은 이 브라우저에 저장하는 준비 화면이에요. 다른 기기 연결과 팀 QR은 아직
            제공하지 않아요.
          </p>
        </aside>
        <section
          className="preparation-paper"
          id="preparation-content"
          tabIndex={-1}
          aria-labelledby="preparation-title"
        >
          <div
            className={`preparation-page-heading${landscape ? ' preparation-page-heading--landscape' : ''}`}
            style={
              landscape
                ? {
                    backgroundImage: `linear-gradient(90deg, #f5f7f4 28%, #f5f7f400 85%), url(${forestCover})`,
                  }
                : undefined
            }
          >
            <div>
              <h1 id="preparation-title" ref={heading} tabIndex={-1}>
                {title}
              </h1>
              <p>{subtitle}</p>
            </div>
            {headingAside}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

export function FieldError({ id, errors }: { id: string; errors: FieldErrors }) {
  return errors[id] ? (
    <p className="preparation-field-error" id={`${id}-error`}>
      {errors[id]}
    </p>
  ) : null;
}

export function ErrorSummary({ errors }: { errors: FieldErrors }) {
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (Object.keys(errors).length) summary.current?.focus();
  }, [errors]);
  if (!Object.keys(errors).length) return null;
  return (
    <div className="preparation-error-summary" ref={summary} tabIndex={-1} role="alert">
      <strong>아래 내용을 확인해 주세요.</strong>
      <ul>
        {Object.entries(errors).map(([id, text]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(id)?.focus();
              }}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
