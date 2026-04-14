import { useRef } from 'react';
import { useOSStore } from '../store';

// ── Knob ─────────────────────────────────────────────────────────────────────

function Knob({ value, min, max, step = 0.01, onChange, color = '#00e5ff', size = 32 }: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; color?: string; size?: number;
}) {
  const dragRef = useRef<{ y: number; v: number } | null>(null);
  const range = max - min;
  const pct = (value - min) / range;
  const angle = -145 + pct * 290;

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { y: e.clientY, v: value };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const dy = dragRef.current.y - me.clientY;
      const newVal = Math.max(min, Math.min(max, dragRef.current.v + (dy / 100) * range));
      onChange(parseFloat((Math.round(newVal / step) * step).toFixed(6)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div onMouseDown={onMouseDown} style={{ width: size, height: size, position: 'relative', cursor: 'ns-resize', flexShrink: 0 }}>
      {/* Knob well (recessed ring) */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 25%, #2a2a3a, #0a0a12)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 2px rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.08)',
        border: '1px solid #111',
      }} />
      {/* Indicator line */}
      <div style={{
        position: 'absolute', width: 2, height: size * 0.33,
        background: `linear-gradient(to bottom, ${color}, ${color}88)`,
        left: '50%', top: size * 0.08,
        transformOrigin: `50% calc(100% + 2px)`,
        transform: `translateX(-50%) rotate(${angle}deg)`,
        borderRadius: 1,
        boxShadow: `0 0 5px ${color}cc`,
      }} />
      {/* Center dot */}
      <div style={{
        position: 'absolute', width: 4, height: 4, borderRadius: '50%',
        background: '#222', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
      }} />
    </div>
  );
}

function KnobField({ label, value, displayVal, ...knobProps }: {
  label: string; value: number; displayVal: string;
} & Omit<Parameters<typeof Knob>[0], 'value'>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {/* Etched label above */}
      <div style={{
        fontSize: 7, letterSpacing: 1, textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace',
      }}>{label}</div>
      {/* Knob with well surround */}
      <div style={{
        padding: 4, borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.06), transparent)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
      }}>
        <Knob value={value} {...knobProps} />
      </div>
      {/* LED-style readout */}
      <div style={{
        fontSize: 9, fontFamily: "'VT323', monospace",
        color: knobProps.color ?? '#00e5ff',
        textShadow: `0 0 6px ${knobProps.color ?? '#00e5ff'}`,
        minWidth: 36, textAlign: 'center',
      }}>{displayVal}</div>
    </div>
  );
}

// ── Rack Ear ──────────────────────────────────────────────────────────────────

