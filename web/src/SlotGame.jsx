import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LINES, REELS, ROWS, SYMBOLS } from './slot/engine.js'
import { fmt } from './games.js'
import { spin as apiSpin } from './api.js'
import GameHeader from './GameHeader.jsx'
import { IconSound } from './icons.jsx'
import './slot.css'

const BY_ID = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]))
const BET_STEPS = [200, 500, 1000, 2500, 5000, 10000]
const CELL_W = 124
const CELL_H = 148
const GAP = 2                            // horizontal gap between reels — must match .reels gap in slot.css
const STRIP_EXTRA = 14                  // random cells above the final three
const BASE_MS = 700                     // first reel stop
const STAGGER_MS = 150                  // each next reel is this much later
const SOUNDS = ['click', 'wheel', 'ding', 'addCoinsEfc', 'award', 'grandPrize', 'effect']
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)]
const anySymbol = () => rnd(SYMBOLS).id

export default function SlotGame({ user, setUser }) {
  const [betIdx, setBetIdx] = useState(2)                 // 1000
  const [grid, setGrid] = useState(() => Array.from({ length: REELS }, () => Array(ROWS).fill('msilver')))
  const [strips, setStrips] = useState(null)
  const [spinId, setSpinId] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [freeLeft, setFreeLeft] = useState(0)
  const [autoLeft, setAutoLeft] = useState(0)
  const [showPay, setShowPay] = useState(false)
  const [sound, setSound] = useState(true)
  const [banner, setBanner] = useState('')

  const bet = BET_STEPS[betIdx]
  const balance = user?.balance ?? 0
  const busy = useRef(false)
  const timers = useRef([])
  const audio = useRef({})

  useEffect(() => {
    audio.current = Object.fromEntries(SOUNDS.map((n) => [n, new Audio(`/dy01/audio/${n}.mp3`)]))
  }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const play = useCallback((n) => {
    if (!sound) return
    const a = audio.current[n]
    if (!a) return
    try { a.currentTime = 0; a.play().catch(() => {}) } catch { /* ignore */ }
  }, [sound])

  /** animate one resolved round (paid or free); the server already decided the outcome */
  const runRound = useCallback(async (nextGrid, res) => {
    setGrid(nextGrid)
    setStrips(nextGrid.map((col) => [...col, ...Array.from({ length: STRIP_EXTRA }, anySymbol)]))
    setSpinId((n) => n + 1)
    setSpinning(true)
    setResult(null)
    play('wheel')
    for (let i = 0; i < REELS; i++) timers.current.push(setTimeout(() => play('ding'), BASE_MS + i * STAGGER_MS))
    await wait(BASE_MS + (REELS - 1) * STAGGER_MS + 260)
    setSpinning(false)
    setStrips(null)
    setResult(res)
    if (res.total > 0) {
      play(res.total >= bet * 15 ? 'grandPrize' : 'addCoinsEfc')
      if (res.total >= bet * 15) setBanner('BIG WIN!')
      else if (res.total >= bet * 5) setBanner('WIN!')
    } else play('click')
    await wait(520)
  }, [bet, play])

  /** one paid round: server draws, we replay it plus any free spins it awarded */
  const doSpin = useCallback(async () => {
    if (busy.current) return
    if (balance < bet) { setBanner('saldo kurang'); await wait(1400); setBanner(''); return }
    busy.current = true
    setBanner('')
    setShowPay(false)
    try {
      const res = await apiSpin('dy01_slot', bet)
      const d = res.detail
      await runRound(d.grid, d.result)
      setUser((u) => ({ ...u, balance: res.balance }))
      if (d.free.length) {
        setBanner(`FREE SPINS x${d.free.length}`)
        play('award')
        await wait(800)
      }
      for (let i = 0; i < d.free.length; i++) {
        setFreeLeft(d.free.length - i)
        await runRound(d.free[i].grid, d.free[i].result)
      }
      setFreeLeft(0)
      if (res.win >= bet * 15) setBanner('BIG WIN!')
    } catch (e) {
      setBanner(e.message)
      await wait(1600)
      setBanner('')
    } finally {
      busy.current = false
    }
  }, [balance, bet, runRound, setUser, play])

  // autoplay
  useEffect(() => {
    if (!autoLeft || spinning || freeLeft > 0) return
    const t = setTimeout(() => { setAutoLeft((n) => n - 1); doSpin() }, 800)
    return () => clearTimeout(t)
  }, [autoLeft, spinning, freeLeft, doSpin])

  const hitCells = useMemo(() => {
    const s = new Set()
    if (result && !spinning) for (const w of result.lineWins) for (const [reel, row] of w.cells) s.add(`${reel}-${row}`)
    return s
  }, [result, spinning])

  const winTotal = result && !spinning ? result.total : 0
  const lineBet = bet / LINES.length

  return (
    <div className="slot">
      <img className="lobby-bg" src="/dy01/bg_hall.jpg" alt="" />
      <div className="slot-veil" />

      <GameHeader name="DY01" accent="Slots" user={user}>
        <button className="round" onClick={() => setSound((s) => !s)} title="Suara"><IconSound on={sound} /></button>
        <button className="game-btn" onClick={() => { setShowPay((v) => !v); play('click') }}>Paytable</button>
      </GameHeader>

      <main className="slot-mid">
        <div className="reels" style={{ '--cell-h': `${CELL_H}px`, '--cell-w': `${CELL_W}px` }}>
          {Array.from({ length: REELS }, (_, r) => (
            <div className="reel" key={r} data-spinning={spinning}>
              <div
                className="reel-strip"
                key={`${spinId}-${r}`}
                style={spinning ? { animationDuration: `${(BASE_MS + r * STAGGER_MS + 260) / 1000}s` } : undefined}
              >
                {(spinning ? strips[r] : grid[r]).map((id, i) => (
                  <div className="cell" key={i}>
                    <img src={BY_ID[id].img} alt={BY_ID[id].name} />
                  </div>
                ))}
              </div>
              {!spinning && grid[r].map((id, row) => (
                hitCells.has(`${r}-${row}`) ? <span className="glow" key={row} style={{ top: row * CELL_H }} /> : null
              ))}
            </div>
          ))}

          {result && !spinning && result.lineWins.length > 0 && (
            <svg className="lines" width={REELS * CELL_W + (REELS - 1) * GAP} height={ROWS * CELL_H}>
              {result.lineWins.map((w) => (
                <polyline
                  key={w.line}
                  points={w.cells.map(([reel, row]) => `${reel * (CELL_W + GAP) + CELL_W / 2},${row * CELL_H + CELL_H / 2}`).join(' ')}
                />
              ))}
            </svg>
          )}

          {spinning && <div className="slot-dim" />}
          {banner ? <div className={`game-banner ${banner.startsWith('BIG') ? 'big' : ''}`}>{banner}</div> : null}
          {freeLeft > 0 ? <div className="game-free">Free spins sisa <b>{freeLeft}</b></div> : null}
        </div>

        <aside className="slot-side">
          <div className="game-win">
            <span>Menang</span>
            <b>{winTotal ? fmt.format(winTotal) : '—'}</b>
            {result && !spinning ? <i>{result.lineWins.length} line · scatter {result.scatter}</i> : <i>&nbsp;</i>}
          </div>
          <div className="slot-lines">
            <span>Lines</span><b>{LINES.length}</b>
            <span>Line bet</span><b>{fmt.format(lineBet)}</b>
            <span>Total bet</span><b>{fmt.format(bet)}</b>
          </div>
          <button className="slot-spin" disabled={spinning || freeLeft > 0 || balance < bet} onClick={() => { setAutoLeft(0); doSpin() }}>
            {spinning ? 'SPIN…' : freeLeft > 0 ? 'FREE' : 'SPIN'}
          </button>
          <div className="slot-bet">
            <button onClick={() => setBetIdx((i) => Math.max(0, i - 1))} disabled={spinning || betIdx === 0}>−</button>
            <b>{fmt.format(bet)}</b>
            <button onClick={() => setBetIdx((i) => Math.min(BET_STEPS.length - 1, i + 1))} disabled={spinning || betIdx === BET_STEPS.length - 1}>+</button>
          </div>
          <div className="slot-auto">
            {[10, 25, 50].map((n) => (
              <button key={n} className={autoLeft > 0 && autoLeft <= n ? 'on' : ''} disabled={spinning || balance < bet}
                      onClick={() => { play('click'); setAutoLeft(n) }}>AUTO {n}</button>
            ))}
            {autoLeft > 0 ? <button className="on" onClick={() => setAutoLeft(0)}>STOP ({autoLeft})</button> : null}
          </div>
          <p className="slot-note">Demo balance, RNG-nya ada di client (`src/slot/engine.js`) — kalau mau uang beneran, pindahin ke backend.</p>
        </aside>
      </main>

      {showPay ? (
        <div className="paymodal" onClick={() => setShowPay(false)}>
          <div className="paycard" onClick={(e) => e.stopPropagation()}>
            <h3>Paytable</h3>
            <p className="payhint">Bayaran dalam satuan line bet ({fmt.format(lineBet)}). 20 line, 3+ simbol dari kiri.</p>
            <div className="paygrid">
              {SYMBOLS.map((s) => (
                <div className="payrow" key={s.id}>
                  <img src={s.img} alt={s.name} />
                  <b>{s.name}{s.wild ? ' (wild)' : s.scatter ? ' (scatter)' : ''}</b>
                  <span>{s.scatter
                    ? `3→1×bet · 4→5× · 5→20× + free spins`
                    : (s.pays || []).map((p, i) => `${i + 3}× ${p}`).join('  ·  ')}</span>
                </div>
              ))}
            </div>
            <h4>Line patterns</h4>
            <div className="paylines">
              {LINES.map((line, i) => (
                <div className="payline" key={i} title={`line ${i + 1}`}>
                  {Array.from({ length: REELS * ROWS }, (_, c) => {
                    const reel = c % REELS
                    const row = Math.floor(c / REELS)
                    return <i key={c} className={line[reel] === row ? 'on' : ''} />
                  })}
                </div>
              ))}
            </div>
            <button className="game-btn" onClick={() => setShowPay(false)}>Tutup</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
