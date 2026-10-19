import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, FlipCard, ResultBanner, usePlay } from './common.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const pickCard = (color) => {
  const suits = color === 'RED' ? ['H', 'D'] : ['C', 'S']
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)]
  const suit = suits[Math.floor(Math.random() * 2)]
  return `${rank}-${suit}`
}

export default function CardFinding({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('card_finding')
  const [investAmt, setInvestAmt] = useState(10)
  const [choose, setChoose] = useState('red')
  const [card, setCard] = useState(null)
  const [flipping, setFlipping] = useState(false)
  const [final, setFinal] = useState(null)

  const onPlay = async () => {
    setFinal(null)
    setCard(null)
    const res = await invest({ invest: investAmt, choose })
    if (!res) return
    setFlipping(true)
    await sleep(60) // let the face-down state paint before the flip starts
    setCard(pickCard(res.result))
    await sleep(700) // matches the .flip-inner transition
    setFlipping(false)
    const done = await end({ game_log_id: res.game_log_id })
    if (done) setFinal(done)
  }

  return (
    <div className="game-shell">
      <div className="panel stage">
        <ErrorBox error={error} onCancel={cancelRound} />
        <div className="card-row">
          <FlipCard card={card} width={120} height={168} className={`dolly ${flipping ? 'close' : ''}`} />
        </div>
        {card && final ? (
          <div className="row">
            <span className={`badge ${card.endsWith('H') || card.endsWith('D') ? 'red' : 'blue'}`}>
              {card.endsWith('H') || card.endsWith('D') ? 'RED CARD' : 'BLACK CARD'}
            </span>
          </div>
        ) : null}
        {flipping ? <div className="muted">Drawing a card...</div> : null}
        {final ? (
          <ResultBanner outcome={final.win_status} amount={final.win_amount} message={final.message} fmtMoney={fmtMoney} />
        ) : !flipping ? (
          <div className="muted">Predict the color of the drawn card</div>
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
        playLabel="Draw Card"
      >
        <label className="small muted" style={{ fontWeight: 700 }}>Card color</label>
        <div className="choices" style={{ marginTop: 10 }}>
          <button
            type="button"
            className={`choice red-side ${choose === 'red' ? 'selected' : ''}`}
            disabled={busy || flipping}
            onClick={() => setChoose('red')}
          >
            <span style={{ width: 44, height: 60, borderRadius: 8, background: 'linear-gradient(160deg,#f87171,#b91c1c)' }} />
            <span className="label">RED</span>
          </button>
          <button
            type="button"
            className={`choice ${choose === 'black' ? 'selected' : ''}`}
            disabled={busy || flipping}
            onClick={() => setChoose('black')}
          >
            <span style={{ width: 44, height: 60, borderRadius: 8, background: 'linear-gradient(160deg,#374151,#0b0e17)' }} />
            <span className="label">BLACK</span>
          </button>
        </div>
      </BetPanel>
    </div>
  )
}
