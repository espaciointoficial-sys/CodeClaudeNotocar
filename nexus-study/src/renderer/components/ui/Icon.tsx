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
  sun: 'M12 17.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z M12 2.5v2.3M12 19.2v2.3M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6',
  'chevron-down': 'M5 9l7 7 7-7',
  refresh: 'M3.5 9.5A8.5 8.5 0 0 1 19 6.5M20.5 14.5A8.5 8.5 0 0 1 5 17.5 M19 3v5h-5 M5 21v-5h5',
  activity: 'M2.5 12h4l3 7.5 4.5-15 3 7.5h4.5',
  cpu: 'M5.5 5.5h13v13h-13z M9.5 9.5h5v5h-5z M9 2v3.5M15 2v3.5M9 18.5V22M15 18.5V22M2 9h3.5M2 15h3.5M18.5 9H22M18.5 15H22',
  'hard-drive': 'M3 13.5h18 M5.5 5h13l2.5 8.5v4a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 17.5v-4z M6.8 16.9h.01M10.3 16.9h.01',
  battery: 'M2.5 7.5h15a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z M21 10.5v3',
  wifi: 'M2 8.6a15 15 0 0 1 20 0 M5.2 12.2a10.5 10.5 0 0 1 13.6 0 M8.6 15.8a5.5 5.5 0 0 1 6.8 0 M12 19.3h.01',
  'alert-triangle': 'M12 4 2.5 20h19z M12 10v4M12 17.4v.01',
  shield: 'M12 3l7.5 3v5.6c0 4.4-3.1 7.8-7.5 9.1-4.4-1.3-7.5-4.7-7.5-9.1V6z',
  folder: 'M3.5 6.5a1 1 0 0 1 1-1h4l2 2.5h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1z',
  package: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z M4 7.5l8 4.5 8-4.5 M12 12v9',
  trash: 'M4 6.5h16 M9.5 6.5V4h5v2.5 M6.5 6.5 7.4 20a1 1 0 0 0 1 1h7.2a1 1 0 0 0 1-1l.9-13.5 M10 10.5v6.5M14 10.5v6.5',
  gauge: 'M3.5 17.5a8.5 8.5 0 1 1 17 0 M12 12.5l4.3-3.7M12 17.4v.01',
  monitor: 'M3.5 4.5h17v11h-17z M8.5 20.5h7M12 15.5v5',
  'graduation-cap': 'M12 3.5 2.5 8 12 12.5 21.5 8z M6.8 10.2V16c0 1.5 2.3 2.7 5.2 2.7s5.2-1.2 5.2-2.7v-5.8 M21.5 8v5.5',
  zap: 'M13.5 2.5 5 13.5h5.5l-1 8 8.5-11h-5.5z',
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
