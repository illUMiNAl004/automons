# DESIGN.md — "Automons"

A single-player, browser-based **creature-collector auto-battler**. Super Auto Pets' shop-and-auto-battle loop, wrapped in a Pokémon-style monster/type skin. No multiplayer. You play against procedurally generated bot teams that scale in strength each round.

This document is the source of truth for mechanics, content, and architecture. Build to this.

---

## 1. Core Loop

A **run** is a sequence of turns:

1. **Shop phase** — you have 10 gold. Buy monsters, buy items, position your team, sell, reroll, freeze slots.
2. **Battle phase** — press **Fight**. Your team auto-battles a generated opponent. No input during the fight.
3. **Result** — Win → +1 trophy. Loss → −1 life. Draw → nothing changes.
4. Repeat.

**Win the run:** reach **10 trophies**.
**Lose the run:** drop to **0 lives**.
Start each run with **5 lives** and **0 trophies**.

(All numbers in this doc are tunable constants — keep them in one `config.ts`.)

---

## 2. The Four Element Types

Exactly four types. They form a single clean cycle — each type is **strong vs the next**, **weak vs the previous**, and **neutral vs its opposite**.

**Cycle: Fire → Nature → Water → Earth → Fire**
- 🔥 **Fire** beats 🌿 Nature (burns it)
- 🌿 **Nature** beats 💧 Water (overgrows / drinks it)
- 💧 **Water** beats 🪨 Earth (erodes it)
- 🪨 **Earth** beats 🔥 Fire (smothers it)

### Type effectiveness matrix (attacker → defender = damage multiplier)

| Attacker ↓ \ Defender → | Fire | Nature | Water | Earth |
|---|---|---|---|---|
| **Fire** | ×1.0 | ×1.5 | ×1.0 | ×0.5 |
| **Nature** | ×0.5 | ×1.0 | ×1.5 | ×1.0 |
| **Water** | ×1.0 | ×0.5 | ×1.0 | ×1.5 |
| **Earth** | ×1.5 | ×1.0 | ×0.5 | ×1.0 |

Rules:
- **Strong = ×1.5, Weak = ×0.5, Neutral = ×1.0.**
- Apply the multiplier to the attacker's ATK, then **round to nearest**, **minimum 1 damage** on any direct attack.
- Typed *ability* damage (e.g. "deal 2 Fire damage") also uses this chart against the target's type.

---

## 3. Stats & Monster Anatomy

Every monster has:
- **`id`** — unique string (matches its art file `{id}.png`).
- **`name`** — display name.
- **`type`** — Fire | Nature | Water | Earth.
- **`tier`** — 1, 2, or 3 (shop unlock gating + cost).
- **`atk`** / **`hp`** — small integers (base range ~1–6).
- **`ability`** — one triggered effect (see §4). Some monsters can have `ability: null` (pure stat-stick) but in this roster all have one.

Stats are SAP-style small numbers so combat is readable.

---

## 4. Abilities (the "automatic" part)

Each ability = **a trigger + an effect**. The engine fires abilities automatically during battle (or shop, for shop triggers).

### Supported triggers (implement these)
- **`startOfBattle`** — once, when the battle begins, before any attacks.
- **`afterAttack`** — right after this monster performs its basic attack.
- **`onHurt`** — this monster took damage and survived.
- **`onFaint`** — this monster reached 0 HP and is being removed.
- **`onFriendFaint`** — an allied monster fainted.

(Optional later: `onSell`, `onBuy`, `startOfTurn` for shop-phase effects.)

### Supported effect verbs (a small composable vocabulary)
- **`dealDamage`** — deal N typed damage to a target (uses type chart). Targets: `frontEnemy`, `backEnemy`, `randomEnemy`, `strongestEnemy` (highest ATK), `weakestEnemy` (lowest HP), `enemyBehindTarget`, `attacker`, `allEnemies`.
- **`buff`** — give +ATK / +HP to a target. Targets: `self`, `friendAhead`, `friendBehind`, `randomFriend`, `allFriends`. Buffs from abilities are **temporary** (battle-only) unless stated; item buffs are **permanent**.
- **`heal`** — restore N HP to a target (cannot exceed max HP).
- **`shield`** — grant N shield to a target. Shield absorbs incoming damage before HP; depletes as it absorbs.
- **`summon`** — summon a token monster (e.g. a 1/1) into the fainted/empty slot or at the front if full-ish.

