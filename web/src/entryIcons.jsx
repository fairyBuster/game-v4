// Lobby rail art: one hand-drawn medallion glyph per entry, same stroke language
// as icons.jsx. Replaces the clipped spine particles that used to sit in the rail.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const icon = (children) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...P}>{children}</svg>
)

// solid accents reuse currentColor so the chip CSS drives the tint
const dot = (cx, cy, r) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />

export const ENTRY_ART = {
  VIP: icon(<>
    <path d="M4 8.6 8.2 11 12 5.4 15.8 11 20 8.6 18.4 17H5.6z" />
    <path d="M6.4 20h11.2" />
    {dot(12, 14.3, 1.1)}
  </>),
  'Bonus Harian': icon(<>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.6h17M8 3.2v3.4M16 3.2v3.4" />
    <path d="M12 12l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor" stroke="none" />
  </>),
  'Dana Talangan': icon(<>
    <circle cx="12" cy="12" r="8.6" />
    <circle cx="12" cy="12" r="3.6" />
    <path d="m5.9 5.9 3.5 3.5M18.1 5.9l-3.5 3.5M5.9 18.1l3.5-3.5M18.1 18.1l-3.5-3.5" />
  </>),
  'Kartu Mingguan': icon(<>
    <rect x="3" y="6" width="18" height="12" rx="2.2" />
    <path d="M14.8 6.2v11.6" strokeDasharray="2.4 2.6" />
    <path d="M6.4 10.2h5M6.4 13.6h3.6" />
  </>),
  Referral: icon(<>
    <circle cx="6.2" cy="12" r="2.4" />
    <circle cx="17.6" cy="6.4" r="2.4" />
    <circle cx="17.6" cy="17.6" r="2.4" />
    <path d="m8.4 10.9 6.9-3.4M8.4 13.1l6.9 3.4" />
  </>),
  '7 Hari': icon(<>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M9.3 9.4h5.4l-3.3 6.4" />
  </>),
  'Bonus Member': icon(<>
    <circle cx="10.5" cy="8.6" r="3.4" />
    <path d="M4.3 20c1.1-3.4 3.6-5.2 6.2-5.2s5.1 1.8 6.2 5.2" />
    <path d="M18.5 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="currentColor" stroke="none" />
  </>),
  'Belanja Gratis': icon(<>
    <path d="M6.1 8.3h11.8a1 1 0 0 1 1 1.1l-.85 9.4a2 2 0 0 1-2 1.8H8a2 2 0 0 1-2-1.8l-.85-9.4a1 1 0 0 1 1-1.1z" />
    <path d="M9.2 8V6.9a2.8 2.8 0 0 1 5.6 0V8" />
  </>),
  Bank: icon(<>
    <path d="M3.4 9.4 12 4.2l8.6 5.2z" />
    <path d="M5.7 12.6v5.2M9.7 12.6v5.2M14.3 12.6v5.2M18.3 12.6v5.2" />
    <path d="M4.6 17.8h14.8M4.2 20.6h15.6" />
  </>),
  Live: icon(<>
    {dot(12, 12, 2)}
    <path d="M8.7 8.7a4.7 4.7 0 0 0 0 6.6M15.3 8.7a4.7 4.7 0 0 1 0 6.6" />
    <path d="M6 6a8.5 8.5 0 0 0 0 12M18 6a8.5 8.5 0 0 1 0 12" />
  </>),
  Korporat: icon(<>
    <rect x="3.2" y="8" width="17.6" height="11.4" rx="2" />
    <path d="M8.8 8V6.6A1.6 1.6 0 0 1 10.4 5h3.2a1.6 1.6 0 0 1 1.6 1.6V8" />
    <path d="M3.2 12.6h17.6" />
  </>),
  Liburan: icon(<>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 3.4v2.4M12 18.2v2.4M3.4 12h2.4M18.2 12h2.4M6 6l1.7 1.7M16.3 16.3 18 18M18 6l-1.7 1.7M7.7 16.3 6 18" />
  </>),
  'Akun Resmi': icon(<>
    <path d="M12 3.2 19 6v5.4c0 4.5-2.9 7.5-7 9.3-4.1-1.8-7-4.8-7-9.3V6z" />
    <path d="m8.9 11.8 2.2 2.2 4.1-4.6" />
  </>),
  'Tanya Jawab': icon(<>
    <path d="M4.5 8A3.5 3.5 0 0 1 8 4.5h8A3.5 3.5 0 0 1 19.5 8v5.6a3.5 3.5 0 0 1-3.5 3.5h-4.2L8 20.3v-3.2A3.5 3.5 0 0 1 4.5 13.6z" />
    <path d="M10.3 9.8a2.05 2.05 0 0 1 4 .5c0 1.4-2 1.5-2 2.9" />
    <path d="M12.3 16.2v.01" />
  </>),
}
