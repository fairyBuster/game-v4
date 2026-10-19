import { fmt } from './games.js'
import GameHeader from './GameHeader.jsx'

// Cards for games that exist in the list but have no build behind them yet.
// Say that plainly instead of pretending there is a game.
export default function GamePage({ alias, game, user }) {
  return (
    <div className="gamepage">
      <img className="lobby-bg" src="/dy01/bg_hall.jpg" alt="" />
      <GameHeader name={game?.name || alias} user={user} />
      <div className="gamepage-card">
        <h1>{game?.name || alias}</h1>
        <p>
          Game <b>{game?.name || alias}</b> belum di-wire ke backend ini — cuma kartunya yang ada
          di lobby. Yang sudah jalan penuh (satu saldo DY01 untuk semuanya): <b>Gates of Olympus</b>,
          <b> DY01 Slots</b>, <b>11 mini game</b> (Head &amp; Tail, dadu, roulette, roda, lotre, …),
          plus <b>7 slot vendor</b> (Gemstones, Pirate Gold, …).
        </p>
        <div className="gamepage-meta">
          <span>alias <code>{alias}</code></span>
          <span>min {fmt.format(1000)}</span>
        </div>
        <a className="btn gold" href="#/">Kembali ke Lobby</a>
      </div>
    </div>
  )
}
