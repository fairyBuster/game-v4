import { useEffect, useState } from 'react'
import Lobby from './Lobby.jsx'
import GamePage from './GamePage.jsx'
import SlotGame from './SlotGame.jsx'
import GatesGame from './GatesGame.jsx'
import VendorGame from './VendorGame.jsx'
import CasinoGame, { CASINO_READY } from './games/CasinoGame.jsx'
import Admin from './Admin.jsx'
import Auth from './Auth.jsx'
import { auth, setToken } from './api.js'
import { FALLBACK_GAMES } from './games.js'
import { VENDOR_GAMES } from './vendorGames.js'
import './ui.css'

// Tiny hash router — no dependency needed.
function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#\/?/, ''))
  useEffect(() => {
    const on = () => setRoute(window.location.hash.replace(/^#\/?/, ''))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

// The whole stage is a fixed 1280x720 canvas that scales to whatever viewport we get.
// On a phone held upright a landscape 1280x720 stage would be a 390x219 sliver, so a portrait
// viewport gets the stage rotated 90° and scaled against the swapped sides — the app is always
// landscape, no matter how the phone is held (rotate the phone and the rotation drops out).
function useStageScale() {
  const [fit, setFit] = useState({ scale: 1, rotate: false })
  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const rotate = h > w
      setFit({
        rotate,
        scale: rotate ? Math.min(h / 1280, w / 720) : Math.min(w / 1280, h / 720),
      })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])
  return fit
}

export default function App() {
  const route = useHashRoute()
  const { scale, rotate } = useStageScale()
  const [user, setUser] = useState(undefined)     // undefined = still checking the token

  useEffect(() => {
    auth.me().then(setUser).catch(() => { setToken(''); setUser(null) })
    const onUnauth = () => setUser(null)
    window.addEventListener('dy01:unauth', onUnauth)
    return () => window.removeEventListener('dy01:unauth', onUnauth)
  }, [])

  const [, play] = route.split('/')
  const vendor = VENDOR_GAMES.find((g) => g.alias === play)

  async function logout() {
    await auth.logout().catch(() => {})
    setToken('')
    setUser(null)
    window.location.hash = '#/'
  }

  let view
  if (user === undefined) view = <div className="boot">memuat…</div>
  else if (!user) view = <Auth onAuth={setUser} />
  else if (route === 'admin') view = <Admin user={user} />
  else if (!route.startsWith('play/')) view = <Lobby user={user} setUser={setUser} onLogout={logout} />
  else if (play === 'dy01_slot') view = <SlotGame user={user} setUser={setUser} />
  else if (play === 'gates') view = <GatesGame user={user} setUser={setUser} />
  else if (CASINO_READY.includes(play)) view = <CasinoGame alias={play} user={user} setUser={setUser} />
  else if (vendor) view = <VendorGame title={vendor.name} src={vendor.src} alias={vendor.alias} user={user} setUser={setUser} />
  else view = <GamePage alias={play} game={FALLBACK_GAMES.find((g) => g.alias === play)} user={user} />

  return (
    <div className="stage-wrap">
      <div className="stage" style={{ transform: `translate(-50%,-50%) rotate(${rotate ? 90 : 0}deg) scale(${scale})` }}>{view}</div>
    </div>
  )
}

export { useStageScale }