function RackEar({ side }: { side: 'left' | 'right' }) {
  return (
    <div style={{
      width: 18, alignSelf: 'stretch', flexShrink: 0,
      background: 'linear-gradient(to bottom, #2a2a2a, #1a1a1a, #2a2a2a)',
      borderLeft: side === 'left' ? '1px solid #444' : 'none',
      borderRight: side === 'right' ? '1px solid #444' : 'none',
      border: '1px solid #333',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '6px 0',
    }}>
      {/* Top screw */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #555, #1a1a1a)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)',
          border: '1px solid #444',
          position: 'relative',
        }}>
          {/* Phillips screw head */}
          <div style={{ position: 'absolute', inset: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: '100%', height: 1, background: 'rgba(0,0,0,0.6)' }} />
            <div style={{ position: 'absolute', width: 1, height: '100%', background: 'rgba(0,0,0,0.6)' }} />
          </div>
        </div>
      </div>
      {/* U-number in middle */}
      <div style={{ fontSize: 6, color: '#444', textAlign: 'center', fontFamily: 'monospace' }}>1U</div>
      {/* Bottom screw */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #555, #1a1a1a)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)',
          border: '1px solid #444',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', inset: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: '100%', height: 1, background: 'rgba(0,0,0,0.6)' }} />
            <div style={{ position: 'absolute', width: 1, height: '100%', background: 'rgba(0,0,0,0.6)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Power LED ─────────────────────────────────────────────────────────────────

function PowerLED({ on, color }: { on: boolean; color: string }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: on ? color : '#111',
      boxShadow: on ? `0 0 6px ${color}, 0 0 12px ${color}66` : 'inset 0 1px 2px rgba(0,0,0,0.8)',
      border: `1px solid ${on ? color : '#333'}`,
      transition: 'all 0.1s',
      cursor: 'pointer',
      flexShrink: 0,
    }} />
  );
}

// ── Module faceplate SVG decorations ─────────────────────────────────────────

function TapeEchoDecor() {
  return (
    <svg width="60" height="48" viewBox="0 0 60 48" style={{ opacity: 0.25, flexShrink: 0 }}>
      {/* Tape reel left */}
      <circle cx="15" cy="24" r="12" fill="none" stroke="#00e5ff" strokeWidth="1" />
      <circle cx="15" cy="24" r="5" fill="none" stroke="#00e5ff" strokeWidth="1" />
      {[0,60,120,180,240,300].map(a => (
        <line key={a} x1={15+5*Math.cos(a*Math.PI/180)} y1={24+5*Math.sin(a*Math.PI/180)}
          x2={15+12*Math.cos(a*Math.PI/180)} y2={24+12*Math.sin(a*Math.PI/180)}
          stroke="#00e5ff" strokeWidth="0.8" />
      ))}
      {/* Tape reel right */}
      <circle cx="45" cy="24" r="12" fill="none" stroke="#00e5ff" strokeWidth="1" />
      <circle cx="45" cy="24" r="5" fill="none" stroke="#00e5ff" strokeWidth="1" />
      {[0,60,120,180,240,300].map(a => (
        <line key={a} x1={45+5*Math.cos(a*Math.PI/180)} y1={24+5*Math.sin(a*Math.PI/180)}
          x2={45+12*Math.cos(a*Math.PI/180)} y2={24+12*Math.sin(a*Math.PI/180)}
          stroke="#00e5ff" strokeWidth="0.8" />
      ))}
      {/* Tape path */}
      <path d="M 15 14 Q 30 8 45 14" fill="none" stroke="#00e5ff" strokeWidth="0.8" strokeDasharray="2,2" />
      <path d="M 15 34 Q 30 40 45 34" fill="none" stroke="#00e5ff" strokeWidth="0.8" strokeDasharray="2,2" />
    </svg>
  );
}

function HallDecor() {
  return (
    <svg width="60" height="48" viewBox="0 0 60 48" style={{ opacity: 0.22, flexShrink: 0 }}>
      {/* Arched hall lines */}
      {[6, 12, 18, 24, 30].map((r, i) => (
        <path key={i} d={`M ${30-r*1.5} 44 Q 30 ${44-r*2.5} ${30+r*1.5} 44`}
          fill="none" stroke="#bf00ff" strokeWidth="0.7" />
      ))}
      {/* Dots like a hall grid */}
      {[0,1,2,3,4].map(x => [1,2,3].map(y => (
        <circle key={`${x}${y}`} cx={8+x*11} cy={48-y*12} r="1" fill="#bf00ff" />
      )))}
    </svg>
  );
}

function DistortionDecor() {
  // Clipped waveform
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const sine = Math.sin(t * Math.PI * 4);
    const clipped = Math.max(-0.7, Math.min(0.7, sine * 1.8));
    pts.push(`${i},${24 - clipped * 20}`);
  }
  return (
    <svg width="60" height="48" viewBox="0 0 60 48" style={{ opacity: 0.3, flexShrink: 0 }}>
      <polyline points={pts.join(' ')} fill="none" stroke="#ff2244" strokeWidth="1.5" />
      {/* Clip lines */}
      <line x1="0" y1="10" x2="60" y2="10" stroke="#ff4444" strokeWidth="0.5" strokeDasharray="3,3" />
      <line x1="0" y1="38" x2="60" y2="38" stroke="#ff4444" strokeWidth="0.5" strokeDasharray="3,3" />
    </svg>
  );
}

