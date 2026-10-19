import { useEffect, useState } from 'react'
import GameHeader from '../GameHeader.jsx'
import { api } from './api.js'
import { CasinoApp } from './app.jsx'
import { GAME_COMPONENTS } from './index.js'
import './casino.css'

/**
 * Renders a Casino-App game component (their UI, their rules) on our one backend.
 * The engine for each alias lives in server/engine/*; only the ported ones are playable, so
 * CASINO_READY gates the routing in App.jsx until the next family lands.
 */
export const CASINO_READY = [
  'head_tail', 'dice_rolling', 'rock_paper_scissors', 'card_finding', 'spin_wheel',
  'number_pool', 'casino_dice',
  'number_guess', 'number_slot', 'color_prediction', 'roulette', 'keno',
]

export default function CasinoGame({ alias, user, setUser }) {
  const [game, setGame] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setGame(null)
    setError('')
    api.game(alias)
      .then((g) => { if (live) setGame(g) })
      .catch((e) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [alias])

  const Comp = GAME_COMPONENTS[alias]

  return (
    <div className="casino-shell">
      <div className="casino-page">
        <GameHeader name={game?.name || alias} accent="Casino" user={user} />
        {error || !Comp
          ? <div className="casino-msg">{error || `Belum ada komponen buat "${alias}"`}</div>
          : !game
            ? <div className="casino-msg">Memuat…</div>
            : (
              <div className="casino-body">
                <CasinoApp user={user} setUser={setUser}>
                  <Comp game={game} />
                </CasinoApp>
              </div>
            )}
      </div>
    </div>
  )
}
