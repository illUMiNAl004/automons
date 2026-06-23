// ============================================================================
// store.tsx — The UI's single GameState, updated via a reducer that delegates
// to the PURE engine (shop.ts / run.ts). The UI is a function of this state.
//
// The engine never touches React; this file never touches game rules. A small
// transient `battle` session (player team + opponent + precomputed event log)
// lives alongside the reducer while the battle animation plays.
// ============================================================================

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { BattleResult, GameState, MonsterInstance, RunPhase } from '../../engine/types';
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
  getTeam,
} from '../../engine/shop';
import { makeInstance, resolveBattle } from '../../engine/battle';
import { generateOpponent } from '../../engine/opponent';
import { applyOutcome } from '../../engine/run';
import { getMonsterDef } from '../../engine/data/monsters';

export type GameAction =
  | { type: 'BUY_MONSTER'; slot: number; targetIndex?: number }
  | { type: 'BUY_ITEM'; slot: number; targetId: string }
  | { type: 'SELL'; index: number }
  | { type: 'MOVE'; from: number; to: number }
  | { type: 'REROLL' }
  | { type: 'FREEZE_MONSTER'; slot: number }
  | { type: 'FREEZE_ITEM'; slot: number }
  | { type: 'SET_PHASE'; phase: RunPhase }
  | { type: 'RESOLVE_BATTLE'; winner: BattleResult['winner'] }
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
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'RESOLVE_BATTLE': {
      const out = applyOutcome(state, action.winner);
      // Keep playing → roll into the next shop turn. Game over → stop on won/lost.
      return out.phase === 'result' ? nextTurn(out) : out;
    }
    case 'RESET':
      return createRun(action.seed);
  }
}

/** Transient battle data, present only while phase === 'battle'. */
export interface BattleSession {
  playerTeam: MonsterInstance[];
  opponent: MonsterInstance[];
  result: BattleResult;
}

export interface GameActions {
  buyMonster: (slot: number, targetIndex?: number) => void;
  buyItem: (slot: number, targetId: string) => void;
  sell: (index: number) => void;
  move: (from: number, to: number) => void;
  reroll: () => void;
  freezeMonster: (slot: number) => void;
  freezeItem: (slot: number) => void;
  /** Leave the title screen and begin the run (reveal the shop). */
  startRun: () => void;
  /** Generate an opponent, simulate the fight, and enter the battle phase. */
  startBattle: () => void;
  /** Apply the battle outcome and advance (next shop turn, or win/lose). */
  finishBattle: () => void;
  reset: () => void;
}

interface GameContextValue {
  state: GameState;
  battle: BattleSession | null;
  actions: GameActions;
}

const GameContext = createContext<GameContextValue | null>(null);

// UI-side randomness is fine (only the ENGINE must be deterministic-by-seed).
const freshSeed = () => Math.floor(Math.random() * 1_000_000_000);

function initialState(): GameState {
  const base = createRun(freshSeed());
  if (typeof window !== 'undefined' && window.location.search.includes('demo')) {
    return demoState(base); // demo jumps straight to the shop for screenshots
  }
  return { ...base, phase: 'title' }; // first load shows the title screen
}

/** Dev-only: a hand-built team showing evolution progress, an evolved form, a shield. */
function demoState(base: GameState): GameState {
  const mk = (id: string, n: number, opts?: Parameters<typeof makeInstance>[2]) =>
    makeInstance(getMonsterDef(id), `demo-${n}`, opts);
  return {
    ...base,
    turn: 3,
    gold: 7,
    trophies: 2,
    team: [
      mk('cinderpup', 0, { copies: 2 }), // real art, 2/3 evolution progress
      mk('emberling', 1), // real art
      mk('magmaw', 2, { startShield: 2 }), // real art + a Shell shield
      mk('cinderhound', 3), // evolved form (still emoji until art lands)
      mk('cinderpup', 4), // a duplicate — drag onto slot 0 to evolve
    ],
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, 0, initialState);
  const [battle, setBattle] = useState<BattleSession | null>(null);

  // Refs to read the latest values inside stable action callbacks.
  const stateRef = useRef(state);
  stateRef.current = state;
  const battleRef = useRef(battle);
  battleRef.current = battle;

  const actions = useMemo<GameActions>(
    () => ({
      buyMonster: (slot, targetIndex) => dispatch({ type: 'BUY_MONSTER', slot, targetIndex }),
      buyItem: (slot, targetId) => dispatch({ type: 'BUY_ITEM', slot, targetId }),
      sell: (index) => dispatch({ type: 'SELL', index }),
      move: (from, to) => dispatch({ type: 'MOVE', from, to }),
      reroll: () => dispatch({ type: 'REROLL' }),
      freezeMonster: (slot) => dispatch({ type: 'FREEZE_MONSTER', slot }),
      freezeItem: (slot) => dispatch({ type: 'FREEZE_ITEM', slot }),
      startRun: () => dispatch({ type: 'SET_PHASE', phase: 'shop' }),
      startBattle: () => {
        const s = stateRef.current;
        const playerTeam = getTeam(s);
        if (playerTeam.length === 0) return; // need at least one pet
        const opponent = generateOpponent(s.turn, s.seed);
        const result = resolveBattle(playerTeam, opponent, s.seed);
        setBattle({ playerTeam, opponent, result });
        dispatch({ type: 'SET_PHASE', phase: 'battle' });
      },
      finishBattle: () => {
        const b = battleRef.current;
        if (!b) return;
        dispatch({ type: 'RESOLVE_BATTLE', winner: b.result.winner });
        setBattle(null);
      },
      reset: () => {
        setBattle(null);
        dispatch({ type: 'RESET', seed: freshSeed() });
      },
    }),
    [],
  );

  const value = useMemo(() => ({ state, battle, actions }), [state, battle, actions]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within <GameProvider>');
  return ctx;
}
