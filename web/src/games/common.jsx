import { useCallback, useState } from 'react'
import { api } from './api.js'
import { useApp } from './app.jsx'

/**
 * Wraps the invest/end lifecycle shared by all games:
 * error handling, busy flag, balance sync and sound playback.
 */
export function usePlay(alias) {
  const { demo, refreshUser, playSound } = useApp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(
    async (fn) => {
      setBusy(true)
      setError('')
      try {
        const res = await fn()
        if (res?.sound) playSound(res.sound)
        await refreshUser()
        return res
      } catch (err) {
        setError(err.message || 'Something went wrong')
        await refreshUser().catch(() => {})
        return null
      } finally {
        setBusy(false)
      }
    },
    [playSound, refreshUser],
  )

  const invest = useCallback((payload) => run(() => api.invest(alias, payload, demo)), [alias, demo, run])
  const end = useCallback((payload) => run(() => api.end(alias, payload, demo)), [alias, demo, run])
  const cancelRound = useCallback(async () => {
    await api.cancel(alias).catch(() => {})
    setError('')
    await refreshUser().catch(() => {})
  }, [alias, refreshUser])

  return { busy, error, setError, invest, end, cancelRound }
}

/** Error box that offers to forfeit an abandoned in-complete round. */
export function ErrorBox({ error, onCancel }) {
  if (!error) return null
  const locked = /in-complete/i.test(error)
  return (
    <div className="error-box spread">
      <span>{error}</span>
      {locked && onCancel ? (
        <button type="button" className="btn sm red" onClick={onCancel}>
          Cancel previous round
        </button>
      ) : null}
    </div>
  )
}

export function CardFace({ card, back = false, className = '', onClick, style }) {
  const facedown = back || !card
  return (
    <div className={`pcard ${facedown ? 'back' : ''} ${className}`} onClick={onClick} style={style}>
      <img
        src={facedown ? '/casino/images/cards/BACK.png' : `/casino/images/cards/${card}.png`}
        alt={facedown ? 'card back' : card}
        draggable="false"
      />
    </div>
  )
}

/**
 * A card that 3D-flips between its back and its face. Pass `card` = null to show
 * the back; changing it to a card id plays the flip. Size defaults match `.pcard`.
 */
export function FlipCard({ card, width = 74, height = 104, className = '' }) {
  return (
    <div className={`flip-card ${card ? 'flipped' : ''} ${className}`} style={{ width, height }}>
      <div className="flip-inner">
        <div className="flip-face flip-back">
          <img src="/casino/images/cards/BACK.png" alt="card back" draggable="false" />
        </div>
        <div className="flip-face flip-front">
          {card ? <img src={`/casino/images/cards/${card}.png`} alt={card} draggable="false" /> : null}
        </div>
      </div>
    </div>
  )
}

// deterministic confetti pieces for the win banner (stable across re-renders)
const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  x: (i * 41 + 7) % 100,
  d: (((i * 17) % 40) / 20).toFixed(2),
  t: (2.1 + ((i * 29) % 26) / 20).toFixed(2),
  rot: 320 + ((i * 61) % 400),
  c: ['#a855f7', '#ec4899', '#22d3ee', '#ffc94d', '#34d399'][i % 5],
}))

export function ResultBanner({ outcome, title, amount, message, fmtMoney }) {
  const cls = outcome === 1 ? 'win' : outcome === 2 ? 'push' : 'lose'
  const tone = outcome === 1 ? 'won' : outcome === 2 ? 'push' : 'lose'
  return (
    <div className={`result-banner ${cls}`}>
      {outcome === 1 ? (
        <span className="confetti" aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <i key={i} style={{ '--x': c.x, '--d': `${c.d}s`, '--t': `${c.t}s`, '--rot': `${c.rot}deg`, '--c': c.c }} />
          ))}
        </span>
      ) : null}
      <h2>{title || (outcome === 1 ? 'You Win!' : outcome === 2 ? 'Push' : 'You Lost')}</h2>
      {amount > 0 ? <div className="amt">{fmtMoney(amount)}</div> : null}
      {message ? <div className="muted small" style={{ marginTop: 6 }}>{message}</div> : null}
      <span className="badge" style={{ display: 'none' }}>{tone}</span>
    </div>
  )
}

/** Renders a spinning/settled wheel disc from segment config `[{label, color, span}]`. */
export function WheelDisc({ segments, rotation, size = 270, spinning = false }) {
  const total = segments.reduce((sum, s) => sum + (s.span || 1), 0)
  let acc = 0
  const stops = segments.map((s) => {
    const start = (acc / total) * 360
    acc += s.span || 1
    const end = (acc / total) * 360
    return `${s.color} ${start}deg ${end}deg`
  })
  return (
    <div
      className={`wheel-wrap dolly ${spinning ? 'spinning close' : ''}`}
      style={{ width: size, height: size }}
    >
      <div className="wheel-pointer" />
      <div
        className="wheel-disc"
        style={{
          background: `conic-gradient(${stops.join(', ')})`,
          transform: `rotate(${rotation}deg)`,
        }}
      />
    </div>
  )
}

export function money(value, symbol = 'Rp') {
  const n = Number(value || 0)
  const idr = symbol === 'Rp'
  return `${symbol}${idr ? ' ' : ''}${n.toLocaleString(idr ? 'id-ID' : 'en-US', {
    minimumFractionDigits: idr ? 0 : 2,
    maximumFractionDigits: idr ? 0 : 2,
  })}`
}
