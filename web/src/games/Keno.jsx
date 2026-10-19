import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function Keno({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('keno')
  const [investAmt, setInvestAmt] = useState(10)
  const [picked, setPicked] = useState([])
  const [drawn, setDrawn] = useState([])
  const [revealing, setRevealing] = useState(false)
  const [final, setFinal] = useState(null)

  const maxSelect = Number(game?.level?.max_select_number || 10)
  const levels = game?.level?.levels || []

  const toggle = (n) => {
    if (revealing || busy) return
    setPicked((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n)
      if (prev.length >= maxSelect) return prev
      return [...prev, n]
    })
  }

  const onPlay = async () => {
    setFinal(null)
    setDrawn([])
    const res = await invest({ invest: investAmt, choose: picked })
    if (!res) return
    setRevealing(true)
    const all = res.result || []
    for (const n of all) {
      setDrawn((prev) => [...prev, n])
      await sleep(140)
    }
    setRevealing(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  const cellClass = (n) => {
    const isPicked = picked.includes(n)
    const isDrawn = drawn.includes(n)
    if (isDrawn && isPicked) return 'hit'
    if (isDrawn) return 'drawn'
    if (isPicked) return 'picked'
    return ''
  }

  return (
    <div className="game-shell">
      <div className="panel stage" style={{ gap: 16 }}>
        <ErrorBox error={error} onCancel={cancelRound} />
        <div className="spread" style={{ width: '100%', maxWidth: 640 }}>
          <span className="muted small">Pick {picked.length}/{maxSelect} numbers</span>
          <span className="muted small">{drawn.length ? `Drawn: ${drawn.length}/${maxSelect}` : 'Ready'}</span>
        </div>
        {drawn.length ? (
          <div className="ball-row">
            {drawn.map((n) => (
              <span key={n} className={`ball b-${picked.includes(n) ? 'hit' : 'drawn'}`}>{n}</span>
            ))}
          </div>
        ) : null}
        <div className={`num-grid dolly tilt ${revealing ? 'close' : ''}`}>
          {Array.from({ length: 80 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`num-cell ${cellClass(n)}`}
              disabled={revealing || busy}
              onClick={() => toggle(n)}
            >
              {n}
            </button>
          ))}
        </div>
        {final ? (
          <ResultBanner outcome={final.win_status} amount={final.win_amount} message={final.message} fmtMoney={fmtMoney} />
        ) : null}
        {final?.gameplay_bonus ? (
          <div className="info-box">Gameplay bonus credited: {fmtMoney(final.gameplay_bonus)}</div>
        ) : null}
      </div>

      <BetPanel
        game={game}
        invest={investAmt}
        setInvest={setInvestAmt}
        busy={busy || revealing}
        onPlay={onPlay}
        playDisabled={picked.length === 0}
        playLabel="Start Draw"
        summary={
          <div>
            <div className="muted small" style={{ marginBottom: 6 }}>Paytable (matches - bonus)</div>
            {levels.map((l) => (
              <div className="line" key={l.level}>
                <span>{l.level} matches</span>
                <b>+{l.percent}%</b>
              </div>
            ))}
          </div>
        }
      >
        <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="chip-btn" disabled={revealing || busy} onClick={() => setPicked([])}>
            Clear
          </button>
          <button
            type="button"
            className="chip-btn"
            disabled={revealing || busy}
            onClick={() => {
              const set = new Set()
              while (set.size < maxSelect) set.add(Math.floor(Math.random() * 80) + 1)
              setPicked([...set].sort((a, b) => a - b))
            }}
          >
            Random {maxSelect}
          </button>
        </div>
      </BetPanel>
    </div>
  )
}
