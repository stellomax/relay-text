// Small line icons in the style of iOS system symbols.
type P = { size?: number; className?: string };
const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const ChevronLeft = ({ size = 26, className }: P) => (
  <svg {...base(size)} strokeWidth={2.6} className={className}>
    <path d="M15 4 7 12l8 8" />
  </svg>
);
export const ChevronRight = ({ size = 14, className }: P) => (
  <svg {...base(size)} strokeWidth={2.6} className={className}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
export const Compose = ({ size = 24, className }: P) => (
  <svg {...base(size)} strokeWidth={1.9} className={className}>
    <path d="M20 13v5.5A2.5 2.5 0 0 1 17.5 21h-12A2.5 2.5 0 0 1 3 18.5v-12A2.5 2.5 0 0 1 5.5 4H11" />
    <path d="M18.4 2.6a1.9 1.9 0 0 1 2.7 2.7L12.5 14 9 15l1-3.5z" />
  </svg>
);
export const ArrowUp = ({ size = 16, className }: P) => (
  <svg {...base(size)} strokeWidth={3} className={className}>
    <path d="M12 20V5M5.5 11 12 4.5 18.5 11" />
  </svg>
);
export const Plus = ({ size = 18, className }: P) => (
  <svg {...base(size)} strokeWidth={2.6} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Globe = ({ size = 22, className }: P) => (
  <svg {...base(size)} strokeWidth={1.8} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </svg>
);
export const Search = ({ size = 16, className }: P) => (
  <svg {...base(size)} strokeWidth={2.4} className={className}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </svg>
);
export const Gear = ({ size = 22, className }: P) => (
  <svg {...base(size)} strokeWidth={1.8} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const Alert = ({ size = 18, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="M12 6.5v7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="12" cy="17.3" r="1.5" fill="#fff" />
  </svg>
);
export const Person = ({ size = 24, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
    <circle cx="12" cy="8.5" r="4.3" fill="currentColor" />
    <path d="M3.8 20.5c.9-4 4.2-6.3 8.2-6.3s7.3 2.3 8.2 6.3" fill="currentColor" />
  </svg>
);
export const Ellipsis = ({ size = 24, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
    <circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="7.6" cy="12" r="1.45" fill="currentColor" />
    <circle cx="12" cy="12" r="1.45" fill="currentColor" />
    <circle cx="16.4" cy="12" r="1.45" fill="currentColor" />
  </svg>
);
export const Info = ({ size = 20, className }: P) => (
  <svg {...base(size)} strokeWidth={1.8} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6" />
    <circle cx="12" cy="7.6" r="0.6" fill="currentColor" />
  </svg>
);
export const Bubble = ({ size = 20, className }: P) => (
  <svg {...base(size)} strokeWidth={1.8} className={className}>
    <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v6a3.5 3.5 0 0 1-3.5 3.5H10l-5 4 1-4.3A3.5 3.5 0 0 1 4 12.5z" />
  </svg>
);
export const Trash = ({ size = 20, className }: P) => (
  <svg {...base(size)} strokeWidth={1.8} className={className}>
    <path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13M10 10.5v6M14 10.5v6" />
  </svg>
);
export const People = ({ size = 20, className }: P) => (
  <svg {...base(size)} strokeWidth={1.8} className={className}>
    <circle cx="9" cy="8" r="3.3" />
    <path d="M2.8 19.5c.7-3.4 3.2-5.2 6.2-5.2s5.5 1.8 6.2 5.2" />
    <path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.4 14.6c2 .6 3.4 2.2 3.8 4.9" />
  </svg>
);
export const SignOut = ({ size = 20, className }: P) => (
  <svg {...base(size)} strokeWidth={1.8} className={className}>
    <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14M10 12h10M16.5 8.5 20 12l-3.5 3.5" />
  </svg>
);
export const Link = ({ size = 20, className }: P) => (
  <svg {...base(size)} strokeWidth={1.8} className={className}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4.2l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4-.2l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
  </svg>
);
export const PersonAdd = ({ size = 20, className }: P) => (
  <svg {...base(size)} strokeWidth={1.8} className={className}>
    <circle cx="10" cy="8" r="3.6" />
    <path d="M3.5 20c.8-3.7 3.4-5.7 6.5-5.7 1.6 0 3 .5 4.2 1.4M18.5 14.5v6M15.5 17.5h6" />
  </svg>
);
export const Building = ({ size = 20, className }: P) => (
  <svg {...base(size)} strokeWidth={1.8} className={className}>
    <path d="M3 21h18M5 21V10l7-5 7 5v11M9.5 21v-5h5v5M9 11.5h.01M15 11.5h.01" />
  </svg>
);
