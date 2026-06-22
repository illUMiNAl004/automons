// ============================================================================
// store.tsx — The UI's single GameState, updated via a reducer that delegates
// to the PURE engine (src/engine/shop.ts). The UI is a function of this state.
//
// The engine never touches React; this file never touches game rules. Every
// action maps 1:1 to a pure engine function, so the UI can't desync from logic.
// ============================================================================

import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { GameState } from '../../engine/types';
import {
  createRun,
  buyMonster,
  buyItemOnto,
  sellMonster,
  moveMonster,
  reroll,
  toggleFreezeMonster,
  toggleFreezeItem,
  nextTurn,
} from '../../engine/shop';
import { makeInstance } from '../../engine/battle';
import { getMonsterDef } from '../../engine/data/monsters';

export type GameAction =
  | { type: 'BUY_MONSTER'; slot: number; targetIndex?: number }
  | { type: 'BUY_ITEM'; slot: number; targetId: string }
  | { type: 'SELL'; index: number }
  | { type: 'MOVE'; from: number; to: number }
  | { type: 'REROLL' }
  | { type: 'FREEZE_MONSTER'; slot: number }
  | { type: 'FREEZE_ITEM'; slot: number }
  | { type: 'NEXT_TURN' }
  | { type: 'RESET'; seed: number };

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'BUY_MONSTER':
      return buyMonster(state, action.slot, action.targetIndex);
    case 'BUY_ITEM':
      return buyItemOnto(state, action.slot, action.targetId);
    case 'SELL':
      return sellMonster(state, action.index);
    case 'MOVE':
      return moveMonster(state, action.from, action.to);
    case 'REROLL':
      return reroll(state);
    case 'FREEZE_MONSTER':
      return toggleFreezeMonster(state, action.slot);
    case 'FREEZE_ITEM':
      return toggleFreezeItem(state, action.slot);
    case 'NEXT_TURN':
      return nextTurn(state);
    case 'RESET':
      return createRun(action.seed);
  }
}

/** Bound action creators — a thin, stable wrapper over dispatch. */
export interface GameActions {
  buyMonster: (slot: number, targetIndex?: number) => void;
  buyItem: (slot: number, targetId: string) => void;
  sell: (index: number) => void;
  move: (from: number, to: number) => void;
  reroll: () => void;
  freezeMonster: (slot: number) => void;
  freezeItem: (slot: number) => void;
  nextTurn: () => void;
  reset: () => void;
}

interface GameContextValue {
  state: GameState;
  actions: GameActions;
}

const GameContext = createContext<GameContextValue | null>(null);

// UI-side randomness is fine (only the ENGINE must be deterministic-by-seed).
const freshSeed = () => Math.floor(Math.random() * 1_000_000_000);

/** Initial state, with an optional dev-only `?demo` curated team for previews. */
function initialState(): GameState {
  const base = createRun(freshSeed());
  if (typeof window !== 'undefined' && window.location.search.includes('demo')) {
    return demoState(base);
  }
  return base;
}

/** Dev-only: a hand-built team showing every element, a level-2 merge, a shield. */
function demoState(base: GameState): GameState {
  const mk = (id: string, n: number, opts?: Parameters<typeof makeInstance>[2]) =>
    makeInstance(getMonsterDef(id), `demo-${n}`, opts);
  return {
    ...base,
    turn: 3,
    gold: 7,
    trophies: 2,
    team: [
      mk('cinderpup', 0, { level: 2 }), // fire, leveled (⭐)
      mk('dewdrop', 1, { startShield: 2 }), // water, shield from Shell
      mk('sprout', 2, { bonusAtk: 2 }), // nature, Raw Meat buff
      mk('boulderpup', 3), // earth
      mk('magmaw', 4), // fire
    ],
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, 0, initialState);

  const actions = useMemo<GameActions>(
    () => ({
      buyMonster: (slot, targetIndex) => dispatch({ type: 'BUY_MONSTER', slot, targetIndex }),
      buyItem: (slot, targetId) => dispatch({ type: 'BUY_ITEM', slot, targetId }),
      sell: (index) => dispatch({ type: 'SELL', index }),
      move: (from, to) => dispatch({ type: 'MOVE', from, to }),
      reroll: () => dispatch({ type: 'REROLL' }),
      freezeMonster: (slot) => dispatch({ type: 'FREEZE_MONSTER', slot }),
      freezeItem: (slot) => dispatch({ type: 'FREEZE_ITEM', slot }),
      nextTurn: () => dispatch({ type: 'NEXT_TURN' }),
      reset: () => dispatch({ type: 'RESET', seed: freshSeed() }),
    }),
    [],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within <GameProvider>');
  return ctx;
}
