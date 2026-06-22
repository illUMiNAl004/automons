// ============================================================================
// battle.ts — resolveBattle(): the deterministic combat simulator (DESIGN.md §5).
//
// PURE. No DOM, no React, no Date.now(), no Math.random() — the only randomness
// is the seeded RNG passed in. Same teams + same seed ⇒ identical event log.
//
// The function simulates the WHOLE fight up front and returns an ordered
// `eventLog` (DESIGN.md §6). The UI replays that log; it never recomputes combat.
//
// ─────────────────────────────────────────────────────────────────────────────
// RESOLUTION ORDER (DESIGN.md §5) — read this before touching the loop:
//
//   1. startOfBattle abilities fire once, in DESCENDING ATK order (RNG breaks
//      ties). After each one we "settle" (resolve any faints/hurt it caused).
//   2. While both teams are non-empty, run a STEP:
//        a. a = teamA.front, b = teamB.front
//        b. Both attack SIMULTANEOUSLY — damage for both is computed from
//           pre-damage ATK, then applied (shield-then-HP).
//        c. afterAttack fires for a and b (before faints resolve — §5 step c),
//           in descending ATK order.
//        d/e. SETTLE: resolve faints, then onHurt, as a deterministic fixpoint
//           (see `settle`). Chains (onFaint → AoE → more faints, thorns → faint)
//           are handled by looping until the board is stable.
//   3. Empty checks → winner / draw. Append the `end` event.
//
// TRIGGER ORDERING (DESIGN.md §4): whenever several abilities fire from one
// event, they resolve in descending ATK order; ties are broken by the seeded
// RNG (see `orderByAtkDesc`). This is the single rule used everywhere.
// ============================================================================

import type {
  BattleEvent,
  BattleResult,
  BattleWinner,
  ElementType,
  InstanceId,
  MonsterDef,
  MonsterInstance,
  Side,
  Team,
  Trigger,
} from './types';
import { CONFIG, levelStatBonus } from './config';
import { computeDamage } from './typeChart';
import { getMonsterDef } from './data/monsters';
import { fireAbility, type EffectContext, type FireOpts } from './abilities';
import { makeRng, type RNG } from './rng';

// ----------------------------------------------------------------------------
// Instance construction (shared by opponent.ts, the harness, and tests)
// ----------------------------------------------------------------------------

export interface InstanceOptions {
  level?: number;
  /** Permanent stat bonuses from items/merges, layered on top of base + level. */
  bonusAtk?: number;
  bonusHp?: number;
  /** Shield the monster starts the battle with (e.g. from the `shell` item). */
  startShield?: number;
}

/** Build a fresh battle-ready instance from a species def. */
export function makeInstance(
  def: MonsterDef,
  instanceId: InstanceId,
  opts: InstanceOptions = {},
): MonsterInstance {
  const level = opts.level ?? 1;
  const lvl = levelStatBonus(level);
  const atk = def.atk + lvl.atk + (opts.bonusAtk ?? 0);
  const hp = def.hp + lvl.hp + (opts.bonusHp ?? 0);
  return {
    instanceId,
    speciesId: def.id,
    name: def.name,
    type: def.type,
    level,
    atk,
    hp,
    maxHp: hp,
    shield: opts.startShield ?? 0,
    ability: def.ability,
    lastDamagedBy: null,
    pendingHurt: false,
  };
}

/** Build a team, assigning ids `${prefix}0`, `${prefix}1`, … (globally unique). */
export function buildTeam(
  entries: Array<{ def: MonsterDef } & InstanceOptions>,
  prefix: string,
): Team {
  return entries.map((e, i) => makeInstance(e.def, `${prefix}${i}`, e));
}

// ----------------------------------------------------------------------------
// resolveBattle
// ----------------------------------------------------------------------------

/**
 * Simulate the entire battle. `teamA`/`teamB` are NOT mutated — they are deep
 * cloned (instance ids preserved) so the same teams can be replayed.
 */
