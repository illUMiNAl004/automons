// ============================================================================
// EndScreen.tsx — Run over: a victory (10 trophies) or defeat (0 lives) screen
// over the meadow, with the final tally and a New Run button.
// ============================================================================

import { motion } from 'framer-motion';
import { useGame } from '../state/store';
import { Stage } from '../components/Stage';
import { WoodButton } from '../components/WoodButton';
import { MOTION } from '../theme';
import { CONFIG } from '../../engine/config';

export function EndScreen() {
  const { state, actions } = useGame();
  const won = state.phase === 'won';

  return (
    <Stage>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-7" style={{ background: 'rgba(8,10,20,0.45)' }}>
        <motion.div
          initial={{ scale: 0.4, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={MOTION.pop}
          className="flex flex-col items-center rounded-3xl px-16 py-9"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          <div className="text-7xl">{won ? '🏆' : '💀'}</div>
          <div className="mt-2 text-6xl font-black" style={{ color: won ? '#ffd24a' : '#ff6b73', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            {won ? 'YOU WIN!' : 'GAME OVER'}
          </div>
          <div className="mt-3 text-xl font-bold text-white/85">
            {won ? `Reached ${CONFIG.winTrophies} trophies!` : `Survived ${state.turn} turn${state.turn === 1 ? '' : 's'}`}
          </div>
          <div className="mt-1 text-base font-semibold text-white/60">
            🏆 {state.trophies}/{CONFIG.winTrophies} · ❤️ {state.lives}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <WoodButton label="New Run" icon="↺" onClick={actions.reset} />
        </motion.div>
      </div>
    </Stage>
  );
}
