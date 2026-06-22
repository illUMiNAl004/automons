// ============================================================================
// TitleScreen.tsx — The front door. Big AUTOMONS logo in the world's art
// language (extruded, element-colored letters), a Start Run button, and a row
// of hero creatures idling along the meadow floor.
// ============================================================================

import { motion } from 'framer-motion';
import { useGame } from '../state/store';
import { Stage } from '../components/Stage';
import { PetFigure } from '../components/Pet';
import { WoodButton } from '../components/WoodButton';
import { ELEMENTS, TYPE, type ElementKey } from '../theme';
import { makeInstance } from '../../engine/battle';
import { getMonsterDef } from '../../engine/data/monsters';

const LETTERS: [string, ElementKey][] = [
  ['A', 'fire'], ['U', 'water'], ['T', 'nature'], ['O', 'earth'],
  ['M', 'fire'], ['O', 'water'], ['N', 'nature'], ['S', 'earth'],
];

const HEROES = ['cinderpup', 'dewdrop', 'bloomtail', 'terrapex'].map((id, i) =>
  makeInstance(getMonsterDef(id), `title-${i}`),
);

export function TitleScreen() {
  const { actions } = useGame();
  return (
    <Stage>
      <div className="relative flex h-full flex-col items-center px-6 pt-[10vh]">
        {/* logo */}
        <div className="flex select-none" style={{ fontSize: TYPE.title, fontWeight: 700, lineHeight: 1 }}>
          {LETTERS.map(([ch, el], i) => (
            <motion.span
              key={i}
              initial={{ y: -40, opacity: 0, rotate: -10 }}
              animate={{ y: 0, opacity: 1, rotate: i % 2 ? 2 : -2 }}
              transition={{ delay: 0.06 * i, type: 'spring', stiffness: 320, damping: 13 }}
              style={{
                color: ELEMENTS[el].from,
                WebkitTextStroke: `2px ${ELEMENTS[el].dark}`,
                textShadow: `0 5px 0 ${ELEMENTS[el].dark}, 0 8px 16px rgba(0,0,0,0.45)`,
                marginInline: -1,
              }}
            >
              {ch}
            </motion.span>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-3 text-lg font-semibold text-white"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          An elemental auto-battler
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mt-8">
          <WoodButton label="Start Run" icon="▶" onClick={actions.startRun} />
        </motion.div>

        {/* hero line-up idling on the grass */}
        <div className="absolute inset-x-0 bottom-6 flex items-end justify-center gap-4">
          {HEROES.map((m, i) => (
            <motion.div key={m.instanceId} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + i * 0.1 }}>
              <PetFigure monster={m} interactive={false} facing={i < 2 ? 'right' : 'left'} />
            </motion.div>
          ))}
        </div>
      </div>
    </Stage>
  );
}