function FilterDecor({ type }: { type: string }) {
  // Frequency response curve
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const f = i / 60;
    let gain = 0;
    if (type === 'lowpass') gain = f < 0.5 ? 0 : -Math.pow((f - 0.5) * 3, 2) * 30;
    else if (type === 'highpass') gain = f > 0.5 ? 0 : -Math.pow((0.5 - f) * 3, 2) * 30;
    else if (type === 'bandpass') gain = -Math.abs(f - 0.5) * 60 + 10;
    else if (type === 'notch') gain = Math.abs(f - 0.5) < 0.08 ? -30 : 0;
    else gain = 0;
    pts.push(`${i},${24 - Math.max(-24, Math.min(18, gain))}`);
  }
  return (
    <svg width="60" height="48" viewBox="0 0 60 48" style={{ opacity: 0.3, flexShrink: 0 }}>
      <line x1="0" y1="24" x2="60" y2="24" stroke="#ffb300" strokeWidth="0.4" strokeDasharray="2,2" />
      <polyline points={pts.join(' ')} fill="none" stroke="#ffb300" strokeWidth="1.5" />
    </svg>
  );
}

function ChorusDecor() {
  const pts1: string[] = [], pts2: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    pts1.push(`${i},${24 + Math.sin(t * Math.PI * 4) * 16}`);
    pts2.push(`${i},${24 + Math.sin(t * Math.PI * 4 + 0.8) * 14}`);
  }
  return (
    <svg width="60" height="48" viewBox="0 0 60 48" style={{ opacity: 0.28, flexShrink: 0 }}>
      <polyline points={pts1.join(' ')} fill="none" stroke="#00ffaa" strokeWidth="1.2" />
      <polyline points={pts2.join(' ')} fill="none" stroke="#00cc88" strokeWidth="1" strokeDasharray="3,2" />
    </svg>
  );
}

function BitDecor() {
  return (
    <svg width="60" height="48" viewBox="0 0 60 48" style={{ opacity: 0.3, flexShrink: 0 }}>
      {/* Stepped / quantized waveform */}
      {(
        <path
          d="M0,8 H0 V16 H8 V16 H8 V32 H16 V32 H16 V8 H24 V8 H24 V40 H32 V40 H32 V16 H40 V16 H40 V32 H48 V32 H48 V8 H56 V8"
          fill="none" stroke="#39ff14" strokeWidth="1.5"
        />
      )}
      {/* Grid */}
      {[12,24,36].map(y => (
        <line key={y} x1="0" y1={y} x2="60" y2={y} stroke="#39ff14" strokeWidth="0.3" strokeDasharray="1,3" />
      ))}
    </svg>
  );
}

// ── Rack Module ───────────────────────────────────────────────────────────────

interface RackModuleProps {
  name: string;
  brand: string;
  model: string;
  enabled: boolean;
  onToggle: () => void;
  accentColor: string;
  panelGradient: string;
  decor?: React.ReactNode;
  children: React.ReactNode;
}

