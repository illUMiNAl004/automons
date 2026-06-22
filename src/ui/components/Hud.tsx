// ============================================================================
// Hud.tsx — SAP-style status: a wooden shell top-left (coin / heart / turn /
// trophy) and round menu knobs top-right. The coin item keeps id="hud-gold"
// so sold-pet coins can fly to it.
// ============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../state/store';
import { MOTION, SCENE } from '../theme';
import { CONFIG } from '../../engine/config';

export function Hud() {
  const { state } = useGame();
  return (
    <div className="pointer-events-none flex items-start justify-between">
      {/* left shell */}
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-2xl px-2 py-1.5"
        style={{
          background: `linear-gradient(180deg, ${SCENE.hudShellLight}, ${SCENE.hudShell})`,
          boxShadow: `inset 0 2px 0 rgba(255,255,255,0.15), 0 4px 10px rgba(0,0,0,0.35)`,
          border: `2px solid ${SCENE.woodDark}`,
        }}
      >
        <Stat id="hud-gold" icon="🪙" value={state.gold} pop />
        <Stat icon="❤️" value={state.lives} />
        <Stat icon="⏳" value={state.turn} />
        <Stat icon="🏆" value={`${state.trophies}/${CONFIG.winTrophies}`} />
      </div>

      {/* right knobs */}
      <div className="pointer-events-auto flex items-center gap-2">
        <Knob>🐾</Knob>
        <Knob>≡</Knob>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  id,
  pop = false,
}: {
  icon: string;
  value: number | string;
  id?: string;
  pop?: boolean;
}) {
  return (
    <div id={id} className="flex items-center gap-1 rounded-xl px-2 py-1" style={{ background: 'rgba(0,0,0,0.18)' }}>
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
              className="text-[15px] font-black tabular-nums text-white"
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : (
        <span className="text-[15px] font-black tabular-nums text-white">{value}</span>
      )}
    </div>
  );
}

function Knob({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-white transition-transform hover:scale-105 active:scale-95"
      style={{
        background: `linear-gradient(180deg, ${SCENE.hudShellLight}, ${SCENE.hudShell})`,
        border: `2px solid ${SCENE.woodDark}`,
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.15), 0 4px 8px rgba(0,0,0,0.3)',
      }}
    >
      {children}
    </button>
  );
}
