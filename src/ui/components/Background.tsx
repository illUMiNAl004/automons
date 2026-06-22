// ============================================================================
// Background.tsx — The meadow stage as SEPARATE parallax layers (sky / hills /
// ground), so Stage.tsx can drift them at different depths and blur the far
// one. FALLBACK when no painterly arena art is present; when art/{far,mid,
// near}.png exist, Stage uses those images instead.
//
// Horizon sits high (≈45%) so the grass dominates and there's little dead sky.
// ============================================================================

import { SCENE } from '../theme';

const H = 360; // horizon line in the 0..900 viewBox (high → grass dominates)

/** Far layer: sky gradient, sun, clouds, distant mountains. (Gets DoF blur.) */
export function SkyLayer() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE.skyTop} />
          <stop offset="100%" stopColor={SCENE.skyHorizon} />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffbe6" />
          <stop offset="100%" stopColor={SCENE.sun} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="1600" height={H} fill="url(#sky)" />
      <circle cx="1300" cy="120" r="200" fill="url(#sun)" />
      <circle cx="1300" cy="120" r="70" fill="#fff6cf" />
      <g fill={SCENE.cloud}>
        <Cloud x={240} y={86} s={1.15} />
        <Cloud x={780} y={60} s={0.9} />
        <Cloud x={1120} y={150} s={1.0} />
      </g>
      <path d={`M-60 ${H} L240 ${H - 200} L450 ${H - 30} L660 ${H - 230} L900 ${H - 10} L1100 ${H - 180} L1360 ${H - 10} L1680 ${H - 200} L1680 ${H} Z`} fill={SCENE.mountainFar} opacity="0.85" />
    </svg>
  );
}

/** Mid layer: nearer green ridge + a bushy tree-line. */
export function HillsLayer() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <path d={`M-60 ${H + 24} L280 ${H - 70} L540 ${H + 18} L780 ${H - 80} L1060 ${H + 22} L1340 ${H - 66} L1680 ${H + 16} L1680 ${H + 90} L-60 ${H + 90} Z`} fill={SCENE.mountainNear} />
      <g fill={SCENE.hillsBack}>
        {Array.from({ length: 28 }).map((_, i) => (
          <circle key={i} cx={-40 + i * 62} cy={H + 20} r={48 + ((i * 37) % 22)} />
        ))}
      </g>
      <g fill={SCENE.hillsFront}>
        {Array.from({ length: 32 }).map((_, i) => (
          <circle key={i} cx={-20 + i * 53} cy={H + 50} r={42 + ((i * 53) % 18)} />
        ))}
      </g>
    </svg>
  );
}

/** Near/foreground floor: grass field, mowed stripes, dirt paths, flowers. */
export function GroundLayer() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE.grassDark} />
          <stop offset="100%" stopColor={SCENE.grassLight} />
        </linearGradient>
      </defs>
      <rect x="0" y={H + 8} width="1600" height={900 - H} fill="url(#grass)" />
      <g opacity="0.5">
        <rect x="0" y={H + 130} width="1600" height="70" fill={SCENE.grassMid} />
        <rect x="0" y={H + 300} width="1600" height="100" fill={SCENE.grassMid} />
      </g>
      <g fill={SCENE.dirt} opacity="0.75">
        <rect x="0" y={H + 215} width="1600" height="10" rx="5" />
        <rect x="0" y={H + 410} width="1600" height="12" rx="6" />
      </g>
      <g>
        {[[150, H + 180], [430, H + 300], [720, H + 200], [1010, H + 360], [1270, H + 230], [1470, H + 170], [600, H + 410]].map(
          ([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle r="5" fill={i % 2 ? '#ffd34e' : '#ff8fb3'} />
              <circle r="2" fill="#fff" />
            </g>
          ),
        )}
      </g>
    </svg>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity="0.95">
      <ellipse cx="0" cy="0" rx="62" ry="30" />
      <ellipse cx="50" cy="6" rx="44" ry="26" />
      <ellipse cx="-48" cy="8" rx="40" ry="24" />
    </g>
  );
}
