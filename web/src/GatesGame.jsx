import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { REELS, ROWS, SPEC, SYMBOLS, spin } from './slot/gates.js'
import { fmt } from './games.js'
import { spin as apiSpin } from './api.js'
import GameHeader from './GameHeader.jsx'
import { IconSound } from './icons.jsx'
import './gates.css'

const BY_ID = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]))
const BET_STEPS = [500, 1000, 2500, 5000, 10000, 25000]
const CELL_H = 92
const CELL_W = 108
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const SOUNDS = ['spin-start', 'reel-stop', 'symbols-remove', 'symbols-drop', 'sfx-orb-land', 'sfx-tumble-multiplier',
  'win', 'win-multiplier', 'big-win', 'free-spins-start', 'free-spins-end', 'feature-start', 'sfx-zeus-cast', 'near-miss']

export default function GatesGame({ user, setUser }) {
  const [betIdx, setBetIdx] = useState(2)
  const [view, setView] = useState(() => spin())
  const [orbs, setOrbs] = useState({})            // "reel-row" -> multiplier value
  const [hits, setHits] = useState([])
  const [win, setWin] = useState(0)
  const [busy, setBusy] = useState(false)
  const [auto, setAuto] = useState(0)
  const [freeLeft, setFreeLeft] = useState(0)
  const [banner, setBanner] = useState('')
  const [sound, setSound] = useState(true)
  const [showPay, setShowPay] = useState(false)
  const [music, setMusic] = useState(false)

  const bet = BET_STEPS[betIdx]
  const balance = user?.balance ?? 0
  const busyRef = useRef(false)
  const timers = useRef([])
  const audio = useRef({})
  const musicRef = useRef(null)

  useEffect(() => {
    audio.current = Object.fromEntries(SOUNDS.map((n) => [n, new Audio(`/gates/audio/${n}.ogg`)]))
    musicRef.current = new Audio('/gates/audio/music-base.ogg')
    musicRef.current.loop = true
    musicRef.current.volume = 0.35
  }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const play = useCallback((n, vol = 0.7) => {
    if (!sound) return
    const a = audio.current[n]
    if (!a) return
    try { a.currentTime = 0; a.volume = vol; a.play().catch(() => {}) } catch { /* ignore */ }
  }, [sound])

  useEffect(() => {
    const m = musicRef.current
    if (!m) return
    if (music && sound) m.play().catch(() => {})
    else m.pause()
  }, [music, sound])

  // orb values + scatter count of whatever grid is on screen
  const orbBadges = useMemo(() => {
    const out = {}
    for (let r = 0; r < REELS; r++) {
      for (let row = 0; row < ROWS; row++) {
        if (BY_ID[view[r][row]].orb) out[`${r}-${row}`] = orbs[`${r}-${row}`] ?? null
      }
    }
    return out
  }, [view, orbs])

  const hitSet = useMemo(() => new Set(hits.flatMap((h) => h.cells.map(([r, row]) => `${r}-${row}`))), [hits])

  /** replay one server-resolved run: land -> highlight -> remove -> drop, step by step */
  const replayRun = useCallback(async (run) => {
    // each step carries the orb map the engine actually used, so what we show is what was paid
    setOrbs(Object.fromEntries(run.steps[0].orbs))
    setView(run.steps[0].grid)
    play('symbols-drop')
    await sleep(220)
    if (run.steps[0].orbs.length) play('sfx-orb-land')

    for (let i = 0; i < run.steps.length; i++) {
      const st = run.steps[i]
      if (st.hits.length === 0) break
      setView(st.grid)
      setOrbs(Object.fromEntries(st.orbs))
      setHits(st.hits)
      play(st.orbSum > 1 ? 'win-multiplier' : 'win')
      await sleep(520)
      setWin((w) => w + st.winX * bet)
      if (st.orbSum > 1) setBanner(`x${st.orbSum} MULTIPLIER`)
      await sleep(180)
      setHits([])
      play('symbols-remove', 0.5)
      await sleep(150)
      const nxt = run.steps[i + 1] || run
      setOrbs(Object.fromEntries(nxt.orbs || st.orbs))
      setView(nxt.grid || st.grid)
      play('symbols-drop', 0.5)
      await sleep(200)
    }
  }, [bet, play])

  /** one paid spin: the server draws everything (paid spin + any free spins), we replay it */
  const runSpin = useCallback(async () => {
    if (busyRef.current) return
    if (balance < bet) { setBanner('saldo kurang'); await sleep(1400); setBanner(''); return }
    busyRef.current = true
    setBusy(true)
    setWin(0)
    setHits([])
    setBanner('')
    setOrbs({})
    setFreeLeft(0)
    play('spin-start')

    for (let i = 0; i < 8; i++) {
      setView(spin())
      play('reel-stop', 0.25)
      await sleep(55)
    }

    try {
      const res = await apiSpin('gates', bet)
      const runs = res.detail.runs
      if (runs.length > 1) {
        setBanner(`FREE SPINS x${runs.length - 1}`)
        play('free-spins-start')
        await sleep(900)
      }
      for (let i = 0; i < runs.length; i++) {
        if (i > 0) { setFreeLeft(runs.length - i); play('free-spins-start', 0.45) }
        await replayRun(runs[i])
      }
      setFreeLeft(0)
      setWin(res.win)
      setUser((u) => ({ ...u, balance: res.balance }))
      if (res.win >= bet * 25) { play('big-win'); setBanner('BIG WIN!') }
      else if (res.win > 0) setBanner(res.win >= bet * 10 ? 'BIG WIN!' : 'WIN!')
      else play('near-miss', 0.3)
    } catch (e) {
      setBanner(e.message)
      await sleep(1600)
      setBanner('')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [balance, bet, play, replayRun, setUser])

  // autoplay
  useEffect(() => {
    if (busy || auto <= 0 || freeLeft > 0) return
    const t = setTimeout(() => {
      setAuto((n) => n - 1)
      runSpin()
    }, 700)
    return () => clearTimeout(t)
  }, [auto, busy, freeLeft, runSpin])

  const winNow = win
  return (
    <div className="gates">
      <img className="gates-bg" src="/gates/bg.jpg" alt="" />
      <div className="gates-veil" />
      <img className="gates-zeus" src="/gates/zeus.png" alt="" />

      <GameHeader name="Gates" accent="of Olympus" user={user}>
        <button className="round" onClick={() => setMusic((m) => !m)} title="Musik">{music ? '♪' : '♪̸'}</button>
        <button className="round" onClick={() => setSound((s) => !s)} title="Suara"><IconSound on={sound} /></button>
        <button className="game-btn" onClick={() => setShowPay((v) => !v)}>Paytable</button>
      </GameHeader>

      <aside className="gates-panel">
        <div className="game-win">
          <span>Menang</span>
          <b>{winNow ? fmt.format(winNow) : '—'}</b>
          <i>{winNow ? `${(winNow / bet).toFixed(2)}x bet` : 'putar buat mulai'}</i>
        </div>
        <button className="gates-spin" disabled={busy || freeLeft > 0 || balance < bet}
                onClick={() => { setAuto(0); runSpin(false) }}>
          {busy ? 'SPIN…' : freeLeft > 0 ? 'FREE' : 'SPIN'}
        </button>
        <div className="gates-bet">
          <button onClick={() => setBetIdx((i) => Math.max(0, i - 1))} disabled={busy || betIdx === 0}>−</button>
          <b>{fmt.format(bet)}</b>
          <button onClick={() => setBetIdx((i) => Math.min(BET_STEPS.length - 1, i + 1))} disabled={busy || betIdx === BET_STEPS.length - 1}>+</button>
        </div>
        <div className="gates-auto">
          {[10, 25, 50].map((n) => (
            <button key={n} className={auto > 0 && auto <= n ? 'on' : ''} disabled={busy || balance < bet}
                    onClick={() => setAuto(n)}>AUTO {n}</button>
          ))}
          {auto > 0 ? <button className="on" onClick={() => setAuto(0)}>STOP ({auto})</button> : null}
        </div>
        <p className="gates-note">
          {SPEC.maxCascades} cascade max · max win {SPEC.maxWinX}x · free spins {SPEC.freeSpins}
          <br />RTP terukur 95.7% · draw & saldo di server
        </p>
      </aside>

      <main className="gates-board" style={{ '--cell-w': `${CELL_W}px`, '--cell-h': `${CELL_H}px` }}>
        {Array.from({ length: REELS }, (_, r) => (
          <div className="gates-reel" key={r}>
            {Array.from({ length: ROWS }, (_, row) => {
              const id = view[r][row]
              const sym = BY_ID[id]
              const key = `${r}-${row}`
              const orbVal = orbBadges[key]
              return (
                <div className={`gates-cell ${hitSet.has(key) ? 'hit' : ''}`} key={row} data-busy={busy}>
                  <img src={sym.img} alt={sym.name} />
                  {sym.orb ? <span className="gates-orb">{orbVal ? `x${orbVal}` : ''}</span> : null}
                </div>
              )
            })}
          </div>
        ))}
        {banner ? <div className={`game-banner ${banner.includes('BIG') ? 'big' : ''}`}>{banner}</div> : null}
        {freeLeft > 0 ? <div className="game-free">Free spins sisa <b>{freeLeft}</b></div> : null}
      </main>

      {showPay ? (
        <div className="paymodal" onClick={() => setShowPay(false)}>
          <div className="paycard" onClick={(e) => e.stopPropagation()}>
            <h3>Paytable — Gates of Olympus</h3>
            <p className="payhint">
              6 reel × 5 baris, bayar di mana saja (count-based). Angka = kelipatan total bet (bet {fmt.format(bet)}).
              Orb pengali (2x–500x) mengalikan kemenangan tumble dan tetap tinggal selama cascade.
            </p>
            <div className="paygrid">
              {SYMBOLS.map((s) => (
                <div className="payrow" key={s.id}>
                  <img src={s.img} alt={s.name} />
                  <b>{s.name}{s.scatter ? ' (scatter)' : s.orb ? ' (multiplier orb)' : ''}</b>
                  <span>{s.orb ? '2x – 500x, dijumlahkan lalu dikali ke win' : s.pays.map(([c, p]) => `${c}+ → ${p}x`).join('   ')}</span>
                </div>
              ))}
            </div>
            <p className="payhint">
              4+ Zeus = {SPEC.freeSpins} free spins · 3+ Zeus saat free spins = +{SPEC.retriggerSpins} spins ·
              maksimum {SPEC.maxCascades} cascade per spin
            </p>
            <button className="game-btn" onClick={() => setShowPay(false)}>Tutup</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
