// ============================================================================
// Hud.tsx — Run status carved into the world's material: a wooden plaque (top-
// left) with stone-inset stat chips (gold / lives / turn / trophies) and round
// wooden menu knobs (top-right). The gold chip keeps id="hud-gold" so sold-
// creature coins can fly to it.
// ============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useGame } from '../state/store';
import { MOTION, SCENE } from '../theme';
import { CONFIG } from '../../engine/config';

const woodFace = `linear-gradient(180deg, ${SCENE.wood} 0%, #9a5f29 55%, ${SCENE.woodDark} 100%)`;
const woodKnob = `radial-gradient(circle at 35% 30%, ${SCENE.wood}, ${SCENE.woodDark})`;

export function Hud() {
  const { state } = useGame();
  return (
    <div className="pointer-events-none flex items-start justify-between">
      <Plaque>
        <Stat id="hud-gold" icon="🪙" value={state.gold} pop />
        <Stat icon="❤️" value={state.lives} />
        <Stat icon="⏳" value={state.turn} />
        <Stat icon="🏆" value={`${state.trophies}/${CONFIG.winTrophies}`} />
      </Plaque>

      <div className="pointer-events-auto flex items-center gap-2">
        <Knob>🐾</Knob>
        <Knob>≡</Knob>
      </div>
    </div>
  );
}

function Plaque({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-auto relative flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5"
      style={{
        background: woodFace,
        border: `3px solid ${SCENE.woodDark}`,
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.22), inset 0 -3px 0 rgba(0,0,0,0.28), 0 6px 14px rgba(0,0,0,0.35)',
      }}
    >
      {/* carved corner pegs */}
      <Peg className="left-1 top-1" />
      <Peg className="right-1 top-1" />
      <Peg className="bottom-1 left-1" />
      <Peg className="bottom-1 right-1" />
      {children}
    </div>
  );
}

function Peg({ className }: { className: string }) {
  return <span className={`absolute h-1.5 w-1.5 rounded-full ${className}`} style={{ background: 'rgba(0,0,0,0.35)', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.5)' }} />;
}

function Stat({ icon, value, id, pop = false }: { icon: string; value: number | string; id?: string; pop?: boolean }) {
  return (
    <div
      id={id}
      className="mx-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1"
      style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.32), rgba(0,0,0,0.18))', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.45)' }}
    >
      <span className="text-base leading-none">{icon}</span>
      {pop && typeof value === 'number' ? (
        <span className="relative inline-flex min-w-[1.4ch] justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              initial={{ y: -10, scale: 1.5, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={MOTION.pop}
              className="text-[16px] font-bold tabular-nums text-white"
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : (
        <span className="text-[16px] font-bold tabular-nums text-white">{value}</span>
      )}
    </div>
  );
}

function Knob({ children }: { children: ReactNode }) {
  return (
    <button
      className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-white transition-transform hover:scale-105 active:scale-95"
      style={{ background: woodKnob, border: `3px solid ${SCENE.woodDark}`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), 0 4px 8px rgba(0,0,0,0.35)' }}
    >
      {children}
    </button>
  );
}
