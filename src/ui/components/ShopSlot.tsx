// ============================================================================
// ShopSlot.tsx — Shop monster & item slots. Each is draggable (buy by dragging
// onto the team / onto a monster), freezable (frost overlay), and price-tagged.
// ============================================================================

import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import type { ItemDef, MonsterInstance } from '../../engine/types';
import { CreatureCard } from './MonsterCard';
import { MOTION, RADII, SHADOW, SURFACE } from '../theme';
import { itemEmoji } from '../art';
import { CONFIG } from '../../engine/config';

export type DragData =
  | { kind: 'shop-monster'; slot: number }
  | { kind: 'shop-item'; slot: number }
  | { kind: 'team'; index: number };

const SLOT_W = 124;

/** Empty (purchased) slot placeholder. */
function EmptySlot({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center text-[11px] font-semibold text-white/30"
      style={{
        width: SLOT_W,
        height: 168,
        borderRadius: RADII.card,
        border: `2px dashed ${SURFACE.slotBorder}`,
        background: SURFACE.slotEmpty,
      }}
    >
      {label}
    </div>
  );
}

function FreezeButton({ frozen, onClick }: { frozen: boolean; onClick: () => void }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute -right-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full text-sm transition-transform hover:scale-110 active:scale-95"
      style={{
        background: frozen ? SURFACE.frost : 'rgba(255,255,255,0.85)',
        boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
      }}
      title={frozen ? 'Unfreeze' : 'Freeze for next turn'}
    >
      {frozen ? '❄️' : '🧊'}
    </button>
  );
}

function PriceTag({ cost, affordable }: { cost: number; affordable: boolean }) {
  return (
    <div
      className="absolute -bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full px-2 py-0.5 text-[11px] font-extrabold"
      style={{
        background: affordable ? SURFACE.gold : '#9b8a55',
        color: '#4a3500',
        boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
        opacity: affordable ? 1 : 0.7,
      }}
    >
      🪙 {cost}
    </div>
  );
}

function FrostOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{ borderRadius: RADII.card }}
    >
      <div className="absolute inset-0" style={{ background: SURFACE.frost, mixBlendMode: 'screen', opacity: 0.5 }} />
      <div className="absolute inset-0 opacity-60" style={{ backdropFilter: 'blur(0.5px)' }} />
      <span className="absolute right-1 top-1 text-xs">❄️</span>
    </div>
  );
}

// ---- monster slot ----------------------------------------------------------

export function ShopMonsterSlot({
  slot,
  preview,
  frozen,
  affordable,
  onFreeze,
  onQuickBuy,
}: {
  slot: number;
  preview: MonsterInstance | null;
  frozen: boolean;
  affordable: boolean;
  onFreeze: () => void;
  onQuickBuy: () => void;
}) {
  const data: DragData = { kind: 'shop-monster', slot };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shop-monster-${slot}`,
    data,
    disabled: !preview || !affordable,
  });

  if (!preview) return <EmptySlot label="sold" />;

  return (
    <div className="relative" style={{ width: SLOT_W }} data-testid={`shop-monster-${slot}`}>
      <motion.div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => affordable && onQuickBuy()}
        whileHover={affordable ? { y: -6, scale: 1.03 } : {}}
        whileTap={affordable ? { scale: 0.97 } : {}}
        transition={{ duration: MOTION.fast, ease: MOTION.ease }}
        className="cursor-grab touch-none active:cursor-grabbing"
        style={{ filter: affordable ? undefined : 'grayscale(0.4)', cursor: affordable ? undefined : 'not-allowed' }}
      >
        <CreatureCard monster={preview} ghost={isDragging} />
      </motion.div>
      {frozen && <FrostOverlay />}
      <FreezeButton frozen={frozen} onClick={onFreeze} />
      <PriceTag cost={CONFIG.monsterCost} affordable={affordable} />
    </div>
  );
}

// ---- item slot -------------------------------------------------------------

export function ItemChip({ item, ghost = false }: { item: ItemDef; ghost?: boolean }) {
  return (
    <div
      className="group relative flex flex-col items-center px-2 py-2"
      style={{
        width: SLOT_W,
        background: SURFACE.cardFace,
        borderRadius: RADII.card,
        border: '2px solid #d8b15e', // neutral "food" gold (items aren't an element)
        boxShadow: SHADOW.card,
        opacity: ghost ? 0.35 : 1,
      }}
    >
      <div
        className="pointer-events-none absolute -top-2 left-1/2 z-30 w-40 -translate-x-1/2 -translate-y-full rounded-xl px-3 py-2 text-center text-[11px] leading-snug opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
        style={{ background: SURFACE.ink, color: '#fff' }}
      >
        <div className="font-semibold">{item.name}</div>
        <div className="opacity-90">{item.description}</div>
        <div className="mt-0.5 opacity-70">Drag onto a creature</div>
      </div>
      <div
        className="flex items-center justify-center"
        style={{ height: 64, width: 64, fontSize: 34, filter: SHADOW.creature }}
      >
        {itemEmoji(item.id)}
      </div>
      <div className="mt-1 text-[12px] font-bold" style={{ color: SURFACE.ink }}>
        {item.name}
      </div>
      <div className="text-center text-[10px] leading-tight" style={{ color: SURFACE.inkSoft }}>
        {item.description}
      </div>
    </div>
  );
}

export function ShopItemSlot({
  slot,
  item,
  frozen,
  affordable,
  onFreeze,
}: {
  slot: number;
  item: ItemDef | null;
  frozen: boolean;
  affordable: boolean;
  onFreeze: () => void;
}) {
  const data: DragData = { kind: 'shop-item', slot };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shop-item-${slot}`,
    data,
    disabled: !item || !affordable,
  });

  if (!item) return <EmptySlot label="sold" />;

  return (
    <div className="relative" style={{ width: SLOT_W }}>
      <motion.div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        whileHover={affordable ? { y: -6, scale: 1.03 } : {}}
        whileTap={affordable ? { scale: 0.97 } : {}}
        transition={{ duration: MOTION.fast, ease: MOTION.ease }}
        className="cursor-grab touch-none active:cursor-grabbing"
        style={{ filter: affordable ? undefined : 'grayscale(0.4)' }}
      >
        <ItemChip item={item} ghost={isDragging} />
      </motion.div>
      {frozen && <FrostOverlay />}
      <FreezeButton frozen={frozen} onClick={onFreeze} />
      <PriceTag cost={CONFIG.itemCost} affordable={affordable} />
    </div>
  );
}
