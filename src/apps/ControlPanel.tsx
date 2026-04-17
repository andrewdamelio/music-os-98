import { useState, useEffect } from 'react';
import { audioEngine } from '../audio/engine';
import { useOSStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

export default function ControlPanel() {
  const { mixerChannels, updateMixerChannel } = useOSStore(useShallow(s => ({
    mixerChannels: s.mixerChannels,
    updateMixerChannel: s.updateMixerChannel,
  })));
  const master = mixerChannels[7];
  const [muted, setMuted] = useState(master?.muted ?? false);

  // Keep in sync if mute is toggled elsewhere (e.g. mixer M button)
  useEffect(() => { setMuted(master?.muted ?? false); }, [master?.muted]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    updateMixerChannel(7, { muted: next });
  };

  return (
    <div style={{
      padding: 20, display: 'flex', flexDirection: 'column', gap: 20,
      background: 'var(--px-bg)', color: 'var(--px-text)', fontFamily: "'Share Tech Mono', monospace",
      height: '100%',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--px-border)', paddingBottom: 12 }}>
        <span style={{ fontSize: 22 }}>🔊</span>
        <div>
          <div style={{ fontSize: 13, letterSpacing: 2, color: 'var(--px-amber)' }}>AUDIO</div>
          <div style={{ fontSize: 9, color: 'var(--px-text-dim)', letterSpacing: 1 }}>Control Panel</div>
        </div>
      </div>

      {/* Master Mute */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--px-bg2)', border: '1px solid var(--px-border)',
        borderRadius: 4, padding: '12px 16px',
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1 }}>MUTE ALL AUDIO</div>
          <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginTop: 2 }}>
            {muted ? 'Audio output silenced' : 'Audio output active'}
          </div>
        </div>
        <button
          onClick={toggleMute}
          style={{
            width: 52, height: 28, cursor: 'pointer', borderRadius: 3,
            fontSize: 10, letterSpacing: 1, fontFamily: 'inherit',
            background: muted
              ? 'linear-gradient(to bottom, #cc2200, #881500)'
              : 'linear-gradient(to bottom, #1a1c2e, #111320)',
            color: muted ? '#ffbb99' : 'var(--px-text-dim)',
            border: `1px solid ${muted ? '#ff4422' : 'var(--px-border)'}`,
            boxShadow: muted ? '0 0 10px #ff332244' : 'none',
          }}
        >
          {muted ? 'MUTED' : 'ON'}
        </button>
      </div>

      {/* Audio context state */}
      <AudioContextStatus />
    </div>
  );
}

function AudioContextStatus() {
  const [state, setState] = useState<string>('—');

  useEffect(() => {
    const update = () => setState(audioEngine.ctx?.state ?? 'not started');
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, []);

  const color = state === 'running' ? 'var(--px-green)' : state === 'suspended' ? '#ffaa00' : 'var(--px-text-dim)';

  const resume = () => {
    if (!audioEngine.ctx) audioEngine.init();
    audioEngine.ctx?.resume();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 9, color: 'var(--px-text-dim)', letterSpacing: 1,
        padding: '8px 16px', background: 'var(--px-bg2)',
        border: '1px solid var(--px-border)', borderRadius: 4,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: state === 'running' ? `0 0 5px ${color}` : 'none' }} />
        <span>AudioContext: </span>
        <span style={{ color }}>{state}</span>
      </div>
      {state !== 'running' && (
        <button
          onClick={resume}
          style={{
            cursor: 'pointer', borderRadius: 3, padding: '8px 0',
            fontSize: 10, letterSpacing: 1, fontFamily: 'inherit',
            background: 'linear-gradient(to bottom, #003300, #001a00)',
            color: '#44ff88',
            border: '1px solid #33ff66',
            boxShadow: '0 0 8px #33ff6644',
          }}
        >
          ▶ RESUME AUDIO
        </button>
      )}
    </div>
  );
}
