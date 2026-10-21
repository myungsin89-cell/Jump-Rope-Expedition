import { useId } from 'react';
import { DEFAULT_MEDAL_COLOR } from './model';
import type { MedalDefinition } from './model';

function tint(color: string, amount: number) {
  return `#${[1, 3, 5]
    .map((offset) => {
      const channel = Number.parseInt(color.slice(offset, offset + 2), 16);
      return Math.round(channel + (255 - channel) * amount)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}

export default function MedalIcon({
  medal,
  decorative = false,
}: {
  medal: MedalDefinition;
  decorative?: boolean;
}) {
  const id = useId().replaceAll(':', '');
  if (medal.image)
    return (
      <img
        className="medal-icon"
        src={medal.image}
        alt={decorative ? '' : medal.name}
        aria-hidden={decorative || undefined}
      />
    );
  const color = medal.color ?? DEFAULT_MEDAL_COLOR;
  return (
    <svg
      className="medal-icon"
      viewBox="0 0 100 110"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : medal.name}
      aria-hidden={decorative || undefined}
    >
      <defs>
        <linearGradient
          id={`${id}-face`}
          x1="25"
          y1="35"
          x2="74"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset=".52" stopColor={tint(color, 0.84)} />
          <stop offset="1" stopColor={tint(color, 0.34)} />
        </linearGradient>
      </defs>
      <path d="M31 9h38l-7 31-12 12-12-12z" fill={color} />
      <path d="m40 9 4 28 6 8 6-8 4-28h-7l-3 28-3-28z" fill={tint(color, 0.64)} />
      <rect x="30" y="6" width="40" height="8" rx="4" fill={tint(color, 0.16)} />
      <path
        d="M34 9.5h32"
        fill="none"
        stroke={tint(color, 0.82)}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="50" cy="68" r="30" fill={color} opacity=".12" />
      <path
        d="m50 36 6 3 6-1 4 5 6 2 1 6 5 4-2 7 2 6-5 4-1 6-6 2-4 5-6-1-6 3-6-3-6 1-4-5-6-2-1-6-5-4 2-6-2-7 5-4 1-6 6-2 4-5 6 1z"
        fill={`url(#${id}-face)`}
        stroke={tint(color, 0.2)}
        strokeWidth="1.6"
      />
      <circle
        cx="50"
        cy="63"
        r="20"
        fill={tint(color, 0.94)}
        stroke={tint(color, 0.42)}
        strokeWidth="1.4"
      />
      <circle cx="50" cy="63" r="17" fill="none" stroke="#fff" strokeWidth="1.2" />
      <path
        d="m50 48 4.4 9 10 1.4-7.2 7 1.7 10-8.9-4.7-8.9 4.7 1.7-10-7.2-7 10-1.4z"
        fill={tint(color, 0.55)}
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
