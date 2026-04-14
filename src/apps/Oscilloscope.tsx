import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/engine';

type ViewMode = 'scope' | 'spectrum';

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

      // Phosphor decay — slow fade for trailing glow
      ctx.fillStyle = 'rgba(8, 8, 22, 0.18)';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.lineWidth = 1;
      const cols = 10;
      const rows = 8;
      for (let x = 0; x <= cols; x++) {
        const px = Math.round(x * w / cols);
        ctx.strokeStyle = x === 0 || x === cols ? 'rgba(0,229,255,0.10)' : 'rgba(0,229,255,0.045)';
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
        // Tick marks
        if (x > 0 && x < cols) {
          for (let t = 1; t < rows; t++) {
            const ty = Math.round(t * h / rows);
            ctx.fillStyle = 'rgba(0,229,255,0.18)';
            ctx.fillRect(px - 1, ty - 1, 2, 2);
          }
        }
      }
      for (let y = 0; y <= rows; y++) {
        const py = Math.round(y * h / rows);
        ctx.strokeStyle = y === 0 || y === rows ? 'rgba(0,229,255,0.10)' : 'rgba(0,229,255,0.045)';
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
      }

      // Center lines — brighter
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();

      if (mode === 'scope') {
        const data = audioEngine.getWaveformData();
        if (!data || !audioEngine.isPlaying) {
          // Idle flat line with subtle pulse
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 1400);
          ctx.strokeStyle = `rgba(0, 229, 255, ${0.08 + pulse * 0.07})`;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = color;
          ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          const sliceWidth = w / data.length;

          // Build path
          const points: [number, number][] = [];
          for (let i = 0; i < data.length; i++) {
            points.push([i * sliceWidth, (1 - (data[i] * gain + 1) / 2) * h]);
          }

          // Layer 1: wide outer glow
          ctx.strokeStyle = `${color}28`;
          ctx.lineWidth = 9;
          ctx.shadowColor = color;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
          ctx.stroke();

          // Layer 2: mid glow
          ctx.strokeStyle = `${color}55`;
          ctx.lineWidth = 4;
          ctx.shadowColor = color;
          ctx.shadowBlur = 16;
          ctx.beginPath();
          points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
          ctx.stroke();

          // Layer 3: bright core
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
          ctx.stroke();

          // Layer 4: hot highlight
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.5;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
          ctx.stroke();

          ctx.shadowBlur = 0;
        }
      } else if (mode === 'spectrum') {
        const data = audioEngine.getFrequencyData();
        if (!data || !audioEngine.isPlaying) {
          ctx.fillStyle = `${color}18`;
          ctx.fillRect(0, h - 2, w, 2);
        } else {
          const numBars = Math.floor(w / 4);
          const step = Math.floor(data.length / numBars);
          for (let i = 0; i < numBars; i++) {
            let val = 0;
            for (let s = 0; s < step; s++) val = Math.max(val, (data[i * step + s] ?? 0) / 255);
            val = Math.pow(val, 0.7) * gain;
            const barH = val * h;
            const hue = (i / numBars) * 140 + 170; // cyan to green
            const bx = i * 4;

            // Glow bar
            ctx.fillStyle = `hsla(${hue}, 100%, 55%, 0.25)`;
            ctx.fillRect(bx, h - barH - 2, 3, barH + 2);

            // Core bar
            const grad = ctx.createLinearGradient(0, h - barH, 0, h);
            grad.addColorStop(0, `hsla(${hue}, 100%, 75%, 1)`);
            grad.addColorStop(0.6, `hsla(${hue}, 100%, 55%, 0.9)`);
            grad.addColorStop(1, `hsla(${hue}, 100%, 40%, 0.6)`);
            ctx.fillStyle = grad;
            ctx.fillRect(bx, h - barH, 3, barH);

            // Peak dot
            if (val > 0.05) {
              ctx.fillStyle = `hsla(${hue}, 100%, 90%, 0.9)`;
              ctx.fillRect(bx, h - barH - 1, 3, 1);
            }
          }
          ctx.shadowBlur = 0;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    ctx.fillStyle = '#08081640';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Initial clear to dark
    ctx.fillStyle = '#080816';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, color, gain]);

  const palette = ['#00e5ff', '#39ff14', '#bf00ff', '#ff4088', '#ffb300', '#ff6600'];

  return (
    <div className="plugin-bg" style={{ padding: 10, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ color: 'var(--px-cyan)', fontFamily: "'VT323', monospace", fontSize: 22, letterSpacing: 2 }}>
          OSCILLOSCOPE
        </div>
        <div style={{ flex: 1 }} />
        {(['scope', 'spectrum'] as ViewMode[]).map(m => (
          <button key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '3px 10px', fontSize: 9, cursor: 'pointer',
              background: mode === m ? 'rgba(0,229,255,0.18)' : '#0d0d1f',
              color: mode === m ? 'var(--px-cyan)' : 'var(--px-text-dim)',
              border: `1px solid ${mode === m ? 'var(--px-cyan)' : 'var(--px-border)'}`,
              borderRadius: 2, letterSpacing: 1,
              boxShadow: mode === m ? '0 0 8px rgba(0,229,255,0.3)' : 'none',
            }}
          >
            {m.toUpperCase()}
          </button>
        ))}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--px-text-dim)', letterSpacing: 1 }}>GAIN</span>
          <input type="range" min={0.5} max={5} step={0.1} value={gain}
            onChange={e => setGain(parseFloat(e.target.value))}
            style={{ width: 64 }} />
          <span style={{ fontSize: 9, color: 'var(--px-text-dim)', fontFamily: 'monospace', minWidth: 24 }}>
            {gain.toFixed(1)}x
          </span>
        </div>
        {palette.map(c => (
          <div
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 14, height: 14, borderRadius: '50%', cursor: 'pointer',
              background: c,
              border: `2px solid ${color === c ? 'white' : 'transparent'}`,
              boxShadow: color === c ? `0 0 6px ${c}` : 'none',
            }}
          />
        ))}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={900}
          height={280}
          style={{
            display: 'block',
            width: '100%', height: '100%',
            borderRadius: 4,
            border: '1px solid var(--px-border)',
            boxShadow: `0 0 20px rgba(0,229,255,0.08), inset 0 0 40px rgba(0,0,40,0.5)`,
          }}
        />
        {/* Corner labels */}
        <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 8,
          color: 'rgba(0,229,255,0.3)', fontFamily: 'monospace', pointerEvents: 'none' }}>
          +{(gain).toFixed(1)}
        </div>
        <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 8,
          color: 'rgba(0,229,255,0.3)', fontFamily: 'monospace', pointerEvents: 'none' }}>
          -{(gain).toFixed(1)}
        </div>
        {mode === 'scope' && (
          <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 8,
            color: 'rgba(0,229,255,0.3)', fontFamily: 'monospace', pointerEvents: 'none' }}>
            2048 pts
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 9, color: 'var(--px-text-dim)', flexShrink: 0, alignItems: 'center' }}>
        <div className="led" style={audioEngine.isPlaying
          ? { background: 'var(--px-green)', boxShadow: '0 0 6px var(--px-green)' }
          : { background: '#222240', border: '1px solid #000' }} />
        <span>{audioEngine.isPlaying ? 'SIGNAL ACTIVE' : 'NO SIGNAL — start playback'}</span>
        <span style={{ marginLeft: 'auto', opacity: 0.5 }}>44.1kHz · 24-bit</span>
      </div>
    </div>
  );
}
