// ============================================================================
// Background.tsx — The cartoon meadow "stage". Full-bleed SVG: sky, sun, soft
// clouds, two mountain layers, a bushy tree-line, and a striped grass field
// with dirt paths. This is the world the pets live in (SAP-style).
// ============================================================================

import { SCENE } from '../theme';

export function Background() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE.skyTop} />
          <stop offset="100%" stopColor={SCENE.skyHorizon} />
        </linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE.grassDark} />
          <stop offset="100%" stopColor={SCENE.grassLight} />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffbe6" />
          <stop offset="100%" stopColor={SCENE.sun} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sky */}
      <rect x="0" y="0" width="1600" height="560" fill="url(#sky)" />
      <circle cx="1330" cy="150" r="190" fill="url(#sun)" />
      <circle cx="1330" cy="150" r="70" fill="#fff6cf" />

      {/* clouds */}
      <g fill={SCENE.cloud}>
        <Cloud x={220} y={140} s={1.1} />
        <Cloud x={760} y={90} s={0.85} />
        <Cloud x={1080} y={210} s={1.0} />
        <Cloud x={520} y={250} s={0.7} />
      </g>

      {/* far mountains */}
      <path d="M-50 560 L220 360 L430 520 L640 330 L880 540 L1080 380 L1330 540 L1650 360 L1650 560 Z" fill={SCENE.mountainFar} opacity="0.8" />
      {/* nearer green ridge */}
      <path d="M-50 575 L260 470 L520 560 L760 450 L1040 565 L1320 470 L1650 560 L1650 600 L-50 600 Z" fill={SCENE.mountainNear} />

      {/* bushy tree-line */}
      <g fill={SCENE.hillsBack}>
        {Array.from({ length: 26 }).map((_, i) => (
          <circle key={i} cx={-40 + i * 66} cy={566} r={46 + ((i * 37) % 22)} />
        ))}
      </g>
      <g fill={SCENE.hillsFront}>
        {Array.from({ length: 30 }).map((_, i) => (
          <circle key={i} cx={-20 + i * 56} cy={596} r={40 + ((i * 53) % 18)} />
        ))}
      </g>

      {/* grass field */}
      <rect x="0" y="585" width="1600" height="315" fill="url(#grass)" />

      {/* mowed stripes + dirt paths */}
      <g opacity="0.6">
        <rect x="0" y="612" width="1600" height="46" fill={SCENE.grassMid} />
        <rect x="0" y="700" width="1600" height="56" fill={SCENE.grassMid} />
        <rect x="0" y="804" width="1600" height="70" fill={SCENE.grassMid} />
      </g>
      <g fill={SCENE.dirt} opacity="0.85">
        <rect x="0" y="688" width="1600" height="8" rx="4" />
        <rect x="0" y="792" width="1600" height="9" rx="4" />
      </g>

      {/* little flowers / pebbles for charm */}
      <g>
        {[[140, 670], [400, 740], [690, 690], [980, 760], [1230, 700], [1440, 660], [560, 830], [1080, 840]].map(
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
      <ellipse cx="0" cy="0" rx="60" ry="30" />
      <ellipse cx="48" cy="6" rx="44" ry="26" />
      <ellipse cx="-46" cy="8" rx="40" ry="24" />
    </g>
  );
}
