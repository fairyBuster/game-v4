import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { api } from './api.js'

/**
 * Stand-in for Casino-App's AppContext. Their game components only ask for
 * { balance, demo, fmtMoney, refreshUser, playSound } — we serve them from the app's own user
 * state, so every game spends the same DY01 wallet. `demo` is always false: there is one wallet.
 */
const Ctx = createContext(null)

export function CasinoApp({ user, setUser, children }) {
  const [soundOn, setSoundOn] = useState(true)
  const soundRef = useRef(true)
  soundRef.current = soundOn
  const player = useRef(null)

  const refreshUser = useCallback(async () => {
    const me = await api.me()
    setUser?.(me)
    return me
  }, [setUser])

  const playSound = useCallback((file) => {
    if (!file || !soundRef.current) return
    try {
      player.current?.pause()
      player.current = new Audio(`/casino/audio/${file}`)
      player.current.volume = 0.5
      player.current.play().catch(() => {})
    } catch { /* autoplay blocked — fine */ }
  }, [])

  const fmtMoney = useCallback((value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`, [])

  return (
    <Ctx.Provider value={{
      user, balance: user?.balance ?? 0, demo: false, fmtMoney, refreshUser, playSound,
      soundOn, setSoundOn,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
