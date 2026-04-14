import { useRef, useCallback, useState, useEffect } from 'react';
import { useOSStore } from '../store';
import { audioEngine } from '../audio/engine';

// ── VU Meter ──────────────────────────────────────────────────────────────────
function VUMeter({ channelIdx, color }: { channelIdx: number; color: string }) {
  const [level, setLevel] = useState(0);
  const peakRef = useRef(0);
  const peakHoldRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      const raw = audioEngine.getChannelLevel(channelIdx);
      const scaled = Math.min(1, raw * 8);
      setLevel(scaled);
      if (scaled > peakRef.current) {
        peakRef.current = scaled;
        peakHoldRef.current = 70;
      } else {
        peakHoldRef.current--;
        if (peakHoldRef.current <= 0) peakRef.current = Math.max(0, peakRef.current - 0.012);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [channelIdx]);

  const segments = 16;
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[0, 1].map(col => (
        <div key={col} style={{
          display: 'flex', flexDirection: 'column', gap: 1,
          width: 9, height: 112,
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 3, padding: '2px 1px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.04)',
        }}>
          {Array.from({ length: segments }, (_, i) => {
            const segLevel = 1 - (i + 1) / segments;
            const lit = level > segLevel;
            const isPeak = col === 0 && Math.abs(peakRef.current - (1 - i / segments)) < 1.2 / segments;
            const segColor = i <= 1 ? '#ff3333' : i <= 3 ? '#ff9900' : color;
            return (
              <div key={i} style={{
                flex: 1, borderRadius: 1,
                background: lit ? segColor : isPeak ? segColor + 'cc' : 'rgba(255,255,255,0.06)',
                boxShadow: lit ? `0 0 3px ${segColor}88` : 'none',
                transition: lit ? 'none' : 'background 0.04s',
              }} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Pan Knob ──────────────────────────────────────────────────────────────────
function PanKnob({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  const angle = value * 135;
  const dragRef = useRef<{ y: number; v: number } | null>(null);
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { y: e.clientY, v: value };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      onChange(Math.max(-1, Math.min(1, dragRef.current.v + (dragRef.current.y - me.clientY) / 60)));
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };
  return (
    <div title={`Pan: ${value === 0 ? 'C' : value > 0 ? `R${Math.round(value * 100)}` : `L${Math.round(-value * 100)}`}`}
      onMouseDown={onMouseDown} onDoubleClick={() => onChange(0)}
      style={{ width: 26, height: 26, borderRadius: '50%', cursor: 'ns-resize', position: 'relative',
        background: 'radial-gradient(circle at 35% 30%, #7a7c98, #32344a)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.28), 0 0 0 1px #111',
      }}>
      <div style={{
        position: 'absolute', width: 3, height: 10,
        background: color,
        left: '50%', top: 3,
        transformOrigin: '50% calc(100% + 3px)',
        transform: `translateX(-50%) rotate(${angle}deg)`,
        borderRadius: 1,
        boxShadow: `0 0 5px ${color}bb`,
      }} />
    </div>
  );
}

// ── FX Send Knob ──────────────────────────────────────────────────────────────
function SendKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const angle = -135 + value * 270;
  const dragRef = useRef<{ y: number; v: number } | null>(null);
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { y: e.clientY, v: value };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      onChange(Math.max(0, Math.min(1, dragRef.current.v + (dragRef.current.y - me.clientY) / 60)));
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };
  return (
    <div onMouseDown={onMouseDown} title={`FX Send: ${Math.round(value * 100)}%`}
      style={{ width: 22, height: 22, borderRadius: '50%', cursor: 'ns-resize', position: 'relative',
        background: 'radial-gradient(circle at 35% 30%, #5a4238, #2e1810)',
        boxShadow: '0 2px 5px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.2), 0 0 0 1px #111',
      }}>
      <div style={{
        position: 'absolute', width: 3, height: 8,
        background: '#ff8844',
        left: '50%', top: 2,
        transformOrigin: '50% calc(100% + 3px)',
        transform: `translateX(-50%) rotate(${angle}deg)`,
        borderRadius: 1,
        boxShadow: value > 0.02 ? '0 0 6px #ff8844cc' : 'none',
        opacity: 0.4 + value * 0.6,
      }} />
    </div>
  );
}

// ── Channel Strip ─────────────────────────────────────────────────────────────
function ChannelStrip({ index }: { index: number }) {
  const { mixerChannels, updateMixerChannel } = useOSStore();
  const ch = mixerChannels[index];
  const dragRef = useRef<{ y: number; v: number } | null>(null);
  const isMaster = index === 7;
  const isFXBus = index === 6;

  const onFaderDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { y: e.clientY, v: ch.gain };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      updateMixerChannel(index, { gain: Math.max(0, Math.min(1, dragRef.current.v + (dragRef.current.y - me.clientY) / 130)) });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [ch.gain, index, updateMixerChannel]);

  const faderH = 130;
  const thumbPos = faderH - ch.gain * faderH;
  const dbVal = ch.gain === 0 ? '-∞' : (20 * Math.log10(ch.gain)).toFixed(1);
  const col = ch.color || '#00e5ff';

  const panelBg = isMaster
    ? 'linear-gradient(180deg, #282430 0%, #1e1c28 100%)'
    : isFXBus
    ? 'linear-gradient(180deg, #222c1e 0%, #1a221a 100%)'
    : 'linear-gradient(180deg, #22243a 0%, #1a1c30 100%)';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: isMaster ? 86 : 74, flex: `0 0 ${isMaster ? 86 : 74}px`,
      background: panelBg,
      border: `1px solid ${isMaster ? '#383040' : '#252638'}`,
      borderTop: `3px solid ${col}`,
      borderRadius: '0 0 4px 4px',
      boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.4)`,
      paddingBottom: 8,
      position: 'relative',
    }}>
      {/* Top color glow */}
      <div style={{ position: 'absolute', top: -3, left: 0, right: 0, height: 3,
        background: col, boxShadow: `0 0 10px ${col}88`, borderRadius: '2px 2px 0 0' }} />

      {/* VU section */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center',
        padding: '10px 0 8px', background: 'rgba(0,0,0,0.35)',
        borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <VUMeter channelIdx={index} color={col} />
      </div>

      {/* Channel name */}
      <div style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase',
        color: ch.muted ? '#333' : col, fontFamily: "'Share Tech Mono', monospace",
        textAlign: 'center', padding: '6px 4px 4px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
        textShadow: ch.muted ? 'none' : `0 0 10px ${col}66` }}>
        {ch.name}
      </div>

      {/* Pan */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0 6px' }}>
        <PanKnob value={ch.pan} onChange={v => updateMixerChannel(index, { pan: v })} color={col} />
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
          {ch.pan === 0 ? '·C·' : ch.pan > 0 ? `R${Math.round(ch.pan * 100)}` : `L${Math.round(-ch.pan * 100)}`}
        </div>
      </div>

      {/* dB readout */}
      <div style={{ fontFamily: "'VT323', monospace", fontSize: 13,
        color: ch.gain === 0 ? '#444' : ch.gain > 0.85 ? '#ff9900' : col,
        textShadow: ch.gain > 0 ? `0 0 8px ${col}55` : 'none',
        minWidth: 36, textAlign: 'center', paddingBottom: 4 }}>
        {dbVal}
      </div>

      {/* Fader */}
      <div style={{ width: 12, height: faderH,
        background: 'linear-gradient(to right, #0e0f18, #141520, #0e0f18)',
        border: '1px solid #0a0a14', borderRadius: 5, position: 'relative',
        cursor: 'ns-resize', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.9)' }}
        onMouseDown={onFaderDrag}>
        {/* Unity mark */}
        <div style={{ position: 'absolute', left: -4, right: -4, top: faderH * 0.25,
          height: 1, background: 'rgba(255,255,255,0.14)', pointerEvents: 'none' }} />
        {/* Fill */}
        <div style={{ position: 'absolute', bottom: 0, left: 2, right: 2,
          height: `${ch.gain * 100}%`,
          background: `linear-gradient(to top, ${col}44, transparent)`, borderRadius: 4 }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute', left: '50%', top: thumbPos, transform: 'translateX(-50%)',
          width: 30, height: 14,
          background: 'linear-gradient(180deg, #6a6c8a 0%, #3e4060 45%, #32344e 55%, #4a4c6a 100%)',
          border: '1px solid #7a7c9a', borderRadius: 2, cursor: 'ns-resize',
          boxShadow: '0 3px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.25)',
          zIndex: 2,
        }}>
          {[3, 7, 11].map(y => (
            <div key={y} style={{ position: 'absolute', left: 5, right: 5, top: y,
              height: 1, background: 'rgba(0,0,0,0.5)', boxShadow: '0 1px 0 rgba(255,255,255,0.18)' }} />
          ))}
        </div>
      </div>

      {/* M / S buttons */}
      <div style={{ display: 'flex', gap: 3, padding: '6px 0 2px' }}>
        <button onClick={() => updateMixerChannel(index, { muted: !ch.muted })} style={{
          width: 24, height: 18, fontSize: 8, cursor: 'pointer',
          fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1,
          background: ch.muted ? 'linear-gradient(to bottom, #cc2200, #881500)' : 'linear-gradient(to bottom, #2a2c40, #1e2032)',
          color: ch.muted ? '#ffbb99' : 'rgba(255,255,255,0.35)',
          border: `1px solid ${ch.muted ? '#ff4422' : '#303248'}`,
          borderRadius: 2,
          boxShadow: ch.muted ? '0 0 8px #ff332244, inset 0 1px 0 rgba(255,255,255,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>M</button>
        <button onClick={() => updateMixerChannel(index, { solo: !ch.solo })} style={{
          width: 24, height: 18, fontSize: 8, cursor: 'pointer',
          fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1,
          background: ch.solo ? 'linear-gradient(to bottom, #005500, #003300)' : 'linear-gradient(to bottom, #2a2c40, #1e2032)',
          color: ch.solo ? '#99ffbb' : 'rgba(255,255,255,0.35)',
          border: `1px solid ${ch.solo ? '#33ff66' : '#303248'}`,
          borderRadius: 2,
          boxShadow: ch.solo ? '0 0 8px #33ff6644, inset 0 1px 0 rgba(255,255,255,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>S</button>
      </div>

      {/* FX Send — channels 0–5 only */}
      {index < 6 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 5 }}>
          <div style={{ fontSize: 7, color: (ch.fxSend ?? 0) > 0 ? '#ff8844' : 'rgba(255,255,255,0.2)',
            fontFamily: 'monospace', letterSpacing: 0.5 }}>FX</div>
          <SendKnob value={ch.fxSend ?? 0}
            onChange={v => updateMixerChannel(index, { fxSend: parseFloat(v.toFixed(3)) })} />
          <div style={{ fontSize: 7, fontFamily: 'monospace',
            color: (ch.fxSend ?? 0) > 0 ? '#ff8844' : 'rgba(255,255,255,0.15)' }}>
            {Math.round((ch.fxSend ?? 0) * 100)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Master horizontal output meter ────────────────────────────────────────────
function OutputMeter() {
  const [level, setLevel] = useState(0);
  const peakRef = useRef(0);
  const peakHoldRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      const raw = audioEngine.getChannelLevel(7);
      const scaled = Math.min(1, raw * 8);
      setLevel(scaled);
      if (scaled > peakRef.current) { peakRef.current = scaled; peakHoldRef.current = 70; }
      else { peakHoldRef.current--; if (peakHoldRef.current <= 0) peakRef.current = Math.max(0, peakRef.current - 0.012); }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const segments = 24;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[0, 1].map(col => (
        <div key={col} style={{
          display: 'flex', gap: 1, height: 8, alignItems: 'center',
          background: 'rgba(0,0,0,0.6)', borderRadius: 2, padding: '1px 3px',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
        }}>
          {Array.from({ length: segments }, (_, i) => {
            const segLevel = (i + 1) / segments;
            const lit = level >= segLevel;
            const isPeak = col === 0 && Math.abs(peakRef.current - segLevel) < 1.5 / segments;
            const segColor = i >= 20 ? '#ff2222' : i >= 16 ? '#ff9900' : '#00ee55';
            return (
              <div key={i} style={{
                width: 7, height: 6, borderRadius: 1,
                background: lit ? segColor : isPeak ? segColor + 'bb' : 'rgba(255,255,255,0.05)',
                boxShadow: lit && i >= 16 ? `0 0 4px ${segColor}99` : 'none',
              }} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Mixer ─────────────────────────────────────────────────────────────────────
export default function Mixer() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(180deg, #141520 0%, #0e0f1a 100%)',
      fontFamily: "'Share Tech Mono', monospace" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 14px',
        background: 'linear-gradient(90deg, #10111e, #181928, #10111e)',
        borderBottom: '2px solid #0a0a14',
        boxShadow: '0 3px 10px rgba(0,0,0,0.5)', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
          <div style={{ fontSize: 17, fontFamily: "'VT323', monospace", letterSpacing: 4,
            background: 'linear-gradient(to bottom, #e8e8f8, #888899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 1px 3px rgba(255,255,255,0.15))' }}>CONSOLE</div>
          <div style={{ fontSize: 7, color: '#3a3c50', letterSpacing: 2 }}>MusicOS 98 · 8ch MIXING DESK</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <OutputMeter />
          <div style={{ fontSize: 7, color: '#2a2c40', letterSpacing: 2 }}>MASTER OUT</div>
        </div>
      </div>

      {/* Strips */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', gap: 3, padding: '0 10px', height: '100%', alignItems: 'flex-start' }}>
          {/* Input channels 0–5 */}
          {[0,1,2,3,4,5].map(i => <ChannelStrip key={i} index={i} />)}
          {/* Divider */}
          <div style={{ width: 2, alignSelf: 'stretch', margin: '0 5px',
            background: 'linear-gradient(to bottom, transparent, #383050, transparent)', flexShrink: 0 }} />
          {/* FX Bus + Master */}
          {[6,7].map(i => <ChannelStrip key={i} index={i} />)}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 14px',
        borderTop: '1px solid #0e0f1a', background: '#0a0b14', flexShrink: 0 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff8844',
          boxShadow: '0 0 5px #ff884488' }} />
        <span style={{ fontSize: 8, color: '#ff8844', letterSpacing: 0.5 }}>FX SND knob routes channel to FX Rack chain</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 8, color: '#2a2c40' }}>Double-click pan knob to center</span>
      </div>
    </div>
  );
}
