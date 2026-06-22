// ============================================================================
// Pedestal.tsx — Where creatures stand. Two DISTINCT surfaces so the board
// never reads as a grid of identical slots:
//   • FloorSpot  — your TEAM stands on the bare arena floor (a worn ground decal)
//   • ShopCrate  — shop RECRUITS stand on a little wooden market crate/shelf
// Plus ContactShadow, the soft shadow under a creature that keeps it grounded.
// ============================================================================

import { motion } from 'framer-motion';
import { SCENE } from '../theme';

export const SLOT_W = 130;

/** Soft contact shadow under a creature; pulses in sync with its idle bob.
 *  Rendered as a centered block — the caller positions it at the feet. */
export function ContactShadow({ phase = 0, dur = 2.6, w = 82 }: { phase?: number; dur?: number; w?: number }) {
  return (
    <motion.div
      className="mx-auto"
      style={{ width: w, height: 16, borderRadius: '50%', background: 'rgba(18,26,16,0.36)', filter: 'blur(5px)' }}
      animate={{ scaleX: [1, 0.88, 1], opacity: [0.42, 0.28, 0.42] }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay: phase * dur }}
    />
  );
}

/** TEAM surface: a trodden patch of ground. Empty → dashed ring; hover → glow. */
export function FloorSpot({ highlight = false, empty = false }: { highlight?: boolean; empty?: boolean }) {
  return (
    <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2" style={{ width: 112 }}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: 104, height: 26, borderRadius: '50%', background: 'rgba(110,82,44,0.30)', filter: 'blur(2px)' }} />
      {empty && (
        <div
          className="absolute bottom-1 left-1/2 -translate-x-1/2"
          style={{ width: 92, height: 22, borderRadius: '50%', border: `2px dashed ${highlight ? SCENE.orange : 'rgba(255,255,255,0.4)'}` }}
        />
      )}
      {highlight && (
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{ width: 110, height: 28, borderRadius: '50%', boxShadow: `0 0 0 3px ${SCENE.orange}, 0 0 18px ${SCENE.orange}` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
        />
      )}
    </div>
  );
}

/** SHOP surface: a wooden crate the recruit stands on. */
export function ShopCrate({ highlight = false, frozen = false, empty = false }: { highlight?: boolean; frozen?: boolean; empty?: boolean }) {
  const W = 96;
  const Hf = 30;
  return (
    <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2" style={{ width: W }}>
      {/* cast shadow on the grass */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2" style={{ width: W + 8, height: 14, borderRadius: '50%', background: SCENE.groundShadow, filter: 'blur(4px)' }} />
      {/* crate body */}
      <div
        className="relative"
        style={{
          width: W,
          height: Hf,
          borderRadius: 9,
          background: `linear-gradient(180deg, ${SCENE.wood}, ${SCENE.woodDark})`,
          border: `2px solid ${SCENE.woodDark}`,
          boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.20), inset 0 -4px 0 rgba(0,0,0,0.18)',
          opacity: empty ? 0.55 : 1,
        }}
      >
        {/* slats */}
        <div className="absolute inset-y-1" style={{ left: '32%', width: 2, background: 'rgba(0,0,0,0.18)' }} />
        <div className="absolute inset-y-1" style={{ left: '64%', width: 2, background: 'rgba(0,0,0,0.18)' }} />
        <div className="absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2" style={{ background: 'rgba(0,0,0,0.14)' }} />
      </div>
      {highlight && <div className="absolute -inset-1 rounded-xl" style={{ boxShadow: `0 0 0 3px ${SCENE.orange}` }} />}
      {frozen && (
        <div className="absolute -inset-1 rounded-xl" style={{ background: SCENE.skyHorizon, mixBlendMode: 'screen', opacity: 0.55 }}>
          <span className="absolute right-0 top-0 text-xs">❄️</span>
        </div>
      )}
    </div>
  );
}
