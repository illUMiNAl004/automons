// ============================================================================
// data/monsters.ts — The starter roster (DESIGN.md §7).
//
// Data-driven content: adding a monster = adding one MonsterDef here, nothing
// else. 12 monsters (3 per type) + the `sapling` token.
// ============================================================================

import type { MonsterDef } from '../types';

export const MONSTERS: MonsterDef[] = [
  // --- Fire ---
  {
    id: 'emberling', name: 'Emberling', type: 'fire', tier: 1, atk: 2, hp: 1,
    // afterAttack: splash 1 Fire dmg to the enemy behind the one it hit.
    ability: { trigger: 'afterAttack', effect: { verb: 'dealDamage', amount: 1, dmgType: 'fire', target: 'enemyBehindTarget' } },
  },
  {
    id: 'cinderpup', name: 'Cinderpup', type: 'fire', tier: 1, atk: 3, hp: 2,
    ability: { trigger: 'startOfBattle', effect: { verb: 'dealDamage', amount: 2, dmgType: 'fire', target: 'strongestEnemy' } },
  },
  {
    id: 'magmaw', name: 'Magmaw', type: 'fire', tier: 3, atk: 4, hp: 4,
    // onHurt: rage — gain +1 ATK.
    ability: { trigger: 'onHurt', effect: { verb: 'buff', atk: 1, hp: 0, target: 'self' } },
  },

  // --- Water ---
  {
    id: 'dewdrop', name: 'Dewdrop', type: 'water', tier: 1, atk: 1, hp: 3,
    ability: { trigger: 'onFriendFaint', effect: { verb: 'buff', atk: 0, hp: 1, target: 'randomFriend' } },
  },
  {
    id: 'tidepup', name: 'Tidepup', type: 'water', tier: 2, atk: 2, hp: 4,
    ability: { trigger: 'startOfBattle', effect: { verb: 'shield', amount: 3, target: 'friendAhead' } },
  },
  {
    id: 'krakenling', name: 'Krakenling', type: 'water', tier: 3, atk: 3, hp: 5,
    ability: { trigger: 'onFaint', effect: { verb: 'dealDamage', amount: 3, dmgType: 'water', target: 'allEnemies' } },
  },

  // --- Nature ---
  {
    id: 'sprout', name: 'Sprout', type: 'nature', tier: 1, atk: 2, hp: 2,
    ability: { trigger: 'onFaint', effect: { verb: 'summon', token: 'sapling', atIndex: 'self' } },
  },
  {
    id: 'thornback', name: 'Thornback', type: 'nature', tier: 2, atk: 3, hp: 3,
    // onHurt: thorns — deal 1 Nature dmg back to whoever hit it.
    ability: { trigger: 'onHurt', effect: { verb: 'dealDamage', amount: 1, dmgType: 'nature', target: 'attacker' } },
  },
  {
    id: 'bloomtail', name: 'Bloomtail', type: 'nature', tier: 3, atk: 2, hp: 6,
    // startOfBattle: anthem — give all OTHER friends +1/+1.
    ability: { trigger: 'startOfBattle', effect: { verb: 'buff', atk: 1, hp: 1, target: 'allFriends' } },
  },

  // --- Earth ---
  {
    id: 'pebbling', name: 'Pebbling', type: 'earth', tier: 1, atk: 1, hp: 2,
    ability: { trigger: 'startOfBattle', effect: { verb: 'shield', amount: 2, target: 'self' } },
  },
  {
    id: 'boulderpup', name: 'Boulderpup', type: 'earth', tier: 2, atk: 4, hp: 3,
    ability: { trigger: 'onFaint', effect: { verb: 'buff', atk: 2, hp: 0, target: 'friendBehind' } },
  },
  {
    id: 'terrapex', name: 'Terrapex', type: 'earth', tier: 3, atk: 3, hp: 6,
    // startOfBattle: mono-type payoff — +0/+2 for each OTHER Earth friend.
    ability: { trigger: 'startOfBattle', effect: { verb: 'buffPerFriendOfType', atk: 0, hp: 2, ofType: 'earth', target: 'self' } },
  },
];

export const TOKENS: MonsterDef[] = [
  { id: 'sapling', name: 'Sapling', type: 'nature', tier: 1, atk: 1, hp: 1, ability: null },
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
