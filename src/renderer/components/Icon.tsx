import { ReactElement } from 'react';

export type IconName =
  | 'articles'
  | 'book'
  | 'brain'
  | 'settings'
  | 'plus'
  | 'play'
  | 'pause'
  | 'chevron-left'
  | 'chevron-right'
  | 'upload'
  | 'trash'
  | 'folder'
  | 'check'
  | 'close'
  | 'eye'
  | 'sound'
  | 'spark'
  | 'clock'
  | 'key'
  | 'connection'
  | 'search';

const paths: Record<IconName, ReactElement> = {
  articles: (
    <>
      <path d="M5 4.75A2.25 2.25 0 0 1 7.25 2.5H19v15.75H7.25A2.25 2.25 0 0 0 5 20.5V4.75Z" />
      <path d="M5 20.5A2.25 2.25 0 0 1 7.25 18.25H19V21.5H7.25A2.25 2.25 0 0 1 5 19.25" />
    </>
  ),
  book: (
    <>
      <path d="M3.5 5.5A3 3 0 0 1 6.5 3H11v16H6.5a3 3 0 0 0-3 2.5v-16Z" />
      <path d="M20.5 5.5A3 3 0 0 0 17.5 3H13v16h4.5a3 3 0 0 1 3 2.5v-16Z" />
    </>
  ),
  brain: (
    <>
      <path d="M9.25 5.25A3.25 3.25 0 0 0 3.5 7.32a3.5 3.5 0 0 0 .25 6.83A3.25 3.25 0 0 0 9.25 18v-12.75Z" />
      <path d="M14.75 5.25a3.25 3.25 0 0 1 5.75 2.07 3.5 3.5 0 0 1-.25 6.83A3.25 3.25 0 0 1 14.75 18v-12.75Z" />
      <path d="M9.25 8.5H7.5M14.75 8.5h1.75M9.25 13H7M14.75 13H17" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09a1.7 1.7 0 0 0-1.1-1.58 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.3v-4h.09A1.7 1.7 0 0 0 4 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.4 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.3h4v.09A1.7 1.7 0 0 0 15 4a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.4a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.09v4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  play: <path d="m9 6 9 6-9 6V6Z" />,
  pause: <path d="M8 5h3v14H8zM14 5h3v14h-3z" />,
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  upload: (
    <>
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
      <path d="M4 15.5v4h16v-4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  folder: (
    <path d="M3 6.5h7l2 2h9v10.75A1.75 1.75 0 0 1 19.25 21H4.75A1.75 1.75 0 0 1 3 19.25V6.5Zm0 0V5.75A1.75 1.75 0 0 1 4.75 4h4.1l2 2.5" />
  ),
  check: <path d="m5 12.5 4.25 4.25L19 7" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  sound: (
    <>
      <path d="M5 10h3l4-3.5v11L8 14H5v-4Z" />
      <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  spark: (
    <path d="m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3Zm6 11 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M17 12v3M20 12v2" />
    </>
  ),
  connection: (
    <>
      <path d="M4 17.5a11 11 0 0 1 16 0M7 14a7 7 0 0 1 10 0M10 10.5a3 3 0 0 1 4 0" />
      <circle cx="12" cy="19" r=".75" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4 4" />
    </>
  ),
};

interface IconProps {
  name: IconName;
}

export default function Icon({ name }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      {paths[name]}
    </svg>
  );
}
