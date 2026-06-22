// ============================================================================
// Pet.tsx — Pets as actual creatures standing in the world (no cards). A pet
// is the creature art (real PNG when present, emoji fallback) + floating
// SAP-style ATK/HP coins + level pips + shield, with a hover info popover.
// Plus the draggable team/shop variants and their droppable pedestals.
// ============================================================================

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import type { ItemDef, MonsterInstance } from '../../engine/types';
import { ELEMENTS, MOTION, SCENE, SHADOW } from '../theme';
import { monsterEmoji, monsterImage, itemEmoji } from '../art';
import { abilityText, triggerLabel } from '../abilityText';
import { Pedestal, SLOT_W } from './Pedestal';
import type { DragData } from './dnd';

const SLOT_H = 168;

// ---- the pure standing-pet visual (also used in the drag overlay) ----------

export function PetFigure({
  monster,
  size = 80,
  facing = 'right',
  interactive = true,
  lifted = false,
}: {
  monster: MonsterInstance;
  size?: number;
  facing?: 'left' | 'right';
  interactive?: boolean;
  lifted?: boolean;
}) {
  const el = ELEMENTS[monster.type];
  const img = monsterImage(monster.speciesId);
  const flip = facing === 'left' ? 'scaleX(-1)' : undefined;

  return (
    <div className="group relative flex w-[132px] flex-col items-center">
      {interactive && <Popover monster={monster} />}

      {/* level pips */}
      {monster.level > 1 && (
        <div className="absolute -top-1 left-1/2 z-10 flex -translate-x-1/2 gap-0.5">
          {Array.from({ length: monster.level - 1 }).map((_, i) => (
            <span key={i} className="text-[12px] leading-none">⭐</span>
          ))}
        </div>
      )}

      {/* the creature */}
      <motion.div
        style={{ filter: lifted ? SHADOW.creatureLift : SHADOW.creature }}
        className="flex items-end justify-center"
      >
        {img ? (
          <img src={img} alt={monster.name} width={size} height={size} style={{ transform: flip, objectFit: 'contain' }} draggable={false} />
        ) : (
          <span style={{ fontSize: size, transform: flip, display: 'inline-block', lineHeight: 1 }}>
            {monsterEmoji(monster.speciesId)}
          </span>
        )}
      </motion.div>

      {/* floating ATK / HP coins + shield */}
      <div className="z-10 -mt-2 flex items-center gap-1.5">
        <Coin value={monster.atk} bg="#f2a93c" ring="#a96a13" icon="⚔" />
        {monster.shield > 0 && <Coin value={monster.shield} bg="#7cc6f2" ring="#2b7fb0" icon="🛡" />}
        <Coin value={monster.hp} bg="#ff5d6c" ring="#b32f3c" icon="♥" />
      </div>

      {/* subtle element tint glow under the pet */}
      <div
        className="pointer-events-none absolute -z-10"
        style={{ bottom: 18, width: 90, height: 22, borderRadius: '50%', background: el.glow, filter: 'blur(8px)', opacity: 0.5 }}
      />
    </div>
  );
}

function Coin({ value, bg, ring, icon }: { value: number; bg: string; ring: string; icon: string }) {
  return (
    <div
      className="flex h-7 min-w-[28px] items-center justify-center gap-0.5 rounded-full px-1 text-[13px] font-black text-white"
      style={{ background: bg, boxShadow: `0 0 0 2px ${ring}, 0 2px 3px rgba(0,0,0,0.35)` }}
    >
      <span style={{ fontSize: 9 }}>{icon}</span>
      {value}
    </div>
  );
}

function Popover({ monster }: { monster: MonsterInstance }) {
  return (
    <div
      className="pointer-events-none absolute bottom-[128px] left-1/2 z-30 w-44 -translate-x-1/2 rounded-xl px-3 py-2 text-center text-[11px] leading-snug opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
      style={{ background: SCENE.parchment, color: '#4a3a22', border: `2px solid ${SCENE.parchmentEdge}` }}
    >
      <div className="font-extrabold">
        {monster.name}
        {monster.level > 1 && <span className="ml-1 opacity-70">Lv {monster.level}</span>}
      </div>
      {monster.ability ? (
        <div className="mt-0.5">
          <span className="font-bold">{triggerLabel(monster.ability.trigger)}:</span>{' '}
          {abilityText(monster.ability).split(': ').slice(1).join(': ')}
        </div>
      ) : (
        <div className="mt-0.5 opacity-60">No ability</div>
      )}
      {/* little tail */}
      <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45" style={{ background: SCENE.parchment, borderRight: `2px solid ${SCENE.parchmentEdge}`, borderBottom: `2px solid ${SCENE.parchmentEdge}` }} />
    </div>
  );
}

// ---- a slot frame: the pedestal + whatever stands on it --------------------

function SlotFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-end justify-center" style={{ width: SLOT_W, height: SLOT_H }}>
      {children}
    </div>
  );
}

// ---- team pet (draggable) on a droppable pedestal --------------------------

