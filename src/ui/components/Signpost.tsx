// ============================================================================
// Signpost.tsx — Sleek modern area labels ("Shop", "Battle ➜") — a small
// dark-glass chip with an accent tick, replacing the old wooden plank.
// ============================================================================

import { UI } from '../theme';

export function Signpost({ label, arrow }: { label: string; arrow?: boolean }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em]"
      style={{
        background: UI.panel,
        border: `1px solid ${UI.panelBorder}`,
        backdropFilter: 'blur(8px)',
        boxShadow: `inset 0 1px 0 ${UI.panelHi}, 0 4px 14px rgba(0,0,0,0.45)`,
        color: UI.text,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: UI.accent, boxShadow: `0 0 8px ${UI.glow}` }} />
      {label}
      {arrow && <span style={{ color: UI.accent }}>➜</span>}
    </div>
  );
}
