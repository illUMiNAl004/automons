// ============================================================================
// Board.tsx — The player's team: 5 ordered slots (index 0 = front in battle).
// Slots are droppable (buy / reorder / merge / apply-item all land here); the
// card inside each is draggable. A SellZone catches team cards for selling.
// ============================================================================

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import type { MonsterInstance } from '../../engine/types';
import { CONFIG } from '../../engine/config';
import { CreatureCard } from './MonsterCard';
import { MOTION, RADII, SURFACE } from '../theme';
import type { DragData } from './ShopSlot';

const SLOT_W = 124;
const SLOT_H = 168;

function DraggableCard({ index, monster }: { index: number; monster: MonsterInstance }) {
  const data: DragData = { kind: 'team', index };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `team-${monster.instanceId}`,
    data,
  });
  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      layoutId={monster.instanceId}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0, transition: { duration: MOTION.fast } }}
      whileHover={{ y: -6, scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      transition={MOTION.pop}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <CreatureCard monster={monster} ghost={isDragging} />
    </motion.div>
  );
}

function TeamSlot({ index, monster }: { index: number; monster: MonsterInstance | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}`, data: { kind: 'slot', index } });
  return (
    <div
      ref={setNodeRef}
      data-slot={index}
      className="relative flex items-center justify-center"
      style={{
        width: SLOT_W,
        height: SLOT_H,
        borderRadius: RADII.card,
        border: monster ? '2px solid transparent' : `2px dashed ${SURFACE.slotBorder}`,
        background: monster ? 'transparent' : SURFACE.slotEmpty,
        outline: isOver ? `3px solid ${SURFACE.gold}` : 'none',
        outlineOffset: 2,
        transition: 'outline-color 120ms ease',
      }}
    >
      {index === 0 && (
        <span className="absolute -top-5 left-0 text-[10px] font-bold uppercase tracking-wider text-white/45">
          ◤ front
        </span>
      )}
      <AnimatePresence mode="popLayout">
        {monster && <DraggableCard key={monster.instanceId} index={index} monster={monster} />}
      </AnimatePresence>
    </div>
  );
}

export function Board({ team }: { team: (MonsterInstance | null)[] }) {
  return (
    <div className="flex items-end justify-center gap-3">
      {Array.from({ length: CONFIG.benchMax }).map((_, i) => (
        <TeamSlot key={i} index={i} monster={team[i] ?? null} />
      ))}
    </div>
  );
}

export function SellZone({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'sell', data: { kind: 'sell' } });
  return (
    <motion.div
      ref={setNodeRef}
      animate={{
        opacity: active ? 1 : 0.4,
        scale: isOver ? 1.06 : 1,
      }}
      transition={{ duration: MOTION.fast, ease: MOTION.ease }}
      className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold"
      style={{
        border: `2px dashed ${isOver ? SURFACE.heart : SURFACE.slotBorder}`,
        background: isOver ? 'rgba(255,93,108,0.18)' : SURFACE.slotEmpty,
        color: isOver ? SURFACE.heart : 'rgba(255,255,255,0.6)',
      }}
    >
      <span className="text-lg">🗑️</span>
      Sell <span style={{ color: SURFACE.gold }}>+{CONFIG.sellRefund}🪙</span>
    </motion.div>
  );
}