export function TeamSlot({ index, monster }: { index: number; monster: MonsterInstance | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}`, data: { kind: 'slot', index } });
  return (
    <div ref={setNodeRef} data-slot={index}>
      <SlotFrame>
        <Pedestal highlight={isOver} dim={!monster} />
        {monster && <TeamPet index={index} monster={monster} />}
        {index === 0 && (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider text-white/70">
            front
          </span>
        )}
      </SlotFrame>
    </div>
  );
}

function TeamPet({ index, monster }: { index: number; monster: MonsterInstance }) {
  const data: DragData = { kind: 'team', index };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `team-${monster.instanceId}`, data });
  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="absolute bottom-5 cursor-grab touch-none active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.25 : 1 }}
      initial={{ scale: 0.5, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: [0, -4, 0], opacity: isDragging ? 0.25 : 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.25 },
        scale: MOTION.pop,
        default: { duration: MOTION.base },
      }}
      whileHover={{ scale: 1.08 }}
    >
      <PetFigure monster={monster} facing="right" />
    </motion.div>
  );
}

// ---- shop monster on a pedestal --------------------------------------------

export function ShopMonsterPedestal({
  slot,
  monster,
  frozen,
  affordable,
  onFreeze,
  onQuickBuy,
}: {
  slot: number;
  monster: MonsterInstance | null;
  frozen: boolean;
  affordable: boolean;
  onFreeze: () => void;
  onQuickBuy: () => void;
}) {
  const data: DragData = { kind: 'shop-monster', slot };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shop-monster-${slot}`,
    data,
    disabled: !monster || !affordable,
  });

  return (
    <div data-testid={`shop-monster-${slot}`}>
      <SlotFrame>
        <Pedestal frozen={frozen} dim={!monster} />
        {monster && (
          <>
            <motion.div
              ref={setNodeRef}
              {...listeners}
              {...attributes}
              onClick={() => affordable && onQuickBuy()}
              className="absolute bottom-5 touch-none"
              style={{ cursor: affordable ? 'grab' : 'not-allowed', opacity: isDragging ? 0.25 : 1, filter: affordable ? undefined : 'grayscale(0.4)' }}
              animate={{ scale: 1, y: [0, -4, 0] }}
              transition={{ y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: slot * 0.2 } }}
              whileHover={affordable ? { scale: 1.08 } : {}}
              whileTap={affordable ? { scale: 0.95 } : {}}
            >
              <PetFigure monster={monster} facing="left" />
            </motion.div>
            <PriceCoin cost={3} affordable={affordable} />
            <FreezeKnob frozen={frozen} onClick={onFreeze} />
          </>
        )}
      </SlotFrame>
    </div>
  );
}

// ---- shop item on a pedestal -----------------------------------------------

export function ItemFigure({ item, lifted = false }: { item: ItemDef; lifted?: boolean }) {
  return (
    <div className="group relative flex w-[132px] flex-col items-center">
      <div
        className="pointer-events-none absolute bottom-[120px] left-1/2 z-30 w-40 -translate-x-1/2 rounded-xl px-3 py-2 text-center text-[11px] leading-snug opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
        style={{ background: SCENE.parchment, color: '#4a3a22', border: `2px solid ${SCENE.parchmentEdge}` }}
      >
        <div className="font-extrabold">{item.name}</div>
        <div className="mt-0.5">{item.description}</div>
        <div className="mt-0.5 opacity-60">Drop on a pet</div>
      </div>
      <div style={{ fontSize: 52, filter: lifted ? SHADOW.creatureLift : SHADOW.creature }}>{itemEmoji(item.id)}</div>
    </div>
  );
}

export function ShopItemPedestal({
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
  return (
    <SlotFrame>
      <Pedestal frozen={frozen} dim={!item} />
      {item && (
        <>
          <motion.div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="absolute bottom-7 touch-none"
            style={{ cursor: affordable ? 'grab' : 'not-allowed', opacity: isDragging ? 0.25 : 1, filter: affordable ? undefined : 'grayscale(0.4)' }}
            animate={{ y: [0, -4, 0] }}
            transition={{ y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: slot * 0.3 } }}
            whileHover={affordable ? { scale: 1.08 } : {}}
          >
            <ItemFigure item={item} />
          </motion.div>
          <PriceCoin cost={3} affordable={affordable} />
          <FreezeKnob frozen={frozen} onClick={onFreeze} />
        </>
      )}
    </SlotFrame>
  );
}

// ---- shop chrome bits ------------------------------------------------------

function PriceCoin({ cost, affordable }: { cost: number; affordable: boolean }) {
  return (
    <div
      className="absolute bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-full px-2 py-0.5 text-[12px] font-black"
      style={{ background: affordable ? '#ffd24a' : '#b6a468', color: '#5a3f00', boxShadow: '0 0 0 2px #b8860b, 0 2px 4px rgba(0,0,0,0.3)' }}
    >
      🪙{cost}
    </div>
  );
}

function FreezeKnob({ frozen, onClick }: { frozen: boolean; onClick: () => void }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute right-3 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full text-sm transition-transform hover:scale-110 active:scale-90"
      style={{ background: frozen ? SCENE.skyHorizon : 'rgba(255,255,255,0.9)', boxShadow: '0 2px 5px rgba(0,0,0,0.35)' }}
      title={frozen ? 'Unfreeze' : 'Freeze for next turn'}
    >
      {frozen ? '❄️' : '🧊'}
    </button>
  );
}
