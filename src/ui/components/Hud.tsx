// ============================================================================
// Hud.tsx — Run status in a sleek, modern game panel (dark glass + glow
// accents). Top-left: gold / lives / turn / trophies. Top-right: menu knobs.
// The gold chip keeps id="hud-gold" so sold-creature coins can fly to it.
// ============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useGame } from '../state/store';
import { MOTION, UI } from '../theme';
import { CONFIG } from '../../engine/config';

export function Hud() {
  const { state } = useGame();
  return (
    <div className="pointer-events-none flex items-start justify-between">
      <Panel>
        <Stat id="hud-gold" icon="🪙" value={state.gold} glow="rgba(255,208,122,0.5)" fg={UI.gold} pop />
        <Divider />
        <Stat icon="❤️" value={state.lives} glow="rgba(255,107,122,0.45)" fg="#ff8088" />
        <Divider />
        <Stat icon="⏳" value={state.turn} glow={UI.glow} fg={UI.text} />
        <Divider />
        <Stat icon="🏆" value={`${state.trophies}/${CONFIG.winTrophies}`} glow="rgba(255,208,122,0.45)" fg={UI.gold} />
      </Panel>

      <div className="pointer-events-auto flex items-center gap-2">
        <Knob>🐾</Knob>
        <Knob>≡</Knob>
      </div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-auto flex items-center gap-1 rounded-2xl px-2 py-1.5"
      style={{
        background: UI.panel,
        border: `1px solid ${UI.panelBorder}`,
        backdropFilter: 'blur(10px)',
        boxShadow: `inset 0 1px 0 ${UI.panelHi}, 0 10px 30px rgba(0,0,0,0.5)`,
      }}
    >
      {children}
    </div>
  );
}

const Divider = () => <span className="h-5 w-px" style={{ background: UI.panelBorder }} />;

function Stat({
  icon,
  value,
  id,
  glow,
  fg,
  pop = false,
}: {
  icon: string;
  value: number | string;
  id?: string;
  glow: string;
  fg: string;
  pop?: boolean;
}) {
  return (
    <div id={id} className="flex items-center gap-1.5 rounded-xl px-2.5 py-1">
      <span className="text-[15px] leading-none" style={{ filter: `drop-shadow(0 0 5px ${glow})` }}>
        {icon}
      </span>
      {pop && typeof value === 'number' ? (
        <span className="relative inline-flex min-w-[1.4ch] justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              initial={{ y: -10, scale: 1.5, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={MOTION.pop}
              className="text-[16px] font-semibold tabular-nums"
              style={{ color: fg }}
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : (
        <span className="text-[16px] font-semibold tabular-nums" style={{ color: fg }}>
          {value}
        </span>
      )}
    </div>
  );
}

function Knob({ children }: { children: ReactNode }) {
  return (
    <button
      className="flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all hover:scale-105 active:scale-95"
      style={{
        background: UI.panel,
        border: `1px solid ${UI.panelBorder}`,
        backdropFilter: 'blur(10px)',
        boxShadow: `inset 0 1px 0 ${UI.panelHi}, 0 6px 18px rgba(0,0,0,0.45)`,
        color: UI.text,
      }}
    >
      {children}
    </button>
  );
}
