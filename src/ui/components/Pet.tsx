// ============================================================================
// Pet.tsx — Creatures as the focal point. NO cards anywhere: you drag the actual
// sprite. Your TEAM stands on the arena floor; shop RECRUITS stand on a wooden
// crate. Stats are small floating badges at each creature's feet (type / ATK /
// HP / shield); the name + ability show on hover. Real PNGs auto-replace the
// emoji fallback. Every creature has a layered idle loop so the board lives.
// ============================================================================

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { ItemDef, MonsterInstance } from '../../engine/types';
import { ELEMENTS, MOTION, PARTICLES, SCENE, SHADOW } from '../theme';
import { monsterEmoji, monsterImage, itemEmoji } from '../art';
import { abilityText, triggerLabel } from '../abilityText';
import { phaseFor } from '../idle';
import { canEvolve, isEvolved } from '../../engine/shop';
import { CONFIG } from '../../engine/config';
import { ContactShadow, FloorSpot, ShopCrate, SLOT_W } from './Pedestal';
import type { DragData } from './dnd';

const SLOT_H = 158;
const PET = 112; // creature display height (the focal point); sprites bottom-anchored

// ---- layered idle: bob + breathe + occasional wiggle, phase-offset ---------

function IdleCreature({ phase, facing, children }: { phase: number; facing: 'left' | 'right'; children: ReactNode }) {
  const flip = facing === 'left' ? -1 : 1;
  return (
    <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: phase * 2.6 }}>
      <motion.div
        style={{ transformOrigin: 'bottom center' }}
        animate={{ scaleY: [1, 0.965, 1], scaleX: [1, 1.03, 1] }}
        transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut', delay: phase * 2 }}
      >
        <motion.div
          style={{ transformOrigin: 'bottom center' }}
          animate={{ rotate: [0, 0, 3, -2, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: phase * 5.5, times: [0, 0.55, 0.7, 0.85, 1] }}
        >
          <div style={{ transform: `scaleX(${flip})`, filter: SHADOW.creature, lineHeight: 1 }}>{children}</div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function ElementParticles({ type, size }: { type: MonsterInstance['type']; size: number }) {
  const p = PARTICLES[type];
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {Array.from({ length: p.count }).map((_, i) => {
        const xoff = (i - (p.count - 1) / 2) * 14;
        const dur = 2.4 + (i % 3) * 0.6;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2"
            style={{ bottom: size * 0.3, color: p.color, fontSize: p.char.length > 1 ? 12 : 8, textShadow: `0 0 6px ${p.color}` }}
            initial={{ opacity: 0 }}
            animate={
              p.rise
                ? { x: [xoff, xoff + (i % 2 ? 8 : -8)], y: [0, -size * 0.7], opacity: [0, 0.9, 0], scale: [0.5, 1, 0.4] }
                : { x: [xoff, xoff + (i % 2 ? 18 : -18)], y: [-size * 0.2, size * 0.18], opacity: [0, 0.85, 0], rotate: [0, i % 2 ? 60 : -60] }
            }
            transition={{ duration: dur, repeat: Infinity, ease: p.rise ? 'easeOut' : 'easeInOut', delay: i * 0.5 }}
          >
            {p.char}
          </motion.span>
        );
      })}
    </div>
  );
}

function Badge({ bg, ring, children }: { bg: string; ring: string; children: ReactNode }) {
  return (
    <div
      className="flex h-[22px] min-w-[22px] items-center justify-center gap-px rounded-full px-1 text-[12px] font-bold text-white"
      style={{ background: bg, boxShadow: `0 0 0 1.5px ${ring}, 0 1.5px 2px rgba(0,0,0,0.35)` }}
    >
      {children}
    </div>
  );
}

function FootBadges({ monster }: { monster: MonsterInstance }) {
  const el = ELEMENTS[monster.type];
  return (
    <div className="flex items-center gap-1">
      <Badge bg={el.main} ring={el.dark}>
        <span style={{ fontSize: 10 }}>{el.emoji}</span>
      </Badge>
      <Badge bg="#f2a93c" ring="#a96a13">
        <span style={{ fontSize: 8 }}>⚔</span>
        {monster.atk}
      </Badge>
      {monster.shield > 0 && (
        <Badge bg="#7cc6f2" ring="#2b7fb0">
          <span style={{ fontSize: 8 }}>🛡</span>
          {monster.shield}
        </Badge>
      )}
      <Badge bg="#ff5d6c" ring="#b32f3c">
        <span style={{ fontSize: 8 }}>♥</span>
        {monster.hp}
      </Badge>
      {/* evolution progress lives WITH the stats, not floating above the creature */}
      {canEvolve(monster) && <EvoPips copies={monster.copies} />}
      {isEvolved(monster) && (
        <Badge bg="#ffd24a" ring="#b8860b">
          <span style={{ fontSize: 10 }}>👑</span>
        </Badge>
      )}
    </div>
  );
}

