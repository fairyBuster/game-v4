import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { CardFace, ErrorBox, FlipCard, ResultBanner, usePlay } from './common.jsx'

const RANK_VALUE = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }
const rankVal = (card) => RANK_VALUE[card.split('-')[0]] || 0

export default function PaiGowPoker({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('pai_gow_poker')
  const [investAmt, setInvestAmt] = useState(10)
  const [cards, setCards] = useState(null)
  const [low, setLow] = useState([])
  const [logId, setLogId] = useState(null)
  const [final, setFinal] = useState(null)

  const onPlay = async () => {
    if (final || !cards) {
      setFinal(null)
      setCards(null)
      setLow([])
      setLogId(null)
      const res = await invest({ invest: investAmt })
      if (!res) return
      setCards(res.result || [])
      setLogId(res.game_log_id)
      return
    }
  }

  const toggle = (card) => {
    if (final) return
    setLow((prev) => {
      if (prev.includes(card)) return prev.filter((c) => c !== card)
      if (prev.length >= 2) return prev
      return [...prev, card]
    })
  }

  const autoArrange = () => {
    if (!cards) return
    const sorted = [...cards].sort((a, b) => rankVal(a) - rankVal(b))
    setLow(sorted.slice(0, 2))
  }

  const submit = async () => {
    if (low.length !== 2 || !logId) return
    const high = cards.filter((c) => !low.includes(c))
    const res = await end({ game_log_id: logId, low_hand: low, high_hand: high })
    if (res) setFinal(res)
  }

  const highCards = cards ? cards.filter((c) => !low.includes(c)) : []

  return (
    <div className="game-shell">
      <div className="panel stage" style={{ gap: 16 }}>
        <ErrorBox error={error} onCancel={cancelRound} />

        {!cards && !final ? (
          <>
            <div className="card-row">{[0, 1, 2, 3, 4, 5, 6].map((i) => <CardFace key={`b${i}`} back />)}</div>
            <div className="muted">Start a round - you receive 7 cards and split them into a 5-card high hand and a 2-card low hand</div>
          </>
        ) : null}

        {cards ? (
          <>
            <div className="card-slot">
              <div className="slot-label">YOUR 7 CARDS - tap 2 cards for the LOW hand</div>
              <div className={`card-row dolly tilt ${cards && !final ? 'close' : ''}`}>
                {cards.map((c) => (
                  <CardFace
                    key={c}
                    card={c}
                    className={`clickable ${low.includes(c) ? 'picked-low' : 'picked-high'}`}
                    onClick={() => toggle(c)}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, width: '100%', maxWidth: 680 }}>
              <div className="card-slot">
                <div className="slot-label" style={{ color: 'var(--cyan)' }}>LOW HAND ({low.length}/2)</div>
                <div className="card-row">
                  {low.map((c) => <CardFace key={c} card={c} style={{ width: 58, height: 82 }} />)}
                  {low.length === 0 ? <div className="muted small">pick 2 cards</div> : null}
                </div>
              </div>
              <div className="card-slot">
                <div className="slot-label" style={{ color: 'var(--gold)' }}>HIGH HAND ({highCards.length}/5)</div>
                <div className="card-row">
                  {highCards.map((c) => <CardFace key={c} card={c} style={{ width: 58, height: 82 }} />)}
                </div>
              </div>
            </div>

            {!final ? (
              <div className="row" style={{ gap: 10 }}>
                <button type="button" className="btn ghost sm" disabled={busy} onClick={autoArrange}>
                  Auto arrange (lowest 2)
                </button>
                <button type="button" className="btn blue" disabled={busy || low.length !== 2} onClick={submit}>
                  Reveal & Compare
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {final ? (
          <>
            <div className="divider" style={{ width: '100%' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, width: '100%', maxWidth: 680 }}>
              <div className="card-slot">
                <div className="slot-label">DEALER HIGH ({final.rank || '-'})</div>
                <div className="card-row">
                  {(final.dealerCards?.high || []).map((c) => <CardFace key={c} card={c} style={{ width: 50, height: 72 }} />)}
                </div>
                <div className="slot-label">DEALER LOW</div>
                <div className="card-row">
                  {(final.dealerCards?.low || []).map((c) => <CardFace key={c} card={c} style={{ width: 50, height: 72 }} />)}
                </div>
              </div>
              <div className="card-slot">
                <div className="slot-label">YOUR HIGH ({final.userCardRank || '-'})</div>
                <div className="card-row">
                  {(final.userCards?.high || []).map((c) => <CardFace key={c} card={c} style={{ width: 50, height: 72 }} />)}
                </div>
                <div className="slot-label">YOUR LOW</div>
                <div className="card-row">
                  {(final.userCards?.low || []).map((c) => <CardFace key={c} card={c} style={{ width: 50, height: 72 }} />)}
                </div>
              </div>
            </div>
            <ResultBanner outcome={final.win_status} amount={final.win_amount} message={final.message} fmtMoney={fmtMoney} />
          </>
        ) : null}

        {final?.gameplay_bonus ? (
          <div className="info-box">Gameplay bonus credited: {fmtMoney(final.gameplay_bonus)}</div>
        ) : null}
      </div>

      <BetPanel
        game={game}
        invest={investAmt}
        setInvest={setInvestAmt}
        busy={busy}
        onPlay={onPlay}
        playLabel={!cards || final ? 'Deal 7 Cards' : 'Waiting for arrangement...'}
        playDisabled={!!cards && !final}
        summary={
          <div className="muted small">
            Split: 5-card high hand + 2-card low hand. Beat both dealer hands to win.
          </div>
        }
      >
        {final ? (
          <button
            type="button"
            className="btn ghost"
            style={{ width: '100%' }}
            onClick={() => {
              setFinal(null)
              setCards(null)
              setLow([])
              setLogId(null)
            }}
          >
            New round
          </button>
        ) : null}
      </BetPanel>
    </div>
  )
}
