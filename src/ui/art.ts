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

/** Emoji for the three MVP items. */
export const ITEM_EMOJI: Record<string, string> = {
  berry: '🍓',
  meat: '🍖',
  shell: '🐚',
};

export function itemEmoji(itemId: string): string {
  return ITEM_EMOJI[itemId] ?? '🎁';
}
