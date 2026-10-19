/**
 * Headless screenshot + DOM probe for the DY01 app, with a logged-in session.
 *
 *   node tools/shot.mjs "#/" screenshot-lobby.png [--probe ".card img"]
 *
 * Why: the in-app browser tool keeps losing the session, and the app needs a token in
 * localStorage before it renders anything. This drives Chrome over CDP (no deps, Node 22
 * has a global WebSocket) — logs in via fetch, stores the token, navigates, screenshots,
 * and optionally dumps computed styles for a selector.
 */
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [hash = '#/', out = 'screenshot.png', ...rest] = process.argv.slice(2)
const probeIdx = rest.indexOf('--probe')
const probe = probeIdx >= 0 ? rest[probeIdx + 1] : null
const evalIdx = rest.indexOf('--eval')
const evalExpr = evalIdx >= 0 ? rest[evalIdx + 1] : null
const waitIdx = rest.indexOf('--wait')
const waitMs = waitIdx >= 0 ? Number(rest[waitIdx + 1]) : 2500
const mobileIdx = rest.indexOf('--mobile')
const mobile = mobileIdx >= 0 ? rest[mobileIdx + 1].split('x').map(Number) : null
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8800'
const PORT = 9333+ Math.floor(Math.random() * 200)
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'dy01shot-'))}`,
  '--window-size=1280,720', 'about:blank',
], { stdio: 'ignore' })

async function targetUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
      const page = list.find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch { /* not up yet */ }
    await sleep(250)
  }
  throw new Error('chrome CDP never came up')
}

const ws = new WebSocket(await targetUrl())
await new Promise((res) => ws.addEventListener('open', res))
let id = 0
const pending = new Map()
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
})
const send = (method, params = {}) => new Promise((res) => {
  const mid = ++id
  pending.set(mid, res)
  ws.send(JSON.stringify({ id: mid, method, params }))
})
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed')
  return r.result?.result?.value
}

await send('Page.enable')
if (mobile) {
  // real phone metrics: mobile flag + touch + DPR, so media/orientation logic behaves like a phone
  await send('Emulation.setDeviceMetricsOverride', {
    width: mobile[0], height: mobile[1], deviceScaleFactor: 2, mobile: true,
    screenOrientation: { type: mobile[1] > mobile[0] ? 'portraitPrimary' : 'landscapePrimary', angle: 0 },
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  console.log(`mobile emulation ${mobile[0]}x${mobile[1]}`)
}
// 1. log in on the origin, keep the token in localStorage
await send('Page.navigate', { url: BASE_URL + '/?shot=1' })
await sleep(1200)
const login = await evaluate(`fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({username:'${process.env.USER_NAME || 'demo'}',password:'${process.env.PASS || 'demo123'}'})})
  .then(r=>r.json()).then(d=>{localStorage.setItem('dy01_token',d.token);return 'ok:'+d.user.balance})`)
console.log('login:', login)

// 2. open the requested route and let it settle
await send('Page.navigate', { url: `${BASE_URL}/?shot=2${hash}` })
await sleep(waitMs)

if (evalExpr) {
  console.log('eval:', await evaluate(evalExpr))
}

if (probe) {
  const info = await evaluate(`JSON.stringify([...document.querySelectorAll(${JSON.stringify(probe)})].map(e=>{
    var cs=getComputedStyle(e),b=e.getBoundingClientRect();
    var hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
    return {el:e.tagName,src:e.getAttribute('src')||null,nat:[e.naturalWidth,e.naturalHeight],
      rect:[Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)],
      op:cs.opacity,vis:cs.visibility,z:cs.zIndex,fit:cs.objectFit,filter:cs.filter,
      pos:cs.position,disp:cs.display,ins:cs.inset,w:cs.width,h:cs.height,
      hit:hit?(hit.tagName+'.'+String(hit.className).slice(0,30)):null,
      hitBg:hit?getComputedStyle(hit).backgroundColor:null,
      hitBgImg:hit?getComputedStyle(hit).backgroundImage.slice(0,60):null}
  }))`)
  console.log('probe:', info)
}

const shot = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
console.log('wrote', out)

ws.close()
chrome.kill()
