// ============================================================================
// effects.tsx — One-shot visual flourishes: coins flying to the gold counter
// (on sell) and a flash burst (on merge). Rendered in a fixed, click-through
// overlay; each effect removes itself when its animation completes.
// ============================================================================

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { MOTION, SURFACE } from '../theme';

export interface Fx {
  id: number;
  kind: 'coins' | 'merge' | 'poof' | 'evolve';
  x: number; // screen-space origin
  y: number;
}

/** Center of a screen element by id, or a fallback point. */
function elementCenter(id: string, fallback: { x: number; y: number }) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function CoinBurst({ from, onDone }: { from: { x: number; y: number }; onDone: () => void }) {
  const to = useMemo(() => elementCenter('hud-gold', { x: from.x, y: from.y - 200 }), [from.x, from.y]);
  const coins = [0, 1, 2, 3, 4, 5];
  return (
    <>
      {coins.map((i) => {
        const midX = (i - 2.5) * 16; // fan out before converging
        return (
          <motion.div
            key={i}
            className="absolute text-lg"
            style={{ left: from.x, top: from.y }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
            animate={{
              x: [0, midX, to.x - from.x],
              y: [0, -46, to.y - from.y],
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1, 0.7],
            }}
            transition={{ duration: 0.55, ease: MOTION.ease, delay: i * 0.045 }}
            onAnimationComplete={() => i === coins.length - 1 && onDone()}
          >
            🪙
          </motion.div>
        );
      })}
    </>
  );
}

function MergeFlash({ at, onDone }: { at: { x: number; y: number }; onDone: () => void }) {
  return (
    <div className="absolute" style={{ left: at.x, top: at.y }}>
      {/* expanding ring */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 130, height: 130, marginLeft: -65, marginTop: -65, border: `3px solid ${SURFACE.gold}` }}
        initial={{ scale: 0.3, opacity: 0.95 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.4, ease: MOTION.ease }}
        onAnimationComplete={onDone}
      />
      {/* center sparkle */}
      <motion.div
        className="absolute text-3xl"
        style={{ marginLeft: -16, marginTop: -20 }}
        initial={{ scale: 0.2, opacity: 1, rotate: -20 }}
        animate={{ scale: 1.4, opacity: 0, rotate: 10 }}
        transition={{ duration: 0.4, ease: MOTION.ease }}
      >
        ✨
      </motion.div>
    </div>
  );
}

function Poof({ at, onDone }: { at: { x: number; y: number }; onDone: () => void }) {
  const puffs = [
    { dx: -22, dy: -6 },
    { dx: 22, dy: -6 },
    { dx: 0, dy: -24 },
    { dx: -12, dy: 8 },
    { dx: 14, dy: 8 },
  ];
  return (
    <div className="absolute" style={{ left: at.x, top: at.y }}>
      {puffs.map((p, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          style={{ marginLeft: -12, marginTop: -12 }}
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 0.9 }}
          animate={{ x: p.dx, y: p.dy, scale: 1.2, opacity: 0 }}
          transition={{ duration: 0.45, ease: MOTION.ease }}
          onAnimationComplete={() => i === puffs.length - 1 && onDone()}
        >
          💨
        </motion.div>
      ))}
    </div>
  );
}

/** A bright transformation burst when a creature evolves. */
function Evolve({ at, onDone }: { at: { x: number; y: number }; onDone: () => void }) {
  const sparks = Array.from({ length: 12 });
  return (
    <div className="absolute" style={{ left: at.x, top: at.y }}>
      {/* bloom flash */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 170, height: 170, marginLeft: -85, marginTop: -85, background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,210,74,0.45) 42%, rgba(255,210,74,0) 70%)' }}
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 1.7, opacity: 0 }}
        transition={{ duration: 0.55, ease: MOTION.ease }}
        onAnimationComplete={onDone}
      />
      {/* gold ring */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 120, height: 120, marginLeft: -60, marginTop: -60, border: `4px solid ${SURFACE.gold}` }}
        initial={{ scale: 0.3, opacity: 0.95 }}
        animate={{ scale: 1.8, opacity: 0 }}
        transition={{ duration: 0.5, ease: MOTION.ease }}
      />
      {/* radial sparks */}
      {sparks.map((_, i) => {
        const a = (i / sparks.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute text-base"
            style={{ marginLeft: -6, marginTop: -8, color: '#fff7c4', textShadow: '0 0 6px #ffd24a' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
            animate={{ x: Math.cos(a) * 72, y: Math.sin(a) * 72, opacity: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: MOTION.ease }}
          >
            ✦
          </motion.span>
        );
      })}
    </div>
  );
}

export function FxOverlay({ effects, remove }: { effects: Fx[]; remove: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {effects.map((fx) => {
        const done = () => remove(fx.id);
        if (fx.kind === 'coins') return <CoinBurst key={fx.id} from={{ x: fx.x, y: fx.y }} onDone={done} />;
        if (fx.kind === 'poof') return <Poof key={fx.id} at={{ x: fx.x, y: fx.y }} onDone={done} />;
        if (fx.kind === 'evolve') return <Evolve key={fx.id} at={{ x: fx.x, y: fx.y }} onDone={done} />;
        return <MergeFlash key={fx.id} at={{ x: fx.x, y: fx.y }} onDone={done} />;
      })}
    </div>
  );
}
