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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Courier New", Courier, monospace',
      color: '#fff',
      gap: 14,
    }}>
      <div style={{ fontSize: 52, lineHeight: 1 }}>🎵</div>

      <div style={{
        fontSize: 40,
        fontFamily: 'monospace',
        color: '#00e5ff',
        textShadow: '0 0 20px #00e5ff',
        letterSpacing: 2,
      }}>
        MusicOS 98
      </div>

      <div style={{ fontSize: 13, color: '#6678aa' }}>
        Professional Music Production Environment
      </div>

      <div style={{
        width: 300,
        height: 20,
        background: '#0a0a20',
        border: '2px solid #c0c0c0',
        marginTop: 8,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${progress}%`,
          background: 'linear-gradient(to right, #000080, #00e5ff)',
          transition: 'width 0.15s linear',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#fff', fontFamily: 'monospace',
        }}>
          {progress}%
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#6678aa', height: 16, fontFamily: 'monospace' }}>
        {statusLine}
      </div>

      <div style={{
        position: 'absolute', bottom: 20,
        fontSize: 11, color: '#333',
        textAlign: 'center', fontFamily: 'monospace',
      }}>
        © 1998 Beat Labs Inc. — Built with Web Audio API
      </div>
    </div>
  );
}
