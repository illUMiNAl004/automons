// ============================================================================
// rng.ts — The ONE seeded PRNG. ALL randomness in the engine flows through here
// (DESIGN.md §4, §11). No `Math.random()` anywhere else in src/engine.
//
// Algorithm: mulberry32 — tiny, fast, good distribution, fully deterministic.
// Same seed ⇒ same sequence ⇒ same battle ⇒ testable + future ghost replay.
// ============================================================================

export interface RNG {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Pick a uniformly-random element (throws on empty array). */
  pick<T>(arr: readonly T[]): T;
  /** Return a new array that is a seeded Fisher–Yates shuffle of `arr`. */
  shuffle<T>(arr: readonly T[]): T[];
  /** Current internal state (lets callers snapshot/derive sub-seeds). */
  state(): number;
}

/**
 * Create a seeded RNG. `seed` is coerced to a 32-bit integer.
 * The returned object holds mutable internal state.
 */
export function makeRng(seed: number): RNG {
  let a = seed >>> 0;

  function next(): number {
    // mulberry32
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(next() * maxExclusive);
  }

  function pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('rng.pick: empty array');
    return arr[int(arr.length)];
  }

  function shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  return {
    next,
    int,
    pick,
    shuffle,
    state: () => a >>> 0,
  };
}
