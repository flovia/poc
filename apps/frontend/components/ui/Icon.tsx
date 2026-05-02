import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const navIcon = (extra?: string) => (extra ? `ico ${extra}` : "ico");

const A11Y_DEFAULTS = { "aria-hidden": true, focusable: false } as const;

export const Icon = {
  customers: ({ className, ...p }: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p} className={navIcon(className)}>
      <path d="M2 13c0-2.2 2-3.5 4-3.5S10 10.8 10 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="6" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 12.5c0-1.7 1.5-2.6 3-2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12.5" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  setup: ({ className, ...p }: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p} className={navIcon(className)}>
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1.5v2 M8 12.5v2 M14.5 8h-2 M3.5 8h-2 M12.6 3.4l-1.4 1.4 M4.8 11.2l-1.4 1.4 M12.6 12.6l-1.4-1.4 M4.8 4.8 3.4 3.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  search: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <circle cx="7" cy="7" r="4.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5 L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  arrow: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <path d="M3 8h10 M9.5 4.5 13 8 9.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  copy: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 11V4a1 1 0 0 1 1-1h7" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  bolt: ({ className, ...p }: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p} className={navIcon(className)}>
      <path d="M9 1.5 4 9h3.5L7 14.5 12 7H8.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  spark: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <path
        d="M8 1.8v3 M8 11.2v3 M1.8 8h3 M11.2 8h3 M3.6 3.6l2 2 M10.4 10.4l2 2 M12.4 3.6l-2 2 M5.6 10.4l-2 2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  ),
  info: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="4.8" r="0.8" fill="currentColor" />
    </svg>
  ),
  bulb: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <path
        d="M5.2 7.1a2.8 2.8 0 1 1 5.6 0c0 1-.5 1.7-1.1 2.3-.4.4-.7.8-.8 1.3H7.1c-.1-.5-.4-.9-.8-1.3-.6-.6-1.1-1.3-1.1-2.3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.9 12.3h2.2M7.2 14h1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 1.6v1M3.6 3.4l.7.7M12.4 3.4l-.7.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  filter: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <path d="M2 3h12 M4 7h8 M6 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  external: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <path d="M9 3h4v4 M13 3 7 9 M11 9.5V13H3V5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  x: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  back: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <path d="M13 8H3 M6.5 4.5 3 8 6.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 6.5h11 M5.5 2v3 M10.5 2v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  refresh: (p: IconProps) => (
    <svg viewBox="0 0 16 16" fill="none" {...A11Y_DEFAULTS} {...p}>
      <path d="M13.5 7A5.5 5.5 0 0 0 3 7M2.5 9A5.5 5.5 0 0 0 13 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 4.5l2.5.5.5-2.5 M5 11.5L2.5 11l-.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};
