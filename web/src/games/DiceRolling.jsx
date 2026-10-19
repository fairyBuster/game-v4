import { useRef, useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'
import { cubeTransform, faceStyle, landRotation, tumble } from './diceCube.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// which side of the cube each face lands on, for the shading classes
const FACE_SIDE = { 1: '', 2: '', 3: 'f-right', 4: 'f-left', 5: 'f-top', 6: 'f-bottom' }

const FACES = [1, 2, 3, 4, 5, 6]

export default function DiceRolling({ game }) {
  const { fmtMoney, playSound } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('dice_rolling')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('1')
  const [rolling, setRolling] = useState(false)
  const [rot, setRot] = useState({ x: 0, y: 0 })
  const [final, setFinal] = useState(null)
  // the accumulated rotation lives in a ref so the async loop never reads stale state
  const spin = useRef({ x: 0, y: 0 })

  const onPlay = async () => {
    setFinal(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    setRolling(true)
    playSound('casino-dice.mp3')
    const startAt = Date.now()
    while (Date.now() - startAt < 1600) {
      spin.current = tumble(spin.current)
      setRot({ ...spin.current })
      await sleep(110)
    }
    // settle on the rolled face, still spinning forward
    spin.current = landRotation(spin.current, Number(res.result))
    setRot({ ...spin.current })
    setRolling(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <div className="dice3d-stage">
          <div className={`dolly dolly-dice ${rolling ? 'close' : ''}`}>
            <div
              className="dice3d"
              style={{
                transform: cubeTransform(rot),
                transitionDuration: rolling ? '110ms' : '1100ms',
                transitionTimingFunction: rolling ? 'linear' : 'cubic-bezier(0.22, 0.9, 0.28, 1)',
              }}
            >
              {FACES.map((f) => (
                <div key={f} className={`face ${FACE_SIDE[f]}`} style={{ transform: faceStyle(f) }}>
                  <img src={`/casino/images/play/dice${f}.png`} alt={`dice ${f}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
        {rolling ? <div className="muted">Rolling...</div> : null}
        {!rolling && !final ? <div className="muted">Pick a face (1-6) - if the dice lands on it, you win</div> : null}
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
        playLabel="Roll Dice"
      >
        <label className="small muted" style={{ fontWeight: 700 }}>Dice face</label>
        <div className="choices" style={{ marginTop: 10, gap: 8 }}>
          {FACES.map((n) => (
            <button
              key={n}
              type="button"
              className={`choice ${choose === String(n) ? 'selected' : ''}`}
              style={{ minWidth: 64, padding: '8px 10px' }}
              disabled={busy || rolling}
              onClick={() => setChoose(String(n))}
            >
              <img src={`/casino/images/play/dice${n}.png`} alt={n} style={{ width: 36, height: 36 }} />
            </button>
          ))}
        </div>
      </BetPanel>
    </div>
  )
}
