// ============================================================================
// opponent.ts — generateOpponent(turn, seed) (DESIGN.md §10).
//
// No multiplayer: each round we synthesize a bot team scaled to the turn.
// Deterministic — same (turn, seed) ⇒ same team — via the one seeded RNG.
//
// Budget grows with the turn; we keep buying random unlocked monsters until the
// budget or the 5-slot board runs out. Light stat/item scaling at higher turns.
// ============================================================================

import type { ItemDef, MonsterDef, Team } from './types';
import { CONFIG, maxTierForTurn } from './config';
import { BASE_MONSTERS } from './data/monsters';
import { ITEMS } from './data/items';
import { makeRng } from './rng';
import { buildTeam, type InstanceOptions } from './battle';

type Entry = { def: MonsterDef } & InstanceOptions;

export function generateOpponent(turn: number, seed: number): Team {
  // Mix the turn into the seed so consecutive turns aren't correlated.
  const rng = makeRng((seed ^ (turn * 0x9e3779b1)) >>> 0);

  const maxTier = maxTierForTurn(turn);
  const pool = BASE_MONSTERS.filter((m) => m.tier <= maxTier);

  let budget = CONFIG.opponent.baseBudget + turn * CONFIG.opponent.budgetPerTurn;
  const entries: Entry[] = [];

  // Buy random monsters into random positions until budget/board is exhausted.
  while (budget >= CONFIG.opponent.monsterValue && entries.length < CONFIG.boardMax) {
    const def = rng.pick(pool);
    const pos = rng.int(entries.length + 1); // random insertion slot
    entries.splice(pos, 0, { def });
    budget -= CONFIG.opponent.monsterValue;
  }

  // Light scaling: from a certain turn, hand out +1/+1 to one or two members.
  if (turn >= CONFIG.opponent.buffFromTurn && entries.length > 0) {
    const count = 1 + rng.int(2); // 1 or 2
    for (let i = 0; i < count; i++) {
      const e = rng.pick(entries);
      e.bonusAtk = (e.bonusAtk ?? 0) + CONFIG.opponent.randomBuffAtk;
      e.bonusHp = (e.bonusHp ?? 0) + CONFIG.opponent.randomBuffHp;
    }
  }

  // Even lighter scaling: from a later turn, give one member a random item.
  if (turn >= CONFIG.opponent.itemFromTurn && entries.length > 0) {
    applyItem(rng.pick(entries), rng.pick(ITEMS));
  }

  return buildTeam(entries, 'B');
}

function applyItem(entry: Entry, item: ItemDef): void {
  if (item.effect.kind === 'permanentBuff') {
    entry.bonusAtk = (entry.bonusAtk ?? 0) + item.effect.atk;
    entry.bonusHp = (entry.bonusHp ?? 0) + item.effect.hp;
  } else {
    entry.startShield = (entry.startShield ?? 0) + item.effect.amount;
  }
}
