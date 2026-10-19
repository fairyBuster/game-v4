// Games we did NOT write: they come as complete builds (own canvas engine + art + audio),
// so we only frame them. Each vendor theme is its own lobby card/route — no in-game theme
// switching. `theme` must match the theme object's `name` in themes/<folder>/theme.js —
// the game looks it up by that exact key, spaces and capitals included.
// `portal=1&alias=` turns on the wallet bridge inside the frame: stakes and payouts move
// the shared DY01 balance through the parent instead of the game's own credit.
const ss = (folder, theme, name, ext = 'jpg') => ({
  alias: `slot-${folder}`,
  name,
  image: `/vendor/simple-slots/themes/${folder}/images/title.${ext}`,
  src: `/vendor/simple-slots/game.html?theme=${encodeURIComponent(theme)}&portal=1&alias=slot-${folder}`,
})

export const VENDOR_GAMES = [
  ss('gemstones', 'Gemstones', 'Gemstones'),
  ss('pirate', 'Pirate', 'Pirate Gold'),
  ss('ancient-egypt', 'Ancient Egypt', 'Ancient Egypt'),
  ss('aztec', 'Aztec', 'Aztec Sun'),
  ss('classic', 'Classic', 'Classic Fruits'),
  ss('fantasy-forest', 'Fantasy Forest', 'Fantasy Forest'),
  ss('space-adventure', 'Space Adventure', 'Space Adventure', 'png'),
]