/** A little pill of pips showing copies/evolveAt toward evolution. */
function EvoPips({ copies }: { copies: number }) {
  return (
    <div
      className="flex h-[22px] items-center gap-[3px] rounded-full px-1.5"
      style={{ background: 'rgba(0,0,0,0.4)', boxShadow: '0 1.5px 2px rgba(0,0,0,0.35)' }}
      title={`${copies}/${CONFIG.evolution.evolveAt} to evolve`}
    >
      {Array.from({ length: CONFIG.evolution.evolveAt }).map((_, i) => (
        <span
          key={i}
          style={{ width: 5, height: 5, borderRadius: '50%', background: i < copies ? '#ffd24a' : 'rgba(255,255,255,0.5)' }}
        />
      ))}
    </div>
  );
}

function Popover({ monster }: { monster: MonsterInstance }) {
  return (
    <div
      className="pointer-events-none absolute -top-1 left-1/2 z-30 w-44 -translate-x-1/2 -translate-y-full rounded-xl px-3 py-2 text-center text-[11px] leading-snug opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
      style={{ background: SCENE.parchment, color: '#4a3a22', border: `2px solid ${SCENE.parchmentEdge}` }}
    >
      <div className="font-bold">
        {monster.name}
        {isEvolved(monster) && <span className="ml-1 opacity-70">★ Evolved</span>}
        {canEvolve(monster) && <span className="ml-1 opacity-70">{monster.copies}/{CONFIG.evolution.evolveAt}</span>}
      </div>
      {monster.ability ? (
        <div className="mt-0.5">
          <span className="font-bold">{triggerLabel(monster.ability.trigger)}:</span>{' '}
          {abilityText(monster.ability).split(': ').slice(1).join(': ')}
        </div>
      ) : (
        <div className="mt-0.5 opacity-60">No ability</div>
      )}
      <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45" style={{ background: SCENE.parchment, borderRight: `2px solid ${SCENE.parchmentEdge}`, borderBottom: `2px solid ${SCENE.parchmentEdge}` }} />
    </div>
  );
}

// ---- the full standing creature (used everywhere, incl. drag overlay) ------

