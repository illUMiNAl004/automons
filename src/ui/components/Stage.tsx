// ============================================================================
// Stage.tsx — The cinematic world wrapper shared by Shop & Battle.
//
// Composes depth layers (far sky / mid hills / near ground) that drift with the
// cursor for parallax, blurs the far layer for depth-of-field, and lays a soft
// vignette + warm/cool color grade over everything. Real painterly art (from
// src/assets/arena/{far,mid,near}.png) overrides the SVG fallback per layer.
//
// Only the BACKGROUND layers parallax — the interactive content (`children`)
// stays put so drag-and-drop coordinates never fight the camera.
// ============================================================================

import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { GroundLayer, HillsLayer, SkyLayer } from './Background';
import { arenaLayer } from '../art';
import { ATMOSPHERE, PARALLAX } from '../theme';

export function Stage({ children }: { children: ReactNode }) {
  // Normalized pointer offset in [-1, 1], smoothed by a spring.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 110, damping: 22, mass: 0.5 });
  const sy = useSpring(py, { stiffness: 110, damping: 22, mass: 0.5 });

  const farX = useTransform(sx, (v) => -v * PARALLAX.far);
  const farY = useTransform(sy, (v) => -v * PARALLAX.far);
  const midX = useTransform(sx, (v) => -v * PARALLAX.mid);
  const midY = useTransform(sy, (v) => -v * PARALLAX.mid);
  const nearX = useTransform(sx, (v) => -v * PARALLAX.near);
  const nearY = useTransform(sy, (v) => -v * PARALLAX.near);

  function onMove(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    py.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  }
  function onLeave() {
    px.set(0);
    py.set(0);
  }

  const farArt = arenaLayer('far');
  const midArt = arenaLayer('mid');
  const nearArt = arenaLayer('near');

  return (
    <div className="relative h-screen w-full overflow-hidden" onPointerMove={onMove} onPointerLeave={onLeave}>
      {/* FAR — sky / mountains, depth-of-field blurred */}
      <motion.div className="absolute -inset-[5%]" style={{ x: farX, y: farY, filter: `blur(${ATMOSPHERE.farBlurPx}px)` }}>
        {farArt ? <Img src={farArt} /> : <SkyLayer />}
      </motion.div>

      {/* MID — hills / tree-line */}
      <motion.div className="absolute -inset-[4%]" style={{ x: midX, y: midY }}>
        {midArt ? <Img src={midArt} /> : <HillsLayer />}
      </motion.div>

      {/* NEAR — the ground the pets stand on */}
      <motion.div className="absolute -inset-[3%]" style={{ x: nearX, y: nearY }}>
        {nearArt ? <Img src={nearArt} /> : <GroundLayer />}
      </motion.div>

      {/* CONTENT — static so dnd coordinates stay true */}
      <div className="relative z-10 h-full w-full">{children}</div>

      {/* ATMOSPHERE — grade + vignette on top of everything */}
      <div className="pointer-events-none absolute inset-0 z-20" style={{ background: ATMOSPHERE.grade }} />
      <div className="pointer-events-none absolute inset-0 z-20" style={{ background: ATMOSPHERE.vignette }} />
    </div>
  );
}

function Img({ src }: { src: string }) {
  return <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />;
}
