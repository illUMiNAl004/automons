// ============================================================================
// Pedestal.tsx — Where creatures stand, restyled for the cinematic stone arena:
//   • FloorSpot — your TEAM stands on the arena floor (a soft glow disc)
//   • ShopCrate — shop RECRUITS stand on a sleek dark stone pedestal
// Plus ContactShadow, the soft shadow that keeps a creature grounded.
// ============================================================================

import { motion } from 'framer-motion';
import { UI } from '../theme';

export const SLOT_W = 130;

/** Soft contact shadow under a creature; pulses in sync with its idle bob. */
export function ContactShadow({ phase = 0, dur = 2.6, w = 82 }: { phase?: number; dur?: number; w?: number }) {
  return (
    <motion.div
      className="mx-auto"
      style={{ width: w, height: 15, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', filter: 'blur(5px)' }}
      animate={{ scaleX: [1, 0.88, 1], opacity: [0.5, 0.34, 0.5] }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay: phase * dur }}
    />
  );
}

/** TEAM surface: a subtle glow disc on the stone floor. Empty → faint ring; hover → accent glow. */
export function FloorSpot({ highlight = false, empty = false }: { highlight?: boolean; empty?: boolean }) {
  return (
    <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2" style={{ width: 116 }}>
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: 104,
          height: 26,
          borderRadius: '50%',
          background: highlight
            ? `radial-gradient(ellipse at center, ${UI.glow}, rgba(0,0,0,0) 70%)`
            : 'radial-gradient(ellipse at center, rgba(150,180,230,0.18), rgba(0,0,0,0) 70%)',
        }}
      />
      {empty && (
        <div
          className="absolute bottom-1 left-1/2 -translate-x-1/2"
          style={{ width: 90, height: 22, borderRadius: '50%', border: `1.5px ${highlight ? 'solid' : 'dashed'} ${highlight ? UI.accent : 'rgba(180,200,235,0.4)'}` }}
        />
      )}
      {highlight && (
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{ width: 108, height: 27, borderRadius: '50%', boxShadow: `0 0 0 2px ${UI.accent}, 0 0 22px ${UI.glow}` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
    </div>
  );
}

/** SHOP surface: a sleek dark stone pedestal the recruit stands on. */
export function ShopCrate({ highlight = false, frozen = false, empty = false }: { highlight?: boolean; frozen?: boolean; empty?: boolean }) {
  const W = 92;
  const Hf = 26;
  return (
    <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2" style={{ width: W }}>
      {/* cast shadow */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2" style={{ width: W + 10, height: 13, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', filter: 'blur(4px)' }} />
      {/* pedestal body */}
      <div
        className="relative"
        style={{
          width: W,
          height: Hf,
          borderRadius: 8,
          background: `linear-gradient(180deg, ${UI.stoneTop}, ${UI.stoneBottom})`,
          border: `1px solid ${UI.stoneEdge}`,
          boxShadow: `inset 0 1px 0 ${UI.panelHi}, inset 0 -4px 8px rgba(0,0,0,0.4)`,
          opacity: empty ? 0.5 : 1,
        }}
      >
        {/* top rim highlight */}
        <div className="absolute inset-x-2 top-1 h-px" style={{ background: 'rgba(180,205,240,0.35)' }} />
        {/* engraved accent line */}
        <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2" style={{ background: UI.accentDim, opacity: 0.5 }} />
      </div>
      {highlight && <div className="absolute -inset-0.5 rounded-lg" style={{ boxShadow: `0 0 0 2px ${UI.accent}, 0 0 18px ${UI.glow}` }} />}
      {frozen && (
        <div className="absolute -inset-0.5 rounded-lg" style={{ boxShadow: `inset 0 0 14px ${UI.glow}, 0 0 0 1.5px ${UI.accentDim}` }} />
      )}
    </div>
  );
}
