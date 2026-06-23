// ============================================================================
// WoodButton.tsx — Sleek modern game button. `primary` is an accent-gradient
// call-to-action; `ghost` is a subtle dark-glass secondary. Weighty press feel.
// (Name kept for import stability; the look is now modern, not wood.)
// ============================================================================

import { motion } from 'framer-motion';
import { MOTION, UI } from '../theme';
import type { ReactNode } from 'react';

export function WoodButton({
  label,
  icon,
  onClick,
  disabled = false,
  tone = 'primary',
}: {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'ghost';
}) {
  const primary = tone === 'primary';
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { y: -2, scale: 1.02 }}
      whileTap={disabled ? {} : { y: 1, scale: 0.98 }}
      transition={{ duration: 0.16, ease: MOTION.ease }}
      className="relative flex items-center gap-2 rounded-xl px-6 py-2.5 text-base font-semibold tracking-wide"
      style={{
        color: primary ? '#0b1020' : UI.text,
        background: primary ? `linear-gradient(180deg, ${UI.gold}, #e3a23a)` : UI.panel,
        border: `1px solid ${primary ? 'rgba(255,224,160,0.6)' : UI.panelBorder}`,
        backdropFilter: 'blur(8px)',
        boxShadow: primary
          ? `inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 18px rgba(227,162,58,0.35), 0 0 22px rgba(255,208,122,0.25)`
          : `inset 0 1px 0 ${UI.panelHi}, 0 6px 16px rgba(0,0,0,0.45)`,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span>{label}</span>
      {icon && <span className="text-lg">{icon}</span>}
    </motion.button>
  );
}
