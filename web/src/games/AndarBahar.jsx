import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, FlipCard, ResultBanner, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function AndarBahar({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('andar_bahar')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('andar')
  const [start, setStart] = useState(null)
  const [final, setFinal] = useState(null)
  const [revealing, setRevealing] = useState(false)

  const onPlay = async () => {
    setFinal(null)
    setStart(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    setStart(res)
    setRevealing(true)
    await sleep(1400)
    setRevealing(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  return (
    <div className="game-shell">
      <div className="panel stage" style={{ gap: 18 }}>
        <ErrorBox error={error} onCancel={cancelRound} />

        <div className="card-slot">
          <div className="slot-label">JOKER CARD</div>
          <FlipCard card={start ? start.randomCard : null} width={84} height={118} />
        </div>

        <div
          className={`dolly tilt ${revealing ? 'close' : ''}`}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, width: '100%', maxWidth: 640 }}
        >
          <div className="card-slot">
            <div className="slot-label" style={{ color: choose === 'andar' ? 'var(--gold)' : undefined }}>
              ANDAR {choose === 'andar' ? '(your bet)' : ''}
            </div>
            <div className="card-row">
              {(start?.andarCards || []).map((c, i) => (
                <FlipCard key={`a${i}`} card={revealing ? null : c} width={54} height={78} />
              ))}
              {!start ? <div className="muted small">-</div> : null}
            </div>
          </div>
          <div className="card-slot">
            <div className="slot-label" style={{ color: choose === 'bahar' ? 'var(--gold)' : undefined }}>
              BAHAR {choose === 'bahar' ? '(your bet)' : ''}
            </div>
            <div className="card-row">
              {(start?.baharCards || []).map((c, i) => (
                <FlipCard key={`b${i}`} card={revealing ? null : c} width={54} height={78} />
              ))}
              {!start ? <div className="muted small">-</div> : null}
            </div>
          </div>
        </div>

        {revealing ? <div className="muted">Dealing cards...</div> : null}
        {final ? (
          <ResultBanner outcome={final.win_status} amount={final.win_amount} message={final.message} fmtMoney={fmtMoney} />
        ) : !revealing && !start ? (
          <div className="muted">Bet ANDAR or BAHAR - the first side to match the joker card wins</div>
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
        playLabel="Deal Cards"
      >
        <label className="small muted" style={{ fontWeight: 700 }}>Your side</label>
        <div className="choices" style={{ marginTop: 10 }}>
          <button
            type="button"
            className={`choice ${choose === 'andar' ? 'selected' : ''}`}
            style={{ minWidth: 110 }}
            disabled={busy || revealing}
            onClick={() => setChoose('andar')}
          >
            <img src="/casino/images/games/andar.png" alt="andar" style={{ width: 46, height: 46 }} />
            <span className="label">ANDAR</span>
          </button>
          <button
            type="button"
            className={`choice ${choose === 'bahar' ? 'selected' : ''}`}
            style={{ minWidth: 110 }}
            disabled={busy || revealing}
            onClick={() => setChoose('bahar')}
          >
            <img src="/casino/images/games/bahar.png" alt="bahar" style={{ width: 46, height: 46 }} />
            <span className="label">BAHAR</span>
          </button>
        </div>
      </BetPanel>
    </div>
  )
}
