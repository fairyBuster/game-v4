/**
 * End-to-end checks for the backend:  cd server && node test.js
 * Boots nothing itself — it talks to a running server (node index.js) and asserts the
 * whole money path: register -> login -> spin (balance math) -> deposit -> withdraw ->
 * admin approve -> stats. Leaves its own test users behind (they are prefixed t_).
 */
const BASE = process.env.BASE || 'http://127.0.0.1:8015'
const assert = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg) }

async function call(path, { method = 'GET', token, body } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* html or empty */ }
  return { status: r.status, json, text }
}

const tag = Date.now().toString(36).slice(-6)
const user = `t_${tag}`
let token = ''
let admin = ''
let views = 0

// --- register + validation ---
let r = await call('/api/auth/register', { method: 'POST', body: { username: user, password: 'rahasia123' } })
assert(r.status === 200 && r.json.token, 'register harus balikin token: ' + r.text)
token = r.json.token
assert(r.json.user.balance === 1000000, 'saldo awal 1jt, dapat ' + r.json.user.balance)

r = await call('/api/auth/register', { method: 'POST', body: { username: user, password: 'rahasia123' } })
assert(r.status === 409, 'username dobel harus 409, dapat ' + r.status)

r = await call('/api/auth/register', { method: 'POST', body: { username: 'a', password: '123' } })
assert(r.status === 400, 'username/password pendek harus 400, dapat ' + r.status)

// --- referral: kode sendiri + register pakai kode -> bonus dua sisi ---
const refCode = (await call('/api/me', { token })).json.ref_code
assert(/^[A-Z0-9]{6}$/.test(refCode || ''), 'user harus punya kode referal 6 karakter, dapat ' + refCode)
r = await call('/api/auth/register', { method: 'POST', body: { username: `t_${tag}r`, password: 'rahasia123', ref: refCode } })
assert(r.status === 200 && r.json.referral && r.json.referral.referrer === user, 'register pakai kode harus sukses: ' + r.text)
assert(r.json.user.balance === 1025000, 'member baru pakai kode harus dapat +25rb, dapat ' + r.json.user.balance)
r = await call('/api/auth/register', { method: 'POST', body: { username: `t_${tag}x`, password: 'rahasia123', ref: 'ZZZZZZ' } })
assert(r.status === 400, 'kode referal ngawur harus 400, dapat ' + r.status)
assert((await call('/api/me', { token })).json.balance === 1050000, 'pengundang harus dapat +50rb per member')
r = await call('/api/referral', { token })
assert(r.status === 200 && r.json.count === 1 && r.json.earned === 50000, 'ringkasan referral harus 1 downline +50rb: ' + r.text)

// --- login ---
r = await call('/api/auth/login', { method: 'POST', body: { username: user, password: 'salahbanget' } })
assert(r.status === 401, 'password salah harus 401, dapat ' + r.status)
r = await call('/api/auth/login', { method: 'POST', body: { username: user, password: 'rahasia123' } })
assert(r.status === 200 && r.json.token, 'login harus sukses')
token = r.json.token

// --- auth wall ---
r = await call('/api/spin', { method: 'POST', body: { alias: 'gates', bet: 500 } })
assert(r.status === 401, 'spin tanpa token harus 401, dapat ' + r.status)

// --- games + spin: balance must move exactly bet -> win ---
r = await call('/api/games')
assert(Array.isArray(r.json) && r.json.length >= 28, 'daftar game minimal 28, dapat ' + (r.json && r.json.length))
const gates = r.json.find((g) => g.alias === 'gates')
assert(gates && gates.kind === 'engine', 'gates harus kind engine')

let balance = (await call('/api/me', { token })).json.balance   // 1jt + bonus referral 50rb
for (const bet of [500, 2500, 10000]) {
  r = await call('/api/spin', { method: 'POST', token, body: { alias: 'gates', bet } })
  assert(r.status === 200, `spin gates ${bet} gagal: ` + r.text)
  const { balance: after, win, detail } = r.json
  assert(after === balance - bet + win, `saldo harus ${balance - bet + win}, dapat ${after}`)
  assert(win <= bet * 5000, 'win harus <= 5000x bet')
  assert(Array.isArray(detail.runs) && detail.runs.length >= 1, 'detail.runs harus ada (UI replay)')
  assert(detail.runs[0].steps.length >= 1, 'tiap run harus punya steps')
  balance = after
  views++
}

