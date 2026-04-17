import { useOSStore, APPS } from '../store';
import Taskbar from './Taskbar';
import ContextMenu from './ContextMenu';
import TransportBar from './TransportBar';
import Window from './Window';
import { useEffect, useCallback, useMemo, useRef, useState } from 'react';

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
import MilkDrop from '../apps/MilkDrop';
import FreeCell from '../apps/FreeCell';
import Minesweeper, { MinesweeperIcon } from '../apps/Minesweeper';
import scmpoo103 from '../assets/scmpoo103.png';
import DesktopPet from './DesktopPet';
import SubSeven from '../apps/SubSeven';
import ControlPanel from '../apps/ControlPanel';
import ICQ from '../apps/ICQ';
import Napster, { NapsterCatIcon } from '../apps/Napster';

function SubSevenIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="s7metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#e8eef8" />
          <stop offset="18%"  stopColor="#ffffff" />
          <stop offset="38%"  stopColor="#b8c8d8" />
          <stop offset="55%"  stopColor="#8898a8" />
          <stop offset="72%"  stopColor="#d0dce8" />
          <stop offset="88%"  stopColor="#a0b0c0" />
          <stop offset="100%" stopColor="#687888" />
        </linearGradient>
        <linearGradient id="s7shine" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="40%"  stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
        <filter id="s7shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1.5" dy="2" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.8"/>
        </filter>
      </defs>
      {/* Navy background */}
      <rect width="32" height="32" fill="#0d2244" rx="1"/>
      {/* The "7" shape — thick chunky bold serif 7 */}
      {/* Top horizontal bar */}
      <path
        d="M5,4 L27,4 L27,9 L5,9 Z"
        fill="url(#s7metal)" filter="url(#s7shadow)"
      />
      {/* Diagonal stem going bottom-right */}
      <path
        d="M17,9 L27,9 L20,28 L10,28 Z"
        fill="url(#s7metal)" filter="url(#s7shadow)"
      />
      {/* Shine overlay on top bar */}
      <path d="M5,4 L27,4 L27,6.5 L5,6.5 Z" fill="url(#s7shine)" opacity="0.6"/>
      {/* Shine overlay on stem left edge */}
      <path d="M10,10 L14,10 L11,24 L10,28 L9,28 Z" fill="url(#s7shine)" opacity="0.4"/>
    </svg>
  );
}

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
  MilkDrop,
  FreeCell,
  Minesweeper,
  SubSeven,
  ControlPanel,
  ICQ,
  Napster,
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
  { id: 'pad-machine', label: 'Pad Machine', icon: '🎶' },
  { id: 'ski-free', label: 'SkiFree', icon: '⛷️' },
  { id: 'screen-mate', label: 'Screen Mate Poo', icon: '🐑', iconImg: { src: scmpoo103, frame: 0 } },
  { id: 'freecell', label: 'FreeCell', icon: '🃏' },
  { id: 'minesweeper', label: 'Minesweeper', icon: '💣', iconSvg: true },
  { id: 'milkdrop', label: 'MilkDrop Viz', icon: '🌊' },
  { id: 'sub-seven', label: 'SubSeven', icon: '💀', iconSvg: true },
  { id: 'napster', label: 'Napster', icon: '🐱', iconSvg: true },
];

// Per-icon box size used to compute the default grid layout.
const ICON_GRID_W = 80;
const ICON_GRID_H = 72;
const ICON_MARGIN = 12;

type IconPositions = Record<string, { x: number; y: number }>;

function defaultIconPositions(ids: string[]): IconPositions {
  const rowsPerCol = Math.max(1, Math.floor((window.innerHeight - 140) / ICON_GRID_H));
  const out: IconPositions = {};
  ids.forEach((id, i) => {
    const col = Math.floor(i / rowsPerCol);
    const row = i % rowsPerCol;
    out[id] = { x: ICON_MARGIN + col * ICON_GRID_W, y: ICON_MARGIN + row * ICON_GRID_H };
  });
  return out;
}

