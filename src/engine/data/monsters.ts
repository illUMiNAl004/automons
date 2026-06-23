// ============================================================================
// data/monsters.ts — The roster (DESIGN.md §7) + EVOLVED forms (DESIGN.md §9).
//
// Data-driven content: adding a monster = adding one MonsterDef here. Each base
// form has an `evolvesTo` pointing at its evolved entry (its own id / name /
// art / higher stats / stronger ability). Evolved entries carry `evolved: true`
// and NEVER appear in the shop — they're obtained only by combining 3 copies.
// Evolved stats/abilities below are placeholders to be tuned.
// ============================================================================

import type { MonsterDef } from '../types';

// ---- Base forms (shop pool) ------------------------------------------------

const BASES: MonsterDef[] = [
  // --- Fire ---
  {
    id: 'emberling', name: 'Emberling', type: 'fire', tier: 1, atk: 2, hp: 1, evolvesTo: 'infernling',
    ability: { trigger: 'afterAttack', effect: { verb: 'dealDamage', amount: 1, dmgType: 'fire', target: 'enemyBehindTarget' } },
  },
  {
    id: 'cinderpup', name: 'Cinderpup', type: 'fire', tier: 1, atk: 3, hp: 2, evolvesTo: 'cinderhound',
    ability: { trigger: 'startOfBattle', effect: { verb: 'dealDamage', amount: 2, dmgType: 'fire', target: 'strongestEnemy' } },
  },
  {
    id: 'magmaw', name: 'Magmaw', type: 'fire', tier: 3, atk: 4, hp: 4, evolvesTo: 'magmaron',
    ability: { trigger: 'onHurt', effect: { verb: 'buff', atk: 1, hp: 0, target: 'self' } },
  },

  // --- Water ---
  {
    id: 'dewdrop', name: 'Dewdrop', type: 'water', tier: 1, atk: 1, hp: 3, evolvesTo: 'dewmonarch',
    ability: { trigger: 'onFriendFaint', effect: { verb: 'buff', atk: 0, hp: 1, target: 'randomFriend' } },
  },
  {
    id: 'tidepup', name: 'Tidepup', type: 'water', tier: 2, atk: 2, hp: 4, evolvesTo: 'tidehound',
    ability: { trigger: 'startOfBattle', effect: { verb: 'shield', amount: 3, target: 'friendAhead' } },
  },
  {
    id: 'krakenling', name: 'Krakenling', type: 'water', tier: 3, atk: 3, hp: 5, evolvesTo: 'kraken',
    ability: { trigger: 'onFaint', effect: { verb: 'dealDamage', amount: 3, dmgType: 'water', target: 'allEnemies' } },
  },

  // --- Nature ---
  {
    id: 'sprout', name: 'Sprout', type: 'nature', tier: 1, atk: 2, hp: 2, evolvesTo: 'bramblebeast',
    ability: { trigger: 'onFaint', effect: { verb: 'summon', token: 'sapling', atIndex: 'self' } },
  },
  {
    id: 'thornback', name: 'Thornback', type: 'nature', tier: 2, atk: 3, hp: 3, evolvesTo: 'thornguard',
    ability: { trigger: 'onHurt', effect: { verb: 'dealDamage', amount: 1, dmgType: 'nature', target: 'attacker' } },
  },
  {
    id: 'bloomtail', name: 'Bloomtail', type: 'nature', tier: 3, atk: 2, hp: 6, evolvesTo: 'floralux',
    ability: { trigger: 'startOfBattle', effect: { verb: 'buff', atk: 1, hp: 1, target: 'allFriends' } },
  },

  // --- Earth ---
  {
    id: 'pebbling', name: 'Pebbling', type: 'earth', tier: 1, atk: 1, hp: 2, evolvesTo: 'cragling',
    ability: { trigger: 'startOfBattle', effect: { verb: 'shield', amount: 2, target: 'self' } },
  },
  {
    id: 'boulderpup', name: 'Boulderpup', type: 'earth', tier: 2, atk: 4, hp: 3, evolvesTo: 'boulderhound',
    ability: { trigger: 'onFaint', effect: { verb: 'buff', atk: 2, hp: 0, target: 'friendBehind' } },
  },
  {
    id: 'terrapex', name: 'Terrapex', type: 'earth', tier: 3, atk: 3, hp: 6, evolvesTo: 'terratitan',
    ability: { trigger: 'startOfBattle', effect: { verb: 'buffPerFriendOfType', atk: 0, hp: 2, ofType: 'earth', target: 'self' } },
  },
];

