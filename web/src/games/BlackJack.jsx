import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { CardFace, ErrorBox, FlipCard, ResultBanner, usePlay } from './common.jsx'

const cardValue = (card) => {
  const rank = card.split('-')[0]
  if (rank === 'A') return 11
  if (rank === 'K' || rank === 'Q' || rank === 'J') return 10
  return parseInt(rank, 10)
}
const reduceAce = (total, aces) => {
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return total
}

export default function BlackJack({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('blackjack')
  const [investAmt, setInvestAmt] = useState(10)
  const [logId, setLogId] = useState(null)
  const [hidden, setHidden] = useState(null)
  const [dealerCards, setDealerCards] = useState([])
  const [userCards, setUserCards] = useState([])
  const [deck, setDeck] = useState([])
  const [userAce, setUserAce] = useState(0)
  const [dealerAce, setDealerAce] = useState(0)
  const [final, setFinal] = useState(null)

  const reset = () => {
    setLogId(null)
    setHidden(null)
    setDealerCards([])
    setUserCards([])
    setDeck([])
    setUserAce(0)
    setDealerAce(0)
    setFinal(null)
  }

  const userRaw = userCards.reduce((s, c) => s + cardValue(c), 0)
  const userSum = reduceAce(userRaw, userAce)
  const bust = userSum > 21

  const onPlay = async () => {
    reset()
    const res = await invest({ invest: investAmt })
    if (!res) return
    const dealerAll = res.result || []
    setLogId(res.game_log_id)
    setHidden(dealerAll[0] || null)
    setDealerCards(res.dealerCardImg || [])
    setUserCards(res.cardImg || [])
    setDeck(res.card || [])
    setUserAce(res.userAceCount || 0)
    setDealerAce(res.dealerAceCount || 0)
  }

  const hit = async () => {
    if (!logId || final || bust) return
    const res = await end({
      type: 'hit',
      game_log_id: logId,
      userSum,
      userAceCount: userAce,
      dealerAceCount: dealerAce,
      card: deck,
    })
    if (!res) return
    setUserCards((prev) => [...prev, ...(res.cardImg || [])])
    setUserAce(res.userAceCount)
    setDeck(res.card || [])
  }

  const stay = async () => {
    if (!logId || final) return
    const res = await end({ type: 'stay', game_log_id: logId, userAceCount: userAce, dealerAceCount: dealerAce })
    if (res) setFinal(res)
  }

  const showDealer = final ? dealerCards : dealerCards
  const dealerSumText = final?.dealerSum != null ? final.dealerSum : null

  return (
    <div className="game-shell">
      <div className="panel stage" style={{ gap: 18 }}>
        <ErrorBox error={error} onCancel={cancelRound} />

        {!logId ? (
          <>
            <div className="card-slot">
              <div className="slot-label">DEALER</div>
              <div className="card-row">{[0, 1].map((i) => <CardFace key={`db${i}`} back />)}</div>
            </div>
            <div className="divider" style={{ width: '70%' }} />
            <div className="card-slot">
              <div className="slot-label">YOU</div>
              <div className="card-row">{[0, 1].map((i) => <CardFace key={`ub${i}`} back />)}</div>
            </div>
            <div className="muted">Hit for another card, stay to compare. Closest to 21 wins - a tie returns your stake.</div>
          </>
        ) : (
          <>
            <div className={`card-slot dolly tilt ${logId && !final ? 'close' : ''}`}>
              <div className="slot-label">
                DEALER {dealerSumText != null ? `(${dealerSumText})` : ''}
                {final?.hiddenImage ? ' - revealed' : ''}
              </div>
              <div className="card-row">
                {hidden ? <FlipCard card={final?.hiddenImage ? hidden : null} /> : null}
                {showDealer.map((c, i) => (
                  <CardFace key={`d${i}`} card={c} style={{ animationDelay: `${i * 0.07}s` }} />
                ))}
              </div>
            </div>

            <div className="divider" style={{ width: '70%' }} />

            <div className={`card-slot dolly tilt ${logId && !final ? 'close' : ''}`}>
              <div className="slot-label">YOU ({userSum}){bust ? ' - BUST' : ''}</div>
              <div className="card-row">
                {userCards.map((c, i) => (
                  <CardFace key={`u${i}`} card={c} style={{ animationDelay: `${i * 0.07}s` }} />
                ))}
              </div>
            </div>

            {!final ? (
              <div className="row" style={{ gap: 12 }}>
                <button type="button" className="btn blue" disabled={busy || bust} onClick={hit}>
                  Hit
                </button>
                <button type="button" className="btn red" disabled={busy} onClick={stay}>
                  Stay
                </button>
              </div>
            ) : null}

            {final ? (
              <ResultBanner
                outcome={final.win_status}
                title={final.result_text === 'Tie' ? 'Tie - stake returned' : undefined}
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
        onPlay={onPlay}
        playLabel={!logId || final ? 'Deal Cards' : 'Round in progress...'}
        playDisabled={!!logId && !final}
      >
        {final ? (
          <button type="button" className="btn ghost" style={{ width: '100%' }} onClick={reset}>
            New round
          </button>
        ) : null}
        <div className="muted small" style={{ marginTop: 10 }}>
          You {userSum}{bust ? ' (bust)' : ''} vs dealer {dealerSumText ?? '?'}
        </div>
      </BetPanel>
    </div>
  )
}
