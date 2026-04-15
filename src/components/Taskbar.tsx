import { useEffect, useState } from 'react';
import { useOSStore } from '../store';
import StartMenu from './StartMenu';
import { ICQ_STATUS_CONFIG } from '../apps/ICQ';

export default function Taskbar() {
  const { windows, focusedWindowId, openApp, minimizeWindow, restoreWindow, focusWindow, startMenuOpen, setStartMenuOpen, icqStatus } = useOSStore();
  const [clock, setClock] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);

  const nonMinimizedVisible = windows;

  return (
    <>
      {startMenuOpen && <StartMenu />}

      <div className="taskbar">
        {/* Start button */}
        <button
          className={`start-btn${startMenuOpen ? ' open' : ''}`}
          onClick={e => { e.stopPropagation(); setStartMenuOpen(!startMenuOpen); }}
        >
          <span style={{ fontSize: 14 }}>🎵</span>
          <span>Start</span>
        </button>

        <div className="taskbar-separator" />

        {/* Transport quick-launch icons */}
        {[
          { id: 'drum-machine', icon: '🥁' },
          { id: 'synth', icon: '🎹' },
          { id: 'mixer', icon: '🎚️' },
          { id: 'piano-roll', icon: '🎼' },
          { id: 'fx-rack', icon: '🎛️' },
        ].map(q => (
          <div
            key={q.id}
            style={{
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 14, border: '1px solid transparent', borderRadius: 2,
            }}
            title={q.id}
            onClick={() => openApp(q.id)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#b0b0b0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {q.icon}
          </div>
        ))}

        <div className="taskbar-separator" />

        {/* Open windows */}
        <div className="taskbar-windows">
          {nonMinimizedVisible.map(win => {
            const app = win;
            const isActive = focusedWindowId === win.instanceId && !win.minimized;
            return (
              <button
                key={win.instanceId}
                className={`taskbar-win-btn${isActive ? ' active' : ''}`}
                title={win.title}
                onClick={() => {
                  if (win.minimized) {
                    restoreWindow(win.instanceId);
                  } else if (isActive) {
                    minimizeWindow(win.instanceId);
                  } else {
                    focusWindow(win.instanceId);
                  }
                }}
              >
                <span style={{ fontSize: 12 }}>{win.minimized ? '📌' : ''}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {win.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* System tray */}
        <div className="taskbar-tray">

          {/* ICQ — flower logo, color reflects status */}
          {(() => {
            const petalColor = ICQ_STATUS_CONFIG[icqStatus].petal;
            const tip = `ICQ — ${ICQ_STATUS_CONFIG[icqStatus].label} (UIN: 1337420)\nDouble-click to open`;
            return (
              <div title={tip} onClick={() => openApp('icq')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '1px 4px' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'block' }}>
                  <g transform="translate(8,8)">
                    {[0,45,90,135,180,225,270,315].map(r => (
                      <ellipse key={r} cx="0" cy="-4.0" rx="2.1" ry="3.1" fill="black" transform={`rotate(${r})`} />
                    ))}
                    {[0,45,90,135,180,270,315].map(r => (
                      <ellipse key={r} cx="0" cy="-4.0" rx="1.5" ry="2.5" fill={petalColor} transform={`rotate(${r})`} />
                    ))}
                    <ellipse cx="0" cy="-4.0" rx="1.5" ry="2.5" fill="#ee0000" transform="rotate(225)" />
                    <circle cx="0" cy="0" r="2.0" fill="black" />
                    <circle cx="0" cy="0" r="1.4" fill="#ffcc00" />
                  </g>
                </svg>
              </div>
            );
          })()}

          <span title="Audio active" style={{ fontSize: 12 }}>🔊</span>
          <span style={{ fontSize: 10 }}>{clock}</span>
        </div>
      </div>
    </>
  );
}
