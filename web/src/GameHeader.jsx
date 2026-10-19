import { fmt } from './games.js'
import { IconCoin } from './icons.jsx'

/**
 * One header for every in-game page — our two engines, the vendor frames and the
 * coming-soon cards all render exactly this: back pill, gold gradient title, and
 * the same wallet pill as the lobby. Game-specific buttons go in `children`
 * (sound / music / paytable) so the right side stays identical everywhere.
 */
export default function GameHeader({ name, accent, user, children }) {
  return (
    <header className="game-top">
      <a className="game-back" href="#/">‹ Lobby</a>
      <h1>{name} {accent ? <span>{accent}</span> : null}</h1>
      <div className="game-top-right">
        {children}
        <div className="coin-pill"><IconCoin /><b>{fmt.format(user?.balance ?? 0)}</b></div>
      </div>
    </header>
  )
}
