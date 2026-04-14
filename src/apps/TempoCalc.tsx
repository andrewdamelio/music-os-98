import { useState } from 'react';
import { useOSStore } from '../store';

function calcDelayMs(bpm: number, division: string): number {
  const divisions: Record<string, number> = {
    '1/1': 4, '1/2': 2, '1/2d': 3, '1/4': 1, '1/4d': 1.5, '1/4t': 2/3,
    '1/8': 0.5, '1/8d': 0.75, '1/8t': 1/3, '1/16': 0.25, '1/16t': 1/6, '1/32': 0.125,
  };
  const beats = divisions[division] ?? 1;
  return (60000 / bpm) * beats;
}

export default function TempoCalc() {
  const { bpm, setBPM } = useOSStore();
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [tapBPM, setTapBPM] = useState<number | null>(null);

  const handleTap = () => {
    const now = Date.now();
    setTapTimes(prev => {
      const recent = [...prev, now].filter(t => now - t < 4000).slice(-8);
      if (recent.length >= 2) {
        const intervals = [];
        for (let i = 1; i < recent.length; i++) intervals.push(recent[i] - recent[i - 1]);
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const detected = Math.round(60000 / avg);
        setTapBPM(detected);
      }
      return recent;
    });
  };

  const applyTapBPM = () => { if (tapBPM) setBPM(tapBPM); };

  const divisions = ['1/32', '1/16', '1/16t', '1/8t', '1/8d', '1/8', '1/4t', '1/4d', '1/4', '1/2d', '1/2', '1/1'];

  return (
    <div className="plugin-bg" style={{ padding: 12 }}>
      <div style={{ color: 'var(--px-amber)', fontFamily: "'VT323', monospace", fontSize: 22, marginBottom: 12 }}>
        🔢 TEMPO CALC
      </div>

      {/* BPM display */}
      <div style={{
        background: '#0a0a1a', border: '1px solid var(--px-border)',
        borderRadius: 4, padding: '12px 16px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 2, textTransform: 'uppercase' }}>Current BPM</div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: 52, color: 'var(--px-cyan)', lineHeight: 1 }}>
            {bpm}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="win98-btn"
            style={{ minWidth: 0, padding: '4px 12px', background: '#0d0d1f', color: 'var(--px-cyan)', border: '1px solid var(--px-border)' }}
            onClick={() => setBPM(Math.min(300, bpm + 1))}>▲ +1</button>
          <button className="win98-btn"
            style={{ minWidth: 0, padding: '4px 12px', background: '#0d0d1f', color: 'var(--px-cyan)', border: '1px solid var(--px-border)' }}
            onClick={() => setBPM(Math.max(20, bpm - 1))}>▼ -1</button>
          <button className="win98-btn"
            style={{ minWidth: 0, padding: '4px 12px', background: '#0d0d1f', color: 'var(--px-text-dim)', border: '1px solid var(--px-border)', fontSize: 9 }}
            onClick={() => setBPM(Math.round(bpm / 2))}>/2</button>
          <button className="win98-btn"
            style={{ minWidth: 0, padding: '4px 12px', background: '#0d0d1f', color: 'var(--px-text-dim)', border: '1px solid var(--px-border)', fontSize: 9 }}
            onClick={() => setBPM(Math.min(300, bpm * 2))}>×2</button>
        </div>
        <div>
          <input type="range" min={20} max={300} value={bpm}
            onChange={e => setBPM(parseInt(e.target.value))}
            style={{ writingMode: 'vertical-lr', height: 80, direction: 'rtl' } as any}
          />
        </div>
      </div>

      {/* Quick BPM presets */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {[60, 70, 80, 85, 90, 100, 110, 120, 128, 130, 140, 150, 160, 170, 180].map(b => (
          <button key={b}
            onClick={() => setBPM(b)}
            style={{
              padding: '3px 8px', fontSize: 10, cursor: 'pointer',
              background: bpm === b ? 'rgba(255,179,0,0.2)' : '#0d0d1f',
              color: bpm === b ? 'var(--px-amber)' : 'var(--px-text-dim)',
              border: `1px solid ${bpm === b ? 'var(--px-amber)' : 'var(--px-border)'}`,
              borderRadius: 2,
            }}
          >{b}</button>
        ))}
      </div>

      {/* Tap tempo */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={handleTap}
          style={{
            padding: '10px 20px', cursor: 'pointer',
            background: 'rgba(0,229,255,0.1)', color: 'var(--px-cyan)',
            border: '2px solid var(--px-cyan)', borderRadius: 4,
            fontFamily: "'VT323', monospace", fontSize: 18, letterSpacing: 1,
            userSelect: 'none',
          }}
        >
          TAP TEMPO
        </button>
        {tapBPM && (
          <>
            <div style={{ fontFamily: "'VT323', monospace", fontSize: 28, color: 'var(--px-green)' }}>
              {tapBPM} BPM
            </div>
            <button
              onClick={applyTapBPM}
              style={{
                padding: '4px 12px', fontSize: 11, cursor: 'pointer',
                background: 'rgba(57,255,20,0.1)', color: 'var(--px-green)',
                border: '1px solid var(--px-green)', borderRadius: 3,
              }}
            >
              Apply
            </button>
          </>
        )}
      </div>

      {/* Delay times table */}
      <div style={{ borderTop: '1px solid var(--px-border)', paddingTop: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Delay Times @ {bpm} BPM
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {divisions.map(div => {
            const ms = calcDelayMs(bpm, div);
            return (
              <div key={div} style={{
                background: 'var(--px-bg2)', border: '1px solid var(--px-border)',
                borderRadius: 2, padding: '4px 6px', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>{div}</span>
                <span style={{ fontSize: 11, color: 'var(--px-cyan)', fontFamily: 'monospace' }}>
                  {ms.toFixed(0)}ms
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
