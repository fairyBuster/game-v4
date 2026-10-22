/**
 * Checks for the ported casino engine (Casino-App → Node):  cd server && node casino.test.js
 * Talks to a running server. Registers its own user so the balance maths is exact.
 *
 * Covers the quick family end-to-end: play-page config, invest→end, the payout formula from the
 * `win` column, the min/max limits, the one-open-round guard, cancel, and the gameplay bonus.
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
  try { json = JSON.parse(text) } catch { /* non-json */ }
  return { status: r.status, json, text }
}

const tag = Date.now().toString(36).slice(-6)
const user = `c_${tag}`
let token = ''
let balance = 0

// --- account ---
let r = await call('/api/auth/register', { method: 'POST', body: { username: user, password: 'rahasia123' } })
assert(r.status === 200 && r.json.token, 'register: ' + r.text)
token = r.json.token
balance = r.json.user.balance
assert(balance === 1000000, 'saldo awal 1jt, dapat ' + balance)

// --- play-page config comes from the games table ---
r = await call('/api/games/head_tail', { token })
assert(r.status === 200, 'detail head_tail: ' + r.text)
const cfg = r.json
assert(cfg.win === 96 && cfg.min_limit === 200 && cfg.max_limit === 10000, 'config head_tail salah: ' + r.text)
assert(cfg.probable_win === 48, 'probable_win harus 48, dapat ' + cfg.probable_win)

r = await call('/api/games/tidak_ada', { token })
assert(r.status === 404, 'alias ngawur harus 404, dapat ' + r.status)

// --- limits + validation ---
r = await call('/api/play/invest/head_tail', { method: 'POST', token, body: { invest: 100, choose: 'head' } })
assert(r.status === 400 && /minimum/i.test(r.json.error), 'invest di bawah min harus 400 minimum, dapat ' + r.text)
r = await call('/api/play/invest/head_tail', { method: 'POST', token, body: { invest: 200000, choose: 'head' } })
assert(r.status === 400 && /maximum/i.test(r.json.error), 'invest di atas max harus 400 maximum, dapat ' + r.text)
r = await call('/api/play/invest/head_tail', { method: 'POST', token, body: { invest: 1000, choose: 'kepala' } })
assert(r.status === 400 && /head or tail/i.test(r.json.error), 'choose ngawur harus 400, dapat ' + r.text)
r = await call('/api/play/invest/head_tail', { method: 'POST', body: { invest: 1000, choose: 'head' } })
assert(r.status === 401, 'tanpa token harus 401, dapat ' + r.status)

// --- one open round at a time + cancel releases it ---
r = await call('/api/play/invest/head_tail', { method: 'POST', token, body: { invest: 1000, choose: 'head' } })
assert(r.status === 200, 'invest pertama: ' + r.text)
balance -= 1000
const openLog = r.json.game_log_id
r = await call('/api/play/invest/head_tail', { method: 'POST', token, body: { invest: 1000, choose: 'tail' } })
assert(r.status === 400 && /in-complete/i.test(r.json.error), 'ronde kedua harus ditolak, dapat ' + r.text)
r = await call('/api/play/cancel/head_tail', { method: 'POST', token })
assert(r.status === 200 && r.json.cancelled === true && r.json.game_log_id === openLog, 'cancel: ' + r.text)
r = await call('/api/play/end/head_tail', { method: 'POST', token, body: { game_log_id: openLog } })
assert(r.status === 400, 'ronde yang di-cancel nggak boleh bisa di-end, dapat ' + r.status + ' ' + r.text)

// --- gameplay bonus: 5 finished rounds of the same game pays 10.000, exactly once ---
// (deterministic: spin_wheel is untouched before this, so its 5th finish must pay)
{
  let bonusAt = 0
  for (let i = 1; i <= 6; i++) {
    const inv = await call('/api/play/invest/spin_wheel', { method: 'POST', token, body: { invest: 1000, choose: 'red' } })
    assert(inv.status === 200, 'spin_wheel invest: ' + inv.text)
    balance = inv.json.balance
    const end = await call('/api/play/end/spin_wheel', { method: 'POST', token, body: { game_log_id: inv.json.game_log_id } })
    balance += (end.json.win_amount || 0) + (end.json.gameplay_bonus || 0)
    if (end.json.gameplay_bonus) {
      assert(end.json.gameplay_bonus === 10000, 'bonus harus 10000, dapat ' + end.json.gameplay_bonus)
      bonusAt = i
    }
    assert(Math.abs(end.json.bal - balance) < 0.01, `spin_wheel bal harus ${balance}, dapat ${end.json.bal}`)
  }
  assert(bonusAt === 5, `gameplay bonus harus di ronde ke-5, dapat ronde ke-${bonusAt}`)
  console.log('  gameplay bonus      paid on the 5th finished round, once')
}

