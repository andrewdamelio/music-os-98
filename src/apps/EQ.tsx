import { useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../audio/engine';
import { useOSStore } from '../store';

const BANDS = [
  { label: 'LOW',  freq: 80,   type: 'lowshelf', color: '#ff4088' },
  { label: 'LM',   freq: 250,  type: 'peaking',  color: '#ffb300' },
  { label: 'MID',  freq: 1000, type: 'peaking',  color: '#39ff14' },
  { label: 'HM',   freq: 4000, type: 'peaking',  color: '#00e5ff' },
  { label: 'HIGH', freq: 12000,type: 'highshelf', color: '#bf00ff' },
] as const;

const GAIN_RANGE = 18; // ±18 dB

// ── Frequency Response Curve ──────────────────────────────────────────────────
function FreqCurve({ enabled, gains }: { enabled: boolean; gains: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#080816';
    ctx.fillRect(0, 0, w, h);

    // Grid lines — frequency decades
    const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    freqs.forEach(f => {
      const x = ((Math.log10(f) - logMin) / (logMax - logMin)) * w;
      ctx.strokeStyle = 'rgba(0,229,255,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    });

    // dB grid lines
    for (let db = -GAIN_RANGE; db <= GAIN_RANGE; db += 6) {
      const y = h / 2 - (db / GAIN_RANGE) * (h / 2) * 0.85;
      ctx.strokeStyle = db === 0 ? 'rgba(0,229,255,0.18)' : 'rgba(0,229,255,0.05)';
      ctx.lineWidth = db === 0 ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      if (db !== 0 && db % 12 === 0) {
        ctx.fillStyle = 'rgba(0,229,255,0.3)';
        ctx.font = '8px monospace';
        ctx.fillText(`${db > 0 ? '+' : ''}${db}`, 3, y - 2);
      }
    }

    if (!enabled) {
      // Show flat line when bypassed
      ctx.strokeStyle = 'rgba(0,229,255,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,229,255,0.25)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BYPASSED', w / 2, h / 2 - 10);
      return;
    }

    // Build frequency array for response calculation
    const numPoints = w;
    const freqArray = new Float32Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      freqArray[i] = Math.pow(10, logMin + t * (logMax - logMin));
    }

    const { mag } = audioEngine.getUserEQFrequencyResponse(freqArray);

    // Draw fill
    const path = new Path2D();
    path.moveTo(0, h / 2);
    for (let i = 0; i < numPoints; i++) {
      const db = 20 * Math.log10(Math.max(0.0001, mag[i]));
      const y = h / 2 - (db / GAIN_RANGE) * (h / 2) * 0.85;
      if (i === 0) path.moveTo(0, y); else path.lineTo(i, y);
    }
    path.lineTo(w, h / 2);
    path.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0,229,255,0.25)');
    grad.addColorStop(0.5, 'rgba(0,229,255,0.08)');
    grad.addColorStop(1, 'rgba(0,229,255,0.02)');
    ctx.fillStyle = grad;
    ctx.fill(path);

    // Draw curve — glow layers
    const curvePath = new Path2D();
    for (let i = 0; i < numPoints; i++) {
      const db = 20 * Math.log10(Math.max(0.0001, mag[i]));
      const y = h / 2 - (db / GAIN_RANGE) * (h / 2) * 0.85;
      if (i === 0) curvePath.moveTo(0, y); else curvePath.lineTo(i, y);
    }

    ctx.strokeStyle = 'rgba(0,229,255,0.3)';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 0;
    ctx.stroke(curvePath);

    ctx.strokeStyle = 'rgba(0,229,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.stroke(curvePath);
    ctx.shadowBlur = 0;

    // Band handle dots
    BANDS.forEach((band, i) => {
      const db = gains[i] ?? 0;
      const x = ((Math.log10(band.freq) - logMin) / (logMax - logMin)) * w;
      const y = h / 2 - (db / GAIN_RANGE) * (h / 2) * 0.85;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = band.color;
      ctx.shadowColor = band.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

  }, [enabled, gains]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={160}
      style={{
        display: 'block', width: '100%', height: 160,
        borderRadius: 3, border: '1px solid rgba(0,229,255,0.1)',
        boxShadow: 'inset 0 0 20px rgba(0,0,40,0.5)',
      }}
    />
  );
}

// ── Band Control ──────────────────────────────────────────────────────────────
function BandControl({
  band, idx, gain, enabled, onChange,
}: {
  band: typeof BANDS[number];
  idx: number;
  gain: number;
  enabled: boolean;
  onChange: (idx: number, gain: number) => void;
}) {
  const dragRef = useRef<{ y: number; v: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { y: e.clientY, v: gain };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = (dragRef.current.y - me.clientY) / 80 * GAIN_RANGE;
      onChange(idx, Math.max(-GAIN_RANGE, Math.min(GAIN_RANGE, dragRef.current.v + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [gain, idx, onChange]);

  const sliderH = 90;
  const thumbY = sliderH / 2 - (gain / GAIN_RANGE) * (sliderH / 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      {/* dB readout */}
      <div style={{
        fontFamily: "'VT323', monospace", fontSize: 14,
        color: Math.abs(gain) > 0.5 ? band.color : '#334',
        textShadow: Math.abs(gain) > 0.5 && enabled ? `0 0 8px ${band.color}88` : 'none',
        minWidth: 42, textAlign: 'center',
      }}>
        {gain > 0 ? '+' : ''}{gain.toFixed(1)}
      </div>

      {/* Vertical fader */}
      <div
        onMouseDown={onMouseDown}
        onDoubleClick={() => onChange(idx, 0)}
        style={{
          width: 14, height: sliderH, position: 'relative', cursor: 'ns-resize',
          background: 'linear-gradient(to right, #0a0b14, #141520, #0a0b14)',
          border: '1px solid #0a0a14', borderRadius: 5,
          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.9)',
        }}
      >
        {/* Zero line */}
        <div style={{ position: 'absolute', left: -3, right: -3, top: sliderH / 2,
          height: 1, background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
        {/* Gain fill above/below zero */}
        {gain > 0 && (
          <div style={{ position: 'absolute', left: 2, right: 2,
            top: thumbY, height: sliderH / 2 - thumbY,
            background: `linear-gradient(to bottom, ${band.color}55, transparent)`, borderRadius: 2 }} />
        )}
        {gain < 0 && (
          <div style={{ position: 'absolute', left: 2, right: 2,
            top: sliderH / 2, height: Math.abs(thumbY - sliderH / 2),
            background: `linear-gradient(to top, ${band.color}33, transparent)`, borderRadius: 2 }} />
        )}
        {/* Thumb */}
        <div style={{
          position: 'absolute', left: '50%', top: thumbY, transform: 'translateX(-50%) translateY(-50%)',
          width: 28, height: 10,
          background: `linear-gradient(180deg, #6a6c8a 0%, #3e4060 45%, #32344e 55%, #4a4c6a 100%)`,
          border: `1px solid ${Math.abs(gain) > 0.5 && enabled ? band.color : '#5a5c7a'}`,
          borderRadius: 2, cursor: 'ns-resize',
          boxShadow: `0 2px 6px rgba(0,0,0,0.7), ${Math.abs(gain) > 0.5 && enabled ? `0 0 8px ${band.color}44` : ''}`,
          zIndex: 2,
        }} />
      </div>

      {/* Band label & freq */}
      <div style={{ fontSize: 9, color: enabled ? band.color : '#334',
        fontFamily: 'monospace', letterSpacing: 1, textAlign: 'center',
        textShadow: enabled ? `0 0 6px ${band.color}66` : 'none' }}>
        {band.label}
      </div>
      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
        {band.freq >= 1000 ? `${band.freq / 1000}k` : band.freq}Hz
      </div>
    </div>
  );
}

// ── EQ ────────────────────────────────────────────────────────────────────────
export default function EQ() {
  const { eqParams, setEQEnabled, setEQBand } = useOSStore();
  const { enabled, gains } = eqParams;

  const toggle = () => setEQEnabled(!enabled);

  const onBandChange = useCallback((idx: number, gain: number) => {
    setEQBand(idx, gain);
  }, [setEQBand]);

  return (
    <div className="plugin-bg" style={{
      padding: 14, height: '100%', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ fontFamily: "'VT323', monospace", fontSize: 22, letterSpacing: 3,
          color: enabled ? '#00e5ff' : '#444',
          textShadow: enabled ? '0 0 12px rgba(0,229,255,0.6)' : 'none' }}>
          PARAMETRIC EQ
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>MASTER INSERT</div>
        <button
          onClick={toggle}
          style={{
            padding: '4px 14px', fontSize: 10, cursor: 'pointer', letterSpacing: 2,
            fontFamily: "'Share Tech Mono', monospace",
            background: enabled
              ? 'linear-gradient(to bottom, #003a5c, #00273f)'
              : 'linear-gradient(to bottom, #2a2c40, #1e2032)',
            color: enabled ? '#00e5ff' : 'rgba(255,255,255,0.3)',
            border: `1px solid ${enabled ? '#00e5ff' : '#303248'}`,
            borderRadius: 3,
            boxShadow: enabled ? '0 0 12px rgba(0,229,255,0.35), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
          }}
        >
          {enabled ? 'ON' : 'BYPASS'}
        </button>
      </div>

      {/* Frequency response curve */}
      <div style={{ flexShrink: 0 }}>
        <FreqCurve enabled={enabled} gains={gains} />
      </div>

      {/* Band faders */}
      <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'flex-start', paddingTop: 4 }}>
        {BANDS.map((band, i) => (
          <BandControl
            key={band.label}
            band={band}
            idx={i}
            gain={gains[i]}
            enabled={enabled}
            onChange={onBandChange}
          />
        ))}
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, fontSize: 8,
        color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', flexShrink: 0 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%',
          background: enabled ? '#00e5ff' : '#222',
          boxShadow: enabled ? '0 0 6px #00e5ff' : 'none' }} />
        <span>
          {enabled
            ? `ACTIVE — ${BANDS.map((b, i) => gains[i] !== 0 ? `${b.label}:${gains[i] > 0 ? '+' : ''}${gains[i].toFixed(1)}` : null).filter(Boolean).join(' · ') || 'flat'}`
            : 'BYPASSED — signal passing through unprocessed'}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ opacity: 0.5 }}>Double-click fader to zero</span>
      </div>
    </div>
  );
}
