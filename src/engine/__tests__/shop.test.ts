import { describe, it, expect } from 'vitest';
import {
  createRun,
  reroll,
  buyMonster,
  buyItemOnto,
  sellMonster,
  moveMonster,
  nextTurn,
  toggleFreezeMonster,
  getTeam,
} from '../shop';
import { makeInstance } from '../battle';
import { getMonsterDef } from '../data/monsters';
import { getItemDef } from '../data/items';
import { CONFIG, maxTierForTurn } from '../config';
import type { GameState } from '../types';

const SEED = 1;

/** A run whose team has been hand-set for a focused test. */
function withTeam(ids: (string | null)[]): GameState {
  const base = createRun(SEED);
  const team = base.team.slice();
  ids.forEach((id, i) => {
    team[i] = id ? makeInstance(getMonsterDef(id), `t${i + 1}`) : null;
  });
  return { ...base, team };
}

describe('createRun', () => {
  it('starts with the configured lives/gold/trophies and an empty team', () => {
    const s = createRun(SEED);
    expect(s.gold).toBe(CONFIG.startingGold);
    expect(s.lives).toBe(CONFIG.startingLives);
    expect(s.trophies).toBe(0);
    expect(s.turn).toBe(1);
    expect(s.team).toHaveLength(CONFIG.benchMax);
    expect(getTeam(s)).toHaveLength(0);
  });

  it('rolls a full shop, gated to Tier 1 on turn 1', () => {
    const s = createRun(SEED);
    expect(s.shop.monsterSlots.filter(Boolean)).toHaveLength(CONFIG.shopMonsterSlots);
    expect(s.shop.itemSlots.filter(Boolean)).toHaveLength(CONFIG.shopItemSlots);
    for (const m of s.shop.monsterSlots) expect(m!.tier).toBe(1);
  });

  it('is deterministic for a given seed', () => {
    expect(JSON.stringify(createRun(99))).toBe(JSON.stringify(createRun(99)));
  });
});

describe('buying & selling', () => {
  it('buys a monster: −cost gold, monster on team, shop slot cleared', () => {
    const s0 = createRun(SEED);
    const s1 = buyMonster(s0, 0);
    expect(s1.gold).toBe(CONFIG.startingGold - CONFIG.monsterCost);
    expect(getTeam(s1)).toHaveLength(1);
    expect(s1.team[0]!.speciesId).toBe(s0.shop.monsterSlots[0]!.id);
    expect(s1.shop.monsterSlots[0]).toBeNull();
  });

  it('refuses to buy when broke', () => {
    const s0 = { ...createRun(SEED), gold: 2 };
    expect(buyMonster(s0, 0)).toBe(s0); // unchanged reference
  });

  it('refuses to buy when the team is full (5)', () => {
    const full = withTeam(['emberling', 'pebbling', 'sprout', 'dewdrop', 'magmaw']);
    const after = buyMonster(full, 0);
    expect(getTeam(after)).toHaveLength(5);
    expect(after.gold).toBe(full.gold); // no spend
  });

  it('sells a monster for the refund', () => {
    const s = withTeam(['emberling']);
    const sold = sellMonster(s, 0);
    expect(sold.team[0]).toBeNull();
    expect(sold.gold).toBe(s.gold + CONFIG.sellRefund);
  });

  it('applies a bought item (Berry +1/+1) to the chosen monster', () => {
    const s = withTeam(['emberling']); // 2/1
    const id = s.team[0]!.instanceId;
    // Force a known Berry into item slot 0 for a deterministic assertion.
    const withBerry: GameState = {
      ...s,
      shop: {
        ...s.shop,
        itemSlots: [getItemDef('berry'), s.shop.itemSlots[1]],
      },
    };
    const after = buyItemOnto(withBerry, 0, id);
    expect(after.team[0]!.atk).toBe(3); // 2 + 1
    expect(after.team[0]!.maxHp).toBe(2); // 1 + 1
    expect(after.gold).toBe(s.gold - CONFIG.itemCost);
  });
});

describe('merging & arranging', () => {
  it('merges same-species into a higher level with +1/+1 per level', () => {
    const s = withTeam(['emberling', 'emberling']); // both 2/1, lvl1
    const base = s.team[0]!;
    const merged = moveMonster(s, 1, 0);
    expect(merged.team[0]!.level).toBe(2);
    expect(merged.team[0]!.atk).toBe(base.atk + CONFIG.level.atkPerLevel);
    expect(merged.team[0]!.maxHp).toBe(base.maxHp + CONFIG.level.hpPerLevel);
    expect(merged.team[1]).toBeNull();
  });

  it('swaps two different species when moved onto each other', () => {
    const s = withTeam(['emberling', null, 'pebbling']);
    const moved = moveMonster(s, 0, 2);
    expect(moved.team[0]!.speciesId).toBe('pebbling');
    expect(moved.team[2]!.speciesId).toBe('emberling');
  });

  it('moves into an empty slot', () => {
    const s = withTeam(['emberling']);
    const moved = moveMonster(s, 0, 3);
    expect(moved.team[0]).toBeNull();
    expect(moved.team[3]!.speciesId).toBe('emberling');
  });
});

describe('reroll & freeze', () => {
  it('reroll costs 1 gold and advances the RNG', () => {
    const s0 = createRun(SEED);
    const s1 = reroll(s0);
    expect(s1.gold).toBe(s0.gold - CONFIG.rerollCost);
    expect(s1.seed).not.toBe(s0.seed);
  });

  it('a frozen monster slot survives a reroll', () => {
    const s0 = createRun(SEED);
    const frozen = toggleFreezeMonster(s0, 0);
    const kept = s0.shop.monsterSlots[0];
    const s1 = reroll(frozen);
    expect(s1.shop.monsterSlots[0]).toBe(kept);
    expect(s1.shop.frozenMonsters[0]).toBe(true);
  });
});

describe('turn flow', () => {
  it('nextTurn advances the turn, resets gold to 10, and re-rolls', () => {
    const spent = buyMonster(createRun(SEED), 0); // gold 7
    const t2 = nextTurn(spent);
    expect(t2.turn).toBe(2);
    expect(t2.gold).toBe(CONFIG.startingGold);
  });

  it('honors the tier schedule across turns', () => {
    let s = createRun(SEED);
    for (let target = 2; target <= 6; target++) s = nextTurn(s);
    expect(s.turn).toBe(6);
    for (const m of s.shop.monsterSlots) {
      expect(m!.tier).toBeLessThanOrEqual(maxTierForTurn(s.turn));
    }
  });
});
