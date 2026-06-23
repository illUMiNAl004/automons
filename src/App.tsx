import { AnimatePresence, motion } from 'framer-motion';
import { GameProvider, useGame } from './ui/state/store';
import { TitleScreen } from './ui/screens/TitleScreen';
import { ShopScreen } from './ui/screens/ShopScreen';
import { BattleScene } from './ui/screens/BattleScene';
import { EndScreen } from './ui/screens/EndScreen';
import { MOTION } from './ui/theme';

/** Top-level router: the screen is purely a function of the run phase, with a
 *  camera-push / fade transition between phases. */
function Game() {
  const { state } = useGame();

  let key: string;
  let screen: React.ReactNode;
  if (state.phase === 'title') {
    key = 'title';
    screen = <TitleScreen />;
  } else if (state.phase === 'battle') {
    key = 'battle';
    screen = <BattleScene />;
  } else if (state.phase === 'won' || state.phase === 'lost') {
    key = 'end';
    screen = <EndScreen />;
  } else {
    key = 'shop'; // shop (and the transient 'result' before it advances)
    screen = <ShopScreen />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        className="h-screen w-full"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.5, ease: MOTION.ease }}
      >
        {screen}
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}

export default App;
