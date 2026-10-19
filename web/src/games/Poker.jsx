import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { CardFace, ErrorBox, FlipCard, ResultBanner, usePlay } from './common.jsx'

const RANK_IMG = {
  royal_flush: 'royal_flush',
  straight_flush: 'straight_flush',
  four_of_a_kind: 'four_kind',
  full_house: 'full_house',
  flush: 'flash',
  straight: 'straight',
  three_of_a_kind: 'three_kind',
  two_pair: 'two_pair',
  pair: 'one_pair',
  high_card: 'high_card',
}

const RANK_ORDER = [
  'royal flush', 'straight flush', 'four of a kind', 'full house', 'flush',
  'straight', 'three of a kind', 'two pair', 'pair', 'high card',
]

export default function Poker({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('poker')
  const [investAmt, setInvestAmt] = useState(10)
  const [logId, setLogId] = useState(null)
  const [firstThree, setFirstThree] = useState([])
  const [lastTwo, setLastTwo] = useState(null)
  const [final, setFinal] = useState(null)

  const bonuses = game?.guess_bonuses || []

  const onPlay = async () => {
    setFinal(null)
    setLogId(null)
    setFirstThree([])
    setLastTwo(null)
    const res = await invest({ invest: investAmt })
    if (!res) return
    setLogId(res.game_log_id)
    setFirstThree((res.result || []).slice(0, 3))
  }

  const act = async (type) => {
    const res = await end({ type, game_log_id: logId })
    if (!res) return
    setLastTwo(res.result || [])
    setFinal(res)
  }

  const rankKey = final?.rank ? final.rank.replaceAll(' ', '_') : null
  const rankImg = rankKey && RANK_IMG[rankKey] ? `/casino/images/poker/${RANK_IMG[rankKey]}.png` : null

  return (
    <div className="game-shell">
      <div className="panel stage" style={{ gap: 18 }}>
        <ErrorBox error={error} onCancel={cancelRound} />

        {!logId ? (
          <>
            <div className="card-row">{[0, 1, 2, 3, 4].map((i) => <CardFace key={`b${i}`} back />)}</div>
            <div className="muted">Deal a hand - see 3 cards, then CALL to reveal the last 2 or FOLD to give up the round</div>
          </>
        ) : (
          <>
            <div className={`card-row dolly tilt ${logId && !final ? 'close' : ''}`}>
              {firstThree.map((c, i) => (
                <CardFace key={`f${i}`} card={c} style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
              {[0, 1].map((i) => (
                <FlipCard key={`l${i}`} card={lastTwo?.[i] ?? null} />
              ))}
            </div>

            {!final ? (
              <div className="row" style={{ gap: 12 }}>
                <button type="button" className="btn green" disabled={busy} onClick={() => act('call')}>
                  Call
                </button>
                <button type="button" className="btn red" disabled={busy} onClick={() => act('fold')}>
                  Fold
                </button>
              </div>
            ) : null}

            {final ? (
              <>
                {rankImg && final.win_status === 1 ? (
                  <img src={rankImg} alt={final.rank} style={{ width: 170, height: 92, objectFit: 'contain' }} />
                ) : null}
                <ResultBanner
                  outcome={final.win_status}
                  amount={final.win_amount}
                  title={final.win_status === 1 ? `You Win - ${final.rank}` : `You Lost - ${final.rank}`}
                  message={final.message}
                  fmtMoney={fmtMoney}
                />
              </>
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
        summary={
          <div>
            <div className="muted small" style={{ marginBottom: 6 }}>Hand bonuses</div>
            {RANK_ORDER.map((rank, i) => (
              <div className="line" key={rank}>
                <span style={{ textTransform: 'capitalize' }}>{rank}</span>
                <b>{bonuses[i]?.percent != null ? `${bonuses[i].percent}%` : '-'}</b>
              </div>
            ))}
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
              setLogId(null)
              setFirstThree([])
              setLastTwo(null)
            }}
          >
            New round
          </button>
        ) : null}
      </BetPanel>
    </div>
  )
}
