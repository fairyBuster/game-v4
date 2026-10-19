import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'
import { POCKETS, SEG, RED_NUMBERS, pocketColor, landRotation } from './rouletteWheel.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const OUTSIDE = [
  { key: '1_18', label: '1 - 18', cls: 'wide' },
  { key: 'even', label: 'EVEN', cls: 'wide' },
  { key: 'red', label: 'RED', cls: 'wide' },
  { key: '2_1_1', label: 'COL 1', cls: 'wide' },
  { key: '19_36', label: '19 - 36', cls: 'wide' },
  { key: 'odd', label: 'ODD', cls: 'wide' },
  { key: 'black', label: 'BLACK', cls: 'wide' },
  { key: '2_1_2', label: 'COL 2', cls: 'wide' },
  { key: '1_12', label: '1st 12', cls: 'wide' },
  { key: '13_24', label: '2nd 12', cls: 'wide' },
  { key: '25_36', label: '3rd 12', cls: 'wide' },
  { key: '2_1_3', label: 'COL 3', cls: 'wide' },
]

/** European wheel drawn with a conic gradient - no bitmap needed, crisp at any size. */
function RouletteWheel({ rotation, landed, spinning }) {
  const stops = POCKETS.map((n, i) => `${pocketColor(n)} ${i * SEG}deg ${(i + 1) * SEG}deg`)
  return (
    <div className={`wheel-wrap dolly ${spinning ? 'spinning close' : ''}`} style={{ width: 268, height: 268 }}>
      <div className="wheel-pointer" />
      <span className="wheel-ball" style={{ opacity: landed == null ? 0 : 1 }} />
      <div
        className="wheel-disc"
        style={{
          background: `repeating-conic-gradient(from 0deg, rgba(6,3,14,.8) 0 .6deg, transparent .6deg ${SEG}deg), conic-gradient(${stops.join(', ')})`,
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {POCKETS.map((n, i) => (
          <span
            key={n}
            className="wheel-label"
            style={{
              fontSize: '0.6rem',
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,.8)',
              transform: `rotate(${i * SEG + SEG / 2 - 90}deg) translateX(94px) rotate(90deg)`,
            }}
          >
            {n}
          </span>
        ))}
      </div>
      <div
        className="wheel-hub"
        style={landed == null ? undefined : { background: pocketColor(landed), color: '#fff', fontSize: '1.15rem' }}
      >
        {landed == null ? 'SPIN' : landed}
      </div>
    </div>
  )
}

export default function Roulette({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('roulette')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('red')
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [final, setFinal] = useState(null)

  const onPlay = async () => {
    setFinal(null)
    setResult(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    const target = Number(res.result)
    // land the winning pocket under the pointer, always spinning forward
    const centre = POCKETS.indexOf(target) * SEG + SEG / 2
    setRotation((prev) => Math.ceil((prev + 360 * 5) / 360) * 360 + (360 - centre))
    setSpinning(true)
    await sleep(3500) // matches the 3.4s .wheel-disc transition
    setResult(target)
    setSpinning(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  const colorOf = (n) => (n === 0 ? 'green' : RED_NUMBERS.includes(n) ? 'red' : 'black')
  const isSelected = (key) => choose === key

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <RouletteWheel rotation={rotation} landed={result} spinning={spinning} />
        {final ? (
          <ResultBanner
            outcome={final.win_status}
            amount={final.win_amount}
            title={`${result} ${colorOf(result).toUpperCase()}`}
            message={final.message}
            fmtMoney={fmtMoney}
          />
        ) : !spinning ? (
          <div className="muted">Bet on a number (36x), color, parity, range or column</div>
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
        playLabel="Spin Wheel"
        summary={
          <div className="muted small">
            Selected bet: <b style={{ color: 'var(--gold)' }}>{choose.replaceAll('_', ' ').toUpperCase()}</b>
          </div>
        }
      >
        <label className="small muted" style={{ fontWeight: 700 }}>Betting grid</label>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <div className="roulette-grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
            <button
              type="button"
              className={`roulette-cell ${isSelected('0') ? 'selected' : ''}`}
              style={{ gridColumn: 'span 12', background: 'rgba(34,197,94,.35)' }}
              disabled={busy || spinning}
              onClick={() => setChoose('0')}
            >
              0
            </button>
            {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`roulette-cell ${colorOf(n) === 'red' ? 'red-cell' : 'black-cell'} ${isSelected(String(n)) ? 'selected' : ''}`}
                disabled={busy || spinning}
                onClick={() => setChoose(String(n))}
              >
                {n}
              </button>
            ))}
            {OUTSIDE.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`roulette-cell wide ${isSelected(o.key) ? 'selected' : ''} ${o.key === 'red' ? 'red-cell' : ''}`}
                disabled={busy || spinning}
                onClick={() => setChoose(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </BetPanel>
    </div>
  )
}
