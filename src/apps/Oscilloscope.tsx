import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/engine';

type ViewMode = 'scope' | 'spectrum' | 'lissajous';

export default function Oscilloscope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [mode, setMode] = useState<ViewMode>('scope');
  const [color, setColor] = useState('#00e5ff');
  const [gain, setGain] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Fade effect
      ctx.fillStyle = 'rgba(13, 13, 31, 0.15)';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += w / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += h / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Center lines
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();

      if (mode === 'scope') {
        const data = audioEngine.getWaveformData();
        if (!data || !audioEngine.isPlaying) {
          // Draw idle line
          ctx.strokeStyle = `${color}44`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = color;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          const sliceWidth = w / data.length;
          for (let i = 0; i < data.length; i++) {
            const x = i * sliceWidth;
            const y = (1 - (data[i] * gain + 1) / 2) * h;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      } else if (mode === 'spectrum') {
        const data = audioEngine.getFrequencyData();
        if (!data || !audioEngine.isPlaying) {
          ctx.fillStyle = `${color}22`;
          ctx.fillRect(0, h - 2, w, 2);
        } else {
          const barW = w / data.length * 4;
          const step = Math.floor(data.length / (w / barW));
          for (let i = 0; i < w / barW; i++) {
            const val = (data[i * step] ?? 0) / 255;
            const barH = val * h * gain;
            const hue = (i / (w / barW)) * 120 + 180;
            ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
            ctx.shadowBlur = 3;
            ctx.fillRect(i * barW, h - barH, barW - 1, barH);
          }
          ctx.shadowBlur = 0;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    ctx.fillStyle = '#0d0d1f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, color, gain]);

  return (
    <div className="plugin-bg" style={{ padding: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ color: 'var(--px-cyan)', fontFamily: "'VT323', monospace", fontSize: 20 }}>
          📊 OSCILLOSCOPE
        </div>
        <div style={{ flex: 1 }} />
        {(['scope', 'spectrum'] as ViewMode[]).map(m => (
          <button key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '2px 8px', fontSize: 9, cursor: 'pointer',
              background: mode === m ? 'rgba(0,229,255,0.15)' : '#0d0d1f',
              color: mode === m ? 'var(--px-cyan)' : 'var(--px-text-dim)',
              border: `1px solid ${mode === m ? 'var(--px-cyan)' : 'var(--px-border)'}`,
              borderRadius: 2,
            }}
          >
            {m.toUpperCase()}
          </button>
        ))}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>GAIN</span>
          <input type="range" min={0.5} max={5} step={0.1} value={gain}
            onChange={e => setGain(parseFloat(e.target.value))}
            style={{ width: 50 }} />
        </div>
        {['#00e5ff', '#39ff14', '#bf00ff', '#ff4088', '#ffb300'].map(c => (
          <div
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 14, height: 14, borderRadius: '50%', cursor: 'pointer',
              background: c, border: `2px solid ${color === c ? 'white' : 'transparent'}`,
            }}
          />
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={360}
        height={200}
        style={{
          width: '100%', flex: 1, borderRadius: 4,
          border: '1px solid var(--px-border)',
          imageRendering: 'pixelated',
        }}
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 9, color: 'var(--px-text-dim)' }}>
        <div className="led" style={audioEngine.isPlaying ? { background: 'var(--px-green)', boxShadow: '0 0 4px var(--px-green)' } : { background: '#222240', border: '1px solid #000' }} />
        <span>{audioEngine.isPlaying ? 'SIGNAL ACTIVE' : 'NO SIGNAL — Start playback'}</span>
        <span style={{ marginLeft: 'auto' }}>48kHz / 24-bit</span>
      </div>
    </div>
  );
}
