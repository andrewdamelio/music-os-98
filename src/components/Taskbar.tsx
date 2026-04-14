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

          {/* ICQ */}
          <div title="ICQ — You've got a message!" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '1px 2px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block' }}>
              {/* 8 petals */}
              <circle cx="7"   cy="3.8" r="2" fill="#2ec82e" />
              <circle cx="9.3" cy="4.8" r="2" fill="#26b226" />
              <circle cx="10.2" cy="7" r="2" fill="#2ec82e" />
              <circle cx="9.3" cy="9.2" r="2" fill="#26b226" />
              <circle cx="7"   cy="10.2" r="2" fill="#2ec82e" />
              <circle cx="4.7" cy="9.2" r="2" fill="#26b226" />
              <circle cx="3.8" cy="7" r="2" fill="#2ec82e" />
              <circle cx="4.7" cy="4.8" r="2" fill="#26b226" />
              {/* Centre */}
              <circle cx="7" cy="7" r="2.9" fill="#ffe033" />
              <circle cx="7" cy="7" r="1.4" fill="#e6c200" />
            </svg>
          </div>

          {/* Dial-up connection */}
          <div title="Dial-Up Networking — Connected at 56Kbps" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '1px 2px' }}>
            <svg width="20" height="14" viewBox="0 0 20 14" style={{ display: 'block' }}>
              {/* Left monitor */}
              <rect x="0.5" y="2" width="5.5" height="4.5" rx="0.5" fill="#d4d0c8" stroke="#888" strokeWidth="0.5"/>
              <rect x="1"   y="2.4" width="4.5" height="3.6" fill="#000080"/>
              <rect x="2.2" y="6.5" width="2" height="0.9" fill="#a0a0a0"/>
              <rect x="1.5" y="7.3" width="3.5" height="0.6" fill="#808080"/>
              {/* Signal squiggle */}
              <path d="M6 4.5 C8 2, 10 7, 12 4" stroke="#ff8800" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
              {/* Right monitor */}
              <rect x="14" y="2" width="5.5" height="4.5" rx="0.5" fill="#d4d0c8" stroke="#888" strokeWidth="0.5"/>
              <rect x="14.5" y="2.4" width="4.5" height="3.6" fill="#000080"/>
              <rect x="15.8" y="6.5" width="2" height="0.9" fill="#a0a0a0"/>
              <rect x="15"   y="7.3" width="3.5" height="0.6" fill="#808080"/>
              {/* Activity lights — green TX left, amber RX right */}
              <circle cx="5.2" cy="2.7" r="0.7" fill="#00e000"/>
              <circle cx="14.8" cy="2.7" r="0.7" fill="#ffaa00"/>
            </svg>
          </div>

          <span title="Audio active" style={{ fontSize: 12 }}>🔊</span>
          <span style={{ fontSize: 10 }}>{clock}</span>
        </div>
      </div>
    </>
  );
}
