import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const OPTIONS = [
  { key: '1', label: '1', img: '/casino/images/games/1.png' },
  { key: '2', label: '2', img: '/casino/images/games/2.png' },
  { key: '5', label: '5', img: '/casino/images/games/5.png' },
  { key: '10', label: '10', img: '/casino/images/games/10.png' },
  { key: 'coin_flip', label: 'Coin Flip', img: '/casino/images/games/coin_flip.png' },
  { key: 'pachinko', label: 'Pachinko', img: '/casino/images/games/pachinko.png' },
  { key: 'cash_hunt', label: 'Cash Hunt', img: '/casino/images/games/cash_hunt.png' },
  { key: 'crazy_times', label: 'Crazy Time', img: '/casino/images/games/crazy_times.png' },
]

const labelOf = (key) => OPTIONS.find((o) => o.key === String(key))?.label || String(key)

export default function CrazyTimes({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('crazy_times')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('1')
  const [landed, setLanded] = useState(null)
  const [scrolling, setScrolling] = useState(false)
  const [final, setFinal] = useState(null)

  const onPlay = async () => {
    setFinal(null)
    setLanded(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    setScrolling(true)
    for (let i = 0; i < 18; i++) {
      setLanded(OPTIONS[Math.floor(Math.random() * OPTIONS.length)].key)
      await sleep(110)
    }
    setLanded(String(res.point ?? res.result))
    setScrolling(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <div className={`choices dolly tilt soft ${scrolling ? 'close' : ''}`} style={{ maxWidth: 560 }}>
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`choice ${choose === o.key ? 'selected' : ''}`}
              style={{
                minWidth: 0, padding: 10,
                borderColor: landed === o.key ? 'var(--gold)' : undefined,
                boxShadow: landed === o.key ? '0 0 22px rgba(245,183,49,.55)' : undefined,
                transform: landed === o.key ? 'translateY(-4px) scale(1.05)' : undefined,
              }}
              disabled={busy || scrolling}
              onClick={() => setChoose(o.key)}
            >
              <img src={o.img} alt={o.label} style={{ width: 54, height: 54 }} />
              <span className="label" style={{ fontSize: '0.72rem' }}>{o.label}</span>
            </button>
          ))}
        </div>
        {scrolling ? <div className="muted">The wheel is turning...</div> : null}
        {!scrolling && landed ? <div className="muted">Landed on: <b style={{ color: 'var(--gold)' }}>{labelOf(landed)}</b></div> : null}
        {final ? (
          <ResultBanner outcome={final.win_status} amount={final.win_amount} message={final.message} fmtMoney={fmtMoney} />
        ) : !scrolling && !landed ? (
          <div className="muted">Bet on 1/2/5/10 or one of the four bonus rounds</div>
        ) : null}
        {final?.gameplay_bonus ? (
          <div className="info-box">Gameplay bonus credited: {fmtMoney(final.gameplay_bonus)}</div>
        ) : null}
      </div>

      <BetPanel
        game={game}
        invest={investAmt}
        setInvest={setInvestAmt}
        busy={busy || scrolling}
        onPlay={onPlay}
        playLabel="Spin"
        summary={
          <div>
            <div className="line"><span>1 or 2</span><b>2x / 3x</b></div>
            <div className="line"><span>5 or 10</span><b>6x / 11x</b></div>
            <div className="line muted small"><span>Bonus rounds</span>stake + bonus %</div>
          </div>
        }
      >
        <div className="muted small">
          Selected: <b style={{ color: 'var(--gold)' }}>{labelOf(choose)}</b>
        </div>
      </BetPanel>
    </div>
  )
}
