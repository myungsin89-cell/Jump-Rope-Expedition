import type { MedalDefinition } from './model';

export default function MedalIcon({
  medal,
  decorative = false,
}: {
  medal: MedalDefinition;
  decorative?: boolean;
}) {
  if (medal.image)
    return (
      <img
        className="medal-icon"
        src={medal.image}
        alt={decorative ? '' : medal.name}
        aria-hidden={decorative || undefined}
      />
    );
  const paths = {
    star: 'm16 4 3.6 7.3 8.1 1.2-5.9 5.7 1.4 8.1-7.2-3.8-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2Z',
    leaf: 'M26 5C12 3 5 10 7 19s19 12 19-14ZM7 27l14-16',
    heart: 'M16 27 5.5 16.5C-2 8.5 10 0 16 9c6-9 18-.5 10.5 7.5Z',
    flag: 'M7 28V5m0 0c8-4 10 5 19 1v14c-9 4-11-5-19-1',
  };
  return (
    <svg
      className="medal-icon"
      viewBox="0 0 32 32"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : medal.name}
      aria-hidden={decorative || undefined}
    >
      <path
        d={paths[medal.symbol]}
        fill="var(--mint-tint)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