### Resolution & determinism rules
- **Seeded RNG.** All randomness (`randomEnemy`, tie-breaks, opponent generation) flows through one seeded PRNG. Same teams + same seed ⇒ identical battle every time. This is mandatory for testing (and future "ghost replay").
- **Trigger ordering.** When multiple abilities trigger from the same event (e.g. several `startOfBattle`), resolve them in **descending ATK order; ties broken by the seeded RNG.** Document this in code.
- **Simultaneous faints** are allowed; resolve both `onFaint`/`onFriendFaint` chains, then continue.

---

## 5. Combat Resolution (precise algorithm)

Two teams are ordered lists; **index 0 = front**. The engine simulates the entire battle and returns an **ordered event log** (see §6). The UI never computes combat — it only replays the log.

```
function resolveBattle(teamA, teamB, seed) -> { winner, eventLog }

1. Fire all startOfBattle abilities (descending ATK, RNG tiebreak). Log each effect.
2. Loop while both teams have >=1 monster:
   a. Let a = teamA.front, b = teamB.front.
   b. Both attack simultaneously:
        dmgToB = round(a.atk * typeMult(a.type, b.type)), min 1
        dmgToA = round(b.atk * typeMult(b.type, a.type)), min 1
        Apply shield-then-HP to each. Log attack + damage events.
   c. Fire afterAttack for a and b.
   d. Resolve faints: any monster with hp <= 0 is removed.
        For each fainting monster: fire onFaint, then allies' onFriendFaint.
        Resolve summons (token enters at the fainted index).
        Log faint/summon events.
   e. Survivors that took damage this step fire onHurt. Log.
3. End:
   - teamA empty & teamB empty -> draw
   - only one empty -> the other wins
4. Return winner + full eventLog.
```

Keep this function **pure** (no DOM, no React, no `Date.now()`/`Math.random()` — only the seeded RNG). Unit-test it heavily.

---

## 6. The Battle Event Log (key architecture)

`resolveBattle` returns an array of typed events the UI animates one-by-one. Example event shapes:

```ts
type BattleEvent =
  | { kind: 'startOfBattle' }
  | { kind: 'attack'; attacker: InstanceId; target: InstanceId }
  | { kind: 'damage'; target: InstanceId; amount: number; type: ElementType; shielded: number }
  | { kind: 'ability'; source: InstanceId; trigger: Trigger; description: string }
  | { kind: 'buff'; target: InstanceId; atk: number; hp: number }
  | { kind: 'heal'; target: InstanceId; amount: number }
  | { kind: 'shieldGain'; target: InstanceId; amount: number }
  | { kind: 'faint'; target: InstanceId }
  | { kind: 'summon'; token: MonsterInstance; atIndex: number }
  | { kind: 'end'; winner: 'A' | 'B' | 'draw' };
```

Each event carries enough info to animate (who, what, how much). `InstanceId` identifies a specific monster instance on the board (not the species id), so the UI can map events to on-screen cards.

**Why:** decouples logic from rendering, makes battles deterministic + testable, and turns animation into "iterate the log with delays." This pattern is non-negotiable.

---

## 7. Starter Roster (12 monsters, 3 per type)

These are demonstrative and balanced enough to start; tune later. All names/creatures are **original** (no Pokémon IP).

| id | Name | Type | Tier | ATK | HP | Ability |
|---|---|---|---|---|---|---|
| `emberling` | Emberling | Fire | 1 | 2 | 1 | **afterAttack:** deal 1 Fire dmg to `enemyBehindTarget` (splash) |
| `cinderpup` | Cinderpup | Fire | 1 | 3 | 2 | **startOfBattle:** deal 2 Fire dmg to `strongestEnemy` |
| `magmaw` | Magmaw | Fire | 3 | 4 | 4 | **onHurt:** gain +1 ATK (rage) |
| `dewdrop` | Dewdrop | Water | 1 | 1 | 3 | **onFriendFaint:** give +0/+1 to `randomFriend` |
| `tidepup` | Tidepup | Water | 2 | 2 | 4 | **startOfBattle:** give `friendAhead` 3 shield |
| `krakenling` | Krakenling | Water | 3 | 3 | 5 | **onFaint:** deal 3 Water dmg to `allEnemies` |
| `sprout` | Sprout | Nature | 1 | 2 | 2 | **onFaint:** summon a 1/1 `sapling` token |
| `thornback` | Thornback | Nature | 2 | 3 | 3 | **onHurt:** deal 1 Nature dmg to its `attacker` (thorns) |
| `bloomtail` | Bloomtail | Nature | 3 | 2 | 6 | **startOfBattle:** give `allFriends` +1/+1 (anthem) |
| `pebbling` | Pebbling | Earth | 1 | 1 | 2 | **startOfBattle:** gain 2 shield |
| `boulderpup` | Boulderpup | Earth | 2 | 4 | 3 | **onFaint:** give `friendBehind` +2 ATK |
| `terrapex` | Terrapex | Earth | 3 | 3 | 6 | **startOfBattle:** gain +0/+2 for each *other* Earth friend (mono-type payoff) |

