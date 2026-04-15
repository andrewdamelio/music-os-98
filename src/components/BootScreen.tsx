import { useEffect, useState } from 'react';
import { useOSStore } from '../store';
import { audioEngine } from '../audio/engine';

const BIOS_LINES = [
  'MusicOS BIOS v2.98',
  'Copyright (C) 1998 Beat Labs Inc.',
  '',
  'CPU: AudioX 440Hz Pentium II MMX',
  'Memory: 640K Conventional, 523264K Extended',
  'HD0: SAMPLES (8192 MB)',
  'HD1: PROJECTS (4096 MB)',
  '',
  'Audio Device: SoundBlaster AWE64 Gold',
  'MIDI: MPU-401 Compatible',
  '',
  'Press DEL to enter Setup... [skipping]',
  '',
  'Starting MusicOS 98...',
];

const LOAD_STEPS = [
  'Initializing audio subsystem...',
  'Loading drum synthesis engine...',
  'Calibrating oscillators...',
  'Mounting sample library...',
  'Connecting MIDI interfaces...',
  'Starting sequencer engine...',
  'Loading project templates...',
  'Verifying audio drivers...',
  'Initializing mixer matrix...',
  'MusicOS 98 ready.',
];

export default function BootScreen() {
  const setBooted = useOSStore(s => s.setBooted);
  const loadDefaultPattern = useOSStore(s => s.loadDefaultPattern);
  const [biosLines, setBiosLines] = useState<string[]>([]);
  const [showLoader, setShowLoader] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLine, setStatusLine] = useState('');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Schedule each BIOS line
    BIOS_LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        setBiosLines(prev => [...prev, line]);
      }, i * 70);
      timers.push(t);
    });

    // After BIOS completes, switch to loader
    const biosTotal = BIOS_LINES.length * 70 + 400;
    const loaderStart = setTimeout(() => {
      setShowLoader(true);
    }, biosTotal);
    timers.push(loaderStart);

    // Schedule each load step
    LOAD_STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setStatusLine(step);
        setProgress(Math.round(((i + 1) / LOAD_STEPS.length) * 100));
      }, biosTotal + 100 + i * 180);
      timers.push(t);
    });

    // Boot!
    const bootTime = biosTotal + 100 + LOAD_STEPS.length * 180 + 400;
    const bootTimer = setTimeout(() => {
      try { audioEngine.init(); } catch {}
      // Use the store action so the UI drum grid syncs too
      try { loadDefaultPattern(); } catch {}
      setBooted(true);
    }, bootTime);
    timers.push(bootTimer);

    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!showLoader) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: '#000',
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: 13,
        color: '#aaa',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {biosLines.map((line, i) => (
          <div
            key={i}
            style={{
              color: i === 0
                ? '#fff'
                : line.startsWith('Audio') || line.startsWith('MIDI')
                ? '#00ffcc'
                : '#aaaaaa',
              minHeight: 16,
            }}
          >
            {line || '\u00A0'}
          </div>
        ))}
        <span style={{ color: '#fff', animation: 'cursor-blink 0.6s step-end infinite' }}>█</span>
        <style>{`@keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      </div>
    );
  }

  // Segmented Win95-style progress bar — 20 block segments
  const SEGMENTS = 20;
  const filledSegments = Math.round((progress / 100) * SEGMENTS);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#008080', // classic Win95 teal desktop
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Tahoma, "MS Sans Serif", Arial, sans-serif',
    }}>

      {/* ── Central dialog box ── */}
      <div style={{
        background: '#d4d0c8',
        border: '2px solid',
        borderColor: '#ffffff #808080 #808080 #ffffff',
        boxShadow: '4px 4px 0 #000000, inset 1px 1px 0 #dfdfdf',
        width: 420,
        userSelect: 'none',
      }}>

        {/* Title bar */}
        <div style={{
          background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
          padding: '3px 6px',
          display: 'flex', alignItems: 'center', gap: 6,
          borderBottom: '1px solid #000080',
        }}>
          {/* Small music note icon in title bar */}
          <svg width="14" height="14" viewBox="0 0 14 14">
            <rect width="14" height="14" fill="none"/>
            <rect x="7" y="2" width="2" height="8" rx="1" fill="white"/>
            <path d="M9 2 Q13 3 11 7 Q9 5 9 6 Z" fill="white"/>
            <ellipse cx="5.5" cy="11" rx="3" ry="2" transform="rotate(-10 5.5 11)" fill="white"/>
          </svg>
          <span style={{ color: 'white', fontSize: 11, fontWeight: 'bold', flex: 1 }}>
            MusicOS 98
          </span>
          {/* Fake close/min/max buttons */}
          {['_','□','✕'].map(ch => (
            <div key={ch} style={{
              width: 16, height: 14,
              background: '#d4d0c8',
              border: '1px solid', borderColor: '#ffffff #808080 #808080 #ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#000', cursor: 'default',
              fontFamily: 'Marlett, "Webdings", Arial, sans-serif',
            }}>{ch}</div>
          ))}
        </div>

        {/* Dialog body */}
        <div style={{ padding: '20px 24px 18px' }}>

          {/* Logo area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            {/* Large note icon */}
            <div style={{
              width: 64, height: 64, flexShrink: 0,
              background: 'linear-gradient(135deg, #000080 0%, #0000aa 40%, #1060c0 100%)',
              border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="40" height="40" viewBox="0 0 40 40">
                <defs>
                  <linearGradient id="win95-note" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#aaccff" />
                  </linearGradient>
                </defs>
                <g fill="url(#win95-note)">
                  <rect x="22" y="5" width="3" height="22" rx="1.5"/>
                  <path d="M25 5 Q34 8 31 17 Q27 12 25 14 Z"/>
                  <ellipse cx="17" cy="29" rx="7" ry="5" transform="rotate(-12 17 29)"/>
                </g>
              </svg>
            </div>

            {/* Title text */}
            <div>
              <div style={{
                fontFamily: "'Arial Black', 'Arial Bold', Impact, Arial, sans-serif",
                fontWeight: 900,
                fontSize: 36,
                lineHeight: 1,
                color: '#000080',
                textShadow: '1px 1px 0 #aaaacc',
                letterSpacing: -1,
              }}>
                Music<span style={{ color: '#000080' }}>OS</span>
                <span style={{
                  fontSize: 30,
                  color: '#cc4400',
                  textShadow: '1px 1px 0 #ffaa88',
                  marginLeft: 5,
                }}>98</span>
              </div>
              <div style={{
                fontSize: 10, color: '#444444',
                marginTop: 3, letterSpacing: 1,
              }}>
                Professional Music Production Environment
              </div>
            </div>
          </div>

          {/* Separator */}
          <div style={{
            height: 2, marginBottom: 14,
            borderTop: '1px solid #808080',
            borderBottom: '1px solid #ffffff',
          }} />

          {/* Status text */}
          <div style={{
            fontSize: 11, color: '#000000',
            marginBottom: 8, minHeight: 14,
          }}>
            {statusLine || 'Please wait...'}
          </div>

          {/* Win95 segmented progress bar */}
          <div style={{
            height: 20,
            background: '#ffffff',
            border: '1px solid', borderColor: '#808080 #ffffff #ffffff #808080',
            padding: 2,
            display: 'flex', gap: 2, alignItems: 'stretch',
          }}>
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <div key={i} style={{
                flex: 1,
                background: i < filledSegments ? '#000080' : 'transparent',
                transition: i < filledSegments ? 'background 0.1s' : 'none',
              }} />
            ))}
          </div>

        </div>
      </div>

      {/* Copyright text below dialog */}
      <div style={{
        marginTop: 14, fontSize: 10,
        color: 'rgba(0,0,0,0.45)',
        fontFamily: 'Tahoma, "MS Sans Serif", Arial, sans-serif',
        textAlign: 'center',
      }}>
        Copyright © 1998 Beat Labs Inc. All rights reserved.
      </div>

    </div>
  );
}
