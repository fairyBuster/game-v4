import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, WheelDisc, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SEGMENTS = [
  { label: '1', color: '#f5b731', span: 2 },
  { label: '2', color: '#22c55e', span: 2 },
  { label: '5', color: '#3b82f6', span: 1 },
  { label: '10', color: '#8b5cf6', span: 1 },
  { label: '20', color: '#ec4899', span: 1 },
  { label: '40', color: '#f97316', span: 1 },
  { label: '2X', color: '#14b8a6', span: 1 },
  { label: '7X', color: '#ef4444', span: 1 },
]

const segmentIndexOf = (point) => {
  const label = String(point).toUpperCase()
  const idx = SEGMENTS.findIndex((s) => s.label === label)
  return idx >= 0 ? idx : 0
}

// original segment art (dc_01 .. dc_40) shown after the wheel lands
const DC_IMAGES = ['1', '2', '5', '10', '20', '40']

export default function DreamCatcher({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('dream_catcher')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('1')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [landed, setLanded] = useState(null)
  const [reSpinNotice, setReSpinNotice] = useState(null)
  const [final, setFinal] = useState(null)

  const spinTo = (point) => {
    const index = segmentIndexOf(point)
    const total = SEGMENTS.reduce((s, x) => s + x.span, 0)
    let acc = 0
    for (let i = 0; i < index; i++) acc += SEGMENTS[i].span
    const centerAngle = ((acc + SEGMENTS[index].span / 2) / total) * 360
    setRotation((prev) => {
      const base = Math.ceil((prev + 360 * 4) / 360) * 360
      return base + (360 - centerAngle)
    })
  }

  const onPlay = async () => {
    setFinal(null)
    setLanded(null)
    setReSpinNotice(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return

    setSpinning(true)
    spinTo(res.point)
    await sleep(3600)
    setSpinning(false)
    setLanded(String(res.point))

    let done = null
    let resp = res
    while (resp.reSpin && !resp.finished) {
      setReSpinNotice(`Segment ${resp.point} - spin again!`)
      await sleep(900)
      const again = await end({ game_log_id: res.game_log_id, re_spin: 'true' })
      if (!again) return
      if (again.finished === false && again.reSpin) {
        setSpinning(true)
        spinTo(again.point)
        await sleep(3600)
        setSpinning(false)
        setLanded(String(again.point))
        resp = again
        continue
      }
      done = again
      break
    }
    if (!done) {
      done = await end({ game_log_id: res.game_log_id })
    }
    setReSpinNotice(null)
    if (done) setFinal(done)
  }

  const chooseButtons = ['1', '2', '5', '10', '20', '40']

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <WheelDisc segments={SEGMENTS} rotation={rotation} spinning={spinning} />
        {!spinning && landed ? (
          <div className="muted dc-landed">
            {DC_IMAGES.includes(String(landed)) ? (
              <img
                src={`/casino/images/games/dc_${String(landed).padStart(2, '0')}.png`}
                alt={`segment ${landed}`}
                className="dice-pop"
              />
            ) : null}
            <span>
              Landed on: <b style={{ color: 'var(--gold)' }}>{landed}</b>
              {reSpinNotice ? <span className="badge gold" style={{ marginLeft: 8 }}>{reSpinNotice}</span> : null}
            </span>
          </div>
        ) : null}
        {final ? (
          <ResultBanner outcome={final.win_status} amount={final.win_amount} message={final.message} fmtMoney={fmtMoney} />
        ) : !spinning && !landed ? (
          <div className="muted">Bet on 1, 2, 5, 10, 20 or 40. A 2X or 7X segment pays a re-spin with multiplier</div>
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
        playLabel="Pitch Bet"
        summary={
          <div className="muted small">
            Potential: stake x segment number. Re-spin segments multiply by 2 or 7.
          </div>
        }
      >
        <label className="small muted" style={{ fontWeight: 700 }}>Bet on segment</label>
        <div className="num-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 10 }}>
          {chooseButtons.map((n) => (
            <button
              key={n}
              type="button"
              className={`num-cell ${choose === n ? 'picked' : ''}`}
              disabled={busy || spinning}
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