export function resolveBattle(teamA: Team, teamB: Team, seed: number): BattleResult {
  const rng = makeRng(seed);
  const log: BattleEvent[] = [];

  // Deep clone so battles are pure & repeatable; reset battle bookkeeping.
  const A: MonsterInstance[] = teamA.map(cloneForBattle);
  const B: MonsterInstance[] = teamB.map(cloneForBattle);

  let summonCounter = 0;

  // --- the EffectContext abilities.ts talks through ---
  const ctx: EffectContext = {
    rng,
    friendsOf: (side) => (side === 'A' ? A : B),
    enemiesOf: (side) => (side === 'A' ? B : A),
    findById: (id) => A.find((m) => m.instanceId === id) ?? B.find((m) => m.instanceId === id),
    dealTypedDamage: (target, rawAmount, dmgType, sourceId) =>
      dealTypedDamage(log, target, rawAmount, dmgType, sourceId),
    applyBuff: (target, atk, hp) => applyBuff(log, target, atk, hp),
    applyHeal: (target, amount) => applyHeal(log, target, amount),
    applyShield: (target, amount) => applyShield(log, target, amount),
    summon: (side, tokenId, atIndex) => {
      const team = side === 'A' ? A : B;
      const def = getMonsterDef(tokenId);
      const token = makeInstance(def, `${side}s${summonCounter++}`);
      const at = Math.min(Math.max(atIndex, 0), team.length);
      team.splice(at, 0, token);
      log.push({ kind: 'summon', token, atIndex: at });
    },
    emit: (event) => log.push(event),
  };

  const sideOf = (m: MonsterInstance): Side => (A.includes(m) ? 'A' : 'B');

  // --- 1. startOfBattle ---
  log.push({ kind: 'startOfBattle' });
  const starters = orderByAtkDesc([...A, ...B].filter((m) => m.ability?.trigger === 'startOfBattle'), rng);
  for (const m of starters) {
    // Skip if it died to an earlier startOfBattle effect (e.g. a glass cannon
    // killed by Cinderpup before its own turn).
    if (m.hp <= 0 || !inPlay(m)) continue;
    fireAbility(ctx, m, sideOf(m), m.ability!);
    settle(ctx, A, B, sideOf, rng);
  }

  // --- 2. main step loop ---
  let steps = 0;
  while (A.length > 0 && B.length > 0) {
    if (++steps > CONFIG.maxBattleSteps) break; // safety: declare draw below

    const a = A[0];
    const b = B[0];

    // b. simultaneous attack — compute BOTH from pre-damage ATK, then apply.
    const dmgAtoB = a.atk;
    const dmgBtoA = b.atk;
    log.push({ kind: 'attack', attacker: a.instanceId, target: b.instanceId });
    dealTypedDamage(log, b, dmgAtoB, a.type, a.instanceId);
    log.push({ kind: 'attack', attacker: b.instanceId, target: a.instanceId });
    dealTypedDamage(log, a, dmgBtoA, b.type, b.instanceId);

    // c. afterAttack for both front monsters (before faints resolve), ordered.
    for (const attacker of orderByAtkDesc([a, b], rng)) {
      if (attacker.ability?.trigger !== 'afterAttack') continue;
      const target = attacker === a ? b : a;
      fireAbility(ctx, attacker, sideOf(attacker), attacker.ability, {
        attackTargetId: target.instanceId,
      });
    }

    // d + e. settle faints then hurt (fixpoint).
    settle(ctx, A, B, sideOf, rng);
  }

  // --- 3. result ---
  const winner: BattleWinner = A.length > 0 && B.length === 0 ? 'A' : B.length > 0 && A.length === 0 ? 'B' : 'draw';
  log.push({ kind: 'end', winner });

  function inPlay(m: MonsterInstance): boolean {
    return A.includes(m) || B.includes(m);
  }

  return { winner, eventLog: log };
}

// ----------------------------------------------------------------------------
// Settle: resolve faints, then onHurt, until the board is stable (DESIGN.md §5 d/e)
// ----------------------------------------------------------------------------

function settle(
  ctx: EffectContext,
  A: MonsterInstance[],
  B: MonsterInstance[],
  sideOf: (m: MonsterInstance) => Side,
  rng: RNG,
): void {
  let guard = 0;
  while (true) {
    if (++guard > 100_000) break; // unreachable in practice; protects against bugs

    // FAINT PASS — handle the single highest-ATK fainter, then re-scan so that
    // onFaint chains (Krakenling AoE, Sprout summon, …) are picked up in order.
    const fainters = [...A, ...B].filter((m) => m.hp <= 0);
    if (fainters.length > 0) {
      const F = orderByAtkDesc(fainters, rng)[0];
      processFaint(ctx, F, A, B, sideOf, rng);
      continue;
    }

    // HURT PASS — every survivor that lost HP since the last pass fires onHurt
    // once, in descending ATK order. onHurt may deal damage (Thornback thorns),
    // which loops us back to the faint pass.
    const hurt = orderByAtkDesc([...A, ...B].filter((m) => m.pendingHurt && m.hp > 0), rng);
    if (hurt.length > 0) {
      for (const m of hurt) {
        if (m.hp <= 0 || !m.pendingHurt) continue;
        m.pendingHurt = false;
        if (m.ability?.trigger === 'onHurt') fireAbility(ctx, m, sideOf(m), m.ability);
      }
      continue;
    }

    break; // nothing pending — board is stable
  }
}

