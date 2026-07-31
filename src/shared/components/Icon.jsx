import React from 'react';

const ICONS = {
  bolt: (
    <path
      d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </>
  ),
  factory: (
    <path
      d="M3 21V9l6 3V9l6 3V5l6 3v13H3Zm3-3h3m3 0h3m3 0h3M8 9.5V7.2m7 0V5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  ),
  chart: (
    <path
      d="M4 19h16M7 15l3-3 3 2 5-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  ),
  download: (
    <path
      d="M12 3v11m0 0 4-4m-4 4-4-4M4 19h16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  ),
  print: (
    <path
      d="M7 8V4h10v4M6 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1M7 14h10v6H7v-6Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  ),
  trash: (
    <path
      d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  ),
  files: (
    <path
      d="M8 4h8l4 4v12H8V4Zm0 0H4v16h12"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  ),
  battery: (
    <>
      <rect
        x="3"
        y="7"
        width="17"
        height="10"
        rx="2"
        ry="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="20"
        y="10"
        width="1.8"
        height="4"
        rx="0.6"
        fill="currentColor"
      />
      <path
        d="M6.5 12h4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  'solar-bess': (
    <>
      {/* Battery */}
      <rect
        x="3"
        y="9"
        width="15"
        height="9"
        rx="2"
        ry="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="18"
        y="11.5"
        width="1.8"
        height="4"
        rx="0.6"
        fill="currentColor"
      />

      {/* Sun */}
      <circle
        cx="17.5"
        cy="6.5"
        r="2.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M17.5 2.5v1.3
         M17.5 9.7V11
         M13.5 6.5h1.3
         M20.7 6.5H22
         M20.2 3.8l-.9.9
         M15.7 8.3l-.9.9
         M20.2 9.2l-.9-.9
         M15.7 4.7l-.9-.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),

};

export default function Icon({ name, className = '', title }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : 'presentation'}
    >
      {title ? <title>{title}</title> : null}
      {ICONS[name] ?? null}
    </svg>
  );
}
