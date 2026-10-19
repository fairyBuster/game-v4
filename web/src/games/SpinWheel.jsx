import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, WheelDisc, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 12 alternating segments, starting at RED (like the original wheel image)
const SEGMENTS = Array.from({ length: 12 }, (_, i) => ({
  label: i % 2 === 0 ? 'RED' : 'BLUE',
  color: i % 2 === 0 ? '#dc2626' : '#2563eb',
  span: 1,
}))

export default function SpinWheel({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('spin_wheel')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('red')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [final, setFinal] = useState(null)

  const spinTo = (result) => {
    const index = SEGMENTS.findIndex((s) => s.label === result.toUpperCase())
    const seg = 360 / SEGMENTS.length
    const target = index >= 0 ? index : 0
    const center = target * seg + seg / 2
    // always rotate forward, land the target segment under the top pointer
    setRotation((prev) => {
      const base = Math.ceil((prev + 360 * 4) / 360) * 360
      return base + (360 - center)
    })
  }

  const onPlay = async () => {
    setFinal(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    setSpinning(true)
    spinTo(res.result)
    await sleep(3600)
    setSpinning(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <WheelDisc segments={SEGMENTS} rotation={rotation} spinning={spinning} />
        {final ? (
          <ResultBanner outcome={final.win_status} amount={final.win_amount} message={final.message} fmtMoney={fmtMoney} />
        ) : !spinning ? (
          <div className="muted">Bet on RED or BLUE - the wheel decides</div>
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
      >
        <label className="small muted" style={{ fontWeight: 700 }}>Your color</label>
        <div className="choices" style={{ marginTop: 10 }}>
          <button
            type="button"
            className={`choice red-side ${choose === 'red' ? 'selected' : ''}`}
            disabled={busy || spinning}
            onClick={() => setChoose('red')}
          >
            <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #f87171, #b91c1c)' }} />
            <span className="label">RED</span>
          </button>
          <button
            type="button"
            className={`choice blue-side ${choose === 'blue' ? 'selected' : ''}`}
            disabled={busy || spinning}
            onClick={() => setChoose('blue')}
          >
            <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #60a5fa, #1d4ed8)' }} />
            <span className="label">BLUE</span>
          </button>
        </div>
      </BetPanel>
    </div>
  )
}