**Tokens:** `sapling` (Nature, 1/1, no ability). Add a `bee` (1/1) if you implement Honey.

### Same data as TypeScript (lift directly into `src/engine/data/monsters.ts`)

```ts
export const MONSTERS: MonsterDef[] = [
  { id: 'emberling',  name: 'Emberling',  type: 'fire',   tier: 1, atk: 2, hp: 1,
    ability: { trigger: 'afterAttack', effect: { verb: 'dealDamage', amount: 1, dmgType: 'fire', target: 'enemyBehindTarget' } } },
  { id: 'cinderpup',  name: 'Cinderpup',  type: 'fire',   tier: 1, atk: 3, hp: 2,
    ability: { trigger: 'startOfBattle', effect: { verb: 'dealDamage', amount: 2, dmgType: 'fire', target: 'strongestEnemy' } } },
  { id: 'magmaw',     name: 'Magmaw',     type: 'fire',   tier: 3, atk: 4, hp: 4,
    ability: { trigger: 'onHurt', effect: { verb: 'buff', atk: 1, hp: 0, target: 'self' } } },

  { id: 'dewdrop',    name: 'Dewdrop',    type: 'water',  tier: 1, atk: 1, hp: 3,
    ability: { trigger: 'onFriendFaint', effect: { verb: 'buff', atk: 0, hp: 1, target: 'randomFriend' } } },
  { id: 'tidepup',    name: 'Tidepup',    type: 'water',  tier: 2, atk: 2, hp: 4,
    ability: { trigger: 'startOfBattle', effect: { verb: 'shield', amount: 3, target: 'friendAhead' } } },
  { id: 'krakenling', name: 'Krakenling', type: 'water',  tier: 3, atk: 3, hp: 5,
    ability: { trigger: 'onFaint', effect: { verb: 'dealDamage', amount: 3, dmgType: 'water', target: 'allEnemies' } } },

  { id: 'sprout',     name: 'Sprout',     type: 'nature', tier: 1, atk: 2, hp: 2,
    ability: { trigger: 'onFaint', effect: { verb: 'summon', token: 'sapling', atIndex: 'self' } } },
  { id: 'thornback',  name: 'Thornback',  type: 'nature', tier: 2, atk: 3, hp: 3,
    ability: { trigger: 'onHurt', effect: { verb: 'dealDamage', amount: 1, dmgType: 'nature', target: 'attacker' } } },
  { id: 'bloomtail',  name: 'Bloomtail',  type: 'nature', tier: 3, atk: 2, hp: 6,
    ability: { trigger: 'startOfBattle', effect: { verb: 'buff', atk: 1, hp: 1, target: 'allFriends' } } },

  { id: 'pebbling',   name: 'Pebbling',   type: 'earth',  tier: 1, atk: 1, hp: 2,
    ability: { trigger: 'startOfBattle', effect: { verb: 'shield', amount: 2, target: 'self' } } },
  { id: 'boulderpup', name: 'Boulderpup', type: 'earth',  tier: 2, atk: 4, hp: 3,
    ability: { trigger: 'onFaint', effect: { verb: 'buff', atk: 2, hp: 0, target: 'friendBehind' } } },
  { id: 'terrapex',   name: 'Terrapex',   type: 'earth',  tier: 3, atk: 3, hp: 6,
    ability: { trigger: 'startOfBattle', effect: { verb: 'buffPerEarthFriend', atk: 0, hp: 2, target: 'self' } } },
];

export const TOKENS: MonsterDef[] = [
  { id: 'sapling', name: 'Sapling', type: 'nature', tier: 1, atk: 1, hp: 1, ability: null },
];
```

