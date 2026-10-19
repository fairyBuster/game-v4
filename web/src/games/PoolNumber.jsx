import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function PoolNumber({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('number_pool')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('1')
  const [drawn, setDrawn] = useState(null)
  const [counting, setCounting] = useState(false)
  const [final, setFinal] = useState(null)

  const onPlay = async () => {
    setFinal(null)
    setDrawn(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    setCounting(true)
    for (let i = 0; i < 12; i++) {
      setDrawn(String(Math.floor(Math.random() * 8) + 1))
      await sleep(110)
    }
    setDrawn(String(res.result))
    setCounting(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <div className={`choices dolly tilt soft ${counting ? 'close' : ''}`} style={{ maxWidth: 560 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              type="button"
              className={`choice ${choose === String(n) ? 'selected' : ''}`}
              style={{
                minWidth: 0,
                padding: 8,
                borderColor: drawn === String(n) ? 'var(--gold)' : undefined,
                boxShadow: drawn === String(n) ? '0 0 22px rgba(245,183,49,.45)' : undefined,
              }}
              disabled={busy || counting}
              onClick={() => setChoose(String(n))}
            >
              <img src={`/casino/images/games/pool${n}.png`} alt={`pool ${n}`} style={{ width: 52, height: 52 }} />
            </button>
          ))}
        </div>
        {counting ? <div className="muted">Drawing a ball...</div> : null}
        {!counting && drawn && !final ? <div className="muted">Ball drawn: {drawn}</div> : null}
        {final ? (
          <ResultBanner
            outcome={final.win_status}
            amount={final.win_amount}
            message={`${final.message} (Ball: ${final.result})`}
            fmtMoney={fmtMoney}
          />
        ) : !counting && !drawn ? (
          <div className="muted">Pick one of the 8 pool balls</div>
        ) : null}
        {final?.gameplay_bonus ? (
          <div className="info-box">Gameplay bonus credited: {fmtMoney(final.gameplay_bonus)}</div>
        ) : null}
      </div>

      <BetPanel
        game={game}
        invest={investAmt}
        setInvest={setInvestAmt}
        busy={busy || counting}
        onPlay={onPlay}
        playLabel="Draw Ball"
      >
        <div className="muted small">
          Selected ball: <b style={{ color: 'var(--gold)' }}>#{choose}</b>
        </div>
      </BetPanel>
    </div>
  )
}
