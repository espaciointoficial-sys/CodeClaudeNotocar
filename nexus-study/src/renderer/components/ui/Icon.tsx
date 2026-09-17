const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5 M5 9.5V20h5v-6h4v6h5V9.5',
  book: 'M4 4.5A2 2 0 0 1 6 3h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2z M4 17.5A2 2 0 0 1 6 16h13',
  calendar: 'M3.5 5h17a0 0 0 0 1 0 0v14a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-14z M3.5 9.5h17M8 3v4M16 3v4',
  search: 'M17 17 20 20 M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z',
  'bar-chart': 'M5 20V11M12 20V4M19 20v-7',
  layout: 'M3.5 3.5h17v17h-17z M3.5 9.5h17M9.5 9.5V21',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9 M14 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M8 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  'check-circle': 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z M8.5 12.5l2.5 2.5 5-5.5',
  'file-text': 'M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z M14 3.5V8h4M9 12.5h6M9 15.5h6M9 18h4',
  edit: 'M4 20l4-1 11-11-3-3L5 16z M14 6.5l3 3',
  paperclip: 'M8 12.5l6-6a3 3 0 1 1 4.2 4.2l-8 8a5 5 0 1 1-7-7l7-7',
  inbox: 'M4 12h4l2 3h4l2-3h4 M6 4.5h12l3 7.5v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7z',
  image: 'M3.5 4.5h17v15h-17z M8.5 9.5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z M4 17l5-5 4 4 3-3 4 4',
  file: 'M7 3.5h6l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z M13 3.5V8h4',
  clock: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z M12 7.5V12l3.5 2',
  'more-vertical': 'M12 5.01v.01M12 11.99v.01M12 18.98v.01',
  x: 'M5 5l14 14M19 5 5 19',
  'chevron-left': 'M15 5 8 12l7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  grid: 'M4 4.5h7v7h-7z M13 4.5h7v7h-7z M4 13.5h7v7h-7z M13 13.5h7v7h-7z',
  list: 'M4 6h16M4 12h16M4 18h16',
  star: 'M12 3.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z',
  play: 'M7 4.5v15l13-7.5z',
  pause: 'M8 5v14M16 5v14',
  'skip-forward': 'M6 5v14l10-7z M18 5v14',
  'rotate-ccw': 'M3.5 9.5A8.5 8.5 0 1 1 5 16 M3.5 9.5V4 M3.5 9.5H9',
  'zoom-in': 'M17 17 20 20 M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M10.5 14v-7M7 10.5h7',
  'zoom-out': 'M17 17 20 20 M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M7 10.5h7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  mail: 'M4 6.5h16v11H4z M4 7l8 6 8-6',
  'message-circle': 'M4 12a8 8 0 1 1 3 6.2L4 20l1.3-3.6A8 8 0 0 1 4 12z',
  pin: 'M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z M12 10.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z',
  'external-link': 'M14 5h5v5 M19 5 10 14 M7 5H5v14h14v-2',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
};

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  filled?: boolean;
}

export function Icon({ name, size = 18, className, filled }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
