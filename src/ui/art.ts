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
  // Token
  sapling: '🌿',
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

/** Emoji for the three MVP items. */
export const ITEM_EMOJI: Record<string, string> = {
  berry: '🍓',
  meat: '🍖',
  shell: '🐚',
};

export function itemEmoji(itemId: string): string {
  return ITEM_EMOJI[itemId] ?? '🎁';
}