function RackModule({ name, brand, model, enabled, onToggle, accentColor, panelGradient, decor, children }: RackModuleProps) {
  return (
    <div style={{
      display: 'flex',
      marginBottom: 4,
      borderRadius: 3,
      overflow: 'hidden',
      boxShadow: enabled
        ? `0 0 12px ${accentColor}44, 0 2px 6px rgba(0,0,0,0.6)`
        : '0 2px 6px rgba(0,0,0,0.5)',
      border: `1px solid ${enabled ? accentColor + '66' : '#2a2a2a'}`,
      transition: 'box-shadow 0.2s, border-color 0.2s',
    }}>
      <RackEar side="left" />

      {/* Faceplate */}
      <div style={{
        flex: 1,
        background: panelGradient,
        padding: '8px 10px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Brushed metal texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
        }} />

        {/* Top edge highlight (light reflection) */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Colored left accent stripe */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: `linear-gradient(to bottom, ${accentColor}cc, ${accentColor}44)`,
          boxShadow: enabled ? `2px 0 8px ${accentColor}66` : 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 6 }}>
          {/* Brand + model stamp */}
          <div style={{ flexShrink: 0, minWidth: 80 }}>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'monospace' }}>
              {brand}
            </div>
            <div style={{
              fontSize: 13, fontFamily: "'VT323', monospace", letterSpacing: 1,
              color: enabled ? accentColor : 'rgba(255,255,255,0.5)',
              textShadow: enabled ? `0 0 8px ${accentColor}` : 'none',
              lineHeight: 1.1,
            }}>
              {name}
            </div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', letterSpacing: 1 }}>
              {model}
            </div>
          </div>

          {/* SVG decoration */}
          {decor}

          {/* Divider */}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            {children}
          </div>

          {/* Power section (right side) */}
          <div style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 6, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.06)',
          }}>
            <PowerLED on={enabled} color={accentColor} />
            <button
              onClick={onToggle}
              style={{
                background: 'none', border: `1px solid ${enabled ? accentColor : '#333'}`,
                color: enabled ? accentColor : '#555',
                fontSize: 8, padding: '2px 6px', cursor: 'pointer',
                borderRadius: 2, fontFamily: 'monospace', letterSpacing: 0.5,
                textShadow: enabled ? `0 0 6px ${accentColor}` : 'none',
              }}
            >
              {enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      <RackEar side="right" />
    </div>
  );
}

// ── Preset Button Row ─────────────────────────────────────────────────────────

