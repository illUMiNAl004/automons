// ============================================================================
// shop.ts — Pure shop economy (DESIGN.md §9). No React, no DOM.
//
// Every function takes a GameState and returns a NEW GameState (immutable);
// instances are cloned when modified so the React UI sees fresh references.
// All randomness flows through the seeded RNG carried in state.seed, which
// advances on each roll — so a run is fully reproducible from its seed.
// ============================================================================

import type {
  GameState,
  ItemDef,
  MonsterInstance,
  ShopState,
} from './types';
import { CONFIG, maxTierForTurn } from './config';
import { MONSTERS } from './data/monsters';
import { ITEMS } from './data/items';
import { makeInstance } from './battle';
import { makeRng, type RNG } from './rng';

// ----------------------------------------------------------------------------
// Run setup
// ----------------------------------------------------------------------------

/** Fresh run: 5 lives, 0 trophies, 10 gold, an empty team, a rolled shop. */
export function createRun(seed: number): GameState {
  const rng = makeRng(seed >>> 0);
  const shop = rollShopState(1, undefined, rng);
  return {
    phase: 'shop',
    turn: 1,
    gold: CONFIG.startingGold,
    lives: CONFIG.startingLives,
    trophies: 0,
    team: emptyTeam(),
    shop,
    seed: rng.state(),
    nextInstanceId: 1,
    lastResult: null,
  };
}

const emptyTeam = (): (MonsterInstance | null)[] => Array(CONFIG.benchMax).fill(null);

// ----------------------------------------------------------------------------
// Rolling the shop
// ----------------------------------------------------------------------------

/**
 * Build a shop for `turn`. Frozen slots are carried over verbatim from
 * `prev`; every other slot is re-rolled from the tier-gated pool.
 */
function rollShopState(turn: number, prev: ShopState | undefined, rng: RNG): ShopState {
  const maxTier = maxTierForTurn(turn);
  const pool = MONSTERS.filter((m) => m.tier <= maxTier);

  const monsterSlots: ShopState['monsterSlots'] = [];
  const frozenMonsters: boolean[] = [];
  for (let i = 0; i < CONFIG.shopMonsterSlots; i++) {
    if (prev?.frozenMonsters[i] && prev.monsterSlots[i]) {
      monsterSlots[i] = prev.monsterSlots[i];
      frozenMonsters[i] = true;
    } else {
      monsterSlots[i] = rng.pick(pool);
      frozenMonsters[i] = false;
    }
  }

  const itemSlots: ShopState['itemSlots'] = [];
  const frozenItems: boolean[] = [];
  for (let i = 0; i < CONFIG.shopItemSlots; i++) {
    if (prev?.frozenItems[i] && prev.itemSlots[i]) {
      itemSlots[i] = prev.itemSlots[i];
      frozenItems[i] = true;
    } else {
      itemSlots[i] = rng.pick(ITEMS);
      frozenItems[i] = false;
    }
  }

  return { monsterSlots, itemSlots, frozenMonsters, frozenItems };
}

/** Reroll the shop for the current turn (−1 gold, respects frozen slots). */
export function reroll(state: GameState): GameState {
  if (state.gold < CONFIG.rerollCost) return state;
  const rng = makeRng(state.seed);
  const shop = rollShopState(state.turn, state.shop, rng);
  return { ...state, gold: state.gold - CONFIG.rerollCost, shop, seed: rng.state() };
}

/** Freeze toggles persist a slot's contents into the next shop. Free. */
export function toggleFreezeMonster(state: GameState, slot: number): GameState {
  if (!state.shop.monsterSlots[slot]) return state;
  const frozenMonsters = state.shop.frozenMonsters.slice();
  frozenMonsters[slot] = !frozenMonsters[slot];
  return { ...state, shop: { ...state.shop, frozenMonsters } };
}

export function toggleFreezeItem(state: GameState, slot: number): GameState {
  if (!state.shop.itemSlots[slot]) return state;
  const frozenItems = state.shop.frozenItems.slice();
  frozenItems[slot] = !frozenItems[slot];
  return { ...state, shop: { ...state.shop, frozenItems } };
}

// ----------------------------------------------------------------------------
// Buying / selling / arranging
// ----------------------------------------------------------------------------

/**
 * Buy the monster in shop slot `slot`. If `targetIndex` is given and holds the
 * SAME species, it merges (level up); if it's empty it lands there; otherwise
 * we fall back to the first empty team slot. No-op if unaffordable or no room.
 */
export function buyMonster(state: GameState, slot: number, targetIndex?: number): GameState {
  const def = state.shop.monsterSlots[slot];
  if (!def || state.gold < CONFIG.monsterCost) return state;

  const team = state.team.slice();
  let nextId = state.nextInstanceId;

  let idx = targetIndex ?? firstEmpty(team);
  if (idx < 0) return state; // team full and no merge target

  const occupant = team[idx];
  if (occupant) {
    if (occupant.speciesId === def.id) {
      team[idx] = levelUp(occupant, 1); // buy-to-merge
    } else {
      // dropped onto a different species: try first empty instead
      idx = firstEmpty(team);
      if (idx < 0) return state;
      team[idx] = makeInstance(def, `t${nextId++}`);
    }
  } else {
    team[idx] = makeInstance(def, `t${nextId++}`);
  }

  return {
    ...state,
    team,
    gold: state.gold - CONFIG.monsterCost,
    shop: clearMonsterSlot(state.shop, slot),
    nextInstanceId: nextId,
  };
}

