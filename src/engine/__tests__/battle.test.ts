import { describe, it, expect } from 'vitest';
import { resolveBattle, buildTeam, type InstanceOptions } from '../battle';
import { getMonsterDef } from '../data/monsters';
import type { BattleEvent, Team } from '../types';

// --- tiny helpers ---------------------------------------------------------
type Entry = { def: ReturnType<typeof getMonsterDef> } & InstanceOptions;
const e = (id: string, opts: InstanceOptions = {}): Entry => ({ def: getMonsterDef(id), ...opts });
const teamA = (...entries: Entry[]): Team => buildTeam(entries, 'A');
const teamB = (...entries: Entry[]): Team => buildTeam(entries, 'B');

const abilities = (log: BattleEvent[]) => log.filter((e) => e.kind === 'ability');
const buffs = (log: BattleEvent[]) => log.filter((e) => e.kind === 'buff');
const summons = (log: BattleEvent[]) => log.filter((e) => e.kind === 'summon');

const SEED = 42;

describe('resolveBattle — hand-checked battles (DESIGN.md §5)', () => {
  it('mirror match of vanilla 1/1 tokens is a simultaneous draw', () => {
    const { winner, eventLog } = resolveBattle(teamA(e('sapling')), teamB(e('sapling')), SEED);
    expect(winner).toBe('draw');
    expect(eventLog.at(-1)).toEqual({ kind: 'end', winner: 'draw' });
    // both fainted
    expect(eventLog.filter((ev) => ev.kind === 'faint').length).toBe(2);
  });

  it('Pebbling (shield + neutral) beats a Sapling and survives', () => {
    // Pebbling 1/2 gains 2 shield at start; trades 1-for-1 but soaks the hit.
    const { winner, eventLog } = resolveBattle(teamA(e('pebbling')), teamB(e('sapling')), SEED);
    expect(winner).toBe('A');
    // its startOfBattle shield fired
    expect(eventLog.some((ev) => ev.kind === 'shieldGain' && ev.amount === 2)).toBe(true);
  });

  it('Cinderpup one-shots the strongest enemy at start; Sprout still summons a Sapling', () => {
    // Cinderpup deals 2 Fire ×1.5 = 3 to Sprout (2hp) → faints → Sprout summons sapling.
    const { winner, eventLog } = resolveBattle(teamA(e('cinderpup')), teamB(e('sprout')), SEED);
    expect(winner).toBe('A');
    // a sapling token entered the board
    const s = summons(eventLog);
    expect(s.length).toBe(1);
    expect(s[0].kind === 'summon' && s[0].token.speciesId).toBe('sapling');
    // Cinderpup's startOfBattle ability is logged
    expect(abilities(eventLog).some((a) => a.kind === 'ability' && a.trigger === 'startOfBattle')).toBe(true);
  });

  it("Bloomtail's anthem buffs OTHER friends only (not itself)", () => {
    // teamA = [Bloomtail 'A0', Sapling 'A1']. allFriends excludes self → only A1 buffed.
    const { winner, eventLog } = resolveBattle(
      teamA(e('bloomtail'), e('sapling')),
      teamB(e('sapling')),
      SEED,
    );
    expect(winner).toBe('A');
    const anthem = buffs(eventLog);
    expect(anthem.length).toBeGreaterThanOrEqual(1);
    // every anthem buff targets the friend (A1), never Bloomtail (A0)
    expect(anthem.every((b) => b.kind === 'buff' && b.target === 'A1')).toBe(true);
    expect(anthem.some((b) => b.kind === 'buff' && b.target === 'A0')).toBe(false);
  });

  it('Thornback thorns kill a chip attacker via onHurt', () => {
    // Thornback 3/3 vs Pebbling 1/2 (+2 shield). Pebbling chips 1 to Thornback,
    // Thornback survives and reflects 1 Nature back → kills Pebbling.
    const { winner, eventLog } = resolveBattle(teamA(e('thornback')), teamB(e('pebbling')), SEED);
    expect(winner).toBe('A');
    expect(abilities(eventLog).some((a) => a.kind === 'ability' && a.trigger === 'onHurt')).toBe(true);
  });

  it("Krakenling's onFaint AoE fires when it dies with enemies left", () => {
    // Krakenling trades into Cinderpup and dies; its dying 3 Water AoE wipes the
    // two Saplings behind. Everyone dies → draw, but the AoE is on the log.
    const { winner, eventLog } = resolveBattle(
      teamA(e('krakenling')),
      teamB(e('cinderpup'), e('sapling'), e('sapling')),
      SEED,
    );
    const onFaintAoE = abilities(eventLog).some(
      (a) => a.kind === 'ability' && a.trigger === 'onFaint',
    );
    expect(onFaintAoE).toBe(true);
    expect(winner).toBe('draw');
    // plenty of water damage events (the attack + the 3-target splash)
    const waterHits = eventLog.filter((ev) => ev.kind === 'damage' && ev.type === 'water').length;
    expect(waterHits).toBeGreaterThanOrEqual(3);
  });
});

describe('resolveBattle — determinism (DESIGN.md §4, §11)', () => {
  const a = teamA(e('cinderpup'), e('krakenling'), e('thornback'), e('magmaw'));
  const b = teamB(e('bloomtail'), e('boulderpup'), e('terrapex'), e('dewdrop'), e('tidepup'));

  it('same teams + same seed ⇒ byte-identical event log', () => {
    const r1 = resolveBattle(a, b, 12345);
    const r2 = resolveBattle(a, b, 12345);
    expect(r2.winner).toBe(r1.winner);
    expect(JSON.stringify(r2.eventLog)).toBe(JSON.stringify(r1.eventLog));
  });

  it('does not mutate the input teams (pure)', () => {
    const before = JSON.stringify(a);
    resolveBattle(a, b, 777);
    expect(JSON.stringify(a)).toBe(before);
  });

  it('the seed actually matters: different seeds can diverge', () => {
    // A battle with random-target abilities should vary across seeds.
    const logs = [1, 2, 3, 4, 5].map((s) => JSON.stringify(resolveBattle(a, b, s).eventLog));
    expect(new Set(logs).size).toBeGreaterThan(1);
  });

  it('every battle terminates with a single end event', () => {
    const { eventLog } = resolveBattle(a, b, 999);
    expect(eventLog.filter((ev) => ev.kind === 'end').length).toBe(1);
  });
});
