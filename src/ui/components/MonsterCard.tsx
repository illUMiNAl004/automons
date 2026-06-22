// ============================================================================
// MonsterCard.tsx — CreatureCard: the pure visual for one monster.
//
// Used in the shop, on the team, and inside the drag overlay. No drag logic
// here (wrappers add that) so it renders identically everywhere.
// ============================================================================

import type { CSSProperties } from 'react';
import type { MonsterInstance } from '../../engine/types';
import { ELEMENTS, RADII, SHADOW, SURFACE } from '../theme';
import { monsterEmoji } from '../art';
import { abilityText, triggerLabel } from '../abilityText';

export interface CreatureCardProps {
  monster: MonsterInstance;
  /** Smaller footprint (team slots vs shop). */
  size?: number;
  /** Show the ability tooltip on hover. Off for the drag overlay. */
  interactive?: boolean;
  /** Dim it (e.g. the source slot while dragging). */
  ghost?: boolean;
}

export function CreatureCard({ monster, size = 118, interactive = true, ghost = false }: CreatureCardProps) {
  const el = ELEMENTS[monster.type];
  const cardStyle: CSSProperties = {
    width: size,
    background: SURFACE.cardFace,
    borderRadius: RADII.card,
    border: `2px solid ${el.main}`,
    boxShadow: SHADOW.card,
    opacity: ghost ? 0.35 : 1,
  };

  return (
    <div className="group relative select-none" style={cardStyle}>
      {/* ability tooltip */}
      {interactive && (
        <div
          className="pointer-events-none absolute -top-2 left-1/2 z-30 w-44 -translate-x-1/2 -translate-y-full
                     rounded-xl px-3 py-2 text-left text-[11px] leading-snug opacity-0 shadow-xl
                     transition-opacity duration-150 group-hover:opacity-100"
          style={{ background: SURFACE.ink, color: '#fff' }}
        >
          <div className="font-semibold" style={{ color: el.from }}>
            {monster.name}
            {monster.level > 1 && <span className="ml-1 opacity-80">Lv {monster.level}</span>}
          </div>
          {monster.ability ? (
            <div className="mt-0.5 opacity-90">
              <span className="font-semibold">{triggerLabel(monster.ability.trigger)}:</span>{' '}
              {abilityText(monster.ability).split(': ').slice(1).join(': ')}
            </div>
          ) : (
            <div className="mt-0.5 opacity-70">No ability</div>
          )}
        </div>
      )}

      {/* art tile */}
      <div
        className="relative m-1.5 flex items-center justify-center overflow-hidden"
        style={{
          height: size * 0.74,
          borderRadius: RADII.slot,
          background: `linear-gradient(160deg, ${el.from}, ${el.to})`,
        }}
      >
        {/* type badge */}
        <div
          className="absolute left-1.5 top-1.5 flex h-6 items-center gap-1 rounded-full px-1.5 text-[10px] font-bold"
          style={{ background: 'rgba(255,255,255,0.82)', color: el.dark }}
        >
          <span style={{ fontSize: 11 }}>{el.emoji}</span>
        </div>

        {/* level stars */}
        {monster.level > 1 && (
          <div className="absolute right-1.5 top-1.5 text-[11px]" title={`Level ${monster.level}`}>
            {'⭐'.repeat(monster.level - 1)}
          </div>
        )}

        {/* shield */}
        {monster.shield > 0 && (
          <div
            className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-full px-1.5 text-[11px] font-extrabold"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#1f93cf' }}
          >
            🛡 {monster.shield}
          </div>
        )}

        {/* the creature (placeholder emoji) with a grounding shadow */}
        <span style={{ fontSize: size * 0.4, filter: SHADOW.creature, lineHeight: 1 }}>
          {monsterEmoji(monster.speciesId)}
        </span>
      </div>

      {/* name */}
      <div
        className="truncate px-2 text-center text-[12px] font-bold"
        style={{ color: SURFACE.ink }}
      >
        {monster.name}
      </div>

      {/* stats */}
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <StatBadge icon="⚔️" value={monster.atk} bg="#ffb020" fg="#5a3b00" />
        <StatBadge icon="❤️" value={monster.hp} bg={SURFACE.heart} fg="#fff" />
      </div>
    </div>
  );
}

function StatBadge({ icon, value, bg, fg }: { icon: string; value: number; bg: string; fg: string }) {
  return (
    <div
      className="flex min-w-[34px] items-center justify-center gap-0.5 rounded-full px-1.5 py-0.5 text-[13px] font-extrabold"
      style={{ background: bg, color: fg }}
    >
      <span style={{ fontSize: 10 }}>{icon}</span>
      {value}
    </div>
  );
}
