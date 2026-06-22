// ============================================================================
// harness.ts — Dev sanity harness (NOT shipped; run with `npm run harness`).
//
// Runs resolveBattle on hardcoded teams and prints the event log as readable
// text, so combat can be eyeballed before any real UI exists (DESIGN.md §12 M1).
// ============================================================================

import { resolveBattle, buildTeam, type InstanceOptions } from './battle';
import { generateOpponent } from './opponent';
import { getMonsterDef } from './data/monsters';
import type { BattleEvent, MonsterInstance, Team } from './types';

const e = (id: string, opts: InstanceOptions = {}) => ({ def: getMonsterDef(id), ...opts });

// ---- pretty printing -------------------------------------------------------

function nameMap(teamA: Team, teamB: Team, log: BattleEvent[]): Map<string, string> {
  const map = new Map<string, string>();
  const label = (m: MonsterInstance) => `${m.name} ${m.type[0].toUpperCase()}(${m.atk}/${m.hp})`;
  for (const m of [...teamA, ...teamB]) map.set(m.instanceId, label(m));
  for (const ev of log) if (ev.kind === 'summon') map.set(ev.token.instanceId, `${ev.token.name} (token)`);
  return map;
}

function rosterLine(team: Team): string {
  return team.map((m) => `${m.name}[${m.type}] ${m.atk}/${m.hp}${m.shield ? ` 🛡${m.shield}` : ''}`).join('  ·  ');
}

function formatEvent(ev: BattleEvent, n: (id: string) => string): string {
  switch (ev.kind) {
    case 'startOfBattle':
      return '— start of battle —';
    case 'ability':
      return `  ★ ${ev.description}`;
    case 'attack':
      return `  ${n(ev.attacker)} ⚔ ${n(ev.target)}`;
    case 'damage':
      return `     → ${n(ev.target)} takes ${ev.amount} ${ev.type}${ev.shielded ? ` (${ev.shielded} shielded)` : ''}`;
    case 'buff':
      return `     ✚ ${n(ev.target)} gains ${sign(ev.atk)}/${sign(ev.hp)}`;
    case 'heal':
      return `     ♥ ${n(ev.target)} heals ${ev.amount}`;
    case 'shieldGain':
      return `     🛡 ${n(ev.target)} +${ev.amount} shield`;
    case 'faint':
      return `  ☠ ${n(ev.target)} faints`;
    case 'summon':
      return `  ✦ summon ${n(ev.token.instanceId)} at slot ${ev.atIndex}`;
    case 'end':
      return `\n=== Result: ${ev.winner === 'draw' ? 'DRAW' : `Team ${ev.winner} wins`} ===`;
  }
}

const sign = (x: number) => (x >= 0 ? `+${x}` : `${x}`);

function runDemo(title: string, teamA: Team, teamB: Team, seed: number): void {
  const { winner, eventLog } = resolveBattle(teamA, teamB, seed);
  const map = nameMap(teamA, teamB, eventLog);
  const n = (id: string) => map.get(id) ?? id;

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`▶ ${title}   (seed ${seed})`);
  console.log(`${'═'.repeat(72)}`);
  console.log(`Team A: ${rosterLine(teamA)}`);
  console.log(`Team B: ${rosterLine(teamB)}`);
  console.log('-'.repeat(72));
  for (const ev of eventLog) console.log(formatEvent(ev, n));
  console.log(`\n(winner: ${winner}, ${eventLog.length} events)`);
}

// ---- demos -----------------------------------------------------------------

// 1) Two hardcoded teams with a spread of triggers.
runDemo(
  'Hardcoded: Fire/Nature rush vs Earth/Water wall',
  buildTeam([e('cinderpup'), e('emberling'), e('sprout'), e('magmaw')], 'A'),
  buildTeam([e('terrapex'), e('tidepup'), e('krakenling'), e('boulderpup')], 'B'),
  7,
);

// 2) A hardcoded team vs a procedurally generated opponent (turn 6).
runDemo(
  'Hardcoded team vs generated opponent (turn 6)',
  buildTeam([e('bloomtail'), e('thornback'), e('pebbling'), e('dewdrop'), e('magmaw')], 'A'),
  generateOpponent(6, 31337),
  3,
);