export function PetFigure({
  monster,
  size = PET,
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
  const phase = phaseFor(monster.instanceId);
  const img = monsterImage(monster.speciesId);
  // Full-body sprites are bottom-anchored in a contain-box so any aspect ratio
  // stands grounded (feet on the floor), never floating or clipping.
  const creature = img ? (
    <img
      src={img}
      alt={monster.name}
      style={{ width: SLOT_W - 6, height: size, objectFit: 'contain', objectPosition: 'center bottom' }}
      draggable={false}
    />
  ) : (
    <span style={{ fontSize: size * 0.92, lineHeight: 1 }}>{monsterEmoji(monster.speciesId)}</span>
  );

  return (
    <div className="group relative" style={{ width: SLOT_W, height: size + 18 }}>
      {interactive && <Popover monster={monster} />}
      <ElementParticles type={monster.type} size={size} />

      {/* the creature — bottom-anchored, keyed by species so it POPS when it evolves */}
      <div className="absolute inset-x-0 z-10 flex justify-center" style={{ bottom: 10 }}>
        <motion.div
          key={monster.speciesId}
          initial={{ scale: 0.55 }}
          animate={{ scale: 1 }}
          transition={MOTION.pop}
          style={{ filter: lifted ? SHADOW.creatureLift : undefined }}
        >
          <IdleCreature phase={phase} facing={facing}>{creature}</IdleCreature>
        </motion.div>
      </div>

      {/* contact shadow at the feet */}
      <div className="absolute inset-x-0 z-0 flex justify-center" style={{ bottom: 6 }}>
        <ContactShadow phase={phase} w={size * 0.62} />
      </div>

      {/* all the creature's info in one place, at its feet */}
      <div className="absolute inset-x-0 z-20 flex justify-center" style={{ bottom: -6 }}>
        <FootBadges monster={monster} />
      </div>
    </div>
  );
}

// ---- team: creatures on the arena floor ------------------------------------

export function TeamSlot({ index, monster }: { index: number; monster: MonsterInstance | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}`, data: { kind: 'slot', index } });
  return (
    <div ref={setNodeRef} data-slot={index} className="relative" style={{ width: SLOT_W, height: SLOT_H }}>
      <FloorSpot highlight={isOver} empty={!monster} />
      {index === 0 && <FrontFlag />}
      {monster && (
        <div className="absolute inset-x-0 z-10" style={{ bottom: 8 }}>
          <TeamPet index={index} monster={monster} />
        </div>
      )}
    </div>
  );
}

function FrontFlag() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-1 z-20 flex flex-col items-center">
      <div className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: SCENE.orange, boxShadow: `0 1px 3px rgba(0,0,0,0.4)` }}>
        ⚔ FRONT
      </div>
      <div style={{ width: 3, height: 16, background: SCENE.woodDark }} />
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
      className="cursor-grab touch-none active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.25 : 1 }}
      initial={{ scale: 0.5, y: 16, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: isDragging ? 0.25 : 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
    >
      <PetFigure monster={monster} facing="right" />
    </motion.div>
  );
}

// ---- shop: creatures on a wooden crate -------------------------------------

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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `shop-monster-${slot}`, data, disabled: !monster || !affordable });
  return (
    <div data-testid={`shop-monster-${slot}`} className="relative" style={{ width: SLOT_W, height: SLOT_H }}>
      <ShopCrate highlight={false} frozen={frozen} empty={!monster} />
      {monster && (
        <>
          <motion.div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={() => affordable && onQuickBuy()}
            className="absolute inset-x-0 z-10 touch-none"
            style={{ bottom: 22, cursor: affordable ? 'grab' : 'not-allowed', opacity: isDragging ? 0.25 : 1, filter: affordable ? undefined : 'grayscale(0.45)' }}
            whileHover={affordable ? { scale: 1.05 } : {}}
            whileTap={affordable ? { scale: 0.95 } : {}}
          >
            <PetFigure monster={monster} facing="left" />
          </motion.div>
          <PriceCoin cost={3} affordable={affordable} />
          <FreezeKnob frozen={frozen} onClick={onFreeze} />
        </>
      )}
    </div>
  );
}

export function ItemFigure({ item, lifted = false }: { item: ItemDef; lifted?: boolean }) {
  return (
    <div className="group relative flex flex-col items-center" style={{ width: SLOT_W }}>
      <div
        className="pointer-events-none absolute -top-1 left-1/2 z-30 w-40 -translate-x-1/2 -translate-y-full rounded-xl px-3 py-2 text-center text-[11px] leading-snug opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
        style={{ background: SCENE.parchment, color: '#4a3a22', border: `2px solid ${SCENE.parchmentEdge}` }}
      >
        <div className="font-bold">{item.name}</div>
        <div className="mt-0.5">{item.description}</div>
        <div className="mt-0.5 opacity-60">Drop on a creature</div>
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `shop-item-${slot}`, data, disabled: !item || !affordable });
  return (
    <div className="relative" style={{ width: SLOT_W, height: SLOT_H }}>
      <ShopCrate highlight={false} frozen={frozen} empty={!item} />
      {item && (
        <>
          <motion.div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="absolute inset-x-0 z-10 flex justify-center touch-none"
            style={{ bottom: 30, cursor: affordable ? 'grab' : 'not-allowed', opacity: isDragging ? 0.25 : 1, filter: affordable ? undefined : 'grayscale(0.45)' }}
            whileHover={affordable ? { scale: 1.05 } : {}}
          >
            <ItemFigure item={item} />
          </motion.div>
          <PriceCoin cost={3} affordable={affordable} />
          <FreezeKnob frozen={frozen} onClick={onFreeze} />
        </>
      )}
    </div>
  );
}

function PriceCoin({ cost, affordable }: { cost: number; affordable: boolean }) {
  return (
    <div
      className="absolute bottom-1 left-1/2 z-20 -translate-x-1/2 rounded-full px-2 py-0.5 text-[12px] font-bold"
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
      className="absolute right-2 top-1 z-30 flex h-7 w-7 items-center justify-center rounded-full text-sm transition-transform hover:scale-110 active:scale-90"
      style={{ background: frozen ? SCENE.skyHorizon : 'rgba(255,255,255,0.9)', boxShadow: '0 2px 5px rgba(0,0,0,0.35)' }}
      title={frozen ? 'Unfreeze' : 'Freeze for next turn'}
    >
      {frozen ? '❄️' : '🧊'}
    </button>
  );
}
