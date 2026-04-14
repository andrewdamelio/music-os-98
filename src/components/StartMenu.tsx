import { useState } from 'react';
import { useOSStore } from '../store';

interface AppItem {
  label: string;
  icon: string;
  appId?: string;
  action?: () => void;
}

interface Category {
  label: string;
  icon: string;
  items: AppItem[];
}

type TopItem =
  | { kind: 'category'; label: string; icon: string; items: AppItem[] }
  | { kind: 'separator' }
  | { kind: 'action'; label: string; icon: string; action: () => void };

const MENU: TopItem[] = [
  {
    kind: 'category', label: 'Instruments', icon: '🎵',
    items: [
      { label: 'Beat Machine',  icon: '🥁', appId: 'drum-machine' },
      { label: 'SynthStation',  icon: '🎹', appId: 'synth' },
      { label: 'Pad Machine',   icon: '🎮', appId: 'pad-machine' },
      { label: 'Sampler',       icon: '💿', appId: 'sampler' },
    ],
  },
  {
    kind: 'category', label: 'Sequencers', icon: '🎼',
    items: [
      { label: 'Piano Roll', icon: '🎼', appId: 'piano-roll' },
    ],
  },
  {
    kind: 'category', label: 'Mixing & FX', icon: '🎛️',
    items: [
      { label: 'Mixer',        icon: '🎚️', appId: 'mixer' },
      { label: 'FX Rack',      icon: '🎛️', appId: 'fx-rack' },
      { label: 'Oscilloscope', icon: '📊', appId: 'oscilloscope' },
    ],
  },
  {
    kind: 'category', label: 'Utilities', icon: '🔧',
    items: [
      { label: 'Tape Deck',      icon: '📼', appId: 'tape-deck' },
      { label: 'Sample Library', icon: '📁', appId: 'file-browser' },
      { label: 'Tempo Calc',     icon: '🔢', appId: 'tempo-calc' },
    ],
  },
  {
    kind: 'category', label: 'Games & Fun', icon: '🎮',
    items: [
      { label: 'SkiFree',    icon: '⛷️', appId: 'ski-free' },
      { label: 'ScreenMate', icon: '🐑', appId: 'screen-mate' },
    ],
  },
  {
    kind: 'category', label: 'System', icon: '💻',
    items: [
      { label: 'Disk Defragmenter', icon: '💽', appId: 'defrag' },
      { label: 'Help & Manual',     icon: '❓', appId: 'help' },
    ],
  },
  { kind: 'separator' },
  {
    kind: 'action', label: 'Shut Down...', icon: '🔌',
    action: () => { if (window.confirm('Shut down MusicOS 98?')) window.close(); },
  },
];

export default function StartMenu() {
  const { openApp, setStartMenuOpen } = useOSStore();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const close = () => {
    setStartMenuOpen(false);
    setOpenCategory(null);
  };

  const launch = (item: AppItem) => {
    close();
    if (item.appId) openApp(item.appId);
    if (item.action) item.action();
  };

  return (
    <div className="start-menu" onClick={e => e.stopPropagation()}>
      <div className="start-menu-sidebar">
        <span>MusicOS 98</span>
      </div>

      <div className="start-menu-items" style={{ position: 'relative' }}>
        {MENU.map((item, i) => {
          if (item.kind === 'separator') {
            return <div key={i} className="start-menu-separator" />;
          }

          if (item.kind === 'action') {
            return (
              <div
                key={i}
                className="start-menu-item"
                onClick={() => { close(); item.action(); }}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          }

          // category with flyout
          const isOpen = openCategory === item.label;
          return (
            <div key={i} style={{ position: 'relative' }}>
              <div
                className={`start-menu-item${isOpen ? ' active' : ''}`}
                onClick={() => setOpenCategory(isOpen ? null : item.label)}
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="icon">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                <span style={{ fontSize: 9, opacity: 0.7 }}>▶</span>
              </div>

              {isOpen && (
                <div style={{
                  position: 'absolute',
                  left: '100%',
                  top: 0,
                  background: 'var(--w98-bg)',
                  border: '2px solid',
                  borderColor: 'var(--w98-white) var(--w98-dark) var(--w98-dark) var(--w98-white)',
                  boxShadow: '4px 4px 8px rgba(0,0,0,0.5)',
                  minWidth: 170,
                  zIndex: 1,
                }}>
                  {item.items.map((sub, j) => (
                    <div
                      key={j}
                      className="start-menu-item"
                      onClick={() => launch(sub)}
                    >
                      <span className="icon">{sub.icon}</span>
                      <span>{sub.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
