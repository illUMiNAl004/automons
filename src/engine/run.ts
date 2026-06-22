// ============================================================================
// run.ts — Run-loop outcome logic (DESIGN.md §1). Pure.
//
// After a battle: Win → +1 trophy, Loss → −1 life, Draw → nothing. Then check
// the run end conditions: 10 trophies → won, 0 lives → lost. Otherwise the run
// continues (the UI then advances to the next shop turn).
// ============================================================================

import type { BattleWinner, GameState, RunPhase } from './types';
import { CONFIG } from './config';

/**
 * Apply a battle result to the run. `'A'` = the player won, `'B'` = the bot
 * won, `'draw'` = nothing changes. Returns the post-battle state with the
 * `phase` set to 'won' / 'lost' (game over) or 'result' (keep playing).
 */
export function applyOutcome(state: GameState, winner: BattleWinner): GameState {
  const trophies = winner === 'A' ? Math.min(CONFIG.winTrophies, state.trophies + 1) : state.trophies;
  const lives = winner === 'B' ? Math.max(0, state.lives - 1) : state.lives;

  let phase: RunPhase = 'result';
  if (trophies >= CONFIG.winTrophies) phase = 'won';
  else if (lives <= 0) phase = 'lost';

  return { ...state, trophies, lives, lastResult: winner, phase };
}

/** True once the run has ended either way. */
export function isRunOver(state: GameState): boolean {
  return state.phase === 'won' || state.phase === 'lost';
}
