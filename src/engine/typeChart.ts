// ============================================================================
// typeChart.ts — The 4-type effectiveness cycle (DESIGN.md §2).
//
// Cycle: fire → nature → water → earth → fire.
// Each type is STRONG (×1.5) vs the NEXT in the cycle, WEAK (×0.5) vs the
// PREVIOUS, and NEUTRAL (×1.0) vs itself and its opposite.
// ============================================================================

import type { ElementType } from './types';
import { CONFIG } from './config';

/** The cycle order. `CYCLE[(i+1)%4]` is the type that `CYCLE[i]` beats. */
const CYCLE: readonly ElementType[] = ['fire', 'nature', 'water', 'earth'];

/**
 * Damage multiplier for `attacker` hitting `defender`.
 *   strong → 1.5, weak → 0.5, neutral (same or opposite) → 1.0.
 */
export function typeMult(attacker: ElementType, defender: ElementType): number {
  const ai = CYCLE.indexOf(attacker);
  const di = CYCLE.indexOf(defender);

  if ((ai + 1) % 4 === di) return CONFIG.typeMultiplier.strong; // attacker beats the next
  if ((ai + 3) % 4 === di) return CONFIG.typeMultiplier.weak; // defender is the previous
  return CONFIG.typeMultiplier.neutral; // same type or opposite
}

/**
 * Final damage of `rawAmount` ATK of `attackType` landing on `defenderType`:
 * apply the multiplier, round to nearest, clamp to a minimum of 1.
 */
export function computeDamage(
  rawAmount: number,
  attackType: ElementType,
  defenderType: ElementType,
): number {
  const scaled = rawAmount * typeMult(attackType, defenderType);
  return Math.max(CONFIG.minDamage, Math.round(scaled));
}
