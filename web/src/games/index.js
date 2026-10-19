import HeadTail from './HeadTail.jsx'
import DiceRolling from './DiceRolling.jsx'
import RockPaperScissors from './RockPaperScissors.jsx'
import CardFinding from './CardFinding.jsx'
import SpinWheel from './SpinWheel.jsx'
import PoolNumber from './PoolNumber.jsx'
import NumberSlot from './NumberSlot.jsx'
import CasinoDice from './CasinoDice.jsx'
import Roulette from './Roulette.jsx'
import Keno from './Keno.jsx'
import NumberGuess from './NumberGuess.jsx'
import ColorPrediction from './ColorPrediction.jsx'
import CrazyTimes from './CrazyTimes.jsx'
import DreamCatcher from './DreamCatcher.jsx'
import AndarBahar from './AndarBahar.jsx'
import PaiGowPoker from './PaiGowPoker.jsx'
import BlackJack from './BlackJack.jsx'
import Poker from './Poker.jsx'
import Mines from './Mines.jsx'

// alias -> component (matches the backend GAME_REGISTRY)
export const GAME_COMPONENTS = {
  head_tail: HeadTail,
  dice_rolling: DiceRolling,
  rock_paper_scissors: RockPaperScissors,
  card_finding: CardFinding,
  spin_wheel: SpinWheel,
  number_pool: PoolNumber,
  number_slot: NumberSlot,
  casino_dice: CasinoDice,
  roulette: Roulette,
  keno: Keno,
  number_guess: NumberGuess,
  color_prediction: ColorPrediction,
  crazy_times: CrazyTimes,
  dream_catcher: DreamCatcher,
  andar_bahar: AndarBahar,
  pai_gow_poker: PaiGowPoker,
  blackjack: BlackJack,
  poker: Poker,
  mines: Mines,
}
