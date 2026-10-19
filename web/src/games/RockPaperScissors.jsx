import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PIC = {
  ROCK: '/casino/images/play/rock.png',
  PAPER: '/casino/images/play/paper.png',
  SCISSORS: '/casino/images/play/scissors.png',
}

export default function RockPaperScissors({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('rock_paper_scissors')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('rock')
  const [opponent, setOpponent] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [final, setFinal] = useState(null)

  const onPlay = async () => {
    setFinal(null)
    setOpponent(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    for (const n of ['3', '2', '1']) {
      setCountdown(n)
      await sleep(550)
    }
    setCountdown('SHOOT')
    setOpponent(res.result)
    await sleep(700)
    setCountdown(null)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <div className={`row dolly tilt soft ${countdown ? 'close' : ''}`} style={{ gap: 30, justifyContent: 'center' }}>
          <div className="card-slot">
            <div className="slot-label">YOU</div>
            <img src={PIC[choose.toUpperCase()]} alt={choose} style={{ width: 110, height: 110, objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold)', minWidth: 80 }}>
            {countdown || 'VS'}
          </div>
          <div className="card-slot">
            <div className="slot-label">OPPONENT</div>
            {opponent ? (
              <img
                src={PIC[opponent] || PIC.ROCK}
                alt={opponent}
                className="dice-pop"
                style={{ width: 110, height: 110, objectFit: 'contain' }}
              />
            ) : (
              <div style={{ width: 110, height: 110, borderRadius: 14, background: 'var(--bg2)', border: '1px dashed var(--border)' }} />
            )}
          </div>
        </div>
        {final ? (
          <ResultBanner outcome={final.win_status} amount={final.win_amount} message={final.message} fmtMoney={fmtMoney} />
        ) : (
          <div className="muted">Rock beats scissors, scissors beats paper, paper beats rock</div>
        )}
        {final?.gameplay_bonus ? (
          <div className="info-box">Gameplay bonus credited: {fmtMoney(final.gameplay_bonus)}</div>
        ) : null}
      </div>

      <BetPanel
        game={game}
        invest={investAmt}
        setInvest={setInvestAmt}
        busy={busy || !!countdown}
        onPlay={onPlay}
        playLabel="Play Round"
      >
        <label className="small muted" style={{ fontWeight: 700 }}>Your move</label>
        <div className="choices" style={{ marginTop: 10 }}>
          {['rock', 'paper', 'scissors'].map((move) => (
            <button
              key={move}
              type="button"
              className={`choice ${choose === move ? 'selected' : ''}`}
              disabled={busy || !!countdown}
              onClick={() => setChoose(move)}
            >
              <img src={PIC[move.toUpperCase()]} alt={move} style={{ width: 44, height: 44 }} />
              <span className="label">{move.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </BetPanel>
    </div>
  )
}
