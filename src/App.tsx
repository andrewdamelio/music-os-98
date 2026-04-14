import { useOSStore } from './store';
import BootScreen from './components/BootScreen';
import Desktop from './components/Desktop';

export default function App() {
  const booted = useOSStore(s => s.booted);

  return booted ? <Desktop /> : <BootScreen />;
}
