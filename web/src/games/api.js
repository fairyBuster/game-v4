// The Casino-App components call `api.invest/end/cancel` + `api.me/game` — this points that same
// surface at our one backend (the ported engine), reusing the token-aware fetch wrapper.
import { api as http } from '../api.js'

export const api = {
  me: () => http('/api/me'),
  games: () => http('/api/games'),
  game: (alias) => http(`/api/games/${alias}`),
  logs: (limit = 20) => http(`/api/logs?limit=${limit}`),
  invest: (alias, payload) => http(`/api/play/invest/${alias}`, { method: 'POST', body: payload }),
  end: (alias, payload) => http(`/api/play/end/${alias}`, { method: 'POST', body: payload }),
  cancel: (alias) => http(`/api/play/cancel/${alias}`, { method: 'POST' }),
}
