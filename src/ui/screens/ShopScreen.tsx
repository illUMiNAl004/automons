// ============================================================================
// ShopScreen.tsx — The whole shop phase: HUD + shop row + team + controls.
// Owns the @dnd-kit DndContext and translates drops into engine actions, and
// spawns the one-shot juice effects (coin burst on sell, flash on merge).
// ============================================================================

import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../state/store';
import { makeInstance } from '../../engine/battle';
import { CONFIG } from '../../engine/config';
import { getTeam } from '../../engine/shop';
import { MOTION, RADII, SURFACE } from '../theme';
import { Hud } from '../components/Hud';
import { Board, SellZone } from '../components/Board';
import { CreatureCard } from '../components/MonsterCard';
import { ItemChip, ShopItemSlot, ShopMonsterSlot, type DragData } from '../components/ShopSlot';
import { FxOverlay, type Fx } from '../components/effects';

export function ShopScreen() {
  const { state, actions } = useGame();
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [effects, setEffects] = useState<Fx[]>([]);
  const fxId = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), // clicks still quick-buy
  );

  // Build display instances for shop monsters (shop stores defs, cards need instances).
  const monsterPreviews = useMemo(
    () => state.shop.monsterSlots.map((def, i) => (def ? makeInstance(def, `shop-m-${i}`) : null)),
    [state.shop.monsterSlots],
  );

  const affordMonster = state.gold >= CONFIG.monsterCost;
  const affordItem = state.gold >= CONFIG.itemCost;
  const teamN = getTeam(state).length;

  const spawn = (kind: Fx['kind'], x: number, y: number) =>
    setEffects((e) => [...e, { id: fxId.current++, kind, x, y }]);
  const removeFx = (id: number) => setEffects((e) => e.filter((f) => f.id !== id));

  const slotCenter = (index: number) => {
    const el = document.querySelector(`[data-slot="${index}"]`);
    if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  function onDragStart(e: DragStartEvent) {
    setActiveDrag((e.active.data.current as DragData) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    const a = e.active.data.current as DragData | undefined;
    const over = e.over?.data.current as { kind: string; index?: number } | undefined;
    setActiveDrag(null);
    if (!a || !over) return;

    if (a.kind === 'shop-monster') {
      if (over.kind === 'slot' && over.index !== undefined) {
        const dest = state.team[over.index];
        const isMerge = !!dest && dest.speciesId === state.shop.monsterSlots[a.slot]?.id;
        actions.buyMonster(a.slot, over.index);
        if (isMerge) spawn('merge', ...xy(slotCenter(over.index)));
      }
    } else if (a.kind === 'shop-item') {
      if (over.kind === 'slot' && over.index !== undefined) {
        const target = state.team[over.index];
        if (target) {
          actions.buyItem(a.slot, target.instanceId);
          spawn('merge', ...xy(slotCenter(over.index)));
        }
      }
    } else if (a.kind === 'team') {
      if (over.kind === 'sell') {
        spawn('coins', ...xy(slotCenter(a.index)));
        actions.sell(a.index);
      } else if (over.kind === 'slot' && over.index !== undefined && over.index !== a.index) {
        const from = state.team[a.index];
        const dest = state.team[over.index];
        const isMerge = !!from && !!dest && from.speciesId === dest.speciesId;
        actions.move(a.index, over.index);
        if (isMerge) spawn('merge', ...xy(slotCenter(over.index)));
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-5">
        <Hud />

        {/* SHOP */}
        <Panel>
          <SectionHeader title="Shop" hint="Drag to buy · drop on a twin to merge">
            <button
              onClick={actions.reroll}
              disabled={state.gold < CONFIG.rerollCost}
              className="rounded-full px-4 py-1.5 text-sm font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
              style={{ background: SURFACE.gold, color: '#4a3500' }}
            >
              🔄 Reroll · 1🪙
            </button>
          </SectionHeader>

          <div className="flex flex-wrap items-start justify-center gap-4 pt-2">
            {monsterPreviews.map((preview, i) => (
              <ShuffleIn key={`${state.seed}:m${i}`} index={i}>
                <ShopMonsterSlot
                  slot={i}
                  preview={preview}
                  frozen={state.shop.frozenMonsters[i] ?? false}
                  affordable={affordMonster}
                  onFreeze={() => actions.freezeMonster(i)}
                  onQuickBuy={() => actions.buyMonster(i)}
                />
              </ShuffleIn>
            ))}

            <div className="mx-1 self-stretch border-l border-white/10" />

            {state.shop.itemSlots.map((item, i) => (
              <ShuffleIn key={`${state.seed}:i${i}`} index={i + 3}>
                <ShopItemSlot
                  slot={i}
                  item={item}
                  frozen={state.shop.frozenItems[i] ?? false}
                  affordable={affordItem}
                  onFreeze={() => actions.freezeItem(i)}
                />
              </ShuffleIn>
            ))}
          </div>
        </Panel>

        {/* TEAM */}
        <Panel>
          <SectionHeader title={`Your Team · ${teamN}/${CONFIG.benchMax}`} hint="Drag to reorder · 🗑 to sell" />
          <div className="flex flex-col items-center gap-5 pt-3">
            <Board team={state.team} />
            <SellZone active={activeDrag?.kind === 'team'} />
          </div>
        </Panel>

        {/* CONTROLS */}
        <div className="flex items-center justify-center gap-3 pb-2">
          <button
            onClick={actions.nextTurn}
            className="rounded-full px-6 py-2.5 text-sm font-extrabold text-white transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(160deg, #6d5cf0, #4a37c8)', boxShadow: '0 8px 20px -6px rgba(74,55,200,0.7)' }}
          >
            Next Turn ▶
          </button>
          <button
            disabled
            title="Battles arrive in Milestone 3"
            className="cursor-not-allowed rounded-full px-6 py-2.5 text-sm font-bold text-white/60"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${SURFACE.panelBorder}` }}
          >
            ⚔️ Fight (M3)
          </button>
          <button
            onClick={actions.reset}
            className="rounded-full px-5 py-2.5 text-sm font-bold text-white/70 transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${SURFACE.panelBorder}` }}
          >
            ↺ New Run
          </button>
        </div>
      </div>

      {/* drag overlay — the moving card, tilted with a big shadow */}
      <DragOverlay dropAnimation={null}>
        {activeDrag && (
          <div style={{ transform: 'rotate(4deg)', filter: 'drop-shadow(0 26px 32px rgba(8,4,24,0.6))' }}>
            <DragGhost active={activeDrag} previews={monsterPreviews} />
          </div>
        )}
      </DragOverlay>

      <FxOverlay effects={effects} remove={removeFx} />
    </DndContext>
  );
}

// helper: spread a point into CoinBurst/MergeFlash args
const xy = (p: { x: number; y: number }): [number, number] => [p.x, p.y];

function DragGhost({ active, previews }: { active: DragData; previews: (ReturnType<typeof makeInstance> | null)[] }) {
  const { state } = useGame();
  if (active.kind === 'shop-monster') {
    const p = previews[active.slot];
    return p ? <CreatureCard monster={p} interactive={false} /> : null;
  }
  if (active.kind === 'shop-item') {
    const it = state.shop.itemSlots[active.slot];
    return it ? <ItemChip item={it} /> : null;
  }
  const m = state.team[active.index];
  return m ? <CreatureCard monster={m} interactive={false} /> : null;
}

// ---- small layout helpers --------------------------------------------------

function Panel({ children }: { children: ReactNode }) {
  return (
    <section
      className="px-4 py-3"
      style={{
        background: SURFACE.panel,
        border: `1px solid ${SURFACE.panelBorder}`,
        borderRadius: RADII.panel,
      }}
    >
      {children}
    </section>
  );
}

function SectionHeader({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-base font-extrabold tracking-wide text-white/90">{title}</h2>
        {hint && <p className="text-[11px] text-white/40">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** Staggered entry used to "shuffle" the shop in on each reroll. */
function ShuffleIn({ children, index }: { children: ReactNode; index: number }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        initial={{ opacity: 0, y: -14, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: MOTION.base, ease: MOTION.ease, delay: index * 0.04 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
