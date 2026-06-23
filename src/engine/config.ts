// ============================================================================
// config.ts — EVERY tunable number lives here (DESIGN.md §1, §2, §9, §10).
//
// Nothing else in the engine should hardcode a balance number; pull it from
// CONFIG so designers can tune the whole game from one file.
// ============================================================================

import type { Tier } from './types';

export const CONFIG = {
  // --- Run win/lose conditions (DESIGN.md §1) ---
  startingLives: 5,
  winTrophies: 10,

  // --- Shop economy (DESIGN.md §9) ---
  startingGold: 10,
  monsterCost: 3, // flat 3 gold for MVP
  itemCost: 3,
  sellRefund: 1,
  rerollCost: 1,
  benchMax: 5,
  boardMax: 5, // a battle team is at most 5 monsters
  shopMonsterSlots: 3,
  shopItemSlots: 2,

  // --- Type effectiveness multipliers (DESIGN.md §2) ---
  typeMultiplier: {
    strong: 1.5,
    neutral: 1.0,
    weak: 0.5,
  },
  /** Direct attacks (and typed ability damage) never deal less than this. */
  minDamage: 1,

  // --- Evolution / combining (DESIGN.md §9) ---
  // Combining duplicates fills an evolution counter; on the Nth copy the base
  // form transforms into its evolved species (no numeric levels).
  evolution: {
    evolveAt: 3, // copies (incl. the original) needed to evolve
    mergeBonus: { atk: 1, hp: 1 }, // each combine bumps the surviving creature
    evolveBonus: { atk: 1, hp: 1 }, // small bonus on top of the higher stat line
  },

  // --- Opponent generation (DESIGN.md §10) ---
  opponent: {
    baseBudget: 3,
    budgetPerTurn: 2,
    monsterValue: 3, // each monster "costs" this much budget
    buffFromTurn: 4, // from this turn, randomly hand out +1/+1
    itemFromTurn: 7, // from this turn, give one member a random item effect
    randomBuffAtk: 1,
    randomBuffHp: 1,
  },

  // --- Safety: hard cap on battle steps to guarantee termination ---
  maxBattleSteps: 1000,
} as const;

/**
 * Tier unlock schedule (DESIGN.md §9): a new tier opens every 2 turns.
 *   Turns 1–2 → Tier 1 only · Turns 3–4 → Tiers 1–2 · Turn 5+ → Tiers 1–3.
 */
export function maxTierForTurn(turn: number): Tier {
  if (turn <= 2) return 1;
  if (turn <= 4) return 2;
  return 3;
}
