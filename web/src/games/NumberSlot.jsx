import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function NumberSlot({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('number_slot')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('0')
  const [reels, setReels] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [final, setFinal] = useState(null)

  const levels = Array.isArray(game?.level) ? game.level : [100, 150, 200]

  const onPlay = async () => {
    setFinal(null)
    setReels(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    setSpinning(true)
    const startAt = Date.now()
    while (Date.now() - startAt < 1800) {
      setReels([
        String(Math.floor(Math.random() * 10)),
        String(Math.floor(Math.random() * 10)),
        String(Math.floor(Math.random() * 10)),
      ])
      await sleep(80)
    }
    const result = (res.result || []).map((d) => String(d))
    setReels(result)
    setSpinning(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal({ ...done, result })
  }

  const matchedCount = final ? (final.result || []).filter((d) => d === choose).length : 0

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <div className={`digit-strip dolly ${spinning ? 'close' : ''}`}>
          {(reels || ['?', '?', '?']).map((d, i) => (
            <div key={i} className={`digit-box ${spinning ? 'spinning' : ''} ${!spinning && d === choose ? 'win' : ''}`}>
              <span className="reel-digit">{d}</span>
            </div>
          ))}
        </div>
        {final ? (
          <ResultBanner
            outcome={final.win_status}
            amount={final.win_amount}
            message={`${matchedCount} matching reel${matchedCount === 1 ? '' : 's'}`}
            fmtMoney={fmtMoney}
          />
        ) : !spinning ? (
          <div className="muted">Pick a digit - the reels repeat it 0-3 times</div>
        ) : null}
        {final?.gameplay_bonus ? (
          <div className="info-box">Gameplay bonus credited: {fmtMoney(final.gameplay_bonus)}</div>
        ) : null}
      </div>

      <BetPanel
        game={game}
        invest={investAmt}
        setInvest={setInvestAmt}
        busy={busy || spinning}
        onPlay={onPlay}
        playLabel="Spin Reels"
        summary={
          <div>
            <div className="line"><span>1 match</span><b>{levels[0] || 100}%</b></div>
            <div className="line"><span>2 matches</span><b>{levels[1] || 150}%</b></div>
            <div className="line"><span>3 matches</span><b>{levels[2] || 200}%</b></div>
            <div className="muted small">Payouts are total return on your stake</div>
          </div>
        }
      >
        <label className="small muted" style={{ fontWeight: 700 }}>Your digit</label>
        <div className="num-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginTop: 10 }}>
          {Array.from({ length: 10 }, (_, i) => String(i)).map((d) => (
            <button
              key={d}
              type="button"
              className={`num-cell ${choose === d ? 'picked' : ''}`}
              disabled={busy || spinning}
              onClick={() => setChoose(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </BetPanel>
    </div>
  )
}
