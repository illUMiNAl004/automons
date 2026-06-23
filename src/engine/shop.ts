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
import { BASE_MONSTERS, getMonsterDef } from './data/monsters';
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
  // Only BASE forms are sold — evolved forms come purely from combining.
  const pool = BASE_MONSTERS.filter((m) => m.tier <= maxTier);

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
 * SAME species, it combines (fills the evolution counter / evolves on the 3rd);
 * if it's empty it lands there; otherwise we fall back to the first empty team
 * slot. No-op if unaffordable or no room.
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
      team[idx] = combine(occupant, makeInstance(def, '_buy')); // buy-to-combine
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
 * combine (evolution counter); different species → swap. One op covers reorder
 * AND combine/evolve.
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
    team[to] = combine(b, a); // combine a into b
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

/** Whether `m` is a base form that can still evolve (used by the UI for pips). */
export function canEvolve(m: MonsterInstance): boolean {
  return getMonsterDef(m.speciesId).evolvesTo !== undefined;
}

/** Whether `m` is already an evolved form. */
export function isEvolved(m: MonsterInstance): boolean {
  return getMonsterDef(m.speciesId).evolved === true;
}

// ----------------------------------------------------------------------------
// Internals — combine & evolve
// ----------------------------------------------------------------------------

const firstEmpty = (team: (MonsterInstance | null)[]): number => team.findIndex((s) => s === null);

/**
 * Combine `source` into `target`: fill the evolution counter and take the
 * higher of each stat line (+ a small bonus) so a buffed duplicate is never
 * wasted. On reaching `evolveAt` copies, the base transforms into its evolved
 * form IN PLACE (same instanceId). Items (baked-in stats + shield) carry over.
 */
function combine(target: MonsterInstance, source: MonsterInstance): MonsterInstance {
  const def = getMonsterDef(target.speciesId);
  const copies = target.copies + source.copies;
  const merged: MonsterInstance = {
    ...target,
    copies,
    atk: Math.max(target.atk, source.atk) + CONFIG.evolution.mergeBonus.atk,
    maxHp: Math.max(target.maxHp, source.maxHp) + CONFIG.evolution.mergeBonus.hp,
    hp: Math.max(target.maxHp, source.maxHp) + CONFIG.evolution.mergeBonus.hp,
    shield: Math.max(target.shield, source.shield),
  };
  if (def.evolvesTo && copies >= CONFIG.evolution.evolveAt) {
    return evolve(merged, def.evolvesTo);
  }
  return merged;
}

/** Transform an instance into its evolved species, inheriting the higher stats. */
function evolve(inst: MonsterInstance, evolvedId: string): MonsterInstance {
  const ev = getMonsterDef(evolvedId);
  const atk = Math.max(inst.atk, ev.atk) + CONFIG.evolution.evolveBonus.atk;
  const hp = Math.max(inst.maxHp, ev.hp) + CONFIG.evolution.evolveBonus.hp;
  return {
    ...inst, // keeps instanceId + shield (carried items)
    speciesId: ev.id,
    name: ev.name,
    type: ev.type,
    ability: ev.ability,
    atk,
    maxHp: hp,
    hp,
    copies: 1, // evolved is terminal
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