// --- the quick family: invest -> end, payout follows the `win` column ---
const QUICK = {
  head_tail: { win: 96, invests: [{ invest: 1000, choose: 'head' }] },
  dice_rolling: { win: 550, invests: [{ invest: 1000, choose: '3' }] },
  rock_paper_scissors: { win: 110, invests: [{ invest: 1000, choose: 'rock' }] },
  card_finding: { win: 110, invests: [{ invest: 1000, choose: 'red' }] },
  spin_wheel: { win: 110, invests: [{ invest: 1000, choose: 'red' }] },
  number_pool: { win: 700, invests: [{ invest: 1000, choose: '3' }] },
  casino_dice: { win: null, invests: [{ invest: 1000, choose: 'low', percent: 50 }] },   // payout = invest * 99/percent
}

const bonuses = []
const KENO_LEVELS = { 4: 10, 5: 20, 6: 30, 7: 40, 8: 50, 9: 60, 10: 70 }   // matches -> payout %
for (const [alias, spec] of Object.entries(QUICK)) {
  let wins = 0
  let losses = 0
  for (let i = 0; i < 40 && wins === 0; i++) {
    const payload = { ...spec.invests[0] }
    const inv = await call(`/api/play/invest/${alias}`, { method: 'POST', token, body: payload })
    assert(inv.status === 200, `${alias} invest: ` + inv.text)
    assert(inv.json.balance === balance - payload.invest, `${alias} debit salah: ${inv.json.balance} vs ${balance - payload.invest}`)
    balance = inv.json.balance
    const end = await call(`/api/play/end/${alias}`, { method: 'POST', token, body: { game_log_id: inv.json.game_log_id } })
    assert(end.status === 200, `${alias} end: ` + end.text)
    assert(end.json.finished === true && end.json.sound, `${alias} end harus finished + sound`)
    // the gameplay bonus (their rule: after 5 finished rounds of the same game, once)
    if (end.json.gameplay_bonus) bonuses.push([alias, end.json.gameplay_bonus])
    balance += end.json.win_amount + (end.json.gameplay_bonus || 0)
    if (end.json.win_status === 1) {
      const expect = spec.win === null
        ? Math.round(payload.invest * (99 / payload.percent) * 100) / 100
        : payload.invest * (1 + spec.win / 100)
      assert(Math.abs(end.json.win_amount - expect) < 0.01,
        `${alias} payout harus ${expect}, dapat ${end.json.win_amount}`)
      wins++
    } else {
      assert(end.json.win_amount === 0, `${alias} yang kalah nggak boleh dibayar`)
      losses++
    }
    assert(Math.abs(end.json.bal - balance) < 0.01, `${alias} saldo harus ${balance}, dapat ${end.json.bal}`)
  }
  assert(wins > 0, `${alias}: nggak ada menang dalam 40 ronde (probable_win kelewat kecil?)`)
  console.log(`  ${alias.padEnd(20)} wins ${wins} / losses ${losses}`)
}

