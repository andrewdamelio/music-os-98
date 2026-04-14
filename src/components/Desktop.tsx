import { useOSStore, APPS } from '../store';
import Taskbar from './Taskbar';
import ContextMenu from './ContextMenu';
import TransportBar from './TransportBar';
import Window from './Window';
import { useEffect, useCallback, useRef, useState } from 'react';

const WALLPAPERS = [
  // Dark
  'radial-gradient(ellipse at center, #0a0a2e 0%, #000010 100%)',
  'radial-gradient(ellipse at top left, #1a0a2e 0%, #000830 60%, #000010 100%)',
  'radial-gradient(ellipse at bottom right, #0a1a0e 0%, #002010 60%, #000010 100%)',
  'radial-gradient(ellipse at center, #1a0808 0%, #200000 60%, #000010 100%)',
  'linear-gradient(135deg, #000830 0%, #0a0a2e 50%, #001020 100%)',
  'linear-gradient(180deg, #0a0020 0%, #000830 50%, #001830 100%)',
  // Mid
  'linear-gradient(135deg, #1a1a3e 0%, #0e1a2e 50%, #1a0e2e 100%)',
  'radial-gradient(ellipse at top, #2a1040 0%, #0a0820 60%, #0e0e18 100%)',
  'linear-gradient(160deg, #0e2a20 0%, #0a1e30 40%, #1a0a28 100%)',
  'radial-gradient(ellipse at bottom left, #2a1820 0%, #1a0e18 50%, #0a0a1e 100%)',
  // Light
  'linear-gradient(135deg, #c8d8f0 0%, #a8bce0 50%, #d0c8f0 100%)',
  'radial-gradient(ellipse at top, #e8f0ff 0%, #c0d0f0 60%, #d8e8ff 100%)',
  'linear-gradient(180deg, #f0f4ff 0%, #d8e8f8 50%, #e8f0ff 100%)',
  'linear-gradient(135deg, #e0f0e8 0%, #c8e0d8 50%, #d8eee8 100%)',
  'radial-gradient(ellipse at center, #fff0e8 0%, #f0d8cc 60%, #ffe8e0 100%)',
  // Vivid
  'linear-gradient(135deg, #0a0a1e 0%, #1a0a30 30%, #0a1a10 70%, #000818 100%)',
  'radial-gradient(ellipse at 30% 40%, #200840 0%, #080420 50%, #001810 100%)',
];

// App components
import DrumMachine from '../apps/DrumMachine';
import Synth from '../apps/Synth';
import Mixer from '../apps/Mixer';
import PianoRoll from '../apps/PianoRoll';
import FXRack from '../apps/FXRack';
import Sampler from '../apps/Sampler';
import TapeDeck from '../apps/TapeDeck';
import FileBrowser from '../apps/FileBrowser';
import TempoCalc from '../apps/TempoCalc';
import Help from '../apps/Help';
import Oscilloscope from '../apps/Oscilloscope';
import PadMachine from '../apps/PadMachine';
import SkiFree from '../apps/SkiFree';
import Compressor from '../apps/Compressor';
import EQ from '../apps/EQ';
import DesktopPet from './DesktopPet';

const APP_MAP: Record<string, React.ComponentType> = {
  DrumMachine,
  Synth,
  Mixer,
  PianoRoll,
  FXRack,
  Sampler,
  TapeDeck,
  FileBrowser,
  TempoCalc,
  Help,
  Oscilloscope,
  PadMachine,
  SkiFree,
  Compressor,
  EQ,
};

const DESKTOP_ICONS = [
  { id: 'drum-machine', label: 'Beat Machine', icon: '🥁' },
  { id: 'synth', label: 'SynthStation', icon: '🎹' },
  { id: 'mixer', label: 'Mixer', icon: '🎚️' },
  { id: 'piano-roll', label: 'Piano Roll', icon: '🎼' },
  { id: 'fx-rack', label: 'FX Rack', icon: '🎛️' },
  { id: 'sampler', label: 'Sampler', icon: '💿' },
  { id: 'tape-deck', label: 'Tape Deck', icon: '📼' },
  { id: 'file-browser', label: 'Sample Library', icon: '📁' },
  { id: 'oscilloscope', label: 'Oscilloscope', icon: '📊' },
  { id: 'compressor', label: 'Compressor', icon: '🔊' },
  { id: 'eq', label: 'Parametric EQ', icon: '🎛️' },
  { id: 'tempo-calc', label: 'Tempo Calc', icon: '🔢' },
  { id: 'pad-machine', label: 'Pad Machine', icon: '🎮' },
  { id: 'ski-free', label: 'SkiFree', icon: '⛷️' },
  { id: 'screen-mate', label: 'ScreenMate', icon: '🐑' },
  { id: 'help', label: 'Help', icon: '❓' },
];

