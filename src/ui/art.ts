// ============================================================================
// art.ts — Placeholder art manifest (DESIGN.md §11, §14).
//
// Until real PNGs exist in src/assets/monsters/, each creature renders as a
// chunky element-gradient tile with a characterful emoji. Swapping to real art
// later = changing `emoji` to an image path here; nothing else changes.
// ============================================================================

/** Big emoji used as stand-in "art" for each species id. */
export const MONSTER_EMOJI: Record<string, string> = {
  // Fire
  emberling: '🔥',
  cinderpup: '🦊',
  magmaw: '🌋',
  // Water
  dewdrop: '💧',
  tidepup: '🦭',
  krakenling: '🐙',
  // Nature
  sprout: '🌱',
  thornback: '🦎',
  bloomtail: '🌸',
  // Earth
  pebbling: '🪨',
  boulderpup: '🦫',
  terrapex: '🐢',
  // Tokens
  sapling: '🌿',
  bramble: '🍀',
  // --- Evolved forms (placeholder emoji until real art is dropped) ---
  infernling: '🐲',
  cinderhound: '🐺',
  magmaron: '☄️',
  dewmonarch: '🐳',
  tidehound: '🐬',
  kraken: '🦑',
  bramblebeast: '🌳',
  thornguard: '🌵',
  floralux: '🌻',
  cragling: '⛰️',
  boulderhound: '🦏',
  terratitan: '🗿',
};

export function monsterEmoji(speciesId: string): string {
  return MONSTER_EMOJI[speciesId] ?? '❓';
}

/**
 * Real art auto-wiring: drop `{id}.png` (transparent, square) into
 * src/assets/monsters/ and it's picked up here with ZERO code changes.
 * Until then, monsterImage() returns null and the UI falls back to the emoji.
 */
const ART_FILES = import.meta.glob('../assets/monsters/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const ART_BY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ART_FILES).map(([path, url]) => [path.split('/').pop()!.replace('.png', ''), url]),
);

export function monsterImage(speciesId: string): string | null {
  return ART_BY_ID[speciesId] ?? null;
}

/**
 * Painterly arena background layers. Drop `far.png` / `mid.png` / `near.png`
 * (any subset) into src/assets/arena/ for a real layered parallax backdrop;
 * a single full image as `far.png` works too. Missing layers → the SVG meadow.
 */
const ARENA_FILES = import.meta.glob('../assets/arena/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const ARENA_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(ARENA_FILES).map(([path, url]) => [path.split('/').pop()!.replace('.png', ''), url]),
);

export function arenaLayer(name: 'far' | 'mid' | 'near'): string | null {
  if (ARENA_BY_NAME[name]) return ARENA_BY_NAME[name];
  // single-image fallback: treat arena.png / bg.png as the far layer
  if (name === 'far') return ARENA_BY_NAME['arena'] ?? ARENA_BY_NAME['bg'] ?? null;
  return null;
}

export const hasArenaArt = Object.keys(ARENA_BY_NAME).length > 0;

/** Emoji for the three MVP items. */
export const ITEM_EMOJI: Record<string, string> = {
  berry: '🍓',
  meat: '🍖',
  shell: '🐚',
};

export function itemEmoji(itemId: string): string {
  return ITEM_EMOJI[itemId] ?? '🎁';
}
