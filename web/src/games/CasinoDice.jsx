import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function CasinoDice({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('casino_dice')
  const [investAmt, setInvestAmt] = useState(10)
  const [percent, setPercent] = useState(50)
  const [choose, setChoose] = useState('low')
  const [rolled, setRolled] = useState(null)
  const [rolling, setRolling] = useState(false)
  const [final, setFinal] = useState(null)

  const payout = Math.round((99 / percent) * 100) / 100
  const potential = Math.round(Number(investAmt || 0) * payout * 100) / 100

  const onPlay = async () => {
    setFinal(null)
    setRolled(null)
    const res = await invest({ invest: investAmt, percent, choose })
    if (!res) return
    setRolling(true)
    const target = parseInt(res.result, 10)
    for (let i = 0; i < 18; i++) {
      setRolled(Math.floor(Math.random() * 9900) + 100)
      await sleep(85)
    }
    setRolled(target)
    setRolling(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  const show = (v) => (v == null ? '00.00' : String(v).padStart(4, '0').replace(/^(\d{2})(\d{2})$/, '$1.$2'))

  const winZone = `${(percent).toFixed(2)}% range`

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <div
          className={`result-number dolly ${rolling ? 'close' : 'dice-pop'}`}
          style={{
            width: 150, height: 150, fontSize: '2rem', borderRadius: 20,
            background: 'linear-gradient(180deg, #1d2440, #10152b)',
            border: '2px solid var(--gold)', color: 'var(--gold)',
          }}
        >
          {show(rolled)}
        </div>
        <div className="range-wrap">
          <div className="range-track">
            <span
              className="range-zone"
              style={{ left: choose === 'low' ? '0%' : `${100 - percent}%`, width: `${percent}%` }}
            />
            {rolled != null ? <span className="range-marker" style={{ left: `${rolled / 100}%` }} /> : null}
          </div>
          <div className="range-ends">
            <span>00.00</span>
            <span className={rolling ? '' : 'muted'}>
              {choose.toUpperCase()} {choose === 'low' ? `< ${percent.toFixed(2)}` : `> ${(100 - percent).toFixed(2)}`}
            </span>
            <span>99.00</span>
          </div>
        </div>
        <div className="muted small">
          Roll number between 00.00 and 99.00 - {choose.toUpperCase()} rolls {choose === 'low' ? `under ${percent.toFixed(2)}` : `over ${(100 - percent).toFixed(2)}`}
        </div>
        {rolling ? <div className="muted">Rolling...</div> : null}
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
        busy={busy || rolling}
        onPlay={onPlay}
        playLabel="Roll"
        summary={
          <div>
            <div className="line"><span>Win chance ({winZone})</span><b>{percent}%</b></div>
            <div className="line"><span>Payout multiplier</span><b>{payout}x</b></div>
            <div className="line"><span>Potential return</span><b>{fmtMoney(potential)}</b></div>
          </div>
        }
      >
        <label className="small muted" style={{ fontWeight: 700 }}>
          Win chance: <span style={{ color: 'var(--gold)' }}>{percent}%</span>
        </label>
        <input
          type="range"
          min="2"
          max="98"
          step="1"
          value={percent}
          disabled={busy || rolling}
          onChange={(e) => setPercent(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--gold)', margin: '10px 0 14px' }}
        />
        <div className="choices" style={{ gap: 10 }}>
          <button
            type="button"
            className={`choice ${choose === 'low' ? 'selected' : ''}`}
            style={{ minWidth: 110, padding: '12px 14px' }}
            disabled={busy || rolling}
            onClick={() => setChoose('low')}
          >
            <span className="label">LOW</span>
            <span className="small muted">roll under {percent.toFixed(2)}</span>
          </button>
          <button
            type="button"
            className={`choice ${choose === 'high' ? 'selected' : ''}`}
            style={{ minWidth: 110, padding: '12px 14px' }}
            disabled={busy || rolling}
            onClick={() => setChoose('high')}
          >
            <span className="label">HIGH</span>
            <span className="small muted">roll over {(100 - percent).toFixed(2)}</span>
          </button>
        </div>
      </BetPanel>
    </div>
  )
}