export default function Desktop() {
  const { windows, openApp, showContextMenu, hideContextMenu, setStartMenuOpen,
    isPlaying, play, stop, saveProject, loadProjectFromJSON, loadDefaultPattern,
    clearDrumPattern, setProjectName } = useOSStore();
  const [wallpaperIdx, setWallpaperIdx] = useState(() => {
    const saved = localStorage.getItem('musicOS98_wallpaper');
    return saved ? parseInt(saved, 10) % WALLPAPERS.length : 0;
  });
  const [petVisible, setPetVisible] = useState(() => localStorage.getItem('musicOS98_pet') === '1');
  const loadFileRef = useRef<HTMLInputElement>(null);

  const [iconPositions, setIconPositions] = useState<IconPositions>(() => {
    try {
      const raw = localStorage.getItem('musicOS98_iconPositions');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  // Merge saved positions with defaults so newly-added icons still appear even
  // if the user had saved a prior layout.
  const effectivePositions = useMemo(() => {
    const defaults = defaultIconPositions(DESKTOP_ICONS.map(i => i.id));
    return { ...defaults, ...iconPositions };
  }, [iconPositions]);

  const desktopAreaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean } | null>(null);

  const rearrangeIcons = useCallback(() => {
    setIconPositions({});
    try { localStorage.removeItem('musicOS98_iconPositions'); } catch {}
  }, []);

  // Global drag handlers — one mousemove/mouseup pair handles every icon.
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const s = dragRef.current;
      if (!s) return;
      if (!s.moved && Math.hypot(e.clientX - s.startX, e.clientY - s.startY) > 3) {
        s.moved = true;
      }
      if (!s.moved) return;
      const area = desktopAreaRef.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width  - ICON_GRID_W, e.clientX - rect.left - s.offsetX));
      const y = Math.max(0, Math.min(rect.height - ICON_GRID_H, e.clientY - rect.top  - s.offsetY));
      setIconPositions(prev => ({ ...prev, [s.id]: { x, y } }));
    };
    const up = () => {
      const s = dragRef.current;
      if (s && s.moved) {
        setIconPositions(prev => {
          try { localStorage.setItem('musicOS98_iconPositions', JSON.stringify(prev)); } catch {}
          return prev;
        });
      }
      dragRef.current = null;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  // SubSeven fun effect: rotate wallpaper
  useEffect(() => {
    const handler = () => setWallpaperIdx(i => {
      const next = (i + 1) % WALLPAPERS.length;
      localStorage.setItem('musicOS98_wallpaper', String(next));
      return next;
    });
    window.addEventListener('s7:rotate-wallpaper', handler);
    return () => window.removeEventListener('s7:rotate-wallpaper', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) stop(); else play();
        return;
      }
      // Undo / redo — Cmd+Z on Mac, Ctrl+Z on Windows. Shift adds redo.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const { undo, redo } = useOSStore.getState();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      // Ctrl+Y also redoes on Windows convention
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        useOSStore.getState().redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, play, stop]);

  const handleDesktopContextMenu = useCallback((e: React.MouseEvent) => {
    // Only fire for clicks directly on the desktop background — not on icons
    // (which stop propagation) or on windows (siblings of the .desktop-area node).
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      {
        label: '🎨 Change Wallpaper', action: () => setWallpaperIdx(i => {
          const next = (i + 1) % WALLPAPERS.length;
          localStorage.setItem('musicOS98_wallpaper', String(next));
          return next;
        }),
      },
      { label: '📐 Arrange Icons', action: rearrangeIcons },
      { label: '🔊 Audio Control Panel', action: () => openApp('control-panel') },
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
  }, [showContextMenu, openApp, saveProject, clearDrumPattern, loadDefaultPattern, setProjectName, rearrangeIcons]);

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
      {/* Desktop icons — absolutely-positioned, draggable, positions persisted.
          The .desktop-area background owns the right-click menu (scoped via
          target===currentTarget so icons and windows don't trigger it). */}
      <div
        ref={desktopAreaRef}
        className="desktop-area"
        style={{ padding: 0 }}
        onContextMenu={handleDesktopContextMenu}
      >
        {DESKTOP_ICONS.map(icon => {
          const pos = effectivePositions[icon.id] ?? { x: ICON_MARGIN, y: ICON_MARGIN };
          return (
            <div
              key={icon.id}
              className="desktop-icon"
              style={{ position: 'absolute', left: pos.x, top: pos.y }}
              onMouseDown={e => {
                if (e.button !== 0) return;
                const area = desktopAreaRef.current;
                if (!area) return;
                const rect = area.getBoundingClientRect();
                dragRef.current = {
                  id: icon.id,
                  offsetX: e.clientX - rect.left - pos.x,
                  offsetY: e.clientY - rect.top  - pos.y,
                  startX: e.clientX,
                  startY: e.clientY,
                  moved: false,
                };
                // prevent text-selection while dragging; double-click still fires.
                e.preventDefault();
              }}
              onDoubleClick={() => {
                if (icon.id === 'screen-mate') { setPetVisible(v => { const next = !v; localStorage.setItem('musicOS98_pet', next ? '1' : '0'); return next; }); return; }
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
              {(icon as { iconImg?: { src: string; frame: number } }).iconImg ? (
                <div style={{
                  width: 32, height: 32, flexShrink: 0,
                  backgroundImage: `url(${(icon as { iconImg: { src: string; frame: number } }).iconImg.src})`,
                  backgroundPosition: `-${(icon as { iconImg: { src: string; frame: number } }).iconImg.frame * 32}px 0`,
                  backgroundSize: 'auto 32px',
                  imageRendering: 'pixelated',
                  pointerEvents: 'none',
                }} />
              ) : (icon as { iconSvg?: boolean }).iconSvg ? (
                <div style={{ pointerEvents: 'none' }}>
                  {icon.id === 'napster' ? <NapsterCatIcon size={32} />
                    : icon.id === 'minesweeper' ? <MinesweeperIcon size={32} />
                    : <SubSevenIcon size={32} />}
                </div>
              ) : (
                <div className="desktop-icon-emoji" style={{ pointerEvents: 'none' }}>{icon.icon}</div>
              )}
              <div className="desktop-icon-label" style={{ pointerEvents: 'none' }}>{icon.label}</div>
            </div>
          );
        })}
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
