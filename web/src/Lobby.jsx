import { useEffect, useMemo, useRef, useState } from 'react'
import { fmt, loadFeed, loadLobby } from './games.js'
import { dailyBonus, deposit, logs, referral, txs, withdraw } from './api.js'
import Modal from './Modal.jsx'
import { ENTRY_ART } from './entryIcons.jsx'
import {
  IconCoin, IconGift, IconHeadset, IconHistory, IconHome, IconSound, IconUser,
} from './icons.jsx'
import './lobby.css'

// left rail: one drawn medallion glyph + the Indonesian label (array order = display order)
const ENTRIES = [
  'VIP', 'Bonus Harian', 'Dana Talangan', 'Kartu Mingguan', 'Referral', '7 Hari',
  'Bonus Member', 'Belanja Gratis', 'Bank', 'Live', 'Korporat', 'Liburan',
  'Akun Resmi', 'Tanya Jawab',
]

const BANNERS = [
  ['promo/bg_redpacketrain.jpg', 'id/title_redenvelope.png', 'Hujan Angpao'],
  ['promo/bg_scene_l.jpg', 'id/title_02_special_offer.png', 'Penawaran Spesial'],
  ['promo/joinUs_bg.png', 'id/joinus_title.png', 'Join Us'],
  ['promo/hw02_lobby_vip_bg.jpg', 'id/title_03_weekly_card.png', 'Kartu Mingguan'],
  ['promo/bg_welcomebonus.png', 'id/title_01_welcome_bonus.png', 'Bonus Selamat Datang'],
  ['promo/hw03_lobby_turnle_bg.png', 'id/title_18_prize_wheel.png', 'Undian Berhadiah'],
]

const TABS = [['all', 'Semua'], ['slot', 'Slot'], ['trending', 'Populer'], ['featured', 'Pilihan']]
const BANKS = ['BCA', 'BNI', 'BRI', 'Mandiri', 'BSI', 'DANA', 'GoPay', 'OVO', 'ShopeePay', 'QRIS']

// both our engines and the framed vendor builds are slot games
const isSlot = (g) => g.kind === 'engine' || String(g.alias).startsWith('slot-')

// what each rail button says when you tap it (`act` = a real call, not decoration)
const ENTRY_INFO = {
  VIP: { body: 'Level VIP naik dari total taruhan. Makin tinggi level, makin besar bonus mingguan & limit tarik.', act: null },
  'Bonus Harian': { body: 'Klaim sekali tiap 24 jam. Bonus langsung masuk saldo.', act: 'bonus' },
  'Dana Talangan': { body: 'Talangan saldo untuk member aktif, cair maksimal 1x24 jam setelah disetujui admin.', act: 'cs' },
  'Kartu Mingguan': { body: 'Kartu mingguan terbuka setelah 7 hari berturut-turut main. Bonus dibagikan tiap Senin.', act: null },
  Referral: { body: 'Bagikan kode referral kamu. Teman yang daftar pakai kode dapat bonus Rp 25.000, kamu dapat Rp 50.000 per member baru.', act: 'referral' },
  '7 Hari': { body: 'Login 7 hari berturut-turut untuk bonus tambahan di hari ke-7.', act: null },
  'Bonus Member': { body: 'Bonus member baru 100% untuk deposit pertama, maksimal Rp 500.000.', act: 'deposit' },
  'Belanja Gratis': { body: 'Tukar poin jadi voucher belanja. Poin terkumpul otomatis dari setiap spin.', act: null },
  Bank: { body: 'Deposit & tarik dana lewat bank / e-wallet di bawah ini.', act: 'withdraw' },
  Live: { body: 'Dealer live 24 jam. Meja live dipasang lewat provider, hubungi CS untuk akses.', act: 'cs' },
  Korporat: { body: 'Kerja sama korporat / afiliasi: kirim data perusahaan ke email partnership.', act: 'cs' },
  Liburan: { body: 'Bonus musiman tiap libur nasional, otomatis masuk kalau kuota harian masih ada.', act: null },
  'Akun Resmi': { body: 'Hati-hati akun palsu. Akun resmi kami hanya yang terdaftar di halaman ini.', act: null },
  'Tanya Jawab': { body: 'Pertanyaan yang sering masuk: minimal deposit Rp 10.000, minimal tarik Rp 50.000, WD diproses maksimal 1x24 jam.', act: 'cs' },
}