// bet di luar daftar + game iframe harus ditolak di /api/spin (mereka punya endpoint sendiri)
r = await call('/api/spin', { method: 'POST', token, body: { alias: 'gates', bet: 777 } })
assert(r.status === 400, 'bet 777 harus 400, dapat ' + r.status)
r = await call('/api/spin', { method: 'POST', token, body: { alias: 'slot-gemstones', bet: 5000 } })
assert(r.status === 400, 'game vendor lewat /api/spin harus 400, dapat ' + r.status)

// --- vendor slots: charge di /api/vendor/bet, payout di /api/vendor/win, saldo tetap satu ---
r = await call('/api/vendor/bet', { method: 'POST', token, body: { alias: 'slot-gemstones', bet: 10000 } })
assert(r.status === 200 && r.json.balance === balance - 10000, 'charge vendor harus potong saldo: ' + r.text)
const spinRow = r.json.spinId
balance = r.json.balance

r = await call('/api/vendor/win', { method: 'POST', token, body: { alias: 'slot-gemstones', spinId: spinRow, win: 25000 } })
assert(r.status === 200 && r.json.balance === balance + 25000, 'payout vendor harus nambah saldo: ' + r.text)
balance = r.json.balance

r = await call('/api/vendor/win', { method: 'POST', token, body: { alias: 'slot-gemstones', spinId: spinRow, win: -5000 } })
assert(r.status === 200 && r.json.win === 0 && r.json.balance === balance, 'win negatif harus jadi 0 tanpa ubah saldo')

r = await call('/api/vendor/bet', { method: 'POST', token, body: { alias: 'slot-gemstones', bet: 1234 } })
assert(r.status === 400, 'stake vendor di luar daftar harus 400, dapat ' + r.status)
r = await call('/api/vendor/bet', { method: 'POST', token, body: { alias: 'gates', bet: 10000 } })
assert(r.status === 404, 'game engine lewat /api/vendor/bet harus 404, dapat ' + r.status)

// --- dy01 slot engine ---
r = await call('/api/spin', { method: 'POST', token, body: { alias: 'dy01_slot', bet: 1000 } })
assert(r.status === 200, 'spin dy01_slot gagal: ' + r.text)
assert(r.json.detail.grid.length === 5 && r.json.detail.grid[0].length === 3, 'grid 5x3')
assert(r.json.balance === balance - 1000 + r.json.win, 'saldo dy01_slot harus pas')
balance = r.json.balance
views++

// --- the ported Casino-App games: kind=casino kalau engine-nya udah ada, soon kalau belum ---
const listed = (await call('/api/games')).json
for (const [alias, want] of [['head_tail', 'casino'], ['roulette', 'casino'], ['keno', 'casino'], ['blackjack', 'soon']]) {
  const g = listed.find((x) => x.alias === alias)
  assert(g && g.kind === want, `${alias} harus kind=${want}, dapat ${g && g.kind}`)
}
// endpoint lama /api/play (mini.js) udah dibuang — semua lewat /api/play/invest|end
r = await call('/api/play', { method: 'POST', token, body: { alias: 'head_tail', bet: 1000, pick: 'head' } })
assert(r.status === 404, '/api/play lama harus udah nggak ada, dapat ' + r.status)

// --- history ---
r = await call('/api/logs?limit=5', { token })
assert(r.status === 200 && r.json.length >= 4, 'riwayat minimal 4 baris, dapat ' + (r.json && r.json.length))

// --- wallet ---
r = await call('/api/wallet/deposit', { method: 'POST', token, body: { amount: 500000 } })
assert(r.status === 200 && r.json.balance === balance + 500000, 'deposit harus nambah saldo')
balance = r.json.balance

