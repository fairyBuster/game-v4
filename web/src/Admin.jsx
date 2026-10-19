import { useCallback, useEffect, useState } from 'react'
import { admin } from './api.js'
import { fmt } from './games.js'

// Admin panel: users (saldo/ban), withdrawal requests (approve/reject), stats, game switches.
export default function Admin({ user }) {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [wds, setWds] = useState([])
  const [games, setGames] = useState([])
  const [stats, setStats] = useState(null)
  const [refs, setRefs] = useState({ rows: [], txs: 0, total: 0 })
  const [chances, setChances] = useState({})
  const [delta, setDelta] = useState({})
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)

  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    if (!user?.is_admin) return
    try {
      const [u, s, w, g, rf] = await Promise.all([admin.users(), admin.stats(), admin.withdrawals(), admin.games(), admin.referrals()])
      setUsers(u); setStats(s); setWds(w); setGames(g); setRefs(rf)
    } catch (e) { say(e.message) }
  }, [user])

  useEffect(() => { load() }, [load])

  if (!user?.is_admin) {
    return <div className="adm"><h1>Panel admin</h1><p className="muted">Akun ini bukan admin. <a href="#/">Balik ke lobby</a></p></div>
  }

  async function adjust(id) {
    const d = Math.floor(Number(delta[id] || 0))
    if (!d) return say('isi nominal dulu')
    setBusy(true)
    try {
      const r = await admin.setBalance(id, d, 'adjust manual admin')
      setUsers((list) => list.map((u) => (u.id === id ? { ...u, balance: r.balance } : u)))
      setDelta((s) => ({ ...s, [id]: '' }))
      say('saldo diupdate')
      admin.stats().then(setStats)
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }

  async function toggleBan(u) {
    setBusy(true)
    try {
      await admin.ban(u.id, !u.banned)
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, banned: !x.banned } : x)))
      say(u.banned ? `${u.username} dibuka` : `${u.username} diblokir`)
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }

  async function decide(tx, action) {
    setBusy(true)
    try {
      await admin.decide(tx.id, action)
      say(`WD ${tx.username} ${action === 'approve' ? 'disetujui' : 'ditolak'}`)
      load()
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }

  async function toggleGame(g) {
    try {
      await admin.toggleGame(g.alias, !g.enabled)
      setGames((list) => list.map((x) => (x.alias === g.alias ? { ...x, enabled: !x.enabled } : x)))
      say(`${g.name} ${g.enabled ? 'dimatikan' : 'diaktifkan'}`)
    } catch (e) { say(e.message) }
  }

  async function saveChance(g) {
    const raw = chances[g.alias] ?? g.win_chance ?? g.natural ?? ''
    const v = Number(raw)
    if (raw === '' || !Number.isFinite(v)) return say('isi peluang 0-100 dulu')
    try {
      const r = await admin.setChance(g.alias, v)
      setGames((list) => list.map((x) => (x.alias === g.alias ? { ...x, win_chance: r.chance } : x)))
      setChances((s) => { const n = { ...s }; delete n[g.alias]; return n })
      say(`${g.name}: peluang menang ${r.chance}%`)
    } catch (e) { say(e.message) }
  }

  async function resetChance(g) {
    try {
      const r = await admin.setChance(g.alias, null)
      setGames((list) => list.map((x) => (x.alias === g.alias ? { ...x, win_chance: null, natural: r.natural ?? x.natural } : x)))
      setChances((s) => { const n = { ...s }; delete n[g.alias]; return n })
      say(`${g.name}: kembali ke peluang alami${r.natural != null ? ` (${r.natural}%)` : ''}`)
    } catch (e) { say(e.message) }
  }

  const money = (v) => fmt.format(Number(v || 0))

  return (
    <div className="adm">
      <div className="adm-head">
        <a className="game-back" href="#/">‹ Lobby</a>
        <h1>Panel Admin</h1>
        <div className="adm-tabs">
          {[['users', 'Member'], ['referrals', 'Referal'], ['withdrawals', `WD${stats?.pending ? ` (${stats.pending})` : ''}`], ['games', 'Game']].map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
          <button onClick={load}>Refresh</button>
        </div>
      </div>

      {stats ? (
        <div className="kpis">
          <div className="kpi"><span>Member</span><b>{stats.users}</b></div>
          <div className="kpi"><span>Total spin</span><b>{stats.spins}</b></div>
          <div className="kpi"><span>Total taruhan</span><b>{money(stats.staked)}</b></div>
          <div className="kpi"><span>Total menang</span><b>{money(stats.won)}</b></div>
          <div className="kpi"><span>RTP aktual / GGR</span><b>{(stats.rtp * 100).toFixed(2)}% · {money(stats.ggr)}</b></div>
        </div>
      ) : null}

      {tab === 'users' ? (
        <>
          <p className="muted">Akun admin & testing (t_/c_) tidak ditampilkan.</p>
          <table className="adm-table">
            <thead>
              <tr><th>ID</th><th>Username</th><th>Referral</th><th>Saldo</th><th>Spin</th><th>Taruhan</th><th>Menang</th><th>Status</th><th>Adjust saldo</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.ref_code || '—'}{u.invited ? ` · ${u.invited} undangan` : ''}</td>
                  <td>{money(u.balance)}</td>
                  <td>{u.spins}</td>
                  <td>{money(u.staked)}</td>
                  <td>{money(u.won)}</td>
                  <td>{u.banned ? <span className="tag bad">diblokir</span> : <span className="tag">aktif</span>}</td>
                  <td>
                    <input value={delta[u.id] || ''} placeholder="±100000" inputMode="numeric"
                           onChange={(e) => setDelta((s) => ({ ...s, [u.id]: e.target.value }))} />
                    <button className="adm-btn" disabled={busy} onClick={() => adjust(u.id)}>Terapkan</button>
                    <button className="adm-btn warn" disabled={busy} onClick={() => toggleBan(u)}>{u.banned ? 'Buka' : 'Blokir'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {tab === 'referrals' ? (
        <>
          <p className="muted">Total bonus referal dibayar: <b>{money(refs.total)}</b> · {refs.rows.length} member dari referal.</p>
          <table className="adm-table">
            <thead><tr><th>ID</th><th>Member baru</th><th>Diundang oleh</th><th>Tanggal</th></tr></thead>
            <tbody>
              {refs.rows.length ? refs.rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.username}</td>
                  <td>{r.referrer}</td>
                  <td>{new Date(r.created_at).toLocaleString('id-ID')}</td>
                </tr>
              )) : <tr><td colSpan="4">Belum ada referal.</td></tr>}
            </tbody>
          </table>
        </>
      ) : null}

      {tab === 'withdrawals' ? (
        <table className="adm-table">
          <thead><tr><th>ID</th><th>Member</th><th>Nominal</th><th>Tujuan</th><th>Status</th><th>Waktu</th><th>Aksi</th></tr></thead>
          <tbody>
            {wds.length ? wds.map((w) => (
              <tr key={w.id}>
                <td>{w.id}</td>
                <td>{w.username}</td>
                <td>{money(w.amount)}</td>
                <td>{w.note || '-'}</td>
                <td><span className={`tag${w.status === 'pending' ? '' : ' bad'}`}>{w.status}</span></td>
                <td>{new Date(w.created_at).toLocaleString('id-ID')}</td>
                <td>
                  {w.status === 'pending' ? (
                    <>
                      <button className="adm-btn" disabled={busy} onClick={() => decide(w, 'approve')}>Setujui</button>
                      <button className="adm-btn warn" disabled={busy} onClick={() => decide(w, 'reject')}>Tolak</button>
                    </>
                  ) : '—'}
                </td>
              </tr>
            )) : <tr><td colSpan="7">Belum ada request.</td></tr>}
          </tbody>
        </table>
      ) : null}

      {tab === 'games' ? (
        <>
          <p className="muted">
            Peluang menang = frekuensi putaran yang menang (0-100%). Game meja & vendor mengikuti aturan masing-masing.
          </p>
          <table className="adm-table">
            <thead>
              <tr><th>Alias</th><th>Nama</th><th>Tipe</th><th>Status</th><th>Peluang menang</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.alias}>
                  <td>{g.alias}</td>
                  <td>{g.name}</td>
                  <td><span className="tag">{g.kind}</span></td>
                  <td><span className={`tag${g.enabled ? '' : ' bad'}`}>{g.enabled ? 'tampil' : 'disembunyikan'}</span></td>
                  <td>
                    {g.chance_editable ? (
                      <>
                        <input value={chances[g.alias] ?? (g.win_chance ?? g.natural ?? '')} inputMode="decimal"
                               onChange={(e) => setChances((s) => ({ ...s, [g.alias]: e.target.value }))} />%
                        <button className="adm-btn" onClick={() => saveChance(g)}>Set</button>
                        <button className="adm-btn warn" onClick={() => resetChance(g)}>Alami</button>
                        <div className="muted small">
                          {g.win_chance != null ? `diatur ${g.win_chance}%` : 'alami'}{g.natural != null ? ` · alami ${g.natural}%` : ''}
                        </div>
                      </>
                    ) : <span className="muted">— aturan</span>}
                  </td>
                  <td><button className="adm-btn" onClick={() => toggleGame(g)}>{g.enabled ? 'Sembunyikan' : 'Tampilkan'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
