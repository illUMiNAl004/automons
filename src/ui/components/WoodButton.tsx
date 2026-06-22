// ============================================================================
// WoodButton.tsx — Chunky orange wooden button (Roll / End turn), SAP-style:
// a beveled face with a darker bottom edge that "presses" on tap.
// ============================================================================

import { motion } from 'framer-motion';
import { SCENE } from '../theme';
import type { ReactNode } from 'react';

export function WoodButton({
  label,
  icon,
  onClick,
  disabled = false,
  tone = 'orange',
}: {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'orange' | 'wood';
}) {
  const face = tone === 'orange' ? SCENE.orange : SCENE.wood;
  const edge = tone === 'orange' ? SCENE.orangeEdge : SCENE.woodDark;
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { y: -2 }}
      whileTap={disabled ? {} : { y: 4 }}
      transition={{ duration: 0.12 }}
      className="relative flex items-center gap-2 rounded-2xl px-7 py-3 text-lg font-black text-white"
      style={{
        background: `linear-gradient(180deg, ${face}, ${edge})`,
        boxShadow: `0 6px 0 ${edge}, 0 10px 14px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.35)`,
        border: `2px solid ${edge}`,
        textShadow: '0 1px 1px rgba(0,0,0,0.3)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span>{label}</span>
      {icon && <span className="text-xl">{icon}</span>}
    </motion.button>
  );
}
