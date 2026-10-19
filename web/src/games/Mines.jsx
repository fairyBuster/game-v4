import { useState } from 'react'
import BetPanel from './BetPanel.jsx'
import { useApp } from './app.jsx'
import { ErrorBox, ResultBanner, usePlay } from './common.jsx'

export default function Mines({ game }) {
  const { fmtMoney } = useApp()
  const { busy, error, invest, end, cancelRound } = usePlay('mines')
  const [investAmt, setInvestAmt] = useState(10)
  const [minesCount, setMinesCount] = useState(3)
  const [logId, setLogId] = useState(null)
  const [available, setAvailable] = useState(0)
  const [gold, setGold] = useState(0)
  const [cells, setCells] = useState({})
  const [lastWin, setLastWin] = useState(0)
  const [final, setFinal] = useState(null)
  const [phase, setPhase] = useState('setup') // setup | playing | finished

  const onPlay = async () => {
    setFinal(null)
    setCells({})
    setGold(0)
    setLogId(null)
    setLastWin(0)
    const res = await invest({ invest: investAmt, mines: minesCount })
    if (!res) return
    setLogId(res.game_log_id)
    // server model: mine_available starts at the mine count; each gold dig
    // consumes one safe dig, the dig after that blasts the round
    setAvailable(minesCount)
    setPhase('playing')
  }

  const dig = async (index) => {
    if (phase !== 'playing' || cells[index]) return
    const res = await end({ game_log_id: logId, type: 'mine', count: gold, is_blast: '' })
    if (!res) return
    if (res.finished) {
      // blast (or settle) - log finished
      setCells((prev) => ({ ...prev, [index]: 'blast' }))
      setPhase('finished')
      setFinal(res)
      return
    }
    setCells((prev) => ({ ...prev, [index]: 'gold' }))
    setGold(res.gold_count)
    setAvailable(res.mine_available)
    setLastWin(res.win_amount)
  }

  const cashOut = async () => {
    if (phase !== 'playing') return
    const res = await end({ game_log_id: logId, count: gold })
    if (!res) return
    setPhase('finished')
    setFinal(res)
  }

  const multiplier = gold > 0 && Number(investAmt) > 0 ? (Number(lastWin) / Number(investAmt)).toFixed(2) : '1.00'

  return (
    <div className="game-shell">
      <div className="panel stage" style={{ gap: 16 }}>
        <ErrorBox error={error} onCancel={cancelRound} />

        <div className="spread" style={{ width: '100%', maxWidth: 420 }}>
          <span className="muted small">Gold found: <b style={{ color: 'var(--gold)' }}>{gold}</b></span>
          <span className="muted small">Potential win: <b style={{ color: 'var(--gold)' }}>{fmtMoney(lastWin)}</b> ({multiplier}x)</span>
        </div>

        <div className={`mines-grid dolly tilt ${phase === 'playing' ? 'close' : ''}`}>
          {Array.from({ length: 25 }, (_, i) => {
            const state = cells[i]
            const locked = phase !== 'playing' || !!state || busy
            return (
              <button
                key={i}
                type="button"
                className={`mine-cell ${state || ''} ${phase !== 'playing' && !state ? 'empty' : ''}`}
                disabled={locked}
                onClick={() => dig(i)}
              >
                {state === 'gold' ? (
                  <img src="/casino/images/mines/gold.png" alt="gold" className="dice-pop" />
                ) : state === 'blast' ? (
                  <img src="/casino/images/mines/mines.png" alt="mine" className="dice-pop" />
                ) : (
                  <img src="/casino/images/mines/box.png" alt="box" style={{ opacity: 0.85 }} />
                )}
              </button>
            )
          })}
        </div>

        {phase === 'playing' ? (
          <>
            <div className="muted small">
              {available > 0
                ? `Dig boxes to find gold. The dig after the safe ones blast the round (${available} safe digs left).`
                : 'All safe digs used - cash out now or dig again to risk a blast!'}
            </div>
            <div className="row" style={{ gap: 12 }}>
              <button type="button" className="btn blue" disabled={busy || gold === 0} onClick={cashOut}>
                Cash out {fmtMoney(lastWin)}
              </button>
            </div>
          </>
        ) : null}

        {final ? (
          <ResultBanner
            outcome={final.win_status}
            amount={final.win_amount}
            title={final.win_status === 1 ? 'Cashed out!' : 'Blasted!'}
            message={final.message}
            fmtMoney={fmtMoney}
          />
        ) : null}
        {phase === 'setup' ? (
          <div className="muted">Choose how many mines hide in the 5x5 grid, then dig for gold and cash out any time</div>
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
        playLabel={phase === 'setup' ? 'Start Digging' : 'Round in progress...'}
        playDisabled={phase !== 'setup'}
        summary={
          <div className="muted small">
            Each gold adds <b style={{ color: 'var(--gold)' }}>{minesCount}%</b> of your stake to the win.
            Cash out to keep it, dig too far and you lose it all.
          </div>
        }
      >
        <label className="small muted" style={{ fontWeight: 700 }}>
          Mines: <span style={{ color: 'var(--gold)' }}>{minesCount}</span>
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={minesCount}
          disabled={busy || phase !== 'setup'}
          onChange={(e) => setMinesCount(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--gold)', margin: '10px 0 6px' }}
        />
        <div className="limits">
          <span>More mines = bigger bonus per gold, higher risk</span>
        </div>
        {phase === 'finished' ? (
          <button
            type="button"
            className="btn ghost"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => {
              setPhase('setup')
              setFinal(null)
              setCells({})
              setGold(0)
              setLogId(null)
              setLastWin(0)
            }}
          >
            New round
          </button>
        ) : null}
      </BetPanel>
    </div>
  )
}
