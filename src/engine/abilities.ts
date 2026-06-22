// ============================================================================
// abilities.ts — Effect-verb implementations + targeting (DESIGN.md §4).
//
// This module is the "what an ability DOES" layer. It is deliberately decoupled
// from the battle loop: it operates through an `EffectContext` that battle.ts
// supplies (apply damage, buff, summon, emit events, read the boards). That
// keeps targeting/effects unit-reasoned and the loop free to own ordering.
//
// Level scaling: an ability's numeric amounts are multiplied by
// abilityMultiplier(level) — L1 ×1, L2 ×2, L3 ×3 (DESIGN.md §9).
// ============================================================================

import type {
  Ability,
  Effect,
  InstanceId,
  MonsterInstance,
  Side,
  BattleEvent,
  DamageTarget,
  FriendTarget,
  ElementType,
} from './types';
import { abilityMultiplier } from './config';
import type { RNG } from './rng';

/**
 * The callbacks the battle loop exposes to ability effects. Effects never touch
 * the team arrays directly — they go through here so the loop owns all logging,
 * faint detection, and summon bookkeeping.
 */
export interface EffectContext {
  rng: RNG;
  /** Living friends on `side`, front-to-back (live array reference). */
  friendsOf(side: Side): MonsterInstance[];
  /** Living enemies of `side`, front-to-back (live array reference). */
  enemiesOf(side: Side): MonsterInstance[];
  /** Find any living instance by id across both teams. */
  findById(id: InstanceId): MonsterInstance | undefined;

  /** Deal `rawAmount` of `dmgType` damage (type chart + shield applied), logged. */
  dealTypedDamage(target: MonsterInstance, rawAmount: number, dmgType: ElementType, sourceId: InstanceId): void;
  /** +atk / +hp (hp raises current AND max), logged. */
  applyBuff(target: MonsterInstance, atk: number, hp: number): void;
  /** Restore HP up to max, logged. */
  applyHeal(target: MonsterInstance, amount: number): void;
  /** Add shield, logged. */
  applyShield(target: MonsterInstance, amount: number): void;
  /** Summon a token into `side` at `atIndex`, logged. */
  summon(side: Side, tokenId: string, atIndex: number): void;
  /** Push a raw event (used for the ability "label" event). */
  emit(event: BattleEvent): void;
}

/** Extra context for resolving a few position-sensitive targets. */
export interface FireOpts {
  /** For `afterAttack` → `enemyBehindTarget`: the id of the enemy we just hit. */
  attackTargetId?: InstanceId;
  /**
   * For `onFaint`: the slot the fainter just vacated (it has already been
   * removed from the array). Positional friend targets & `summon` resolve
   * relative to this slot.
   */
  faintSlot?: number;
}

/**
 * Fire one ability: emit its label event, then apply its effect. The battle
 * loop is responsible for having decided this ability *should* fire.
 */
export function fireAbility(
  ctx: EffectContext,
  source: MonsterInstance,
  side: Side,
  ability: Ability,
  opts: FireOpts = {},
): void {
  ctx.emit({
    kind: 'ability',
    source: source.instanceId,
    trigger: ability.trigger,
    description: describeEffect(source, ability.effect),
  });
  applyEffect(ctx, source, side, ability.effect, opts);
}

function applyEffect(
  ctx: EffectContext,
  source: MonsterInstance,
  side: Side,
  effect: Effect,
  opts: FireOpts,
): void {
  const mult = abilityMultiplier(source.level);

  switch (effect.verb) {
    case 'dealDamage': {
      const targets = resolveDamageTargets(ctx, source, side, effect.target, opts);
      const amount = effect.amount * mult;
      for (const t of targets) ctx.dealTypedDamage(t, amount, effect.dmgType, source.instanceId);
      break;
    }
    case 'buff': {
      const targets = resolveFriendTargets(ctx, source, side, effect.target, opts);
      for (const t of targets) ctx.applyBuff(t, effect.atk * mult, effect.hp * mult);
      break;
    }
    case 'heal': {
      const targets = resolveFriendTargets(ctx, source, side, effect.target, opts);
      for (const t of targets) ctx.applyHeal(t, effect.amount * mult);
      break;
    }
    case 'shield': {
      const targets = resolveFriendTargets(ctx, source, side, effect.target, opts);
      for (const t of targets) ctx.applyShield(t, effect.amount * mult);
      break;
    }
    case 'summon': {
      // atIndex is always 'self' in the starter set: the token fills the slot
      // the (already-removed) source occupied, or the back if the source is alive.
      const friends = ctx.friendsOf(side);
      const slot = opts.faintSlot ?? friends.indexOf(source);
      ctx.summon(side, effect.token, slot < 0 ? friends.length : slot);
      break;
    }
    case 'buffPerFriendOfType': {
      const count = ctx
        .friendsOf(side)
        .filter((f) => f !== source && f.type === effect.ofType).length;
      if (count > 0) ctx.applyBuff(source, effect.atk * count * mult, effect.hp * count * mult);
      break;
    }
  }
}

