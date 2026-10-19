import { useEffect, useRef, useState } from 'react'
import { vendorBet, vendorWin } from './api.js'
import GameHeader from './GameHeader.jsx'
import './vendor-game.css'

/**
 * Wrapper for a game we did not write: the vendor builds are already complete
 * (own canvas engine, own art/audio), so we just frame them inside the stage.
 *
 * Money is the one thing the frame does NOT own: it is tagged ?portal=1&alias= and
 * asks us over postMessage for every stake/payout, we settle it on /api/vendor/*,
 * so the game draws from the same DY01 wallet as our own engines.
 */
export default function VendorGame({ title, src, alias, user, setUser }) {
  const frame = useRef(null)
  const balance = useRef(user?.balance ?? 0)
  const betRef = useRef(0)
  const bannerTimer = useRef(null)
  const [banner, setBanner] = useState('')
  balance.current = user?.balance ?? 0

  useEffect(() => () => clearTimeout(bannerTimer.current), [])

  // settled wins flash the same banner our engines use
  const flash = (text) => {
    setBanner(text)
    clearTimeout(bannerTimer.current)
    bannerTimer.current = setTimeout(() => setBanner(''), 1900)
  }

  useEffect(() => {
    const post = (msg) => frame.current?.contentWindow?.postMessage({ source: 'dy01-portal', ...msg }, window.location.origin)

    // Replies echo the request's own `type`+`id` — that pair is the frame's promise key.
    const onMessage = async (e) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return
      const d = e.data || {}
      if (d.source !== 'dy01-vendor') return

      if (d.type === 'ready') return post({ type: 'balance', value: balance.current })

      if (d.type === 'bet') {
        try {
          const r = await vendorBet(alias, d.amount)
          betRef.current = d.amount
          setUser((u) => ({ ...u, balance: r.balance }))
          post({ type: 'bet', id: d.id, ok: true, balance: r.balance, spinId: r.spinId })
        } catch (err) {
          post({ type: 'bet', id: d.id, ok: false, message: err.message, balance: balance.current })
        }
        return
      }

      if (d.type === 'win') {
        try {
          const r = await vendorWin(alias, d.spinId, d.amount)
          setUser((u) => ({ ...u, balance: r.balance }))
          if (r.win > 0) flash(r.win >= betRef.current * 15 ? 'BIG WIN!' : 'WIN!')
          post({ type: 'win', id: d.id, ok: true, balance: r.balance, win: r.win })
        } catch (err) {
          post({ type: 'win', id: d.id, ok: false, message: err.message, balance: balance.current })
        }
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [alias, setUser])

  return (
    <div className="vg">
      <GameHeader name={title} user={user} />
      <iframe className="vg-frame" ref={frame} src={src} title={title} allow="autoplay; fullscreen" />
      {banner ? <div className={`game-banner ${banner.includes('BIG') ? 'big' : ''}`}>{banner}</div> : null}
    </div>
  )
}
