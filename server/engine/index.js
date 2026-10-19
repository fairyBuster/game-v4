/**
 * Game registry — Node port of Casino-App/backend/app/engine/__init__.py.
 *
 * Families are ported one at a time (the "bertahap" part). Today: quick (7) + numbers (5).
 * Next: bonus (2), mines (1), cards (4) — add the import + the list entry below.
 */
import { GAMES as quick } from './quick.js'
import { GAMES as numbers } from './numbers.js'

export const GAME_REGISTRY = {}
for (const family of [quick, numbers]) for (const cls of family) GAME_REGISTRY[cls.alias] = cls

export function getGame(alias, user, payload, store) {
  const Cls = GAME_REGISTRY[String(alias)]
  if (!Cls) throw new Error('Game not found')
  return new Cls(String(alias), user, payload, store)
}

export const loadedAliases = () => Object.keys(GAME_REGISTRY)
export { GameError } from './base.js'
