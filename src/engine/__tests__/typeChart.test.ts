import { describe, it, expect } from 'vitest';
import { typeMult, computeDamage } from '../typeChart';
import type { ElementType } from '../types';

// The full 4×4 expectation matrix straight from DESIGN.md §2.
const EXPECTED: Record<ElementType, Record<ElementType, number>> = {
  fire: { fire: 1.0, nature: 1.5, water: 1.0, earth: 0.5 },
  nature: { fire: 0.5, nature: 1.0, water: 1.5, earth: 1.0 },
  water: { fire: 1.0, nature: 0.5, water: 1.0, earth: 1.5 },
  earth: { fire: 1.5, nature: 1.0, water: 0.5, earth: 1.0 },
};

const TYPES: ElementType[] = ['fire', 'nature', 'water', 'earth'];

describe('typeMult — all 16 matchups (DESIGN.md §2)', () => {
  for (const atk of TYPES) {
    for (const def of TYPES) {
      it(`${atk} → ${def} = ×${EXPECTED[atk][def]}`, () => {
        expect(typeMult(atk, def)).toBe(EXPECTED[atk][def]);
      });
    }
  }

  it('forms a clean cycle: each type is strong vs exactly one, weak vs exactly one', () => {
    for (const atk of TYPES) {
      const mults = TYPES.map((d) => typeMult(atk, d));
      expect(mults.filter((m) => m === 1.5).length).toBe(1); // strong vs one
      expect(mults.filter((m) => m === 0.5).length).toBe(1); // weak vs one
      expect(mults.filter((m) => m === 1.0).length).toBe(2); // neutral vs two (self + opposite)
    }
  });
});

describe('computeDamage — multiplier, round-to-nearest, min 1', () => {
  it('strong hit rounds up (2 fire → nature = 3)', () => {
    expect(computeDamage(2, 'fire', 'nature')).toBe(3); // 2 × 1.5
  });
  it('round-half-up (3 fire → nature = 5)', () => {
    expect(computeDamage(3, 'fire', 'nature')).toBe(5); // 4.5 → 5
  });
  it('weak hit rounds (3 fire → earth = 2)', () => {
    expect(computeDamage(3, 'fire', 'earth')).toBe(2); // 1.5 → 2
  });
  it('weak hit clamps to minimum 1 (1 nature → fire = 1)', () => {
    expect(computeDamage(1, 'nature', 'fire')).toBe(1); // 0.5 → 1, min 1
  });
  it('neutral is unchanged (4 water → fire = 4)', () => {
    expect(computeDamage(4, 'water', 'fire')).toBe(4);
  });
  it('never deals 0 even with 0 raw', () => {
    expect(computeDamage(0, 'fire', 'fire')).toBe(1);
  });
});
