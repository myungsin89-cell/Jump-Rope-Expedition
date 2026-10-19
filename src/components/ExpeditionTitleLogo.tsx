function TitleLine({ children, y }: { children: string; y: number }) {
  return (
    <g>
      <text className="wordmark-shadow" x="250" y={y + 7}>
        {children}
      </text>
      <text className="wordmark-outer" x="250" y={y}>
        {children}
      </text>
      <text className="wordmark-gold" x="250" y={y}>
        {children}
      </text>
      <text className="wordmark-face" x="250" y={y}>
        {children}
      </text>
    </g>
  );
}

function ExpeditionTitleLogo() {
  return (
    <svg
      aria-hidden="true"
      className="expedition-title-logo"
      focusable="false"
      viewBox="0 0 500 380"
    >
      <defs>
        <linearGradient id="wordmark-face" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--logo-face-top)" />
          <stop offset="1" stopColor="var(--logo-face-bottom)" />
        </linearGradient>
        <linearGradient id="rope-gold" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#d5932d" />
          <stop offset="0.48" stopColor="#f6d979" />
          <stop offset="1" stopColor="#c47b20" />
        </linearGradient>
      </defs>

      <g className="wordmark-ribbon">
        <path d="M100 34L117 20H383L400 34L383 48H117Z" />
        <circle cx="126" cy="34" r="3" />
        <circle cx="374" cy="34" r="3" />
        <text x="250" y="38">
          JUMP ROPE EXPEDITION
        </text>
      </g>

      <TitleLine y={164}>줄넘기</TitleLine>
      <TitleLine y={306}>원정대</TitleLine>

      <g className="wordmark-rope">
        <path className="rope-outline" d="M101 337C171 363 329 363 399 337" />
        <path className="rope-core" d="M101 337C171 363 329 363 399 337" />
        <g className="rope-handle rope-handle-left" transform="rotate(-58 88 330)">
          <rect height="40" rx="9" width="18" x="79" y="310" />
          <path d="M82 320H94M82 329H94M82 338H94" />
        </g>
        <g className="rope-handle rope-handle-right" transform="rotate(58 412 330)">
          <rect height="40" rx="9" width="18" x="403" y="310" />
          <path d="M406 320H418M406 329H418M406 338H418" />
        </g>
      </g>
    </svg>
  );
}

export default ExpeditionTitleLogo;