// ----------------------------------------------------------------------------
// Targeting
// ----------------------------------------------------------------------------

/** Resolve a damage target into a concrete list of (living) enemies. */
export function resolveDamageTargets(
  ctx: EffectContext,
  source: MonsterInstance,
  side: Side,
  target: DamageTarget,
  opts: FireOpts,
): MonsterInstance[] {
  const enemies = ctx.enemiesOf(side);
  if (enemies.length === 0 && target !== 'attacker') return [];

  switch (target) {
    case 'frontEnemy':
      return [enemies[0]];
    case 'backEnemy':
      return [enemies[enemies.length - 1]];
    case 'randomEnemy':
      return [ctx.rng.pick(enemies)];
    case 'strongestEnemy':
      return pickExtreme(ctx.rng, enemies, (m) => m.atk, 'max');
    case 'weakestEnemy':
      return pickExtreme(ctx.rng, enemies, (m) => m.hp, 'min');
    case 'enemyBehindTarget': {
      // The enemy directly behind whichever enemy we just attacked.
      const hitIdx =
        opts.attackTargetId != null
          ? enemies.findIndex((e) => e.instanceId === opts.attackTargetId)
          : 0;
      const behind = enemies[hitIdx + 1];
      return behind ? [behind] : [];
    }
    case 'attacker': {
      // Whoever most recently dealt damage to the source (thorns).
      const id = source.lastDamagedBy;
      const who = id != null ? ctx.findById(id) : undefined;
      return who ? [who] : [];
    }
    case 'allEnemies':
      return enemies.slice();
  }
}

/** Resolve a friendly target into a concrete list of (living) friends. */
export function resolveFriendTargets(
  ctx: EffectContext,
  source: MonsterInstance,
  side: Side,
  target: FriendTarget,
  opts: FireOpts,
): MonsterInstance[] {
  const friends = ctx.friendsOf(side);
  const faintMode = opts.faintSlot !== undefined;
  // Where the source "is" for positional math. When fainting, the source has
  // already been spliced out, so the slot it vacated is opts.faintSlot.
  const idx = faintMode ? (opts.faintSlot as number) : friends.indexOf(source);

  switch (target) {
    case 'self':
      return [source];
    case 'friendAhead': {
      const ahead = friends[idx - 1];
      return ahead ? [ahead] : [];
    }
    case 'friendBehind': {
      // Alive: the next slot (idx+1). Fainting: the element that shifted up into
      // the vacated slot IS the one that was behind us, now at `idx`.
      const behind = faintMode ? friends[idx] : friends[idx + 1];
      return behind ? [behind] : [];
    }
    case 'randomFriend': {
      const others = friends.filter((f) => f !== source);
      return others.length ? [ctx.rng.pick(others)] : [];
    }
    case 'allFriends':
      return friends.filter((f) => f !== source);
  }
}

/** Return [the extreme element]; ties broken by the seeded RNG (determinism). */
function pickExtreme(
  rng: RNG,
  arr: MonsterInstance[],
  score: (m: MonsterInstance) => number,
  mode: 'max' | 'min',
): MonsterInstance[] {
  if (arr.length === 0) return [];
  let best = score(arr[0]);
  for (const m of arr) {
    const s = score(m);
    if (mode === 'max' ? s > best : s < best) best = s;
  }
  const tied = arr.filter((m) => score(m) === best);
  return [rng.pick(tied)];
}

// ----------------------------------------------------------------------------
// Human-readable ability descriptions (for the event log / battle UI text)
// ----------------------------------------------------------------------------

function describeEffect(source: MonsterInstance, effect: Effect): string {
  const n = source.name;
  switch (effect.verb) {
    case 'dealDamage':
      return `${n} deals ${amt(effect)} ${effect.dmgType} damage to ${labelTarget(effect.target)}`;
    case 'buff':
      return `${n} gives ${signed(effect.atk)}/${signed(effect.hp)} to ${labelTarget(effect.target)}`;
    case 'heal':
      return `${n} heals ${labelTarget(effect.target)} for ${effect.amount}`;
    case 'shield':
      return `${n} grants ${effect.amount} shield to ${labelTarget(effect.target)}`;
    case 'summon':
      return `${n} summons a ${effect.token}`;
    case 'buffPerFriendOfType':
      return `${n} gains ${signed(effect.atk)}/${signed(effect.hp)} per other ${effect.ofType} friend`;
  }
}

function amt(effect: Extract<Effect, { verb: 'dealDamage' }>): number {
  return effect.amount;
}
function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
function labelTarget(t: DamageTarget | FriendTarget): string {
  return t.replace(/([A-Z])/g, ' $1').toLowerCase();
}
