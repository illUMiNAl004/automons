// ============================================================================
// ShopScreen.tsx — The shop phase as a meadow scene (inside the parallax Stage).
// Your team stands on the arena floor; shop recruits stand on wooden crates.
// Owns the @dnd-kit DndContext and spawns the juice effects.
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
import { useGame } from '../state/store';
import { makeInstance } from '../../engine/battle';
import { CONFIG } from '../../engine/config';
import { getTeam } from '../../engine/shop';
import { getMonsterDef } from '../../engine/data/monsters';
import { Stage } from '../components/Stage';
import { Hud } from '../components/Hud';
import { Signpost } from '../components/Signpost';
import { WoodButton } from '../components/WoodButton';
import { PetFigure, ItemFigure, TeamSlot, ShopMonsterPedestal, ShopItemPedestal } from '../components/Pet';
import { FxOverlay, type Fx } from '../components/effects';
import type { DragData } from '../components/dnd';
import type { MonsterInstance } from '../../engine/types';

/** Pick the right flourish for a combine: a full evolve burst vs a merge flash. */
function combineFx(target: MonsterInstance, sourceCopies: number): Fx['kind'] {
  const def = getMonsterDef(target.speciesId);
  return def.evolvesTo && target.copies + sourceCopies >= CONFIG.evolution.evolveAt ? 'evolve' : 'merge';
}

export function ShopScreen() {
  const { state, actions } = useGame();
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [effects, setEffects] = useState<Fx[]>([]);
  const fxId = useRef(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const monsterPreviews = useMemo(
    () => state.shop.monsterSlots.map((def, i) => (def ? makeInstance(def, `shop-m-${i}`) : null)),
    [state.shop.monsterSlots],
  );

  const affordMonster = state.gold >= CONFIG.monsterCost;
  const affordItem = state.gold >= CONFIG.itemCost;
  const teamN = getTeam(state).length;

  const spawn = (kind: Fx['kind'], x: number, y: number) => setEffects((e) => [...e, { id: fxId.current++, kind, x, y }]);
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

    if (a.kind === 'shop-monster' && over.kind === 'slot' && over.index !== undefined) {
      const dest = state.team[over.index];
      const isMerge = !!dest && dest.speciesId === state.shop.monsterSlots[a.slot]?.id;
      actions.buyMonster(a.slot, over.index);
      if (isMerge && dest) { const c = slotCenter(over.index); spawn(combineFx(dest, 1), c.x, c.y); }
    } else if (a.kind === 'shop-item' && over.kind === 'slot' && over.index !== undefined) {
      const target = state.team[over.index];
      if (target) {
        actions.buyItem(a.slot, target.instanceId);
        const c = slotCenter(over.index);
        spawn('merge', c.x, c.y);
      }
    } else if (a.kind === 'team') {
      if (over.kind === 'sell') {
        const c = slotCenter(a.index);
        spawn('poof', c.x, c.y - 30);
        spawn('coins', c.x, c.y);
        actions.sell(a.index);
      } else if (over.kind === 'slot' && over.index !== undefined && over.index !== a.index) {
        const from = state.team[a.index];
        const dest = state.team[over.index];
        const isMerge = !!from && !!dest && from.speciesId === dest.speciesId;
        actions.move(a.index, over.index);
        if (isMerge && from && dest) { const c = slotCenter(over.index); spawn(combineFx(dest, from.copies), c.x, c.y); }
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <Stage>
        <div className="relative flex h-full flex-col px-5 py-3">
          <Hud />

          <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-8">
            {/* TEAM — on the arena floor */}
            <Lane>
              {state.team.map((m, i) => (
                <TeamSlot key={i} index={i} monster={m ?? null} />
              ))}
              <div className="mb-7 ml-1">
                <Signpost label="Battle" arrow />
              </div>
            </Lane>

            {/* SHOP — recruits on crates */}
            <Lane>
              <div className="mb-7 mr-1">
                <Signpost label="Shop" />
              </div>
              {monsterPreviews.map((preview, i) => (
                <ShopMonsterPedestal
                  key={`${state.seed}:m${i}`}
                  slot={i}
                  monster={preview}
                  frozen={state.shop.frozenMonsters[i] ?? false}
                  affordable={affordMonster}
                  onFreeze={() => actions.freezeMonster(i)}
                  onQuickBuy={() => actions.buyMonster(i)}
                />
              ))}
              <div className="mx-1 mb-12 h-14 w-px bg-black/15" />
              {state.shop.itemSlots.map((item, i) => (
                <ShopItemPedestal
                  key={`${state.seed}:i${i}`}
                  slot={i}
                  item={item}
                  frozen={state.shop.frozenItems[i] ?? false}
                  affordable={affordItem}
                  onFreeze={() => actions.freezeItem(i)}
                />
              ))}
            </Lane>
          </div>

          {/* corner controls */}
          <div className="absolute bottom-4 left-5">
            <WoodButton label="Roll" icon="🎲" onClick={actions.reroll} disabled={state.gold < CONFIG.rerollCost} />
          </div>
          <div className="absolute bottom-4 right-5">
            <WoodButton label="End turn" icon="⚔️" onClick={actions.startBattle} disabled={teamN === 0} />
          </div>
        </div>
      </Stage>

      <DragOverlay dropAnimation={null}>
        {activeDrag && (
          <div style={{ transform: 'rotate(3deg)' }}>
            <DragGhost active={activeDrag} previews={monsterPreviews} />
          </div>
        )}
      </DragOverlay>

      <FxOverlay effects={effects} remove={removeFx} />
    </DndContext>
  );
}

function Lane({ children }: { children: ReactNode }) {
  return <div className="flex items-end justify-center gap-1">{children}</div>;
}

function DragGhost({ active, previews }: { active: DragData; previews: (ReturnType<typeof makeInstance> | null)[] }) {
  const { state } = useGame();
  if (active.kind === 'shop-monster') {
    const p = previews[active.slot];
    return p ? <PetFigure monster={p} interactive={false} lifted facing="left" /> : null;
  }
  if (active.kind === 'shop-item') {
    const it = state.shop.itemSlots[active.slot];
    return it ? <ItemFigure item={it} lifted /> : null;
  }
  const m = state.team[active.index];
  return m ? <PetFigure monster={m} interactive={false} lifted /> : null;
}
