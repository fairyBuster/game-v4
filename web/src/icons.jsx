// Inline SVG icons. Keep each icon as one JSX tree — never split a `d` string on spaces.
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const IconHome = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...S} {...p}>
    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
)

export const IconGift = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...S} {...p}>
    <rect x="3" y="8" width="18" height="13" rx="2" />
    <path d="M3 12h18M12 8v13" />
    <path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5zM12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5z" />
  </svg>
)

export const IconHistory = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...S} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
    <path d="M12 7v5l3.5 2" />
  </svg>
)

export const IconUser = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...S} {...p}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" />
  </svg>
)

export const IconHeadset = (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...S} {...p}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="2.5" y="13" width="4" height="6" rx="1.6" />
    <rect x="17.5" y="13" width="4" height="6" rx="1.6" />
    <path d="M19.5 19v.5a2.5 2.5 0 0 1-2.5 2.5h-3" />
  </svg>
)

export const IconSound = ({ on }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...S}>
    <path d="M4 9.5h3L11 6v12l-4-3.5H4z" />
    {on ? <path d="M15 9a4 4 0 0 1 0 6M17.6 6.6a7.5 7.5 0 0 1 0 10.8" /> : <path d="M15.5 9.5l4 5m0-5-4 5" />}
  </svg>
)

export const IconCoin = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...p}>
    <circle cx="12" cy="12" r="9" fill="#f7c948" stroke="#a1761a" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="6" fill="none" stroke="#c9902a" strokeWidth="1.3" />
    <path d="M12 7.6v8.8M9.6 9.6h4.8M9.6 14.4h4.8" stroke="#8a6212" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const IconChevron = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...S} {...p}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)