(`buffPerEarthFriend` is a small special-case verb; or generalize to `buffPerFriendOfType`.)

---

## 8. Items / Food (3 for MVP)

Items are bought from the shop and **applied to a chosen monster** (drag onto it). Item buffs are **permanent** for the run.

| id | Name | Cost | Effect |
|---|---|---|---|
| `berry` | Berry | 3 | +1/+1 permanently |
| `meat` | Raw Meat | 3 | +2/+0 permanently |
| `shell` | Sturdy Shell | 3 | This monster starts each battle with 2 shield |

(Later additions: Honey = "onFaint: summon a 1/1 bee"; Chili = "afterAttack: splash 1 dmg behind".)

---

## 9. Shop Economy

Each shop phase:
- **Gold resets to 10.**
- **Shop slots:** 3 monster slots + 2 item slots.
- **Buy monster:** −3 gold → goes to your bench. **Bench max = 5 monsters.**
- **Buy item:** −3 gold → applied to a chosen friendly monster.
- **Sell monster:** +1 gold (refund), removed from bench.
- **Reroll shop:** −1 gold → new random slot contents (respecting tier gates & frozen slots).
- **Freeze / unfreeze a slot:** free. Frozen slots persist into the next shop phase.

### Tier unlock schedule (new tier every 2 turns)
- **Turns 1–2:** Tier 1 only.
- **Turns 3–4:** Tiers 1–2.
- **Turn 5+:** Tiers 1–3.

(Monster shop cost can simply equal its tier, or flat 3; use flat **3 gold** for MVP simplicity.)

### Leveling / merging (simple MVP rule)
- Drag a monster onto an **identical species** to merge.
- **2 copies → Level 2**, **3 copies → Level 3.**
- Each level: **+1 ATK / +1 HP** and the ability's numbers **scale** (e.g. Level 2 doubles the ability amount, Level 3 triples). Keep scaling in one place so it's tunable.

---

## 10. Opponent Generation (the "bot")

No multiplayer. Each round, generate an opponent team scaled to the current turn:

```
function generateOpponent(turn, seed) -> Team
  budget = 3 + turn * 2                      // grows each turn
  pool = monsters unlocked at this turn's tier gate
  team = []
  while budget >= 3 and team.length < 5:
     pick a random monster from pool (seeded)
     add to team at a random position
     budget -= 3
  // light scaling at higher turns:
  if turn >= 4: randomly apply +1/+1 to one or two members
  if turn >= 7: give one member a random item effect
  return team
```

This yields varied, escalating opponents with zero netcode. **Later upgrade:** "ghost teams" — snapshot real player teams to a local list and replay them as opponents (the event-log + seeded-RNG design already supports this).

---

## 11. Tech Stack & Architecture

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS. Drag-and-drop via **`@dnd-kit/core`**. Optional animation via **Framer Motion**. Tests via **Vitest**. Deploy free to Vercel / Netlify / GitHub Pages.

**Hard rule: separate pure engine from UI.**

```
src/
  engine/                 // PURE. No React, no DOM, no Math.random/Date.
    types.ts              // ElementType, Trigger, Effect, MonsterDef, MonsterInstance, GameState, BattleEvent
    config.ts             // all tunable constants (startingLives=5, winTrophies=10, gold=10, costs, tierSchedule, levelScaling)
    rng.ts                // seeded PRNG (e.g. mulberry32). ALL randomness goes through this.
    typeChart.ts          // typeMult(attacker, defender)
    data/
      monsters.ts         // MONSTERS, TOKENS (from §7)
      items.ts            // ITEMS (from §8)
    abilities.ts          // effect-verb implementations
    battle.ts             // resolveBattle(teamA, teamB, seed) -> { winner, eventLog }  (§5, §6)
    shop.ts               // roll shop, buy, sell, reroll, freeze, merge/level
    opponent.ts           // generateOpponent(turn, seed)  (§10)
    run.ts                // turn state machine: shop -> battle -> result -> next; lives/trophies/win/lose
    __tests__/            // Vitest unit tests for typeChart, battle, shop, opponent

  ui/                     // React. Consumes engine; never computes combat.
    App.tsx
    state/                // single GameState + reducer, or a Zustand store
    screens/
      ShopScreen.tsx
      BattleScreen.tsx    // iterates eventLog with delays to animate
      ResultScreen.tsx
    components/
      Hud.tsx             // gold / lives / trophies / turn
      Board.tsx           // the 5 battle slots
      Bench.tsx
      ShopSlot.tsx
      MonsterCard.tsx     // art + ATK/HP + type badge + shield + ability tooltip
      DragLayer.tsx

  assets/
    monsters/             // {id}.png transparent art; placeholder colored shapes until real art exists
    manifest.ts           // id -> art path
```

