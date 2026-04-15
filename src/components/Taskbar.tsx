import { useEffect, useState } from 'react';
import { useOSStore } from '../store';
import StartMenu from './StartMenu';

export default function Taskbar() {
  const { windows, focusedWindowId, openApp, minimizeWindow, restoreWindow, focusWindow, startMenuOpen, setStartMenuOpen } = useOSStore();
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

          {/* ICQ — flower logo: 8 petals (7 green + 1 red), yellow center, black outline */}
          <div title="ICQ — You've got a message! (UIN: 1337420)" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '1px 2px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'block' }}>
              <g transform="translate(8,8)">
                {/* Black outline layer — slightly larger petals drawn first */}
                <ellipse cx="0" cy="-4.0" rx="2.1" ry="3.1" fill="black" />
                <ellipse cx="0" cy="-4.0" rx="2.1" ry="3.1" fill="black" transform="rotate(45)" />
                <ellipse cx="0" cy="-4.0" rx="2.1" ry="3.1" fill="black" transform="rotate(90)" />
                <ellipse cx="0" cy="-4.0" rx="2.1" ry="3.1" fill="black" transform="rotate(135)" />
                <ellipse cx="0" cy="-4.0" rx="2.1" ry="3.1" fill="black" transform="rotate(180)" />
                <ellipse cx="0" cy="-4.0" rx="2.1" ry="3.1" fill="black" transform="rotate(225)" />
                <ellipse cx="0" cy="-4.0" rx="2.1" ry="3.1" fill="black" transform="rotate(270)" />
                <ellipse cx="0" cy="-4.0" rx="2.1" ry="3.1" fill="black" transform="rotate(315)" />
                {/* Colored petals — 7 green, 1 red (lower-left at 225°) */}
                <ellipse cx="0" cy="-4.0" rx="1.5" ry="2.5" fill="#00ee00" />
                <ellipse cx="0" cy="-4.0" rx="1.5" ry="2.5" fill="#00ee00" transform="rotate(45)" />
                <ellipse cx="0" cy="-4.0" rx="1.5" ry="2.5" fill="#00ee00" transform="rotate(90)" />
                <ellipse cx="0" cy="-4.0" rx="1.5" ry="2.5" fill="#00ee00" transform="rotate(135)" />
                <ellipse cx="0" cy="-4.0" rx="1.5" ry="2.5" fill="#00ee00" transform="rotate(180)" />
                <ellipse cx="0" cy="-4.0" rx="1.5" ry="2.5" fill="#ee0000" transform="rotate(225)" />
                <ellipse cx="0" cy="-4.0" rx="1.5" ry="2.5" fill="#00ee00" transform="rotate(270)" />
                <ellipse cx="0" cy="-4.0" rx="1.5" ry="2.5" fill="#00ee00" transform="rotate(315)" />
                {/* Black center ring */}
                <circle cx="0" cy="0" r="2.0" fill="black" />
                {/* Yellow center dot */}
                <circle cx="0" cy="0" r="1.4" fill="#ffcc00" />
              </g>
            </svg>
          </div>

          <span title="Audio active" style={{ fontSize: 12 }}>🔊</span>
          <span style={{ fontSize: 10 }}>{clock}</span>
        </div>
      </div>
    </>
  );
}