export default function Desktop() {
  const { windows, openApp, showContextMenu, hideContextMenu, setStartMenuOpen,
    isPlaying, play, stop, saveProject, loadProjectFromJSON, loadDefaultPattern,
    clearDrumPattern, setProjectName } = useOSStore();
  const [wallpaperIdx, setWallpaperIdx] = useState(() => {
    const saved = localStorage.getItem('musicOS98_wallpaper');
    return saved ? parseInt(saved, 10) % WALLPAPERS.length : 0;
  });
  const [petVisible, setPetVisible] = useState(false);
  const loadFileRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) stop(); else play();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, play, stop]);

  const handleDesktopContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      {
        label: '🎨 Change Wallpaper', action: () => setWallpaperIdx(i => {
          const next = (i + 1) % WALLPAPERS.length;
          localStorage.setItem('musicOS98_wallpaper', String(next));
          return next;
        }),
      },
      { label: '⚙️ Audio Settings (FX Rack)', action: () => openApp('fx-rack') },
      { separator: true, label: '', action: () => {} },
      {
        label: '🆕 New Project', action: () => {
          if (!window.confirm('Clear current project and start new?')) return;
          clearDrumPattern();
          loadDefaultPattern();
          setProjectName('Untitled Project');
          useOSStore.getState().setPianoNotes([]);
        },
      },
      { label: '💾 Save Project', action: saveProject },
      { label: '📂 Open Project...', action: () => loadFileRef.current?.click() },
      { separator: true, label: '', action: () => {} },
      { label: 'ℹ️ About MusicOS 98', action: () => openApp('help') },
    ]);
  }, [showContextMenu, openApp, saveProject, clearDrumPattern, loadDefaultPattern, setProjectName]);

  const getAppComponent = (appId: string) => {
    const app = APPS.find(a => a.id === appId);
    if (!app) return null;
    return APP_MAP[app.component];
  };

  return (
    <div
      className="desktop"
      style={{ background: WALLPAPERS[wallpaperIdx] }}
      onClick={() => { hideContextMenu(); setStartMenuOpen(false); }}
      onContextMenu={handleDesktopContextMenu}
    >
      {/* Hidden file input for project loading */}
      <input
        ref={loadFileRef}
        type="file"
        accept=".mos98,.json"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => {
            const text = ev.target?.result;
            if (typeof text === 'string') loadProjectFromJSON(text);
          };
          reader.readAsText(file);
          e.target.value = '';
        }}
      />
      {/* Desktop icons */}
      <div className="desktop-area">
        <div style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap', gap: 8, maxHeight: 'calc(100vh - 80px)', alignContent: 'flex-start' }}>
          {DESKTOP_ICONS.map(icon => (
            <div
              key={icon.id}
              className="desktop-icon"
              onDoubleClick={() => {
                if (icon.id === 'screen-mate') { setPetVisible(v => !v); return; }
                openApp(icon.id);
              }}
              onContextMenu={e => {
                e.stopPropagation();
                e.preventDefault();
                showContextMenu(e.clientX, e.clientY, [
                  { label: `Open ${icon.label}`, action: () => openApp(icon.id) },
                ]);
              }}
            >
              <div className="desktop-icon-emoji">{icon.icon}</div>
              <div className="desktop-icon-label">{icon.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Windows */}
      {windows.map(win => {
        const AppComponent = getAppComponent(win.appId);
        const app = APPS.find(a => a.id === win.appId);
        if (!AppComponent) return null;
        return (
          <Window key={win.instanceId} win={win} icon={app?.icon}>
            <AppComponent />
          </Window>
        );
      })}

      {/* Transport */}
      <TransportBar />

      {/* Taskbar */}
      <Taskbar />

      {/* Context menu */}
      <ContextMenu />

      {/* Desktop pet — roams freely over everything */}
      <DesktopPet visible={petVisible} />
    </div>
  );
}
