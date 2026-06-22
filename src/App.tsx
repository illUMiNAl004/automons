import { GameProvider } from './ui/state/store';
import { ShopScreen } from './ui/screens/ShopScreen';

function App() {
  return (
    <GameProvider>
      <ShopScreen />
    </GameProvider>
  );
}

export default App;
