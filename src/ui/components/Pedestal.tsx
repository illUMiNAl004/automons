// ============================================================================
// Pedestal.tsx — A stone the pets stand on, with a soft cast shadow on the
// grass. Empty pedestals are the team/shop slots; a highlight ring shows a
// valid drop target. Frost overlay marks a frozen shop slot.
// ============================================================================

import { motion } from 'framer-motion';
import { SCENE } from '../theme';

export const SLOT_W = 132;
const STONE_W = 118;
const STONE_H = 38;

export function Pedestal({
  highlight = false,
  frozen = false,
  dim = false,
}: {
  highlight?: boolean;
  frozen?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: SLOT_W }}>
      {/* cast shadow on the grass */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: 2,
          width: STONE_W + 8,
          height: 16,
          borderRadius: '50%',
          background: SCENE.groundShadow,
          filter: 'blur(4px)',
        }}
      />
      {/* the stone */}
      <motion.div
        animate={{ scale: highlight ? 1.06 : 1 }}
        transition={{ duration: 0.14 }}
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: 6,
          width: STONE_W,
          height: STONE_H,
          borderRadius: '50%',
          background: `linear-gradient(180deg, ${SCENE.stoneTop}, ${SCENE.stoneBottom})`,
          boxShadow: highlight
            ? `0 0 0 4px ${SCENE.orange}, inset 0 -6px 0 ${SCENE.stoneEdge}`
            : `inset 0 -6px 0 ${SCENE.stoneEdge}`,
          opacity: dim ? 0.55 : 1,
        }}
      />
      {/* top speckle for a bit of texture */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: STONE_H - 4,
          width: STONE_W - 26,
          height: 10,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.35)',
          filter: 'blur(2px)',
        }}
      />
      {frozen && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: 4, width: STONE_W + 4, height: STONE_H + 6, borderRadius: '50%', background: SCENE.skyHorizon, mixBlendMode: 'screen', opacity: 0.6 }}
        />
      )}
    </div>
  );
}
