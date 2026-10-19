// Thin fetch wrapper for the one backend. Token lives in localStorage; every call that
// touches money goes through here so the server stays the only source of truth.
const TOKEN_KEY = 'dy01_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()
  const r = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { error: text.slice(0, 120) } }
  if (!r.ok) {
    if (r.status === 401 && token) {           // session died (expired / banned elsewhere)
      setToken('')
      window.dispatchEvent(new Event('dy01:unauth'))
    }
    const err = new Error((data && data.error) || `HTTP ${r.status}`)
    err.status = r.status
    throw err
  }
  return data
}

export const auth = {
  login: (username, password) => api('/api/auth/login', { method: 'POST', body: { username, password } }),
  register: (username, password, phone, ref) => api('/api/auth/register', { method: 'POST', body: { username, password, phone, ref } }),
  logout: () => api('/api/auth/logout', { method: 'POST' }),
  me: () => api('/api/me'),
}

export const spin = (alias, bet) => api('/api/spin', { method: 'POST', body: { alias, bet } })
export const play = (alias, bet, pick) => api('/api/play', { method: 'POST', body: { alias, bet, pick } })
// vendor (iframed) slots settle in two calls against the same wallet:
// charge the stake when the reels start, credit the payout when the round ends
const vendorBet = (alias, bet) => api('/api/vendor/bet', { method: 'POST', body: { alias, bet } })
const vendorWin = (alias, spinId, win) => api('/api/vendor/win', { method: 'POST', body: { alias, spinId, win } })
export { vendorBet, vendorWin }
export const deposit = (amount) => api('/api/wallet/deposit', { method: 'POST', body: { amount } })
export const withdraw = (amount, bank) => api('/api/wallet/withdraw', { method: 'POST', body: { amount, bank } })
export const dailyBonus = () => api('/api/bonus/daily', { method: 'POST' })
export const referral = () => api('/api/referral')
export const txs = () => api('/api/wallet/txs')
export const logs = (limit = 20) => api(`/api/logs?limit=${limit}`)
export const games = () => api('/api/games')

export const admin = {
  users: () => api('/api/admin/users'),
  setBalance: (userId, delta, note) => api('/api/admin/balance', { method: 'POST', body: { userId, delta, note } }),
  ban: (userId, banned) => api('/api/admin/ban', { method: 'POST', body: { userId, banned } }),
  withdrawals: () => api('/api/admin/withdrawals'),
  referrals: () => api('/api/admin/referrals'),
  decide: (txId, action) => api('/api/admin/withdraw', { method: 'POST', body: { txId, action } }),
  stats: () => api('/api/admin/stats'),
  games: () => api('/api/admin/games'),
  toggleGame: (alias, enabled) => api('/api/admin/game', { method: 'POST', body: { alias, enabled } }),
  setChance: (alias, chance) => api('/api/admin/game/chance', { method: 'POST', body: { alias, chance } }),
}
