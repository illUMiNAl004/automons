import { GameProvider } from './ui/state/store';
import { ShopScreen } from './ui/screens/ShopScreen';
import { SURFACE } from './ui/theme';

function App() {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, ${SURFACE.bgTop} 0%, ${SURFACE.bgBottom} 70%)`,
      }}
    >
      <GameProvider>
        <ShopScreen />
      </GameProvider>
    </div>
  );
}

export default App;