// --- numbers family: multi-step guesses, reels, ratios ---
{
  // number_guess: result is hidden on start, hints come back per try, max 5 tries
  let inv = await call('/api/play/invest/number_guess', { method: 'POST', token, body: { invest: 1000 } })
  assert(inv.status === 200, 'number_guess invest: ' + inv.text)
  assert(!('result' in inv.json), 'number_guess nggak boleh bocorin hasil di start: ' + inv.text)
  balance = inv.json.balance
  const logId = inv.json.game_log_id
  let step = null
  let tries = 0
  for (let i = 0; i < 6; i++) {
    step = await call('/api/play/end/number_guess', { method: 'POST', token, body: { game_log_id: logId, number: 50 } })
    assert(step.status === 200, 'number_guess end: ' + step.text)
    tries++
    if (step.json.finished) break
    assert(['high', 'low'].includes(step.json.hint), 'harus ada hint high/low: ' + step.text)
    assert(/^\d+(\.\d+)?%$/.test(step.json.next_bonus || ''), 'next_bonus harus persen: ' + step.text)
    assert(step.json.tries === tries, `tries harus ${tries}, dapat ${step.json.tries}`)
  }
  assert(step.json.finished === true && tries <= 5, `number_guess harus kelar dalam <=5 tries, dapat ${tries}`)
  balance += step.json.win_amount || 0
  assert(Math.abs(step.json.bal - balance) < 0.01, `number_guess bal harus ${balance}, dapat ${step.json.bal}`)
  console.log(`  number_guess         finished in ${tries} tries (pay ${step.json.win_amount})`)

  // number_slot: payout = invest * level% (level 1..3 = your digit appears 1..3 times)
  const LEVELS = [100, 150, 200]
  let slotWins = 0
  for (let i = 0; i < 30 && slotWins === 0; i++) {
    inv = await call('/api/play/invest/number_slot', { method: 'POST', token, body: { invest: 1000, choose: '7' } })
    assert(inv.status === 200, 'number_slot invest: ' + inv.text)
    balance = inv.json.balance
    const end = await call('/api/play/end/number_slot', { method: 'POST', token, body: { game_log_id: inv.json.game_log_id } })
    assert(end.status === 200, 'number_slot end: ' + end.text)
    balance += (end.json.win_amount || 0) + (end.json.gameplay_bonus || 0)
    const hit = (end.json.result || []).filter((n) => n === 7).length
    assert(hit >= 0 && hit <= 3, 'number_slot result harus 3 digit: ' + JSON.stringify(end.json.result))
    if (end.json.win_status === 1) {
      assert(end.json.win_amount === (1000 * LEVELS[hit - 1]) / 100,
        `number_slot payout level ${hit} harus ${(1000 * LEVELS[hit - 1]) / 100}, dapat ${end.json.win_amount}`)
      slotWins++
    } else {
      assert(end.json.win_amount === 0, 'number_slot kalah nggak dibayar')
    }
    assert(Math.abs(end.json.bal - balance) < 0.01, `number_slot bal harus ${balance}, dapat ${end.json.bal}`)
  }
  assert(slotWins > 0, 'number_slot nggak pernah menang dalam 30 ronde')
  console.log('  number_slot          reel level payout matches its `level` list')

  // color / roulette / keno: payout ratios and the drawn results
  const rounds = [
    { alias: 'color_prediction', body: { invest: 10000, choose: 'green' }, check: (j) => [1.5, 2, 0].includes(j.win_amount / 10000) },
    { alias: 'color_prediction', body: { invest: 10000, choose: '4' }, check: (j) => [9, 0].includes(j.win_amount / 10000) },
    { alias: 'roulette', body: { invest: 1000, choose: 'red' }, check: (j) => [2, 0].includes(j.win_amount / 1000) },
    { alias: 'roulette', body: { invest: 1000, choose: '1_12' }, check: (j) => [3, 0].includes(j.win_amount / 1000) },
    { alias: 'keno', body: { invest: 10000, choose: [1, 5, 9, 13, 17, 21, 25, 29, 33, 37] }, check: () => true },
  ]
  for (const r of rounds) {
    let won = 0
    let paid = 0
    let played = 0
    for (let i = 0; i < 30 && won === 0; i++) {
      inv = await call(`/api/play/invest/${r.alias}`, { method: 'POST', token, body: r.body })
      assert(inv.status === 200, `${r.alias} invest: ` + inv.text)
      balance = inv.json.balance
      played++
      const end = await call(`/api/play/end/${r.alias}`, { method: 'POST', token, body: { game_log_id: inv.json.game_log_id } })
      assert(end.status === 200, `${r.alias} end: ` + end.text)
      balance += (end.json.win_amount || 0) + (end.json.gameplay_bonus || 0)
      assert(r.check(end.json), `${r.alias} payout nggak wajar: ` + end.text)
      if (end.json.win_status === 1) { won++; paid = end.json.win_amount }
      assert(Math.abs(end.json.bal - balance) < 0.01, `${r.alias} bal harus ${balance}, dapat ${end.json.bal}`)
      if (r.alias === 'keno' && end.json.win_status === 1) {
        const matches = (inv.json.match_number || []).length
        assert(matches >= 4 && matches <= 10, 'keno match_number 4-10: ' + JSON.stringify(inv.json.match_number))
        assert(Math.abs(end.json.win_amount - 10000 * (1 + KENO_LEVELS[matches] / 100)) < 0.01,
          `keno payout ${matches} match: ${end.json.win_amount}`)
      }
    }
    assert(won > 0, `${r.alias} nggak pernah menang dalam 30 ronde`)
    console.log(`  ${r.alias.padEnd(20)} paid ${paid} after ${played} ronde`)
  }
}

// --- no second bonus per game (the QUICK loop tracks whatever crossed 5 rounds) ---
assert(bonuses.every(([, amt]) => amt === 10000), 'gameplay bonus harus 10000: ' + JSON.stringify(bonuses))
assert(new Set(bonuses.map(([a]) => a)).size === bonuses.length, 'bonus cuma sekali per game: ' + JSON.stringify(bonuses))
if (bonuses.length) console.log('  bonus lain:', JSON.stringify(bonuses))

const me = await call('/api/me', { token })
assert(Math.abs(me.json.balance - balance) < 0.01, `saldo akhir harus ${balance}, dapat ${me.json.balance}`)

console.log(`casino engine: all checks passed (user ${user}, saldo akhir ${me.json.balance})`)