// ---- Evolved forms (combine-only; never in the shop) -----------------------
// Placeholder stats/abilities — bigger numbers / effects than their base form.

const EVOLVED: MonsterDef[] = [
  // Fire
  {
    id: 'infernling', name: 'Infernling', type: 'fire', tier: 1, atk: 4, hp: 3, evolved: true,
    ability: { trigger: 'afterAttack', effect: { verb: 'dealDamage', amount: 2, dmgType: 'fire', target: 'enemyBehindTarget' } },
  },
  {
    id: 'cinderhound', name: 'Cinderhound', type: 'fire', tier: 1, atk: 5, hp: 4, evolved: true,
    ability: { trigger: 'startOfBattle', effect: { verb: 'dealDamage', amount: 4, dmgType: 'fire', target: 'strongestEnemy' } },
  },
  {
    id: 'magmaron', name: 'Magmaron', type: 'fire', tier: 3, atk: 7, hp: 7, evolved: true,
    ability: { trigger: 'onHurt', effect: { verb: 'buff', atk: 2, hp: 0, target: 'self' } },
  },

  // Water
  {
    id: 'dewmonarch', name: 'Dewmonarch', type: 'water', tier: 1, atk: 2, hp: 6, evolved: true,
    ability: { trigger: 'onFriendFaint', effect: { verb: 'buff', atk: 0, hp: 2, target: 'randomFriend' } },
  },
  {
    id: 'tidehound', name: 'Tidehound', type: 'water', tier: 2, atk: 4, hp: 7, evolved: true,
    ability: { trigger: 'startOfBattle', effect: { verb: 'shield', amount: 6, target: 'friendAhead' } },
  },
  {
    id: 'kraken', name: 'Kraken', type: 'water', tier: 3, atk: 5, hp: 8, evolved: true,
    ability: { trigger: 'onFaint', effect: { verb: 'dealDamage', amount: 5, dmgType: 'water', target: 'allEnemies' } },
  },

  // Nature
  {
    id: 'bramblebeast', name: 'Bramblebeast', type: 'nature', tier: 1, atk: 3, hp: 4, evolved: true,
    ability: { trigger: 'onFaint', effect: { verb: 'summon', token: 'bramble', atIndex: 'self' } },
  },
  {
    id: 'thornguard', name: 'Thornguard', type: 'nature', tier: 2, atk: 5, hp: 5, evolved: true,
    ability: { trigger: 'onHurt', effect: { verb: 'dealDamage', amount: 2, dmgType: 'nature', target: 'attacker' } },
  },
  {
    id: 'floralux', name: 'Floralux', type: 'nature', tier: 3, atk: 3, hp: 9, evolved: true,
    ability: { trigger: 'startOfBattle', effect: { verb: 'buff', atk: 2, hp: 2, target: 'allFriends' } },
  },

  // Earth
  {
    id: 'cragling', name: 'Cragling', type: 'earth', tier: 1, atk: 2, hp: 4, evolved: true,
    ability: { trigger: 'startOfBattle', effect: { verb: 'shield', amount: 4, target: 'self' } },
  },
  {
    id: 'boulderhound', name: 'Boulderhound', type: 'earth', tier: 2, atk: 6, hp: 5, evolved: true,
    ability: { trigger: 'onFaint', effect: { verb: 'buff', atk: 4, hp: 0, target: 'friendBehind' } },
  },
  {
    id: 'terratitan', name: 'Terratitan', type: 'earth', tier: 3, atk: 5, hp: 9, evolved: true,
    ability: { trigger: 'startOfBattle', effect: { verb: 'buffPerFriendOfType', atk: 0, hp: 3, ofType: 'earth', target: 'self' } },
  },
];

/** All species (base + evolved). The shop filters to base forms only. */
export const MONSTERS: MonsterDef[] = [...BASES, ...EVOLVED];

export const TOKENS: MonsterDef[] = [
  { id: 'sapling', name: 'Sapling', type: 'nature', tier: 1, atk: 1, hp: 1, ability: null },
  { id: 'bramble', name: 'Bramble', type: 'nature', tier: 1, atk: 2, hp: 3, ability: null },
];

/** Fast lookup by species id across both the roster and the token pool. */
const BY_ID: Record<string, MonsterDef> = Object.fromEntries(
  [...MONSTERS, ...TOKENS].map((m) => [m.id, m]),
);

export function getMonsterDef(id: string): MonsterDef {
  const def = BY_ID[id];
  if (!def) throw new Error(`Unknown monster id: ${id}`);
  return def;
}

/** Base forms only — the shop & opponent pool draw from these. */
export const BASE_MONSTERS: MonsterDef[] = BASES;
