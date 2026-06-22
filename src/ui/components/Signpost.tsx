// ============================================================================
// Signpost.tsx — Little wooden plank signs that label areas of the world
// ("Shop", "Battle ➜"), standing on a post stuck in the grass.
// ============================================================================

import { SCENE } from '../theme';

export function Signpost({ label, arrow }: { label: string; arrow?: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ width: 96 }}>
      <div
        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-black text-white"
        style={{
          background: `linear-gradient(180deg, ${SCENE.sign}, ${SCENE.signDark})`,
          border: `2px solid ${SCENE.woodDark}`,
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), 0 3px 6px rgba(0,0,0,0.3)',
          textShadow: '0 1px 1px rgba(0,0,0,0.35)',
          color: '#5a3a17',
        }}
      >
        {label}
        {arrow && <span>➜</span>}
      </div>
      {/* post */}
      <div style={{ width: 10, height: 26, background: `linear-gradient(90deg, ${SCENE.woodDark}, ${SCENE.wood}, ${SCENE.woodDark})`, borderRadius: 2 }} />
    </div>
  );
}
