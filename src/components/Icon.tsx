import type { CSSProperties } from 'react';
export type IconName =
  | 'focus'
  | 'tasks'
  | 'history'
  | 'arrow'
  | 'arrowLeft'
  | 'plus'
  | 'check'
  | 'close'
  | 'play'
  | 'pause'
  | 'stop'
  | 'users'
  | 'leaf'
  | 'sun'
  | 'chevron'
  | 'copy'
  | 'logout'
  | 'edit'
  | 'trash'
  | 'clock'
  | 'coffee'
  | 'menu'
  | 'refresh'
  | 'target'
  | 'mail'
  | 'lock'
  | 'user'
  | 'info'
  | 'external'
  | 'volume'
  | 'crown';
const paths: Record<IconName, React.ReactNode> = {
  focus: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="4" width="16" height="17" rx="3" />
      <path d="M9 4V2m6 2V2M8 10l1.5 1.5L12 9m2 2h3m-9 5h9" />
    </>
  ),
  history: (
    <>
      <path d="M3 10a9 9 0 1 1 1 7M3 4v6h6" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  arrowLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  play: <path d="m9 5 10 7-10 7Z" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-3a6 6 0 0 1 12 0v3m1-15a3 3 0 0 1 0 6m5 9v-3a6 6 0 0 0-3-5" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3c-9 0-17 2-17 10a7 7 0 0 0 7 7c8 0 10-8 10-17Z" />
      <path d="M4 20 15 9" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V4H4v12h4" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H4v16h6m3-8h9m-4-4 4 4-4 4" />
    </>
  ),
  edit: (
    <>
      <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v6m4-6v6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3M2 22h18" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M5 7a8 8 0 0 1 13-2l2 3M4 16l2 3a8 8 0 0 0 13-2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8m-4-4h8" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 22v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.2" />
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6" />
    </>
  ),
  volume: (
    <>
      <path d="M3 9h4l5-5v16l-5-5H3Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16" />
    </>
  ),
  crown: (
    <>
      <path d="m3 6 4 4 5-7 5 7 4-4-2 13H5ZM5 22h14" />
    </>
  ),
};
export function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
export function TomatoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 22"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d="M7 5H4v2H2v3H1v7h2v3h3v1h8v-1h3v-3h2v-7h-1V7h-3V5Z" fill="#523c2e" />
      <path d="M7 6H4v2H3v3H2v5h2v3h3v1h6v-1h3v-3h2v-5h-1V8h-3V6Z" fill="#c55636" />
      <path d="M5 8h4v2h4v7h-2v2H6v-2H4v-6h1Z" fill="#df7041" />
      <path d="M5 10h2v4H4v-2h1Z" fill="#f8b16d" />
      <path d="M15 11h2v6h-2v2h-3v-1h2v-2h1Z" fill="#9e452f" />
      <path d="M10 1h2v4h4v2h-4v2H9V7H5V5h4V3h1Z" fill="#344e35" />
      <path d="M10 3h1v3h3v1h-4v1H9V6H7V5h3Z" fill="#7b9b47" />
    </svg>
  );
}
