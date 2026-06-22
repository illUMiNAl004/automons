import { describe, it, expect } from 'vitest';
import { generateOpponent } from '../opponent';
import { getMonsterDef } from '../data/monsters';
import { maxTierForTurn, CONFIG } from '../config';
import type { Team } from '../types';

const sig = (team: Team) =>
  team.map((m) => `${m.speciesId}:${m.atk}/${m.hp}/${m.shield}`).join(',');

describe('generateOpponent — scaling & gating (DESIGN.md §10)', () => {
  it('is deterministic for the same (turn, seed)', () => {
    expect(sig(generateOpponent(5, 999))).toBe(sig(generateOpponent(5, 999)));
  });

  it('produces variety across seeds', () => {
    const sigs = new Set([11, 22, 33, 44, 55].map((s) => sig(generateOpponent(5, s))));
    expect(sigs.size).toBeGreaterThan(1);
  });

  it('team size grows with the turn and is capped at the board max', () => {
    expect(generateOpponent(1, 7).length).toBe(1); // budget 5 → 1 monster
    expect(generateOpponent(2, 7).length).toBe(2); // budget 7 → 2
    expect(generateOpponent(3, 7).length).toBe(3); // budget 9 → 3
    expect(generateOpponent(1, 7).length).toBeLessThan(generateOpponent(5, 7).length);
    for (const turn of [7, 9, 12]) {
      expect(generateOpponent(turn, 7).length).toBe(CONFIG.boardMax); // capped
    }
  });

  it('respects the tier unlock schedule', () => {
    for (const turn of [1, 2, 3, 4, 5, 8]) {
      const max = maxTierForTurn(turn);
      for (const m of generateOpponent(turn, 123)) {
        expect(getMonsterDef(m.speciesId).tier).toBeLessThanOrEqual(max);
      }
    }
  });

  it('applies light stat scaling from the buff turn onward', () => {
    // From turn 4 at least one member is buffed above its base stats.
    const team = generateOpponent(8, 2024);
    const scaled = team.some((m) => {
      const base = getMonsterDef(m.speciesId);
      return m.atk > base.atk || m.maxHp > base.hp || m.shield > 0;
    });
    expect(scaled).toBe(true);
  });

  it('never exceeds the board max', () => {
    for (let turn = 1; turn <= 15; turn++) {
      expect(generateOpponent(turn, turn * 13).length).toBeLessThanOrEqual(CONFIG.boardMax);
    }
  });
});
