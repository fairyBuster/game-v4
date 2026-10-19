# DY01 lobby (React)

Lobby yang dibangun ulang di React + Vite pakai asset hasil clone dari `h5.qwonf.pro`.
Cocos-nya nggak dipakai — cuma gambarnya.

```bash
cd C:\Project\dy01-clone\web
npm install     # sekali doang
npm run dev     # http://127.0.0.1:5188
```

## Isi

| file | isi |
|---|---|
| `src/App.jsx` | hash router + gate login (belum login → `Auth`), stage 1280x720 auto-scale |
| `src/api.js` | satu-satunya jalan ke backend (token di localStorage, 401 → balik ke login) |
| `src/Auth.jsx` + `auth.css` | halaman Masuk / Daftar (validasi + error dari server) |
| `src/Lobby.jsx` | topbar saldo, rail 14 entry (tiap entry buka modal + aksi), banner promo, 28 kartu game, 4 halaman nav |
| `src/Modal.jsx` + `ui.css` | modal bersama (deposit, tarik, info entry, FAQ), toast, panel/tabel |
| `src/Admin.jsx` | panel admin: member (adjust saldo, blokir), request WD (approve/tolak), KPI + RTP, on/off game |
| `src/GatesGame.jsx` | **Gates of Olympus** — draw & saldo dari `POST /api/spin` |
| `src/games/` | **12 game Casino-App** (head & tail, dadu, roulette, keno, koin, angka…) — komponen asli mereka + `CasinoGame.jsx` (fetch config, bungkus `CasinoApp`, `.casino-shell`), draw dari `POST /api/play/invest|end/{alias}` |
| `src/GameHeader.jsx` | header game yang dipakai bareng semua halaman game |
| `src/SlotGame.jsx` | **DY01 Slots** 5×3 20 line — spin, autoplay, free spins, paytable, win line, suara |
| `src/VendorGame.jsx` | iframe buat 7 game vendor (kredit sendiri, belum nyambung saldo DY01) |
| `src/GamePage.jsx` | kartu game yang belum ada build-nya (jujur: belum di-wire) |
| `src/vendorGames.js` | daftar 7 game vendor (alias → URL iframe) |
| `src/slot/gates.js`, `src/slot/engine.js` | logic game, bebas React → dipakai browser **dan** `server/index.js` |
| `src/slot/*.test.mjs`, `*.rtp.mjs` | check + ukur RTP (`node src/slot/gates.test.mjs`) |
| `src/games.js` | list fallback 19 game + `fmt` (kalau backend mati) |
| `src/lobby.css`, `src/slot.css`, `src/gates.css` | tampilan |
| `public/dy01/` | asset hasil clone (bg, chrome, entry, banner promo, judul bhs Indonesia, audio) |
| `public/gates/` | asset Gates (simbol 256px, bg, zeus, 16 audio) |
| `public/vendor/simple-slots/` | build vendor 7 tema (vendored) |

## Game vendor: 7 tema dari `compsmart/simple-slots` (di-embed, bukan ditulis ulang)

`compsmart/simple-slots` itu slot lengkap: 7 tema dalam satu engine canvas + Web Audio, tiap tema punya
reel strip, paytable, payline, art, dan audio sendiri. Jadi nggak gw tulis ulang — gw vendored apa adanya
ke `public/vendor/simple-slots/` lalu di-embed.

| | |
|---|---|
| route | `#/play/slot-<folder>` → `<iframe src="/vendor/simple-slots/game.html?theme=<Nama>">` |
| kartu lobby | `src/vendorGames.js` (daftar tunggal, dipakai lobby + router) |
| wrapper | `src/VendorGame.jsx` + `src/vendor-game.css` |
| tema | Gemstones · Pirate · Ancient Egypt · Aztec · Classic · Fantasy Forest · Space Adventure |

Dua hal yang gampang bikin salah:

1. `?theme=` harus persis `name` di `themes/<folder>/theme.js` — **huruf besar + spasi**, contoh
   `theme=Ancient%20Egypt`. Kalau salah, game diam-diam jatuh ke tema default (Aztec).
2. Build-nya melayout untuk ~1524x810 dan `body{min-height:100vh}` bikin scrollbar di iframe, jadi:
   iframe-nya dikasih 1524x810 lalu di-scale 0.84 (`vendor-game.css`), dan `styles.css` vendored-nya
   gw tambah `html,body{overflow:hidden}` (ditandai komentar) — tanpa itu tombol SPIN kepotong.

