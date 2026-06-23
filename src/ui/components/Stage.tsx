// ============================================================================
// Stage.tsx — The cinematic world wrapper shared by every screen.
//
// Prefers the real painterly arena art (src/assets/arena/*.png): a single
// far.png is used as the full backdrop; far/mid/near together parallax with
// depth-of-field on the far layer. With no art it falls back to the SVG meadow.
// Over the top: a cool desaturated color grade, a strong vignette, a soft tint,
// and slow ambient motes. Only the BACKGROUND parallaxes — content stays put so
// drag-and-drop coordinates never fight the camera.
// ============================================================================

import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { GroundLayer, HillsLayer, SkyLayer } from './Background';
import { arenaLayer, hasArenaArt } from '../art';
import { ATMOSPHERE, PARALLAX } from '../theme';

export function Stage({ children }: { children: ReactNode }) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 24, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 90, damping: 24, mass: 0.6 });

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
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  const useArt = hasArenaArt;
  const farArt = arenaLayer('far');
  const midArt = arenaLayer('mid');
  const nearArt = arenaLayer('near');
  // Only blur the far layer when there's a separate foreground in front of it.
  const farBlur = useArt ? (midArt || nearArt ? ATMOSPHERE.farBlurPx : 0) : ATMOSPHERE.farBlurPx;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#070a12]" onPointerMove={onMove} onPointerLeave={onLeave}>
      {/* FAR */}
      <motion.div className="absolute -inset-[5%]" style={{ x: farX, y: farY, filter: `blur(${farBlur}px) ${useArt ? ATMOSPHERE.bgFilter : ''}` }}>
        {useArt ? farArt && <Img src={farArt} /> : <SkyLayer />}
      </motion.div>

      {/* MID (only if a real mid layer exists, or the SVG fallback) */}
      {(useArt ? midArt : true) && (
        <motion.div className="absolute -inset-[4%]" style={{ x: midX, y: midY, filter: useArt ? ATMOSPHERE.bgFilter : undefined }}>
          {useArt ? midArt && <Img src={midArt} /> : <HillsLayer />}
        </motion.div>
      )}

      {/* NEAR (the ground; only if a real near layer exists, or the SVG fallback) */}
      {(useArt ? nearArt : true) && (
        <motion.div className="absolute -inset-[3%]" style={{ x: nearX, y: nearY, filter: useArt ? ATMOSPHERE.bgFilter : undefined }}>
          {useArt ? nearArt && <Img src={nearArt} /> : <GroundLayer />}
        </motion.div>
      )}

      {/* CONTENT — static so dnd coordinates stay true */}
      <div className="relative z-10 h-full w-full">{children}</div>

      {/* ATMOSPHERE */}
      <div className="pointer-events-none absolute inset-0 z-20" style={{ background: ATMOSPHERE.tint, mixBlendMode: 'soft-light' }} />
      <div className="pointer-events-none absolute inset-0 z-20" style={{ background: ATMOSPHERE.grade }} />
      <div className="pointer-events-none absolute inset-0 z-20" style={{ background: ATMOSPHERE.vignette }} />
      <AmbientMotes />
    </div>
  );
}

function Img({ src }: { src: string }) {
  return <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />;
}

/** Slow drifting dust/ember motes for atmosphere. Deterministic placement. */
function AmbientMotes() {
  const motes = Array.from({ length: 16 });
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {motes.map((_, i) => {
        const left = (i * 61) % 100;
        const top = (i * 37) % 100;
        const dur = 9 + (i % 5) * 2;
        const size = 2 + (i % 3);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, background: 'rgba(200,220,255,0.5)', boxShadow: '0 0 6px rgba(180,210,255,0.5)' }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 0.6, 0], y: [-10, -60], x: [0, (i % 2 ? 14 : -14)] }}
            transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay: (i % 7) * 1.1 }}
          />
        );
      })}
    </div>
  );
}