const PAGE_TITLE = { lobby: '', promo: 'Promo', history: 'Riwayat', account: 'Akun' }

export default function Lobby({ user, setUser, onLogout }) {
  const [games, setGames] = useState([])
  const [feed, setFeed] = useState([])
  const [tab, setTab] = useState('all')
  const [slide, setSlide] = useState(0)
  const [sound, setSound] = useState(false)
  const [page, setPage] = useState('lobby')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [dep, setDep] = useState({ amount: 100000, bank: 'BCA' })
  const [wd, setWd] = useState({ amount: 100000, bank: 'BCA' })
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState({ spins: [], txs: [] })
  const [refInfo, setRefInfo] = useState(null)
  const [gridEdge, setGridEdge] = useState({ start: true, end: true })
  const audio = useRef(null)
  const gridRef = useRef(null)

  useEffect(() => {
    loadLobby().then(({ games }) => setGames(games))
    loadFeed().then(setFeed)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % BANNERS.length), 5200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const el = audio.current
    if (!el) return
    if (sound) el.play().catch(() => {})
    else el.pause()
  }, [sound])

  useEffect(() => {
    if (page !== 'history') return
    Promise.all([logs(20), txs()])
      .then(([spins, list]) => setHistory({ spins, txs: list }))
      .catch(() => {})
  }, [page])

  useEffect(() => {
    if (page !== 'account') return
    referral().then(setRefInfo).catch(() => {})
  }, [page])

  const say = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  function copyRef() {
    const link = `${window.location.origin}/?ref=${user?.ref_code || ''}`
    navigator.clipboard?.writeText(link)
    say('Link referral dicopy')
  }

  const all = useMemo(() => games, [games])
  const shown = useMemo(() => {
    if (tab === 'trending') return all.filter((g) => g.trending)
    if (tab === 'featured') return all.filter((g) => g.featured)
    if (tab === 'slot') return all.filter(isSlot)
    return all
  }, [all, tab])
  const counts = useMemo(() => ({
    all: all.length,
    slot: all.filter(isSlot).length,
    trending: all.filter((g) => g.trending).length,
    featured: all.filter((g) => g.featured).length,
  }), [all])
  const nameOf = (alias) => all.find((g) => g.alias === alias)?.name || alias

  // game shelf: arrows nudge about one screen, then fade out at either end
  function nudge(dir) {
    const el = gridRef.current
    if (el) el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' })
  }

  function onGridScroll() {
    const el = gridRef.current
    if (!el) return
    const start = el.scrollLeft <= 4
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    setGridEdge((e) => (e.start === start && e.end === end ? e : { start, end }))
  }

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    el.scrollLeft = 0
    onGridScroll()
  }, [shown])

  // ---- actions that actually hit the backend ----
  async function claimBonus() {
    setBusy(true)
    try {
      const r = await dailyBonus()
      setUser((u) => ({ ...u, balance: r.balance }))
      setModal(null)
      say(`Bonus harian +${fmt.format(r.amount)} masuk`)
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }

  async function doDeposit() {
    setBusy(true)
    try {
      const r = await deposit(Number(dep.amount))
      setUser((u) => ({ ...u, balance: r.balance }))
      setModal(null)
      say(`Deposit ${fmt.format(r.amount)} berhasil`)
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }

  async function doWithdraw() {
    setBusy(true)
    try {
      const r = await withdraw(Number(wd.amount), wd.bank)
      setModal(null)
      say(`Permintaan tarik ${fmt.format(r.amount)} dikirim — ${r.message}`)
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }

  function openEntry(label) {
    const info = ENTRY_INFO[label] || {}
    const act = info.act
    const actions = []
    if (act === 'bonus') actions.push({ label: busy ? '…' : 'Klaim Bonus', onClick: claimBonus, disabled: busy })
    if (act === 'referral') actions.push({ label: 'Copy link referral', onClick: copyRef })
    if (act === 'deposit') actions.push({ label: 'Deposit sekarang', onClick: () => { setModal(null); setPage('lobby'); setTimeout(() => setModal({ kind: 'deposit' }), 0) } })
    if (act === 'withdraw') actions.push({ label: 'Tarik dana', onClick: () => setModal({ kind: 'withdraw' }) })
    if (act === 'cs') actions.push({ label: 'Hubungi CS', onClick: () => setModal({ kind: 'help' }) })
    setModal({ kind: 'entry', title: label, body: info.body || 'Fitur demo.', actions })
  }

  const money = (v) => fmt.format(Number(v || 0))

  return (
    <div className="lobby">
      <img className="lobby-bg" src="/dy01/bg_hall.jpg" alt="" />
      <div className="lobby-vignette" />
      <img className="lobby-decor" src="/dy01/chrome/hw03_lobby_decorate.png" alt="" />

      <header className="topbar">
        <div className="who">
          <div className="avatar"><img src="/dy01/chrome/avatar.png" alt="" /></div>
          <div className="who-text">
            <b>{user?.username || 'guest'}</b>
            <span>ID: 88{String(user?.id || 0).padStart(4, '0')}<i className="vip-tag">VIP {user?.vip ?? 1}</i></span>
          </div>
        </div>

        <div className="wallet">
          <div className="coin-pill" title="Saldo">
            <IconCoin />
            <b>{money(user?.balance)}</b>
          </div>
          <button className="btn gold" onClick={() => setModal({ kind: 'deposit' })}>Deposit</button>
          <button className="btn wine" onClick={() => setModal({ kind: 'withdraw' })}>Tarik Dana</button>
          {user?.is_admin ? <button className="btn gold" onClick={() => { window.location.hash = '#/admin' }}>Admin</button> : null}
          <button className="round" onClick={() => setSound((s) => !s)} title="Suara"><IconSound on={sound} /></button>
          <button className="round service" title="Pusat Bantuan" onClick={() => setModal({ kind: 'help' })}><IconHeadset /></button>
        </div>
      </header>

      {page === 'lobby' ? (
        <>
          <aside className="entries">
            {ENTRIES.map((label) => (
              <button key={label} className="entry" title={label} onClick={() => openEntry(label)}>
                <span className="entry-ico">{ENTRY_ART[label]}</span>
                <span>{label}</span>
              </button>
            ))}
          </aside>

          <section className="banner">
            {BANNERS.map(([bg, title, name], i) => (
              <div className={`slide ${i === slide ? 'on' : ''}`} key={bg}
                   onClick={() => openEntry(name === 'Kartu Mingguan' ? 'Kartu Mingguan' : name === 'Join Us' ? 'Referral' : 'Bonus Harian')}>
                <img className="slide-bg" src={`/dy01/${bg}`} alt="" />
                <img className="slide-title" src={`/dy01/${title}`} alt={name} />
              </div>
            ))}
            <div className="dots">
              {BANNERS.map((b, i) => (
                <button key={b[0]} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} aria-label={`slide ${i + 1}`} />
              ))}
            </div>
          </section>

          <section className="games">
            <div className="games-head">
              <div className="tabs">
                {TABS.map(([k, label]) => (
                  <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                    {label}<em>{counts[k] ?? 0}</em>
                  </button>
                ))}
              </div>
              {feed.length ? (
                <div className="ticker">
                  <em>Menang terbaru</em>
                  <div className="ticker-track">
                    {[0, 1].map((c) => feed.map((r) => (
                      <span key={`${c}-${r.id ?? r.time}-${r.game_alias}`}>
                        <b>{nameOf(r.game_alias)}</b>
                        <i>{r.win_status === 1 ? `+ ${fmt.format(r.win_amo)}` : fmt.format(r.invest)}</i>
                      </span>
                    )))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid-wrap">
              <div className="grid" ref={gridRef} onScroll={onGridScroll}>
                {shown.map((g) => (
                  <a className={`card ${g.kind === 'soon' ? 'soon' : ''}`} key={g.alias} href={`#/play/${g.alias}`}>
                    <img src={g.image.startsWith('/') ? g.image : `/game/${g.image}`} alt={g.name} />
                    <span className="card-name">{g.name}</span>
                    {g.kind === 'engine' || g.kind === 'casino' ? <i className="badge">BARU</i>
                      : g.kind === 'mini' ? <i className="badge mini">MINI</i>
                      : g.kind === 'iframe' ? <i className="badge vend">SLOT</i>
                      : <i className="badge soon">SEGERA</i>}
                    <span className="card-play" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5.6v12.8L19 12z" /></svg>
                    </span>
                  </a>
                ))}
              </div>
              <button className="grid-nav prev" disabled={gridEdge.start} onClick={() => nudge(-1)} aria-label="Geser kiri">‹</button>
              <button className="grid-nav next" disabled={gridEdge.end} onClick={() => nudge(1)} aria-label="Geser kanan">›</button>
            </div>
          </section>
        </>
      ) : null}

      {page === 'promo' ? (
        <section className="page">
          <h2>Promo & Bonus</h2>
          <div className="page-grid">
            {ENTRIES.map((label) => (
              <button key={label} className="promo-card" onClick={() => openEntry(label)}>
                <span className="entry-ico">{ENTRY_ART[label]}</span>
                <b>{label}</b>
                <span>{ENTRY_INFO[label]?.body?.slice(0, 62)}…</span>
              </button>
            ))}
          </div>
          <div className="page-banners">
            {BANNERS.map(([bg, title, name]) => (
              <div key={bg} className="promo-banner">
                <img src={`/dy01/${bg}`} alt="" />
                <img className="promo-title" src={`/dy01/${title}`} alt={name} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {page === 'history' ? (
        <section className="page">
          <h2>Riwayat</h2>
          <div className="two-col">
            <div className="panel">
              <h4>Spin terakhir</h4>
              {history.spins.length ? history.spins.map((r, i) => (
                <div className="row" key={i}>
                  <b>{nameOf(r.game_alias)}</b>
                  <span>bet {money(r.invest)}</span>
                  <i className={r.win_status ? 'up' : 'down'}>{r.win_status ? `+ ${money(r.win_amo)}` : '—'}</i>
                </div>
              )) : <p className="muted">Belum ada spin.</p>}
            </div>
            <div className="panel">
              <h4>Mutasi saldo</h4>
              {history.txs.length ? history.txs.map((t) => (
                <div className="row" key={t.id}>
                  <b>{t.kind}</b>
                  <span>{t.note || t.status}</span>
                  <i className={t.amount >= 0 ? 'up' : 'down'}>{t.amount >= 0 ? '+' : ''}{money(t.amount)}</i>
                </div>
              )) : <p className="muted">Belum ada mutasi.</p>}
            </div>
          </div>
        </section>
      ) : null}

      {page === 'account' ? (
        <section className="page">
          <h2>Akun</h2>
          <div className="panel acct">
            <div className="acct-row"><span>Username</span><b>{user?.username}</b></div>
            <div className="acct-row"><span>ID</span><b>88{String(user?.id || 0).padStart(4, '0')}</b></div>
            <div className="acct-row"><span>Saldo</span><b>{money(user?.balance)}</b></div>
            <div className="acct-row"><span>Level</span><b>VIP {user?.vip ?? 1}{user?.is_admin ? ' · admin' : ''}</b></div>
            <div className="acct-row"><span>Kode Referral</span><b className="ref-code">{user?.ref_code || '—'}
              <button className="ref-copy" onClick={copyRef}>Copy</button></b></div>
            <div className="acct-row"><span>Member diundang</span>
              <b>{refInfo ? `${refInfo.count} orang · bonus ${money(refInfo.earned)}` : '—'}</b></div>
            <div className="acct-actions">
              <button className="btn gold" onClick={() => setModal({ kind: 'deposit' })}>Deposit</button>
              <button className="btn wine" onClick={() => setModal({ kind: 'withdraw' })}>Tarik Dana</button>
              <button className="btn gold" onClick={claimBonus} disabled={busy}>Klaim Bonus Harian</button>
              {user?.is_admin ? <button className="btn gold" onClick={() => { window.location.hash = '#/admin' }}>Panel Admin</button> : null}
              <button className="btn wine" onClick={onLogout}>Keluar</button>
            </div>
          </div>
        </section>
      ) : null}

      <nav className="bottomnav">
        <img className="nav-bg" src="/dy01/chrome/img_navigation_bg.png" alt="" />
        {[['lobby', 'Lobby', <IconHome key="h" />], ['promo', 'Promo', <IconGift key="g" />],
          ['history', 'Riwayat', <IconHistory key="i" />], ['account', 'Akun', <IconUser key="u" />]].map(([k, label, icon]) => (
          <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}>{icon}<span>{label}</span></button>
        ))}
      </nav>

      {modal?.kind === 'deposit' ? (
        <Modal title="Deposit" onClose={() => setModal(null)}
               actions={[{ label: busy ? '…' : 'Konfirmasi Deposit', onClick: doDeposit, disabled: busy }]}>
          <p className="muted">Demo: saldo masuk instan. Minimal {money(10000)}.</p>
          <div className="quick">
            {[50000, 100000, 500000, 1000000].map((v) => (
              <button key={v} className={Number(dep.amount) === v ? 'on' : ''} onClick={() => setDep((d) => ({ ...d, amount: v }))}>{fmt.format(v)}</button>
            ))}
          </div>
          <label className="field">Nominal
            <input type="number" value={dep.amount} onChange={(e) => setDep((d) => ({ ...d, amount: e.target.value }))} />
          </label>
          <label className="field">Metode
            <select value={dep.bank} onChange={(e) => setDep((d) => ({ ...d, bank: e.target.value }))}>
              {BANKS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
        </Modal>
      ) : null}

      {modal?.kind === 'withdraw' ? (
        <Modal title="Tarik Dana" onClose={() => setModal(null)}
               actions={[{ label: busy ? '…' : 'Ajukan Penarikan', kind: 'wine', onClick: doWithdraw, disabled: busy }]}>
          <p className="muted">Minimal {money(50000)} · saldo {money(user?.balance)} · diproses admin maks 1x24 jam.</p>
          <div className="quick">
            {[50000, 100000, 500000, 1000000].map((v) => (
              <button key={v} className={Number(wd.amount) === v ? 'on' : ''} onClick={() => setWd((d) => ({ ...d, amount: v }))}>{fmt.format(v)}</button>
            ))}
          </div>
          <label className="field">Nominal
            <input type="number" value={wd.amount} onChange={(e) => setWd((d) => ({ ...d, amount: e.target.value }))} />
          </label>
          <label className="field">Tujuan
            <select value={wd.bank} onChange={(e) => setWd((d) => ({ ...d, bank: e.target.value }))}>
              {BANKS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
        </Modal>
      ) : null}

      {modal?.kind === 'help' ? (
        <Modal title="Pusat Bantuan" onClose={() => setModal(null)}
               actions={[{ label: 'Chat CS (demo)', onClick: () => { setModal(null); say('CS demo: balasan maks 5 menit') } }]}>
          <p className="muted">Live chat 24 jam · email support@dy01.local · WhatsApp 0812-0000-0000</p>
          <p className="muted">Deposit minimal {money(10000)}, tarik minimal {money(50000)}, WD maksimal 1x24 jam. Bonus harian bisa diklaim sekali per hari dari menu Bonus Harian.</p>
        </Modal>
      ) : null}

      {modal?.kind === 'entry' ? (
        <Modal title={modal.title} onClose={() => setModal(null)} actions={modal.actions}>
          <div className="entry-hero"><span className="entry-ico">{ENTRY_ART[modal.title]}</span></div>
          <p className="muted">{modal.body}</p>
        </Modal>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
      <audio ref={audio} src="/dy01/audio/bgm.mp3" loop />
    </div>
  )
}