Tiap tema punya RTP sendiri (reel strip + paytable di `config.js`); repo-nya bawa `rtp-simulator.js`
kalau mau ngukur.

## Gates of Olympus (asset Pragmatic-style, diambil dari repo publik)

`#/play/gates` — 6 reel × 5 baris, **bayar di mana saja** (count-based 8/10/12), **cascading reels**,
**multiplier orb** 2x–500x yang nempel & mengali kemenangan tumble, **15 free spins** kalau 4+ Zeus
(3+ saat free spins → +5), cap menang **5000x bet**. Musik + 12 SFX asli dari paket asset-nya.

| sumber | isi |
|---|---|
| repo | `compsmart/gates-of-olympus-slots` (branch `regenerate-zeus-character`) |
| asset | 9 simbol paytable + scatter + orb + background 1920x1080 + Zeus + 16 audio → `vendor/gates/` |
| spec | `vendor/gates/game.yaml` — layout, paytable, bobot simbol, bobot orb, fitur, target RTP 96.5% |

Semua asset-nya **AI-generated** (prompt Gemini-nya ikut kelihatan di `game.yaml`), jadi bukan art
Pragmatic Play yang asli — aman dipakai, cuma gayanya ditiru.

Engine: `src/slot/gates.js` (logic murni, tanpa React) · UI `src/GatesGame.jsx` + `src/gates.css`.

```bash
node src/slot/gates.test.mjs     # shape, pay-anywhere, orb multiplier, tumble, scatter, cap 5000x, RTP
node src/slot/gates.rtp.mjs 500000
# measured RTP over 200000 spins (seeded, free spins included): 95.66%
# gates engine: all checks passed
```

> Satu penyimpangan yang disengaja: angka paytable di spec, kalau dipakai apa adanya, cuma keluar
> ~85% RTP. Jadi semua payout dikali `PAY_SCALE` (1.12) sampai RTP terukurnya nyampe target spec
> sendiri (96.5%). Bentuk paytable-nya nggak diubah.

## Game slot DY01 (bikin sendiri, art hasil clone)

`#/play/dy01_slot` — 5 reel × 3 baris, 20 line tetap, 11 simbol dari **icon sheet asli** di bundle
(dipotong pakai `tools/slice_sheet.py`, tiap ikon dinormalisasi ke frame kotak biar seragam):
Crown Medal (wild) · Treasure (scatter → free spins) · Coin Frame · Money Bag ·
Pink/Green/Purple/Red/Blue/Teal/Silver Medal. Bet 100 – 10.000 (line bet = bet/20), autoplay 10/25/50,
free spins 8/12/20, paytable + gambar 20 pola line, suara dari bundle (wheel/ding/addCoinsEfc/grandPrize).

> Simbolnya **bukan** dari sheet animasi entry (itu potongan spine: ada yang cuma glow/separuh objek,
> kelihatan pecah kalau dipakai sebagai ikon). Yang dipakai: `18f637d73.png` (11 medal),
> `19fcdd360.png` (gold gift box), `1e70d2250.png` (coin frame + money bag).

RTP terukur **96.40%** (200k spin, seed tetap, free spin dihitung) — angka itu datang dari
`engine.test.mjs`, bukan dari tebakan. Semua check lewat:

```bash
node src/slot/engine.test.mjs
# measured RTP over 200k paid spins (seeded, free spins included): 96.40%
# slot engine: all checks passed
```

> Catatan: RNG-nya **sudah di server** — `engine.js`/`gates.js` sengaja bebas React supaya bisa
> di-import langsung oleh `server/index.js`, yang jadi satu-satunya tempat yang draw dan yang
> memindahkan saldo.

## Catatan

* Semua posisi ditulis dalam pixel design 1280x720 (stage-nya landscape, sama kayak canvas Cocos-nya),
  lalu di-scale `min(vw/1280, vh/720)` — jadi layout-nya sama di layar apa pun.
* Backend: `server/index.js` (port 8015). Vite dev proxy arahin `/api` ke situ; kalau backend mati,
  lobby tetap render pakai list statis 19 game tapi semua aksi (spin, deposit, login) mati.
* Deposit/tarik masih demo (nggak nyambung payment gateway). Tarik dana bikin request `pending`
  yang harus di-approve admin di `#/admin`.
