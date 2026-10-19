import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'

export default function NumberGuess({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('number_guess')
  const [investAmt, setInvestAmt] = useState(10)
  const [guess, setGuess] = useState('')
  const [logId, setLogId] = useState(null)
  const [history, setHistory] = useState([]) // [{number, hint}]
  const [hint, setHint] = useState(null)
  const [tries, setTries] = useState(0)
  const [final, setFinal] = useState(null)

  const bonuses = game?.guess_bonuses || []
  const maxTries = bonuses.length || 5
  const nextBonus = bonuses.find((b) => b.chance === tries + 1)?.percent ?? bonuses[0]?.percent
  // backend: hint "low" = the guess was too high, so the secret is lower
  const loGuess = history.reduce((m, h) => (h.hint === 'high' ? Math.max(m, h.number) : m), 0)
  const hiGuess = history.reduce((m, h) => (h.hint === 'low' ? Math.min(m, h.number) : m), 100)

  const startGame = async () => {
    setFinal(null)
    setHistory([])
    setHint(null)
    setTries(0)
    setLogId(null)
    const res = await invest({ invest: investAmt })
    if (!res) return
    setLogId(res.game_log_id)
  }

  const submitGuess = async () => {
    if (!logId) return
    const n = parseInt(guess, 10)
    if (Number.isNaN(n) || n < 0 || n > 100) return
    const res = await end({ game_log_id: logId, number: n })
    if (!res) return
    setGuess('')
    if (res.finished) {
      setTries(res.tries || tries + 1)
      setFinal(res)
      return
    }
    setTries(res.tries)
    setHint(res.message)
    setHistory((prev) => [...prev, { number: n, hint: res.hint }])
  }

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <div className={`range-wrap dolly tilt ${logId && !final ? 'close' : ''}`}>
          <div className="range-track tall">
            <span className="range-zone" style={{ left: `${loGuess}%`, width: `${Math.max(0, hiGuess - loGuess)}%` }} />
          </div>
          <div className="range-ends">
            <span>0</span>
            <span>{logId && !final ? `still between ${loGuess} and ${hiGuess}` : 'secret is 1 - 100'}</span>
            <span>100</span>
          </div>
        </div>
        {!logId ? (
          <div className="muted">Start a round, then guess the secret number between 1 and 100</div>
        ) : (
          <>
            <div className="muted small">
              Try {tries + (final ? 0 : 1)} of {maxTries} | Current win bonus:{' '}
              <b style={{ color: 'var(--gold)' }}>{nextBonus ? `${nextBonus}%` : '-'}</b>
            </div>
            {hint && !final ? <div className="info-box">{hint}</div> : null}
            <div className="guess-input-row">
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0-100"
                value={guess}
                disabled={busy || !!final}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
              />
              <button
                type="button"
                className="btn blue"
                disabled={busy || !!final || guess === ''}
                onClick={submitGuess}
              >
                Guess
              </button>
            </div>
            {history.length ? (
              <div className="guess-history">
                {history.map((h, i) => (
                  <span key={i} className={`guess-chip ${h.hint === 'low' ? 'lower' : 'higher'}`}>
                    {h.number} {h.hint === 'low' ? 'v lower' : '^ higher'}
                  </span>
                ))}
              </div>
            ) : null}
            {final ? (
              <ResultBanner
                outcome={final.win_status}
                amount={final.win_amount}
                message={final.message}
                fmtMoney={fmtMoney}
              />
            ) : null}
          </>
        )}
        {final?.gameplay_bonus ? (
          <div className="info-box">Gameplay bonus credited: {fmtMoney(final.gameplay_bonus)}</div>
        ) : null}
      </div>

      <BetPanel
        game={game}
        invest={investAmt}
        setInvest={setInvestAmt}
        busy={busy}
        onPlay={logId && !final ? submitGuess : startGame}
        playDisabled={logId && !final && guess === ''}
        playLabel={!logId ? 'Start Round' : final ? 'New Round' : 'Submit Guess'}
        summary={
          <div>
            <div className="muted small" style={{ marginBottom: 6 }}>Bonus per try</div>
            {bonuses.map((b) => (
              <div className="line" key={b.chance}>
                <span>Try {b.chance}</span>
                <b>{b.percent}%</b>
              </div>
            ))}
          </div>
        }
      >
        {logId && !final ? (
          <div className="muted small">Type a number in the game area and press Guess</div>
        ) : null}
        {final ? (
          <button type="button" className="btn ghost" style={{ width: '100%' }} onClick={startGame}>
            Play again
          </button>
        ) : null}
      </BetPanel>
    </div>
  )
}
