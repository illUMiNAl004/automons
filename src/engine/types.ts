// ============================================================================
// types.ts — Core type vocabulary for the Automons engine.
//
// This file is PURE: no React, no DOM, no runtime values that aren't types.
// Everything the engine and UI agree on lives here. See DESIGN.md §3, §4, §6.
// ============================================================================

/** The four elements. Cycle: fire → nature → water → earth → fire (DESIGN.md §2). */
export type ElementType = 'fire' | 'nature' | 'water' | 'earth';

/** Shop unlock / cost gating tier. */
export type Tier = 1 | 2 | 3;

/** Events that can fire an ability (DESIGN.md §4). */
export type Trigger =
  | 'startOfBattle'
  | 'afterAttack'
  | 'onHurt'
  | 'onFaint'
  | 'onFriendFaint';

// ----------------------------------------------------------------------------
// Targeting
// ----------------------------------------------------------------------------

/** Where a damage effect can be aimed (relative to the ability's source). */
export type DamageTarget =
  | 'frontEnemy'
  | 'backEnemy'
  | 'randomEnemy'
  | 'strongestEnemy' // highest ATK
  | 'weakestEnemy' // lowest HP
  | 'enemyBehindTarget' // the enemy directly behind the one we just attacked
  | 'attacker' // whoever most recently dealt damage to the source (thorns)
  | 'allEnemies';

/** Where a friendly (buff/heal/shield) effect can be aimed. */
export type FriendTarget =
  | 'self'
  | 'friendAhead' // the ally in front (lower index)
  | 'friendBehind' // the ally behind (higher index)
  | 'randomFriend' // a random OTHER friend
  | 'allFriends'; // all OTHER friends (excludes self, SAP convention)

// ----------------------------------------------------------------------------
// Effects — discriminated union on `verb` (DESIGN.md §4). No `any`.
// ----------------------------------------------------------------------------

export type Effect =
  | { verb: 'dealDamage'; amount: number; dmgType: ElementType; target: DamageTarget }
  | { verb: 'buff'; atk: number; hp: number; target: FriendTarget }
  | { verb: 'heal'; amount: number; target: FriendTarget }
  | { verb: 'shield'; amount: number; target: FriendTarget }
  | { verb: 'summon'; token: string; atIndex: 'self' }
  // Special-case payoff verb (Terrapex): +stats per OTHER friend of a given type.
  | { verb: 'buffPerFriendOfType'; atk: number; hp: number; ofType: ElementType; target: 'self' };

/** An ability is exactly one trigger + one effect. */
export interface Ability {
  trigger: Trigger;
  effect: Effect;
}

// ----------------------------------------------------------------------------
// Monsters
// ----------------------------------------------------------------------------

/** Static definition of a species (data-driven content, DESIGN.md §7). */
export interface MonsterDef {
  id: string; // unique species id; matches art file `{id}.png`
  name: string;
  /** Flavor "species" of the creature, separate from its element type (e.g.
   *  "Ember Wyrmling", "Sea Dragon God"). Surfaced in battle text. */
  subtype?: string;
  /** Grand proper name for battle flavor (often === name; e.g. evolved Dewdrop = "DragoDrop"). */
  displayName?: string;
  type: ElementType;
  tier: Tier;
  atk: number;
  hp: number;
  ability: Ability | null;
  /** Evolved species id this base form combines INTO (3 copies). Undefined = terminal. */
  evolvesTo?: string;
  /** True on evolved entries — these never appear in the shop. */
  evolved?: boolean;
}

/** Unique id for a specific monster *instance* on the board (not the species). */
export type InstanceId = string;

/** A live monster during a battle (a clone — battles never mutate the roster). */
export interface MonsterInstance {
  instanceId: InstanceId;
  speciesId: string; // which MonsterDef this came from
  name: string;
  type: ElementType;
  /** Evolution progress: how many copies are stacked here (1..evolveAt). At
   *  evolveAt the creature transforms into its evolved species (DESIGN.md §9). */
  copies: number;
  atk: number; // current ATK (after buffs)
  hp: number; // current HP
  maxHp: number; // current max HP (buffs raise this too)
  shield: number; // absorbs damage before HP
  ability: Ability | null;
  // --- battle-only bookkeeping (not part of roster state) ---
  /** Instance id of whoever most recently damaged this monster (for `attacker` target). */
  lastDamagedBy: InstanceId | null;
  /** Set when damaged; consumed by the onHurt pass each settle cycle. */
  pendingHurt: boolean;
}

/** A team is an ordered list; index 0 = front (DESIGN.md §5). */
export type Team = MonsterInstance[];

/** Which side of the battle a monster is on. */
export type Side = 'A' | 'B';

// ----------------------------------------------------------------------------
// Items (DESIGN.md §8)
// ----------------------------------------------------------------------------

export type ItemEffect =
  | { kind: 'permanentBuff'; atk: number; hp: number }
  | { kind: 'startingShield'; amount: number };

export interface ItemDef {
  id: string;
  name: string;
  cost: number;
  effect: ItemEffect;
  description: string;
}

// ----------------------------------------------------------------------------
// Battle event log (DESIGN.md §6) — what the UI replays.
// ----------------------------------------------------------------------------

export type BattleEvent =
  | { kind: 'startOfBattle' }
  | { kind: 'attack'; attacker: InstanceId; target: InstanceId }
  | { kind: 'damage'; target: InstanceId; amount: number; type: ElementType; shielded: number }
  | { kind: 'ability'; source: InstanceId; trigger: Trigger; description: string }
  | { kind: 'buff'; target: InstanceId; atk: number; hp: number }
  | { kind: 'heal'; target: InstanceId; amount: number }
  | { kind: 'shieldGain'; target: InstanceId; amount: number }
  | { kind: 'faint'; target: InstanceId }
  | { kind: 'summon'; token: MonsterInstance; atIndex: number }
  | { kind: 'end'; winner: BattleWinner };

export type BattleWinner = 'A' | 'B' | 'draw';

export interface BattleResult {
  winner: BattleWinner;
  eventLog: BattleEvent[];
}

// ----------------------------------------------------------------------------
// Run / game state (used by shop.ts & run.ts in later milestones; typed now so
// the engine's public surface is stable). DESIGN.md §1, §9, §11.
// ----------------------------------------------------------------------------

export type RunPhase = 'title' | 'shop' | 'battle' | 'result' | 'won' | 'lost';

export interface ShopState {
  monsterSlots: (MonsterDef | null)[];
  itemSlots: (ItemDef | null)[];
  frozenMonsters: boolean[];
  frozenItems: boolean[];
}

export interface GameState {
  phase: RunPhase;
  turn: number;
  gold: number;
  lives: number;
  trophies: number;
  /**
   * The player's team, front-to-back (index 0 = front in battle). Up to
   * CONFIG.benchMax monsters. This single ordered row IS both the "bench" and
   * the battle "board" — SAP-style. `null` marks an empty slot.
   */
  team: (MonsterInstance | null)[];
  shop: ShopState;
  /** Live PRNG state; advances on every randomized op (roll/reroll). */
  seed: number;
  /** Monotonic counter for unique team instance ids. */
  nextInstanceId: number;
  /** Outcome of the most recent battle, for the result screen (M3). */
  lastResult: BattleWinner | null;
}