**Engine principles**
- Pure & deterministic. Same inputs + seed ⇒ same output. No side effects.
- Strongly typed. No `any`. Discriminated unions for `Effect` and `BattleEvent`.
- Data-driven. Adding a monster = adding a `MonsterDef`, nothing else.
- Battles return an **event log**; the UI animates it (§6).

**UI principles**
- One `GameState` object, updated via reducer/store. UI is a function of state.
- `BattleScreen` takes the precomputed `eventLog` and steps through it (e.g. ~600ms/event) showing lunges, hit flashes, faints, summons, floating ability text.
- Persist run to `localStorage` (optional).

---

## 12. Milestones (build in this order; stop for review after each)

**M1 — Engine + tests (no real UI).**
Scaffold Vite+React+TS+Tailwind. Implement `types`, `config`, `rng`, `typeChart`, `data/monsters`, `data/items`, `abilities`, `battle` (with event log), `opponent`. Write Vitest tests: type chart correctness, a few hand-checked battles, determinism (same seed ⇒ same log), opponent scaling. Add a tiny dev harness/page that runs `resolveBattle` on two hardcoded teams and dumps the event log as text. **Goal: a correct, tested, headless game brain.**

**M2 — Shop UI + economy.**
`ShopScreen`, `Bench`, `Board`, `MonsterCard`, `ShopSlot`, `Hud`. Drag-and-drop (buy → bench, reorder, sell, drag item onto monster). Gold, reroll, freeze, tier gating, merge/level. **Goal: you can build and arrange a team.**

**M3 — Battle UI + run loop.**
`BattleScreen` animates the engine's event log. `run.ts` state machine: shop → fight → result, trophies/lives, win/lose screens, `generateOpponent` per turn. **Goal: a full playable run vs bots, start to finish.**

**M4 — Polish + content + deploy.**
Drop in Claude-designed monster art (replace placeholders), sound effects, better animations, balance pass, a simple title/menu, localStorage save. Deploy to Vercel/Netlify. **Goal: a shareable URL.**

---

## 13. Coding Standards for the Build

- Build **incrementally by milestone**; don't generate the whole game in one shot. Pause after each milestone for review.
- Engine stays **pure and unit-tested before** wiring any UI to it.
- Keep all tunable numbers in `config.ts`.
- Commit after each milestone with a clear message.
- Prefer small, readable modules over cleverness. Heavy comments on the battle resolution order and trigger ordering.

---

## 14. Art Spec (for Claude Design / image generation)

- One image per monster, filename **`{id}.png`** (e.g. `emberling.png`), placed in `src/assets/monsters/`.
- **Square, transparent background**, ~512×512, full-body, front-facing, centered.
- **Consistent style across all monsters** (pick one and reuse the same descriptor every time): e.g. *"chunky friendly 2D creature, bold clean outlines, soft cel-shading, vibrant saturated colors, simple readable silhouette, transparent background, centered, front view."*
- **Per-element palette:** Fire = warm reds/oranges; Water = blues/teals; Nature = greens; Earth = browns/tans. This makes type readable at a glance.
- Until real art exists, render placeholders: a colored rounded square per type with the monster's name — so the game is fully playable before art is done.

---

## 15. Monetization Options (decide later — none required at launch)

- Free with **cosmetic** skins / alt-art creatures (non-pay-to-win — these communities punish P2W hard).
- One-time **"expansion pack"** of extra monsters/types/items.
- Optional, non-intrusive **ad between runs**, removable via a small one-time purchase.
- **Pay-what-you-want / donations** on itch.io to validate willingness to pay.
- If a browser build gains traction: free demo → **paid Steam 1.0** (the Backpack Battles path).

Keep it free at launch; add monetization only once you see returning players.
