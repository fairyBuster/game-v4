# dy01-clone — asset mirror of h5.qwonf.pro (DY01)

Clone of the art/audio/font assets of the H5 casino platform at `https://h5.qwonf.pro/`
(Cocos Creator 2.4 build, bundles `hall_ct2` + `common_ct2` on CDN `bundle*.wdvsc7.com`).
Nothing here runs Cocos — the goal is to reuse the art with our own logic.

## What's inside

```
assets/
  hall/        241 atlas pages + 1425 import jsons + spine animations, audio, fonts
  common/      shared textures, bgm, particle plists
  launcher/    preloader art, title fonts
  main/        the game framework code bundle (engine/loader, for reference)
  internal/    cocos built-ins
  external/    loading background, logo, brand BGM (from images.beuih.com)
  _meta/       gallery.html, packs.json, manifest.json, contact sheets
  <bundle>/meta/import/*.json   asset/layout data (readable: node trees, atlas lists)
  <bundle>/native/**            the actual images/audio, named by their original path
```

Numbers as cloned: 957 PNG + 17 JPG (54 MB), 11 MP3, 81 spine atlases, 7 particle plists,
4 bitmap fonts, ~2000 import jsons. Locale ID/EN/VI/TH/BN/HI/MS/TL/UR/ZH text textures included.

## Tools (`tools/`)