function PresetRow({ presets, color }: {
  presets: { label: string; onSelect: () => void }[];
  color: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {presets.map(p => (
        <button
          key={p.label}
          onClick={p.onSelect}
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${color}33`,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 8, padding: '2px 8px', cursor: 'pointer',
            fontFamily: 'monospace', letterSpacing: 0.5, borderRadius: 1,
            textAlign: 'left',
            transition: 'all 0.1s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = `${color}22`;
            (e.currentTarget as HTMLElement).style.color = color;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.4)';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Segment Display ───────────────────────────────────────────────────────────

function SegDisplay({ value, color, unit }: { value: string; color: string; unit?: string }) {
  return (
    <div style={{
      background: '#050508',
      border: `1px solid ${color}44`,
      borderRadius: 2, padding: '2px 6px',
      fontFamily: "'VT323', monospace", fontSize: 14,
      color, textShadow: `0 0 8px ${color}`,
      minWidth: 54, textAlign: 'right',
      boxShadow: `inset 0 1px 3px rgba(0,0,0,0.8)`,
    }}>
      {value}{unit && <span style={{ fontSize: 9, opacity: 0.6 }}> {unit}</span>}
    </div>
  );
}

// ── FX Rack ───────────────────────────────────────────────────────────────────

export default function FXRack() {
  const { fxParams, updateFX } = useOSStore();
  const p = fxParams;

  return (
    <div style={{
      background: 'linear-gradient(to bottom, #0d0d0d, #0a0a0a)',
      padding: 10,
      minHeight: '100%',
      // Rack bay side rails
      backgroundImage: 'linear-gradient(to right, #1a1a1a 0px, #0d0d0d 10px, #0d0d0d calc(100% - 10px), #1a1a1a 100%)',
    }}>
      {/* Rack header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        padding: '4px 18px',
      }}>
        <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }}>
          MusicOS 98 ■ FX Rack ■ 6U
        </div>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #333, transparent)' }} />
        <div style={{ fontSize: 8, color: '#333', fontFamily: 'monospace' }}>▣ MASTER BUS</div>
      </div>

      {/* ── DELAY — Tape Echo DLY-1 ─────────────────────── */}
      <RackModule
        name="TAPE ECHO"
        brand="MusicOS"
        model="DLY-1"
        enabled={p.delay.enabled}
        onToggle={() => updateFX('delay', { enabled: !p.delay.enabled })}
        accentColor="#00e5ff"
        panelGradient="linear-gradient(to bottom, #0e1a22, #091218, #0e1a22)"
        decor={<TapeEchoDecor />}
      >
        <KnobField label="Time" value={p.delay.time} min={0.05} max={1} step={0.001}
          onChange={v => updateFX('delay', { time: v })} color="#00e5ff"
          displayVal={`${(p.delay.time * 1000).toFixed(0)}ms`} />
        <KnobField label="Fdbk" value={p.delay.feedback} min={0} max={0.95} step={0.01}
          onChange={v => updateFX('delay', { feedback: v })} color="#00aacc"
          displayVal={`${Math.round(p.delay.feedback * 100)}%`} />
        <KnobField label="Wet" value={p.delay.wet} min={0} max={1} step={0.01}
          onChange={v => updateFX('delay', { wet: v })} color="#0088aa"
          displayVal={`${Math.round(p.delay.wet * 100)}%`} />

        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(0,229,255,0.08)' }} />

        {/* BPM sync buttons */}
        <div>
          <div style={{ fontSize: 7, color: 'rgba(0,229,255,0.4)', marginBottom: 3, letterSpacing: 1, fontFamily: 'monospace' }}>SYNC</div>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 120 }}>
            {(['1/16', '1/8', '1/4', '1/2', '3/4', '1/1'] as const).map(t => {
              const ms: Record<string, number> = {'1/16':0.093,'1/8':0.1875,'1/4':0.375,'1/2':0.75,'3/4':1.125,'1/1':1.5};
              return (
                <button key={t} onClick={() => updateFX('delay', { time: ms[t] })} style={{
                  background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)',
                  color: 'rgba(0,229,255,0.6)', fontSize: 8, padding: '1px 4px',
                  cursor: 'pointer', fontFamily: 'monospace', borderRadius: 1,
                }}>{t}</button>
              );
            })}
          </div>
        </div>

        <SegDisplay value={(p.delay.time * 1000).toFixed(0)} unit="ms" color="#00e5ff" />
      </RackModule>

      {/* ── REVERB — Spatial Hall RVB-1 ─────────────────── */}
      <RackModule
        name="HALL VERB"
        brand="MusicOS"
        model="RVB-1"
        enabled={p.reverb.enabled}
        onToggle={() => updateFX('reverb', { enabled: !p.reverb.enabled })}
        accentColor="#bf00ff"
        panelGradient="linear-gradient(to bottom, #140820, #0c051a, #140820)"
        decor={<HallDecor />}
      >
        <KnobField label="Decay" value={p.reverb.decay} min={0.1} max={10} step={0.1}
          onChange={v => updateFX('reverb', { decay: v })} color="#bf00ff"
          displayVal={`${p.reverb.decay.toFixed(1)}s`} />
        <KnobField label="Wet" value={p.reverb.wet} min={0} max={1} step={0.01}
          onChange={v => updateFX('reverb', { wet: v })} color="#9900cc"
          displayVal={`${Math.round(p.reverb.wet * 100)}%`} />

        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(191,0,255,0.08)' }} />

        <PresetRow color="#bf00ff" presets={[
          { label: 'Room',    onSelect: () => updateFX('reverb', { decay: 1.2 }) },
          { label: 'Hall',    onSelect: () => updateFX('reverb', { decay: 3.5 }) },
          { label: 'Plate',   onSelect: () => updateFX('reverb', { decay: 2.0 }) },
          { label: 'Cave',    onSelect: () => updateFX('reverb', { decay: 6.0 }) },
          { label: 'Chamber', onSelect: () => updateFX('reverb', { decay: 1.8 }) },
        ]} />

        <SegDisplay value={p.reverb.decay.toFixed(1)} unit="s" color="#bf00ff" />
      </RackModule>

      {/* ── DISTORTION — HiGain DST-1 ───────────────────── */}
      <RackModule
        name="HI GAIN"
        brand="MusicOS"
        model="DST-1"
        enabled={p.distortion.enabled}
        onToggle={() => updateFX('distortion', { enabled: !p.distortion.enabled })}
        accentColor="#ff2244"
        panelGradient="linear-gradient(to bottom, #1a0408, #100206, #1a0408)"
        decor={<DistortionDecor />}
      >
        <KnobField label="Drive" value={p.distortion.amount} min={1} max={400} step={1}
          onChange={v => updateFX('distortion', { amount: v })} color="#ff2244"
          displayVal={`${Math.round(p.distortion.amount)}`} />
        <KnobField label="Wet" value={p.distortion.wet} min={0} max={1} step={0.01}
          onChange={v => updateFX('distortion', { wet: v })} color="#cc1133"
          displayVal={`${Math.round(p.distortion.wet * 100)}%`} />

        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,34,68,0.08)' }} />

        {/* Hazard stripe accent */}
        <div style={{
          width: 20, alignSelf: 'stretch',
          background: 'repeating-linear-gradient(45deg, rgba(255,200,0,0.12) 0px, rgba(255,200,0,0.12) 4px, transparent 4px, transparent 8px)',
          borderRadius: 2, flexShrink: 0,
        }} />

        <PresetRow color="#ff2244" presets={[
          { label: 'Soft Clip',  onSelect: () => updateFX('distortion', { amount: 20 }) },
          { label: 'Hard Clip',  onSelect: () => updateFX('distortion', { amount: 80 }) },
          { label: 'Overdrive',  onSelect: () => updateFX('distortion', { amount: 50 }) },
          { label: 'Fuzz',       onSelect: () => updateFX('distortion', { amount: 200 }) },
          { label: 'Annihilate', onSelect: () => updateFX('distortion', { amount: 400 }) },
        ]} />

        <SegDisplay value={`${Math.round(p.distortion.amount)}`} color="#ff2244" />
      </RackModule>

      {/* ── FILTER — Analog FLT-1 ───────────────────────── */}
      <RackModule
        name="ANALOG FILT"
        brand="MusicOS"
        model="FLT-1"
        enabled={p.filter.enabled}
        onToggle={() => updateFX('filter', { enabled: !p.filter.enabled })}
        accentColor="#ffb300"
        panelGradient="linear-gradient(to bottom, #1a1200, #110d00, #1a1200)"
        decor={<FilterDecor type={p.filter.type} />}
      >
        <KnobField label="Freq"
          value={p.filter.freq} min={20} max={20000} step={1}
          onChange={v => updateFX('filter', { freq: v })} color="#ffb300"
          displayVal={p.filter.freq >= 1000 ? `${(p.filter.freq/1000).toFixed(1)}k` : `${Math.round(p.filter.freq)}`} />
        <KnobField label="Reso" value={p.filter.q} min={0.1} max={20} step={0.1}
          onChange={v => updateFX('filter', { q: v })} color="#cc8800"
          displayVal={p.filter.q.toFixed(1)} />

        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,179,0,0.08)' }} />

        {/* Filter mode buttons */}
        <div style={{ display: 'flex', gap: 3, flexDirection: 'column' }}>
          {(['lowpass','highpass','bandpass','notch','peaking'] as BiquadFilterType[]).map(t => (
            <button key={t} onClick={() => updateFX('filter', { type: t })} style={{
              background: p.filter.type === t ? 'rgba(255,179,0,0.2)' : 'rgba(0,0,0,0.4)',
              border: `1px solid ${p.filter.type === t ? '#ffb300' : 'rgba(255,179,0,0.15)'}`,
              color: p.filter.type === t ? '#ffb300' : 'rgba(255,255,255,0.35)',
              fontSize: 8, padding: '2px 6px', cursor: 'pointer',
              fontFamily: 'monospace', borderRadius: 1, letterSpacing: 0.5,
              textShadow: p.filter.type === t ? '0 0 6px #ffb300' : 'none',
            }}>
              {t === 'lowpass' ? 'LP' : t === 'highpass' ? 'HP' : t === 'bandpass' ? 'BP' : t === 'notch' ? 'NOTCH' : 'PEAK'}
            </button>
          ))}
        </div>

        <SegDisplay
          value={p.filter.freq >= 1000 ? `${(p.filter.freq/1000).toFixed(1)}k` : `${Math.round(p.filter.freq)}`}
          unit="Hz" color="#ffb300"
        />
      </RackModule>

      {/* ── CHORUS — Dimension CHR-1 ────────────────────── */}
      <RackModule
        name="DIMENSION"
        brand="MusicOS"
        model="CHR-1"
        enabled={p.chorus.enabled}
        onToggle={() => updateFX('chorus', { enabled: !p.chorus.enabled })}
        accentColor="#00ffaa"
        panelGradient="linear-gradient(to bottom, #001a12, #001008, #001a12)"
        decor={<ChorusDecor />}
      >
        <KnobField label="Rate" value={p.chorus.rate} min={0.1} max={10} step={0.1}
          onChange={v => updateFX('chorus', { rate: v })} color="#00ffaa"
          displayVal={`${p.chorus.rate.toFixed(1)}Hz`} />
        <KnobField label="Depth" value={p.chorus.depth} min={0.001} max={0.02} step={0.0001}
          onChange={v => updateFX('chorus', { depth: v })} color="#00cc88"
          displayVal={`${(p.chorus.depth * 1000).toFixed(1)}`} />
        <KnobField label="Wet" value={p.chorus.wet} min={0} max={1} step={0.01}
          onChange={v => updateFX('chorus', { wet: v })} color="#009966"
          displayVal={`${Math.round(p.chorus.wet * 100)}%`} />
        <SegDisplay value={`${p.chorus.rate.toFixed(1)}`} unit="Hz" color="#00ffaa" />
      </RackModule>

      {/* ── BITCRUSHER — Lo-Fi BCR-1 ────────────────────── */}
      <RackModule
        name="LO-FI CRUSH"
        brand="MusicOS"
        model="BCR-1"
        enabled={p.bitcrusher.enabled}
        onToggle={() => updateFX('bitcrusher', { enabled: !p.bitcrusher.enabled })}
        accentColor="#39ff14"
        panelGradient="linear-gradient(to bottom, #020d00, #010800, #020d00)"
        decor={<BitDecor />}
      >
        <KnobField label="Bits" value={p.bitcrusher.bits} min={1} max={16} step={1}
          onChange={v => updateFX('bitcrusher', { bits: v })} color="#39ff14"
          displayVal={`${Math.round(p.bitcrusher.bits)}-bit`} />
        <KnobField label="Wet" value={p.bitcrusher.wet} min={0} max={1} step={0.01}
          onChange={v => updateFX('bitcrusher', { wet: v })} color="#22cc00"
          displayVal={`${Math.round(p.bitcrusher.wet * 100)}%`} />

        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(57,255,20,0.08)' }} />

        {/* Bit depth visual */}
        <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 40 }}>
          {Array.from({ length: Math.round(p.bitcrusher.bits) }, (_, i) => (
            <div key={i} style={{
              width: 3, background: '#39ff14',
              height: `${((i + 1) / 16) * 100}%`,
              opacity: 0.4 + (i / 16) * 0.6,
              boxShadow: '0 0 3px #39ff14',
            }} />
          ))}
        </div>

        <SegDisplay value={`${Math.round(p.bitcrusher.bits)}`} unit="bit" color="#39ff14" />
      </RackModule>

      {/* Rack footer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
        padding: '3px 18px',
      }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #333)' }} />
        <div style={{ fontSize: 7, color: '#2a2a2a', fontFamily: 'monospace', letterSpacing: 2 }}>
          ▣ MusicOS 98 FX SUITE v1.0
        </div>
      </div>
    </div>
  );
}
