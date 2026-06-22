// ============================================================================
// data/items.ts — The 3 MVP items / food (DESIGN.md §8).
//
// Items are bought in the shop and applied to a chosen monster. Stat buffs are
// PERMANENT for the run; `shell` grants shield at the start of each battle.
// ============================================================================

import type { ItemDef } from '../types';

export const ITEMS: ItemDef[] = [
  {
    id: 'berry', name: 'Berry', cost: 3,
    effect: { kind: 'permanentBuff', atk: 1, hp: 1 },
    description: '+1/+1 permanently',
  },
  {
    id: 'meat', name: 'Raw Meat', cost: 3,
    effect: { kind: 'permanentBuff', atk: 2, hp: 0 },
    description: '+2/+0 permanently',
  },
  {
    id: 'shell', name: 'Sturdy Shell', cost: 3,
    effect: { kind: 'startingShield', amount: 2 },
    description: 'Starts each battle with 2 shield',
  },
];

const BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function getItemDef(id: string): ItemDef {
  const def = BY_ID[id];
  if (!def) throw new Error(`Unknown item id: ${id}`);
  return def;
}
