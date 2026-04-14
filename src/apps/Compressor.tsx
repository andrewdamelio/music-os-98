import { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine } from '../audio/engine';
import { useOSStore } from '../store';

// ── Knob ──────────────────────────────────────────────────────────────────────
interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  color?: string;
}

function Knob({ label, value, min, max, step = 0.01, format, onChange, color = '#00e5ff' }: KnobProps) {
  const norm = (value - min) / (max - min);
  const angle = -135 + norm * 270;
  const dragRef = useRef<{ y: number; v: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { y: e.clientY, v: value };
    const range = max - min;
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = (dragRef.current.y - me.clientY) / 120 * range;
      const raw = dragRef.current.v + delta;
      const snapped = step ? Math.round(raw / step) * step : raw;
      onChange(Math.max(min, Math.min(max, snapped)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [value, min, max, step, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div
        onMouseDown={onMouseDown}
        onDoubleClick={() => onChange((min + max) / 2)}
        title={`${label}: ${format(value)}`}
        style={{
          width: 40, height: 40, borderRadius: '50%', cursor: 'ns-resize', position: 'relative',
          background: `radial-gradient(circle at 35% 30%, #4a4c6a, #1e2038)`,
          boxShadow: `0 3px 8px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.18), 0 0 0 1px #111, 0 0 12px ${color}22`,
        }}
      >
        {/* Track arc */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
          viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5"
            strokeDasharray="100.5" strokeDashoffset="37.7" strokeLinecap="round"
            transform="rotate(135 20 20)" />
          <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="2.5" opacity="0.7"
            strokeDasharray={`${norm * 100.5} 100.5`} strokeDashoffset="37.7" strokeLinecap="round"
            transform="rotate(135 20 20)"
            style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
        </svg>
        {/* Indicator dot */}
        <div style={{
          position: 'absolute', width: 4, height: 4,
          background: color,
          borderRadius: '50%',
          left: '50%', top: 4,
          transformOrigin: '50% calc(16px)',
          transform: `translateX(-50%) rotate(${angle}deg)`,
          boxShadow: `0 0 6px ${color}`,
        }} />
      </div>
      <div style={{ fontSize: 9, fontFamily: 'monospace', color, textAlign: 'center',
        textShadow: `0 0 8px ${color}88`, letterSpacing: 0.5 }}>
        {format(value)}
      </div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
        letterSpacing: 1, fontFamily: 'monospace' }}>
        {label}
      </div>
    </div>
  );
}

// ── GR Meter ──────────────────────────────────────────────────────────────────
function GRMeter() {
  const [reduction, setReduction] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      // reduction is negative dB; clamp to -30..0
      const raw = Math.max(-30, Math.min(0, audioEngine.getUserCompReduction()));
      setReduction(Math.abs(raw));
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const segments = 20;
  const grNorm = reduction / 30;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, fontFamily: 'monospace' }}>GR</div>
      <div style={{
        width: 16, height: 120,
        background: 'rgba(0,0,0,0.7)',
        borderRadius: 3, padding: '2px 2px',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.04)',
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {Array.from({ length: segments }, (_, i) => {
          const segNorm = (segments - i) / segments;
          const lit = grNorm >= segNorm - 0.5 / segments;
          const segColor = i <= 3 ? '#ff3333' : i <= 7 ? '#ff9900' : '#00ccff';
          return (
            <div key={i} style={{
              flex: 1, borderRadius: 1,
              background: lit ? segColor : 'rgba(255,255,255,0.05)',
              boxShadow: lit ? `0 0 3px ${segColor}88` : 'none',
              transition: lit ? 'none' : 'background 0.05s',
            }} />
          );
        })}
      </div>
      <div style={{ fontSize: 9, fontFamily: 'monospace', color: reduction > 0.5 ? '#00ccff' : '#333',
        textShadow: reduction > 0.5 ? '0 0 6px #00ccff88' : 'none' }}>
        -{reduction.toFixed(1)}
      </div>
      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>dB</div>
    </div>
  );
}

// ── Compressor ────────────────────────────────────────────────────────────────
export default function Compressor() {
  const { compParams, setCompParam } = useOSStore();
  const { enabled, threshold, ratio, attack, release, knee, makeup } = compParams;

  const toggle = () => setCompParam('enabled', !enabled);

  const update = useCallback((param: 'threshold' | 'ratio' | 'attack' | 'release' | 'knee' | 'makeup') =>
    (v: number) => setCompParam(param, v),
  [setCompParam]);

  // dB display of makeup gain
  const makeupDb = makeup <= 0 ? '-∞' : (20 * Math.log10(makeup)).toFixed(1);

  return (
    <div className="plugin-bg" style={{
      padding: 14, height: '100%', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontFamily: "'VT323', monospace", fontSize: 22, letterSpacing: 3,
          color: enabled ? '#00e5ff' : '#444',
          textShadow: enabled ? '0 0 12px rgba(0,229,255,0.6)' : 'none' }}>
          COMPRESSOR
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>MASTER INSERT</div>
        {/* ON/BYPASS toggle */}
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

      {/* Main controls */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flex: 1 }}>
        {/* GR Meter */}
        <GRMeter />

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch',
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)' }} />

        {/* Knob bank */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1, justifyContent: 'center', alignItems: 'flex-start', paddingTop: 8 }}>
          <Knob
            label="THRESH"
            value={threshold} min={-60} max={0} step={0.5}
            format={v => `${v.toFixed(0)}dB`}
            color={enabled ? '#00e5ff' : '#334'}
            onChange={update('threshold')}
          />
          <Knob
            label="RATIO"
            value={ratio} min={1} max={20} step={0.5}
            format={v => `${v.toFixed(1)}:1`}
            color={enabled ? '#bf00ff' : '#334'}
            onChange={update('ratio')}
          />
          <Knob
            label="ATTACK"
            value={attack} min={0.001} max={0.5} step={0.001}
            format={v => v < 0.01 ? `${(v * 1000).toFixed(1)}ms` : `${(v * 1000).toFixed(0)}ms`}
            color={enabled ? '#39ff14' : '#334'}
            onChange={update('attack')}
          />
          <Knob
            label="RELEASE"
            value={release} min={0.05} max={2} step={0.01}
            format={v => v < 1 ? `${(v * 1000).toFixed(0)}ms` : `${v.toFixed(2)}s`}
            color={enabled ? '#ff4088' : '#334'}
            onChange={update('release')}
          />
          <Knob
            label="KNEE"
            value={knee} min={0} max={40} step={0.5}
            format={v => `${v.toFixed(0)}dB`}
            color={enabled ? '#ffb300' : '#334'}
            onChange={update('knee')}
          />
          <Knob
            label="MAKEUP"
            value={makeup} min={0.25} max={8} step={0.01}
            format={() => `${makeupDb}dB`}
            color={enabled ? '#ff8844' : '#334'}
            onChange={update('makeup')}
          />
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6,
        borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 8,
        color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%',
          background: enabled ? '#00e5ff' : '#222',
          boxShadow: enabled ? '0 0 6px #00e5ff' : 'none' }} />
        <span>{enabled ? `ACTIVE — ${threshold.toFixed(0)}dBFS · ${ratio.toFixed(1)}:1 · ${makeupDb}dB makeup` : 'BYPASSED — signal passing through unprocessed'}</span>
      </div>
    </div>
  );
}
