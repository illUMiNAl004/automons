// ============================================================================
// Hud.tsx — Always-visible run status: turn, gold, lives (hearts), trophies.
// The gold chip carries id="hud-gold" so the coin-burst can fly coins to it.
// ============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../state/store';
import { MOTION, RADII, SURFACE } from '../theme';
import type { ReactNode } from 'react';

export function Hud() {
  const { state } = useGame();
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5"
      style={{
        background: SURFACE.panel,
        border: `1px solid ${SURFACE.panelBorder}`,
        borderRadius: RADII.panel,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          🧬
        </span>
        <span className="text-sm font-extrabold tracking-wide text-white/90">ELEMENTAURI</span>
      </div>

      <div className="flex items-center gap-2">
        <Chip label="Turn" value={state.turn} icon="🗺️" tint="rgba(255,255,255,0.10)" fg="#fff" />
        <Chip id="hud-gold" label="Gold" value={state.gold} icon="🪙" tint="rgba(255,207,77,0.18)" fg={SURFACE.gold} pop />
        <Chip label="Lives" value={state.lives} icon="❤️" tint="rgba(255,93,108,0.16)" fg={SURFACE.heart} />
        <Chip label="Trophies" value={state.trophies} icon="🏆" tint="rgba(255,210,74,0.16)" fg={SURFACE.trophy} />
      </div>
    </div>
  );
}

function Chip({
  id,
  label,
  value,
  icon,
  tint,
  fg,
  pop = false,
}: {
  id?: string;
  label: string;
  value: number;
  icon: ReactNode;
  tint: string;
  fg: string;
  pop?: boolean;
}) {
  return (
    <div
      id={id}
      className="flex items-center gap-1.5 rounded-full px-3 py-1"
      style={{ background: tint, border: `1px solid ${SURFACE.panelBorder}` }}
    >
      <span className="text-sm" aria-hidden>
        {icon}
      </span>
      <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-white/55 sm:inline">
        {label}
      </span>
      {pop ? (
        <span className="relative inline-flex w-[2ch] justify-end">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              initial={{ y: -8, scale: 1.4, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={MOTION.pop}
              className="text-base font-extrabold tabular-nums"
              style={{ color: fg }}
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : (
        <span className="text-base font-extrabold tabular-nums" style={{ color: fg }}>
          {value}
        </span>
      )}
    </div>
  );
}
