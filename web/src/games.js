// Game list + feed come from the one backend (/api/games, /api/logs via the vite proxy).
// If that backend is not running the same cards are used from here, so the lobby still
// renders. (name, alias, image, kind) — mirrors the server's seed list.
import { api } from './api.js'

const FALLBACK = [
  ['Gates of Olympus', 'gates', '/game/gates_slot.png', 'engine'],
  ['DY01 Slots', 'dy01_slot', '/game/dy01_slot.png', 'engine'],
  ['Gemstones', 'slot-gemstones', '/vendor/simple-slots/themes/gemstones/images/title.jpg', 'iframe'],
  ['Pirate Gold', 'slot-pirate', '/vendor/simple-slots/themes/pirate/images/title.jpg', 'iframe'],
  ['Ancient Egypt', 'slot-ancient-egypt', '/vendor/simple-slots/themes/ancient-egypt/images/title.jpg', 'iframe'],
  ['Aztec Sun', 'slot-aztec', '/vendor/simple-slots/themes/aztec/images/title.jpg', 'iframe'],
  ['Classic Fruits', 'slot-classic', '/vendor/simple-slots/themes/classic/images/title.jpg', 'iframe'],
  ['Fantasy Forest', 'slot-fantasy-forest', '/vendor/simple-slots/themes/fantasy-forest/images/title.jpg', 'iframe'],
  ['Space Adventure', 'slot-space-adventure', '/vendor/simple-slots/themes/space-adventure/images/title.png', 'iframe'],
  ['Head & Tail', 'head_tail', '6592b9b5aace01704114613.png', 'soon'],
  ['Rock Paper Scissors', 'rock_paper_scissors', '610515f76a27a1627723255.jpg', 'soon'],
  ['Spin Wheel', 'spin_wheel', '61051d8469d731627725188.jpg', 'soon'],
  ['Number Guessing', 'number_guess', '61051a9ed28511627724446.jpg', 'soon'],
  ['Dice Rolling', 'dice_rolling', '61051cb37ad601627724979.jpg', 'soon'],
  ['Card Finding', 'card_finding', '610521608fde21627726176.jpg', 'soon'],
  ['Number Slot', 'number_slot', '61052482a60ed1627726978.jpg', 'soon'],
  ['Pool Number', 'number_pool', '610526fa315241627727610.jpg', 'soon'],
  ['Roulette', 'roulette', '63fc71d5784ce1677488597.jpg', 'soon'],
  ['Casino Dice', 'casino_dice', '657ff2e06f55f1702884064.jpg', 'soon'],
  ['Keno', 'keno', '6492c056a362e1687339094.png', 'soon'],
  ['Black Jack', 'blackjack', '641820a7bb36e1679302823.jpg', 'soon'],
  ['Mines', 'mines', '658138687ef751702967400.png', 'soon'],
  ['Poker', 'poker', '659d119dc8d811704792477.png', 'soon'],
  ['Color Prediction', 'color_prediction', '670f5b2d8af5a1729059629.png', 'soon'],
  ['Crazy Times', 'crazy_times', '6720d9aaa6d211730206122.png', 'soon'],
  ['Dream Catcher', 'dream_catcher', '6815d25acd2e71746260570.png', 'soon'],
  ['Andar Bahar', 'andar_bahar', '695373ce3ff591767076814.png', 'soon'],
  ['Pai Gow Poker', 'pai_gow_poker', '6952166d1b1ba1766987373.png', 'soon'],
].map(([name, alias, image, kind]) => ({
  name, alias, image, kind,
  trending: ['head_tail', 'number_slot', 'number_pool', 'keno', 'dream_catcher', 'andar_bahar', 'pai_gow_poker'].includes(alias),
  featured: ['gates', 'dy01_slot', 'roulette', 'blackjack'].includes(alias),
}))

const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
export { fmt }

export const FALLBACK_GAMES = FALLBACK

export async function loadLobby() {
  try {
    const list = await api('/api/games')
    if (Array.isArray(list) && list.length) return { games: list, live: true }
  } catch {
    /* backend not up: fall through to the static list */
  }
  return { games: FALLBACK, live: false }
}

export async function loadFeed() {
  try {
    const rows = await api('/api/logs?limit=14')
    return rows.slice(0, 10)
  } catch {
    return []
  }
}
