# Automons

A single-player, browser-based **creature-collector auto-battler** — Super Auto Pets'
shop-and-auto-battle loop with an original monster/element skin. Build a team of
elemental creatures in the shop, then watch them auto-battle escalating bot teams.
Reach **10 trophies** to win the run; drop to **0 lives** and it's over.

Built with React + TypeScript + Vite + Tailwind, drag-and-drop via `@dnd-kit`,
animation via Framer Motion. The full design is in [`DESIGN.md`](./DESIGN.md).

## Architecture

A strict split between a **pure, deterministic game engine** and the **React UI**:

- `src/engine/` — pure TypeScript, no React/DOM, all randomness through one seeded
  PRNG. Battles return an ordered **event log**; the UI replays it (never recomputes
  combat). Same teams + same seed ⇒ identical battle.
- `src/ui/` — consumes the engine. All visual tokens live in `src/ui/theme.ts`.

## Develop

```bash
npm install
npm run dev      # play it at http://localhost:5173
npm test         # the engine test suite (Vitest)
npm run build    # production build
```

Append `?demo` to the dev URL for a pre-built team (handy for screenshots).

## Art

Creatures render as emoji placeholders until real art lands. Drop transparent
square PNGs named by id into `src/assets/monsters/` (e.g. `emberling.png`) and a
painterly backdrop into `src/assets/arena/` (`far.png` / `mid.png` / `near.png`) —
both auto-wire with no code changes.