/** Buy the item in `slot` and apply it to the team monster `targetId`. */
export function buyItemOnto(state: GameState, slot: number, targetId: string): GameState {
  const item = state.shop.itemSlots[slot];
  if (!item || state.gold < CONFIG.itemCost) return state;
  const idx = state.team.findIndex((m) => m?.instanceId === targetId);
  if (idx < 0) return state;

  const team = state.team.slice();
  team[idx] = applyItem(team[idx]!, item);
  return {
    ...state,
    team,
    gold: state.gold - CONFIG.itemCost,
    shop: clearItemSlot(state.shop, slot),
  };
}

/** Sell the monster at `index` for the refund. */
export function sellMonster(state: GameState, index: number): GameState {
  if (!state.team[index]) return state;
  const team = state.team.slice();
  team[index] = null;
  return { ...state, team, gold: state.gold + CONFIG.sellRefund };
}

/**
 * Move the monster at `from` to slot `to`. Empty target → move; same species →
 * merge; different species → swap. This single op covers reorder AND merge.
 */
export function moveMonster(state: GameState, from: number, to: number): GameState {
  if (from === to) return state;
  const a = state.team[from];
  if (!a) return state;

  const team = state.team.slice();
  const b = team[to];
  if (!b) {
    team[to] = a;
    team[from] = null;
  } else if (b.speciesId === a.speciesId) {
    team[to] = levelUp(b, a.level); // merge a into b
    team[from] = null;
  } else {
    team[from] = b; // swap
    team[to] = a;
  }
  return { ...state, team };
}

// ----------------------------------------------------------------------------
// Turn flow (battle wiring comes in M3; here it just refreshes the economy)
// ----------------------------------------------------------------------------

/** Advance to the next shop turn: +1 turn, gold back to 10, re-roll the shop. */
export function nextTurn(state: GameState): GameState {
  const rng = makeRng(state.seed);
  const turn = state.turn + 1;
  const shop = rollShopState(turn, state.shop, rng);
  return {
    ...state,
    phase: 'shop',
    turn,
    gold: CONFIG.startingGold,
    shop,
    seed: rng.state(),
  };
}

// ----------------------------------------------------------------------------
// Derived helpers
// ----------------------------------------------------------------------------

/** The team as a dense, ordered list (drops empty slots) — for battle. */
export function getTeam(state: GameState): MonsterInstance[] {
  return state.team.filter((m): m is MonsterInstance => m !== null);
}

export const teamCount = (state: GameState): number => getTeam(state).length;
export const teamIsFull = (state: GameState): boolean => firstEmpty(state.team) < 0;

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

const firstEmpty = (team: (MonsterInstance | null)[]): number => team.findIndex((s) => s === null);

/** Level a monster up by `addLevels`, capped, applying per-level stat bonus. */
function levelUp(target: MonsterInstance, addLevels: number): MonsterInstance {
  const newLevel = Math.min(CONFIG.level.maxLevel, target.level + addLevels);
  const gained = newLevel - target.level;
  return {
    ...target,
    level: newLevel,
    atk: target.atk + gained * CONFIG.level.atkPerLevel,
    maxHp: target.maxHp + gained * CONFIG.level.hpPerLevel,
    hp: target.hp + gained * CONFIG.level.hpPerLevel,
  };
}

/** Apply a (permanent) item effect to a monster. */
function applyItem(m: MonsterInstance, item: ItemDef): MonsterInstance {
  if (item.effect.kind === 'permanentBuff') {
    return {
      ...m,
      atk: m.atk + item.effect.atk,
      maxHp: m.maxHp + item.effect.hp,
      hp: m.hp + item.effect.hp,
    };
  }
  // startingShield (e.g. Sturdy Shell): persists on the instance and carries
  // into battle as its opening shield.
  return { ...m, shield: m.shield + item.effect.amount };
}

function clearMonsterSlot(shop: ShopState, slot: number): ShopState {
  const monsterSlots = shop.monsterSlots.slice();
  const frozenMonsters = shop.frozenMonsters.slice();
  monsterSlots[slot] = null;
  frozenMonsters[slot] = false;
  return { ...shop, monsterSlots, frozenMonsters };
}

function clearItemSlot(shop: ShopState, slot: number): ShopState {
  const itemSlots = shop.itemSlots.slice();
  const frozenItems = shop.frozenItems.slice();
  itemSlots[slot] = null;
  frozenItems[slot] = false;
  return { ...shop, itemSlots, frozenItems };
}
