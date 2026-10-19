# Gates of Olympus (clone)

![Gates of Olympus gameplay showing the reels, multiplier feature, and animated Zeus](./gates-of-olympus.png)

A production-grade clone of Pragmatic Play's "Gates of Olympus" built on the slot-skills framework
(`[https://github.com/compsmart/slot-skills](https://github.com/compsmart/slot-skills)`). Server-authoritative engine, exact rational math, AI-generated art
and audio, Canvas2D presentation.

## Game profile

- 6x5 grid, scatter-pays (`count` evaluator): 8+ matching symbols anywhere pays; winning symbols
  tumble away and new ones fall in (up to 30 cascades per sequence).
- Symbols: Crown / Hourglass / Ring / Chalice highs, five gem lows, Zeus scatter, Multiplier Orb.
- Paytable identical to the original (for example Crown 8-9: 10x, 10-11: 25x, 12+: 50x; Zeus
  scatter 4/5/6: 3x/5x/100x). Payouts are exact rationals on the total bet; bets must be
  divisible by 20 minor units for integral payouts.
- Multiplier orbs (`tumble-multiplier-orbs` feature): weighted values 2x-500x; when a tumble
  sequence ends in a win the orb sum multiplies the sequence total. In free spins orb sums
  accumulate into a persistent total multiplier that applies to any later winning sequence that
  lands at least one new orb.
- Free spins: 4+ scatters (counted on the final grid after tumbling) award 15 free spins;
  3+ scatters during the bonus retrigger +5 (engine cap: 50 free spins per bonus).
- Ante bet: stake x1.25, scatter weight x1.22 (roughly 2.2x trigger chance), disables bonus buy.
- Bonus buy: 42x bet, forces the 4 triggering scatters onto the reveal. Deliberate deviation
  from the original's 100x price: this game's bonus averages ~41x bet, so 42x prices the buy at
  ~96.5% RTP (a 100x price here would return only ~41% - unfair to the player).
- Targets: 96.50% RTP (base, ante, and buy), high volatility, 5000x max win (engine-clamped,
  `max-win` event), free-spins trigger about 1 in 220 spins.
- Jurisdiction: `mt-mga-reference` (Malta). The GB profile blocks buy/ante mechanics.

## Commands (run from C:\projects\ai\slot-skills)

```
npm run slot -- validate --game C:\projects\ai\slots-oneshots\gates-of-olympus
npm run slot -- simulate --game C:\projects\ai\slots-oneshots\gates-of-olympus --rounds 1000000 --workers 8
npm run slot -- simulate --game ... --ante            # ante RTP (denominator = 1.25x stake)
npm run slot -- simulate --game ... --purchase bonus-buy   # buy RTP (denominator = 100x bet)
npm run slot -- serve --game C:\projects\ai\slots-oneshots\gates-of-olympus --port 4173
```

`serve` hosts the playable page at http://127.0.0.1:4173/ (spin, ante toggle, buy button,
orb value badges, tumble multiplier presentation, Zeus character layer, SFX). The page uses the
web client's `fit="viewport"` letterbox mode plus `chrome="immersive"` (see the
`manage-slot-viewport` skill in slot-skills): full-bleed temple background, no card frame or
title bar, deepened reels, and Zeus in a dedicated side column clear of the symbols. The game
scales to fit any window without page scrolling; narrow portrait phones rotate the player into
landscape so the reels, enlarged Zeus side art, and controls remain together. Zeus plays his idle animation continuously and his bonus animation on
free-spins start (both Veo-generated, returning exactly to the neutral pose).

E2E: with the server running, from slot-skills:
`npx playwright test -c C:\projects\ai\slots-oneshots\gates-of-olympus\e2e`

## Assets

All art was generated with Gemini (`gemini-3.1-flash-image`), sounds with ElevenLabs; provenance
(model, prompt, run dir, sha256) is recorded per asset in `game.yaml`. Generation run
directories are retained under `slot-skills/tmp/slot-runs/gates-of-olympus`.

## Remaining operator actions

- Background music: `music-base` (90s majestic orchestral loop) and `music-bonus` (60s intense
  free-spins variant), generated with the ElevenLabs Music API (`music_v2`), mastered to
  -16 LUFS / -1 dBTP Opus. The base loop starts on the first spin; the bonus track takes over
  during free spins and hands back after.
- Animated Zeus (`zeus-idle.avif` / `zeus-cast.avif`) uses one shared top-padded canvas with no
  added padding below the character. The idle remains stationary with subtle hair and robe motion;
  the max-win cast raises both hands and summons lightning overhead, accompanied by the supplied video's sound.
  Its declared 10.043-second duration locks the cast pose until the complete animation has played.
  The action endpoints and review PNGs use the exact canonical idle pixels. The delivered idle is
  a true forward/reverse loop that wraps from the adjacent frame into the canonical pose without
  duplicating either turnaround frame. `assets/zeus.png` remains the automatic AVIF fallback.
- Release build (`slot build`) requires 10,000,000-round evidence:
  `npm run slot -- simulate --game ... --rounds 10000000 --workers 10 --release-evidence`
  (skipped per operator instruction; `build/math-report.json` holds a 1M-round report).
- External test-house certification and a jurisdiction re-review before 2026-10-18.