r = await call('/api/wallet/deposit', { method: 'POST', token, body: { amount: 100 } })
assert(r.status === 400, 'deposit 100 harus 400, dapat ' + r.status)

r = await call('/api/wallet/withdraw', { method: 'POST', token, body: { amount: 200000, bank: 'BCA' } })
assert(r.status === 200 && r.json.status === 'pending', 'withdraw harus pending')
assert((await call('/api/me', { token })).json.balance === balance, 'saldo belum boleh berkurang sebelum approve')

// --- daily bonus: sekali saja ---
r = await call('/api/bonus/daily', { method: 'POST', token })
assert(r.status === 200 && r.json.balance === balance + 25000, 'bonus harian harus +25000')
balance = r.json.balance
r = await call('/api/bonus/daily', { method: 'POST', token })
assert(r.status === 429, 'klaim kedua harus 429, dapat ' + r.status)

// --- admin ---
r = await call('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'admin123' } })
assert(r.status === 200, 'login admin gagal (seed belum jalan?)')
admin = r.json.token

r = await call('/api/admin/users', { token })
assert(r.status === 403, 'non-admin harus 403, dapat ' + r.status)

r = await call('/api/admin/users', { token: admin })
assert(r.status === 200 && r.json.length >= 1, 'admin/users harus berisi member asli')
assert(!r.json.some((u) => u.is_admin || /^[tc]_/.test(u.username)), 'admin & akun testing tidak boleh tampil di daftar member')
const meId = (await call('/api/me', { token })).json.id

r = await call('/api/admin/referrals', { token: admin })
assert(r.status === 200 && Array.isArray(r.json.rows), 'admin harus bisa lihat daftar referal')
assert(!r.json.rows.some((x) => /^[tc]_/.test(x.username)), 'referal dari akun testing tidak boleh tampil')

r = await call('/api/admin/withdrawals', { token: admin })
const pending = r.json.find((w) => w.username === user && w.status === 'pending')
assert(pending, 'request withdraw harus muncul di admin')

r = await call('/api/admin/withdraw', { method: 'POST', token: admin, body: { txId: pending.id, action: 'approve' } })
assert(r.status === 200, 'approve withdraw gagal: ' + r.text)
assert((await call('/api/me', { token })).json.balance === balance - 200000, 'approve harus motong saldo')

r = await call('/api/admin/balance', { method: 'POST', token: admin, body: { userId: meId, delta: 50000, note: 'test' } })
assert(r.status === 200 && r.json.balance === balance - 200000 + 50000, 'adjust saldo admin harus pas')
balance = r.json.balance

r = await call('/api/admin/stats', { token: admin })
assert(r.status === 200 && r.json.spins > 0 && r.json.staked > 0, 'stats harus ada isinya')
// the live DB has real play in it (a single 100x vendor win blows the ratio up), so assert
// the arithmetic instead of a guessed RTP band
assert(Math.abs(r.json.rtp - r.json.won / r.json.staked) < 1e-9, 'rtp harus = won/staked')
assert(r.json.ggr === r.json.staked - r.json.won, 'ggr harus = staked - won')
assert(Number.isFinite(r.json.users) && r.json.users >= 1, 'stats harus ngitung member asli')

// --- peluang menang: admin atur per game, lalu balik ke alami ---
r = await call('/api/admin/game/chance', { method: 'POST', token, body: { alias: 'head_tail', chance: 100 } })
assert(r.status === 403, 'non-admin atur peluang harus 403, dapat ' + r.status)

r = await call('/api/admin/game/chance', { method: 'POST', token: admin, body: { alias: 'head_tail', chance: 150 } })
assert(r.status === 400, 'peluang di luar 0-100 harus 400, dapat ' + r.status)

r = await call('/api/admin/game/chance', { method: 'POST', token: admin, body: { alias: 'roulette', chance: 90 } })
assert(r.status === 400, 'game meja harus nolak atur peluang, dapat ' + r.status)

r = await call('/api/admin/games', { token: admin })
const htCfg = r.json.find((g) => g.alias === 'head_tail')
const gatesCfg = r.json.find((g) => g.alias === 'gates')
assert(htCfg && htCfg.chance_editable && htCfg.natural === 48.5, 'head_tail alami 48.5%, dapat ' + JSON.stringify(htCfg))
assert(gatesCfg && gatesCfg.chance_editable && gatesCfg.natural > 0, 'gates harus punya peluang alami')
assert(r.json.find((g) => g.alias === 'roulette').chance_editable === false, 'roulette tidak boleh editable')

// head_tail 100% -> dua ronde pasti menang dan dibayar
r = await call('/api/admin/game/chance', { method: 'POST', token: admin, body: { alias: 'head_tail', chance: 100 } })
assert(r.status === 200 && r.json.chance === 100, 'set peluang 100 gagal: ' + r.text)
for (let i = 0; i < 2; i++) {
  const inv = await call('/api/play/invest/head_tail', { method: 'POST', token, body: { invest: 1000, choose: 'head' } })
  assert(inv.status === 200 && inv.json.win_status === 1, 'peluang 100 harus selalu menang: ' + inv.text)
  const end = await call('/api/play/end/head_tail', { method: 'POST', token, body: { game_log_id: inv.json.game_log_id } })
  assert(end.status === 200 && end.json.win_status === 1 && end.json.win_amount > 0, 'settle harus menang: ' + end.text)
  balance = end.json.bal
}

// reset -> probable_win kembali 48, win_chance null
r = await call('/api/admin/game/chance', { method: 'POST', token: admin, body: { alias: 'head_tail', chance: null } })
assert(r.status === 200 && r.json.chance === null && r.json.natural === 48.5, 'reset head_tail gagal: ' + r.text)
assert((await call('/api/games/head_tail', { token })).json.probable_win === 48, 'probable_win harus balik 48')

// gates 100% -> governor slot pasti kasih putaran menang
r = await call('/api/admin/game/chance', { method: 'POST', token: admin, body: { alias: 'gates', chance: 100 } })
assert(r.status === 200, 'set peluang gates gagal: ' + r.text)
r = await call('/api/spin', { method: 'POST', token, body: { alias: 'gates', bet: 500 } })
assert(r.status === 200 && r.json.win > 0, 'gates peluang 100 harus menang: ' + r.text)
balance = r.json.balance
r = await call('/api/admin/game/chance', { method: 'POST', token: admin, body: { alias: 'gates', chance: null } })
assert(r.status === 200 && r.json.chance === null, 'reset gates gagal: ' + r.text)
r = await call('/api/admin/games', { token: admin })
assert(r.json.find((g) => g.alias === 'gates').win_chance === null, 'gates harus balik alami')

r = await call('/api/admin/game', { method: 'POST', token: admin, body: { alias: 'slot-aztec', enabled: false } })
assert(r.status === 200, 'toggle game gagal')
const list = (await call('/api/games')).json
assert(!list.some((g) => g.alias === 'slot-aztec'), 'game mati harus hilang dari daftar')
await call('/api/admin/game', { method: 'POST', token: admin, body: { alias: 'slot-aztec', enabled: true } })

// --- ban ---
r = await call('/api/admin/ban', { method: 'POST', token: admin, body: { userId: meId, banned: true } })
assert(r.status === 200, 'ban gagal')
assert((await call('/api/me', { token })).status === 401, 'session user yang di-ban harus mati')
r = await call('/api/auth/login', { method: 'POST', body: { username: user, password: 'rahasia123' } })
assert(r.status === 403, 'login user yang di-ban harus 403, dapat ' + r.status)
await call('/api/admin/ban', { method: 'POST', token: admin, body: { userId: meId, banned: false } })

// --- static frontend ---
const page = await fetch(BASE + '/')
assert(page.status === 200, 'GET / harus serve index.html')
const html = await page.text()
assert(/<div id="root">/.test(html), 'index.html harus punya #root')

console.log(`server: all checks passed (${views} spins, user ${user}, saldo akhir ${balance})`)