| script | what it does |
|---|---|
| `fetch_assets.py` | re-mirror the bundles (decodes Cocos compressed uuids, walks pack tables) |
| `decrypt_assets.py` | undo the image encryption (16-byte magic + xor keys + nibble swap, lifted from the game's own downloader hook) |
| `atlas_index.py` | map pack id -> member assets; `--list <word>` to find which page holds a sprite |
| `slice_spine.py` | cut a spine `.atlas` sheet into individual sprites (`--all-entries` for the lobby entry icons). Handles `rotate: true` and pads each sprite back onto its real `orig` frame |
| `slice_sheet.py` | cut a sheet of *complete* icons into separate files (connected-component labelling, `--square` normalises each icon) — this is what the slot symbols come from |
| `sheets.py` | contact sheets of the biggest atlas pages / textures |
| `make_gallery.py` | browsable `assets/_meta/gallery.html` |
| `api_probe.py` | try the platform's own API (AES-256-ECB like its client). `/maintain/timestamp` + `server_status` answer; `app_info` / `v3/entrance` return 500 — the game list is behind that + an Aliyun captcha |

Then `web/` is the React app rebuilt on top of the art (lobby + two playable slots) — see `web/README.md`.

## Backend — satu proses untuk semua (`server/`)

Zero npm: `node:http` + `node:sqlite` + `node:crypto`. Satu file `server/index.js` (~450 baris) yang
menangani auth, wallet, game, admin, **dan** menyajikan `web/dist`.

```bash
cd server && node index.js          # http://127.0.0.1:8015  (port ini yang di-proxy vite)
cd server && node test.js           # 30+ assertion: register→login→spin→WD→approve→ban→stats
```

Akun seed: **admin/admin123** (panel admin) dan **demo/demo123** (saldo awal Rp 1.000.000).

| area | endpoint |
|---|---|
| auth | `POST /api/auth/register`, `/login`, `/logout`, `GET /api/me` |
| lobby | `GET /api/games`, `GET /api/logs?limit=` |
| main | `POST /api/spin` `{alias,bet}` → `{balance,win,detail}` (detail = data buat replay animasi) |
| mini (lama, udah dihapus) | ~~`POST /api/play`~~ → diganti `/api/play/invest|end/{alias}` |
| vendor | `POST /api/vendor/bet` `{alias,bet}` → `{balance,spinId}` lalu `POST /api/vendor/win` `{alias,spinId,win}` → `{balance,win}` |
| wallet | `POST /api/wallet/deposit`, `/withdraw` (pending → approve admin), `GET /api/wallet/txs`, `POST /api/bonus/daily` |
| admin | `GET /api/admin/users`, `POST /api/admin/balance`, `/ban`, `GET/POST /api/admin/withdraw(als)`, `GET /api/admin/stats`, `GET/POST /api/admin/game(s)` |

Aturan yang dipegang: **RNG dan saldo cuma di server.** Browser cuma kirim `{alias, bet}`, server yang
draw pakai engine yang sama (`web/src/slot/gates.js`, `engine.js`), cap menang 5000x, potong saldo,
tulis log, lalu balikin hasilnya — client hanya memutar animasinya. Bet divalidasi terhadap daftar
per-game, saldo diperiksa, password pakai scrypt + salt, session pakai token random 32 byte.

Catatan jujur: deposit/withdraw demo (nggak nyambung payment gateway). 7 game vendor jalan di iframe,
**satu saldo dengan game lain**: frame menagih stake lewat `POST /api/vendor/bet` saat reels mulai,
lalu meng-kredit payout lewat `POST /api/vendor/win` — bridge-nya postMessage di `web/src/VendorGame.jsx`.

**Patch di build vendor** (kalau `public/vendor/simple-slots` di-update, ulangi dua ini):
1. `styles.css` — `html, body { overflow: hidden }`, `body { min-height: 0; padding: 8px }`: build-nya
   nggak boleh scroll karena dipasang di iframe.
2. `game.js` (`drawUIElements`) — label `BALANCE:` jadi `SALDO:`, dan angka saldo/bet digambar pakai
   `drawFittedRight()` (font ngecil sampai masuk kotak). Dompet kita IDR, 9–10 digit: font 22px
   tetap bikin angka numpuk di atas labelnya.

**Geometri frame** (`web/src/vendor-game.css`): build-nya punya layout tetap 1524×810 dan canvas
806×606 di posisi konten (359,28) — 359px pertama itu tombol bet bawaannya yang udah di-hide, jadi
kepotong aja. Rumusnya: `left = X - 359`, `top = Y - 28` biar canvas mendarat di (X,Y) skala 1:1.
Sekarang (237,68) → board 806×606, tengah, di bawah header 56px. Tema-tema lain ikut karena
semuanya satu halaman yang sama.

## Game Casino-App (diport dari `Xaxino v3.8 Nulled/Casino-App`)

19 game-nya udah ada di sana (komponen React + engine Python). Yang dipindah ke sini:

| bagian | asal | jadi |
| --- | --- | --- |
| UI 21 komponen + `common.jsx` + `BetPanel` | `Casino-App/frontend/src/games/` | `web/src/games/` (path aset `/assets/` → `/casino/`) |
| aset kartu/dadu/koin/audio (31 MB) | `Casino-App/frontend/public/assets/` | `web/public/casino/` |
| CSS (scoped) | `Casino-App/frontend/src/styles/global.css` | `web/src/games/casino.css` — digenerate `tools/scope_casino_css.py` (semua selector dikasih prefix `.casino-shell`) |
| engine | `Casino-App/backend/app/engine/*.py` | `server/engine/` — **udah diport**: `quick` (7 game) + `numbers` (5). **Nyusul**: `bonus` (crazy times, dream catcher), `mines`, `cards` (blackjack, poker, andar bahar, pai gow) |
| config game | `Casino-App/backend/app/seed.py` | `server/engine/config.js` (limit ×1000 jadi IDR) |
| API | `routers/api.py` | route `/api/play/invest|end|cancel/{alias}` + `/api/games/{alias}` di `server/index.js` |

Kontrak mereka dipertahankan: `GET /api/games/{alias}` buat config halaman play, lalu
`POST /api/play/invest/{alias}` (debit stake, buka game log) → `POST /api/play/end/{alias}` (bayar
kalau menang, tutup log) + `/api/play/cancel/{alias}` buat ngelepas ronde yang ditinggal.
Saldo, RNG dan payout tetap di server kita; `spins` (tabel yang sama kayak slot) jadi game log-nya.

**Gotcha class bentrok** (udah tiga kali kena, jangan diulang): CSS app kita punya nama generic
yang sama kayak komponen mereka —

| class | punya gw | efeknya ke UI mereka | status |
| --- | --- | --- | --- |
| `.stage` | stage 1280×720 `position:absolute` | area main mereka kelempar keluar grid | di-scope → `.stage-wrap > .stage` |
| `.badge` | badge kartu game, `position:absolute` | pill DEMO/REAL nyangkut di pojok panel | di-scope → `.card .badge` |
| `.slot` | root layar DY01 Slots, `inset:0` | badge `badge slot` melar nutupin thumbnail (kartu vendor jadi kosong) | badge-nya di-rename `.badge.vend` |

Sisanya cuma nge-merge style (nggak rusak, tapi kalau nambah layar baru cek lagi): `.btn`
(height 38px), `.field`, `.muted`, `.panel`, `.row` (border dashed), `.round` (38px circle).
Cara ngecek cepat: `node tools/shot.mjs "#/" out.png --probe "<selector>"` (login + screenshot
headless, ada `--eval` juga) — dipakai buat nge-track bug ini.

Jalanin: `cd server && npm test` (engine casino + end-to-end), `cd web && npm test`, `npm run build`.

`CASINO_READY` di `web/src/games/CasinoGame.jsx` = daftar alias yang engine-nya udah diport (12
sekarang); alias di luar itu jatuh ke kartu "soon"/`GamePage`. Tambah alias di situ tiap keluarga
baru masuk.

## Mini games lama — udah dibuang (2026-10)

11 game mini tulisan sendiri (`server/mini.js`, `web/src/MiniGame.jsx` + `mini.css` + `miniGames.js`)
dan endpoint `POST /api/play` udah dihapus: semua alias-nya sekarang dipegang engine Casino-App,
jadi cuma ada satu jalur (`/api/play/invest|end/{alias}`) dan satu sumber RTP. Kalau butuh versi
lama, ada di git history.

```bash
cd server && npm test              # casino.test.js (port + payout) + test.js (HTTP end-to-end)
cd web && npm test                 # RTP engine DY01 Slots + Gates of Olympus
```

Sisa 7 kartu yang butuh aturan panjang (blackjack, mines, poker, crazy times, dream catcher,
andar bahar, pai gow) masih ditandai **SEGERA HADIR** di lobby — nunggu keluarganya diport.

## Mobile / HP

Stage-nya tetap 1280×720 landscape. Kalau viewport-nya portrait (HP dipegang tegak), stage-nya
**diputar 90° otomatis** dan di-scale pakai sisi yang ditukar — jadi seluruh app (lobby, game,
admin) kebaca landscape, tinggal HP-nya diputar. Begitu HP diputar (viewport jadi landscape),
rotasinya hilang sendiri, jadi nggak ada rotasi dobel. Semua di `useStageScale()` (`web/src/App.jsx`),
nggak ada halaman yang perlu diurus satu-satu. Media query di dalam stage tetap lihat 1280px, jadi
layout desktop-nya nggak berubah di HP.

Cek pakai tool yang sama: `node tools/shot.mjs "#/" out.png --mobile 390x844` (emulasi HP: DPR 2 +
touch) atau `--mobile 844x390` buat landscape.


```bat
dev.bat            :: jalanin server + vite sekaligus (2 window)
```
atau manual: `cd server && node index.js` lalu `cd web && npm run dev` → buka http://127.0.0.1:5188
Produksi cukup `cd web && npm run build` lalu `cd server && node index.js` → semua di http://127.0.0.1:8015.

## vendor/gates — Pragmatic-style asset pack

`compsmart/gates-of-olympus-slots` is a public rebuild of Gates of Olympus with **AI-generated** assets
(the Gemini prompts ship inside its `game.yaml`) plus a full game spec: 6x5 layout, pay-anywhere
paytable, symbol weights, orb values, feature list, RTP target 96.5%. Mirrored here (67 files, 27 MB)
and rebuilt as `web/src/slot/gates.js` + `GatesGame.jsx`.

```bash
cd web && node src/slot/gates.test.mjs   # engine checks incl. measured RTP
          node src/slot/gates.rtp.mjs 500000
```

## web/public/vendor/simple-slots — 7-theme slot, satu kartu per tema

`compsmart/simple-slots` is a complete multi-theme slot (canvas + Web Audio, 20 paylines per theme,
own reel strips/paytables, bonus games, RTP simulator). Framed by `web/src/VendorGame.jsx` with
`?theme=<name>`; lobby cards + routes come from `web/src/vendorGames.js` (one card per theme, no
in-game theme switcher). Patched on purpose: a wallet bridge (`?portal=1&alias=`) that settles
every stake/payout on the DY01 backend, and the old theme picker / Add Credit button removed.

Still on the shelf in the same account if more games are wanted: `path-slots` (10 MB, path-to-multiplier
mechanic), `3d-slots` (11 MB, three.js), `word-slots` (29 MB, word paylines), `crypto-slots` (123 MB,
DALL·E crypto-god symbols), and `slot-skills/games/{alien-expanse,football-frenzy}/game.yaml`
(specs only — art would have to be generated).

## Notes / gotchas

* Native files come down **encrypted**. `decrypt_assets.py` is not optional — PNGs look like
  garbage before it runs. Layout `.json` files are plain text, audio is not encrypted.
* Cocos uuids in `config.json` are the 22-char compressed form; `fetch_assets.py:decode_uuid`
  converts them to the real file names. Don't hand-build those URLs.
* Standalone textures keep their original readable path (`skin/ct2/res/texture/...`).
  Auto-atlas pages are named by a bare 9-hex pack id and hold many sprites each —
  use `atlas_index.py --list <name>` to find which page a sprite is on.
* No backend included: the platform's API (`api.gvdfdd7.com`) needs a signed `entrance`
  request, and gameplay/backend logic is ours to write.
