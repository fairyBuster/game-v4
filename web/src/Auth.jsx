import { useEffect, useState } from 'react'
import { auth, setToken } from './api.js'
import './auth.css'

// Login / register against the one backend. Nothing else in the app renders until this
// succeeds, so every screen can assume there is a logged-in user.
export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', phone: '', ref: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Link referral (/?ref=KODE) langsung buka tab Daftar dengan kodenya terisi.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('ref')
    if (!code) return
    setMode('register')
    setForm((f) => ({ ...f, ref: code.trim().toUpperCase() }))
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = mode === 'login'
        ? await auth.login(form.username, form.password)
        : await auth.register(form.username, form.password, form.phone, form.ref)
      setToken(res.token)
      if (window.location.search) window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      onAuth(res.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <img className="auth-bg" src="/dy01/bg_hall.jpg" alt="" />
      <div className="auth-veil" />
      <form className="auth-card" onSubmit={submit}>
        <img className="auth-logo" src="/dy01/logo.png" alt="DY01" />
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError('') }}>Masuk</button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setError('') }}>Daftar</button>
        </div>

        <label>
          <span>Username</span>
          <input value={form.username} onChange={set('username')} autoComplete="username"
                 placeholder="3-20 huruf/angka/_" required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={form.password} onChange={set('password')}
                 autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                 placeholder="minimal 6 karakter" required />
        </label>
        {mode === 'register' ? (
          <label>
            <span>No. HP (opsional)</span>
            <input value={form.phone} onChange={set('phone')} placeholder="08xxxxxxxxxx" />
          </label>
        ) : null}
        {mode === 'register' ? (
          <label>
            <span>Kode Referral (opsional)</span>
            <input value={form.ref} onChange={set('ref')} placeholder="mis. A1B2C3 — dapat bonus Rp 25.000"
                   autoComplete="off" />
          </label>
        ) : null}

        {error ? <p className="auth-error">{error}</p> : null}

        <button className="btn gold auth-submit" disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Masuk' : 'Daftar & Main'}
        </button>

        <p className="auth-note">
          {mode === 'login'
            ? <>Belum punya akun? <b>Daftar</b> — saldo awal Rp 1.000.000 (demo).</>
            : <>Sudah punya akun? <b>Masuk</b>.</>}
        </p>
      </form>
    </div>
  )
}
