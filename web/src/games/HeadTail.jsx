import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function HeadTail({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('head_tail')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('head')
  const [flipping, setFlipping] = useState(false)
  const [start, setStart] = useState(null)
  const [final, setFinal] = useState(null)

  const onPlay = async () => {
    setFinal(null)
    setStart(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    setStart(res)
    setFlipping(true)
    await sleep(2300)
    setFlipping(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  const landed = start?.result
  const shownFace = flipping ? (choose === 'head' ? 'head' : 'tail') : (landed || null)

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <div className={`coin-halo-wrap dolly ${flipping ? 'close' : ''}`}>
          <span className={`coin-halo ${flipping ? 'hot' : ''}`} aria-hidden="true" />
          <div className={`coin ${flipping ? `flip-${landed}` : ''}`}>
            <img
              className="side-a"
              src="/casino/images/games/head.png"
              alt="head"
              style={{ opacity: shownFace && shownFace !== 'head' ? 0.25 : 1 }}
            />
            <img
              className="side-b"
              src="/casino/images/games/tail.png"
              alt="tail"
              style={{ opacity: shownFace && shownFace !== 'tail' ? 0.25 : 1 }}
            />
          </div>
        </div>
        {!flipping && !start ? <div className="muted">Pick HEAD or TAIL and flip the coin</div> : null}
        {!flipping && start && final ? (
          <ResultBanner
            outcome={final.win_status}
            amount={final.win_amount}
            message={final.message}
            fmtMoney={fmtMoney}
          />
        ) : null}
        {final?.gameplay_bonus ? (
          <div className="info-box">Gameplay bonus credited: {fmtMoney(final.gameplay_bonus)}</div>
        ) : null}
      </div>

      <BetPanel
        game={game}
        invest={investAmt}
        setInvest={setInvestAmt}
        busy={busy || flipping}
        onPlay={onPlay}
        playLabel="Flip Coin"
      >
        <label className="small muted" style={{ fontWeight: 700 }}>Your choice</label>
        <div className="choices" style={{ marginTop: 10 }}>
          <button
            type="button"
            className={`choice ${choose === 'head' ? 'selected' : ''}`}
            disabled={busy || flipping}
            onClick={() => setChoose('head')}
          >
            <img src="/casino/images/games/head.png" alt="head" />
            <span className="label">HEAD</span>
          </button>
          <button
            type="button"
            className={`choice ${choose === 'tail' ? 'selected' : ''}`}
            disabled={busy || flipping}
            onClick={() => setChoose('tail')}
          >
            <img src="/casino/images/games/tail.png" alt="tail" />
            <span className="label">TAIL</span>
          </button>
        </div>
      </BetPanel>
    </div>
  )
}
