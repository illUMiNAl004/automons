import { GameProvider, useGame } from './ui/state/store';
import { ShopScreen } from './ui/screens/ShopScreen';
import { BattleScene } from './ui/screens/BattleScene';
import { EndScreen } from './ui/screens/EndScreen';

/** Top-level router: the screen is purely a function of the run phase. */
function Game() {
  const { state } = useGame();
  if (state.phase === 'battle') return <BattleScene />;
  if (state.phase === 'won' || state.phase === 'lost') return <EndScreen />;
  return <ShopScreen />; // shop (and the transient 'result' before it advances)
}

function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}

export default App;
