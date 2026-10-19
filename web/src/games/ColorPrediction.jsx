import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'

const COLOR_GROUPS = {
  green: [1, 3, 5, 7, 9],
  violet: [0, 5],
  red: [2, 4, 6, 8, 0],
}

const numberStyle = (n) => {
  if (n === 0) return { background: 'linear-gradient(135deg, #ef4444 50%, #8b5cf6 50%)' }
  if (n === 5) return { background: 'linear-gradient(135deg, #22c55e 50%, #8b5cf6 50%)' }
  if (COLOR_GROUPS.green.includes(n)) return { background: 'radial-gradient(circle at 35% 30%, #4ade80, #15803d)' }
  return { background: 'radial-gradient(circle at 35% 30%, #f87171, #b91c1c)' }
}

export default function ColorPrediction({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('color_prediction')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('green')
  const [result, setResult] = useState(null)
  const [drawing, setDrawing] = useState(false)
  const [final, setFinal] = useState(null)

  const onPlay = async () => {
    setFinal(null)
    setResult(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    setDrawing(true)
    for (let i = 0; i < 14; i++) {
      setResult(Math.floor(Math.random() * 10))
      await new Promise((r) => setTimeout(r, 105))
    }
    setResult(res.result)
    setDrawing(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  const options = [
    { key: 'green', label: 'GREEN', ratio: '2x', cls: 'green-side' },
    { key: 'violet', label: 'VIOLET', ratio: '4.5x', cls: '' },
    { key: 'red', label: 'RED', ratio: '2x', cls: 'red-side' },
  ]

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        {result != null ? (
          <div
            className={`result-number dice-pop dolly ${drawing ? 'close' : ''}`}
            style={{ ...numberStyle(result), border: '4px solid rgba(255,255,255,.25)' }}
          >
            {result}
          </div>
        ) : (
          <div
            className={`result-number dolly ${drawing ? 'close' : ''}`}
            style={{ background: '#1d2440', fontSize: '1.6rem' }}
          >
            ?
          </div>
        )}
        {final ? (
          <ResultBanner outcome={final.win_status} amount={final.win_amount} message={final.message} fmtMoney={fmtMoney} />
        ) : !drawing ? (
          <div className="muted">Predict the number (0-9), its color group, or violet</div>
        ) : null}
        {final?.gameplay_bonus ? (
          <div className="info-box">Gameplay bonus credited: {fmtMoney(final.gameplay_bonus)}</div>
        ) : null}
      </div>

      <BetPanel
        game={game}
        invest={investAmt}
        setInvest={setInvestAmt}
        busy={busy || drawing}
        onPlay={onPlay}
        playLabel="Place Prediction"
        summary={
          <div className="muted small">
            Selected: <b style={{ color: 'var(--gold)' }}>{choose.toUpperCase()}</b>
          </div>
        }
      >
        <div className="choices" style={{ gap: 10, marginBottom: 14 }}>
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`choice ${o.cls} ${choose === o.key ? 'selected' : ''}`}
              style={{ minWidth: 92, padding: '10px 12px' }}
              disabled={busy || drawing}
              onClick={() => setChoose(o.key)}
            >
              <span className={`ball b-${o.key}`} />
              <span className="label">{o.label}</span>
              <span className="small muted">{o.ratio}</span>
            </button>
          ))}
        </div>
        <label className="small muted" style={{ fontWeight: 700 }}>Or a single number (9x)</label>
        <div className="num-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginTop: 10 }}>
          {Array.from({ length: 10 }, (_, i) => String(i)).map((n) => (
            <button
              key={n}
              type="button"
              className={`num-cell round ${choose === n ? 'picked' : ''}`}
              style={numberStyle(Number(n))}
              disabled={busy || drawing}
              onClick={() => setChoose(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </BetPanel>
    </div>
  )
}
