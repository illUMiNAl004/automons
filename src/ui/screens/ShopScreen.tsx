// ============================================================================
// ShopScreen.tsx — The shop phase rendered as a living meadow scene. Pets stand
// on stone pedestals (team lane + shop lane); wooden signs label the areas;
// chunky Roll / End-turn buttons sit in the corners. Owns the DnD + juice.
// ============================================================================

import { useMemo, useRef, useState } from 'react';
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
import { Background } from '../components/Background';
import { Hud } from '../components/Hud';
import { Signpost } from '../components/Signpost';
import { WoodButton } from '../components/WoodButton';
import {
  PetFigure,
  ItemFigure,
  TeamSlot,
  ShopMonsterPedestal,
  ShopItemPedestal,
} from '../components/Pet';
import { FxOverlay, type Fx } from '../components/effects';
import type { DragData } from '../components/dnd';

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
      if (isMerge) { const c = slotCenter(over.index); spawn('merge', c.x, c.y); }
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
        if (isMerge) { const c = slotCenter(over.index); spawn('merge', c.x, c.y); }
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="relative min-h-screen w-full overflow-hidden">
        <Background />

        <div className="relative z-10 flex min-h-screen flex-col px-5 py-4">
          <Hud />

          <div className="flex flex-1 flex-col justify-center gap-1">
            {/* TEAM LANE */}
            <Lane>
              {state.team.map((m, i) => (
                <TeamSlot key={i} index={i} monster={m ?? null} />
              ))}
              <div className="mb-2 ml-1">
                <Signpost label="Battle" arrow />
              </div>
            </Lane>

            {/* SHOP LANE */}
            <Lane>
              <div className="mb-2 mr-1">
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
              <div className="mx-1 mb-6 h-16 w-px bg-black/15" />
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

          {/* CORNER CONTROLS */}
          <div className="flex items-end justify-between">
            <WoodButton label="Roll" icon="🎲" onClick={actions.reroll} disabled={state.gold < CONFIG.rerollCost} />
            <div className="mb-1 hidden text-center text-xs font-bold text-white/70 sm:block">
              <div>Drag a pet to buy · drop on a twin to merge</div>
              <div>Drag a teammate to the shop to sell · {teamN}/{CONFIG.benchMax} on team</div>
            </div>
            <WoodButton label="End turn" icon="⚔️" onClick={actions.nextTurn} />
          </div>
        </div>

        {/* lifted pet/item follows the cursor */}
        <DragOverlay dropAnimation={null}>
          {activeDrag && (
            <div style={{ transform: 'rotate(3deg)' }}>
              <DragGhost active={activeDrag} previews={monsterPreviews} />
            </div>
          )}
        </DragOverlay>

        <FxOverlay effects={effects} remove={removeFx} />
      </div>
    </DndContext>
  );
}

function Lane({ children }: { children: React.ReactNode }) {
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