/**
 * Remove one fainted monster, then fire (in order): its own `onFaint`, then its
 * allies' `onFriendFaint` (DESIGN.md §5 step d). The fainter is spliced out
 * FIRST so that friend-targeting can't select the corpse and so `summon`/
 * positional targets resolve against the vacated slot.
 */
function processFaint(
  ctx: EffectContext,
  F: MonsterInstance,
  A: MonsterInstance[],
  B: MonsterInstance[],
  sideOf: (m: MonsterInstance) => Side,
  rng: RNG,
): void {
  const side = sideOf(F);
  const team = side === 'A' ? A : B;
  const idx = team.indexOf(F);
  if (idx < 0) return; // already removed

  ctx.emit({ kind: 'faint', target: F.instanceId });
  team.splice(idx, 1);

  // 1. the fainter's own onFaint (positional relative to the vacated slot).
  if (F.ability?.trigger === 'onFaint') {
    fireAbility(ctx, F, side, F.ability, { faintSlot: idx } satisfies FireOpts);
  }

  // 2. allies' onFriendFaint, descending ATK.
  const allies = orderByAtkDesc(team.filter((a) => a.ability?.trigger === 'onFriendFaint'), rng);
  for (const ally of allies) {
    if (!team.includes(ally)) continue; // died in the meantime
    fireAbility(ctx, ally, side, ally.ability!);
  }
}

// ----------------------------------------------------------------------------
// Mutation primitives — the ONLY places that change instance stats. Each logs.
// ----------------------------------------------------------------------------

/** Apply typed damage: type chart → round/min-1 → shield-then-HP. Logs `damage`. */
function dealTypedDamage(
  log: BattleEvent[],
  target: MonsterInstance,
  rawAmount: number,
  dmgType: ElementType,
  sourceId: InstanceId,
): void {
  const damage = computeDamage(rawAmount, dmgType, target.type);
  const shielded = Math.min(target.shield, damage);
  target.shield -= shielded;
  const toHp = damage - shielded;
  target.hp -= toHp;
  target.lastDamagedBy = sourceId;
  // "Hurt" = lost HP. Damage fully soaked by shield does NOT trigger onHurt.
  if (toHp > 0) target.pendingHurt = true;
  log.push({ kind: 'damage', target: target.instanceId, amount: damage, type: dmgType, shielded });
}

/** +atk / +hp. HP buffs raise current AND max HP (SAP convention). Logs `buff`. */
function applyBuff(log: BattleEvent[], target: MonsterInstance, atk: number, hp: number): void {
  target.atk += atk;
  target.maxHp += hp;
  target.hp += hp;
  log.push({ kind: 'buff', target: target.instanceId, atk, hp });
}

/** Heal up to max HP. Logs the actual amount restored. */
function applyHeal(log: BattleEvent[], target: MonsterInstance, amount: number): void {
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = target.hp - before;
  if (healed > 0) log.push({ kind: 'heal', target: target.instanceId, amount: healed });
}

/** Add shield. Logs `shieldGain`. */
function applyShield(log: BattleEvent[], target: MonsterInstance, amount: number): void {
  target.shield += amount;
  log.push({ kind: 'shieldGain', target: target.instanceId, amount });
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Deep-clone an instance for battle; reset per-battle bookkeeping. */
function cloneForBattle(m: MonsterInstance): MonsterInstance {
  return { ...m, lastDamagedBy: null, pendingHurt: false };
}

/**
 * Sort by DESCENDING ATK; ties broken by the seeded RNG. Implemented by giving
 * each element a random key up front (deterministic for a given seed), so the
 * sort itself is a pure comparator. This is THE trigger-ordering rule (§4).
 */
export function orderByAtkDesc<T extends { atk: number }>(items: readonly T[], rng: RNG): T[] {
  const keyed = items.map((item) => ({ item, key: rng.next() }));
  keyed.sort((x, y) => y.item.atk - x.item.atk || x.key - y.key);
  return keyed.map((k) => k.item);
}

/** Re-export so callers can name the result trigger type without reaching in. */
export type { Trigger };
