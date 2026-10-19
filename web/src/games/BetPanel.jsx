import { useApp } from './app.jsx'

/**
 * Shared "place your bet" side panel.
 * Children are used for the game-specific options (choices, sliders, ...).
 */
export default function BetPanel({
  game,
  invest,
  setInvest,
  busy,
  onPlay,
  playLabel = 'Play',
  playDisabled = false,
  children,
  summary = null,
}) {
  const { balance, demo, fmtMoney } = useApp()
  const min = Number(game?.min_limit || 1)
  const max = Number(game?.max_limit || 0)

  const bump = (factor) => {
    let next = Math.round(Number(invest || 0) * factor * 100) / 100
    if (max) next = Math.min(next, max)
    if (next < min) next = min
    setInvest(next)
  }

  return (
    <div className="panel">
      <div className="spread" style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Place Bet</h3>
        <span className="badge gold">{demo ? 'DEMO' : 'REAL'}</span>
      </div>

      <div className="field">
        <label>Invest amount</label>
        <input
          type="number"
          min={min}
          max={max || undefined}
          step="1"
          value={invest}
          disabled={busy}
          onChange={(e) => setInvest(e.target.value)}
        />
      </div>
      <div className="quick-row" style={{ marginBottom: 10 }}>
        <button type="button" disabled={busy} onClick={() => bump(0.5)}>1/2</button>
        <button type="button" disabled={busy} onClick={() => bump(2)}>2x</button>
        <button type="button" disabled={busy} onClick={() => setInvest(min)}>Min</button>
        {max ? <button type="button" disabled={busy} onClick={() => setInvest(max)}>Max</button> : null}
      </div>
      <div className="limits" style={{ marginBottom: 16 }}>
        <span>Limit: <b>{fmtMoney(min)}</b> - <b>{max ? fmtMoney(max) : 'no max'}</b></span>
        <span>Balance: <b>{fmtMoney(balance)}</b></span>
      </div>

      {children ? <div className="divider" /> : null}
      {children}

      {summary ? <div className="bet-summary">{summary}</div> : null}

      <div style={{ marginTop: 18 }}>
        <button
          className="btn green"
          style={{ width: '100%', padding: '13px 0', fontSize: '1rem' }}
          disabled={busy || playDisabled}
          onClick={onPlay}
        >
          {busy ? 'Please wait...' : playLabel}
        </button>
      </div>
    </div>
  )
}
