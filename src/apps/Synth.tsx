import { useEffect, useRef, useState, useCallback } from 'react';
import { useOSStore } from '../store';
import { audioEngine } from '../audio/engine';
import type { SynthParams } from '../audio/engine';
import { midiBridge } from '../audio/midi';

// ── Factory Patches ──────────────────────────────────────────────────────────
interface Patch { name: string; params: SynthParams; factory?: boolean; }

const FACTORY_PATCHES: Patch[] = [
  { name: 'Init', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'square', osc2Detune: 0, osc2Mix: 0, attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.4, filterFreq: 18000, filterQ: 1, filterEnvAmount: 0, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.7 } },
  { name: 'Supersaw Lead', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'sawtooth', osc2Detune: 11, osc2Mix: 0.8, attack: 0.008, decay: 0.2, sustain: 0.7, release: 0.35, filterFreq: 3400, filterQ: 1.5, filterEnvAmount: 0.3, lfoRate: 0.4, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.65 } },
  { name: 'Acid Bass', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'sawtooth', osc2Detune: 0, osc2Mix: 0, attack: 0.002, decay: 0.18, sustain: 0.0, release: 0.08, filterFreq: 600, filterQ: 14, filterEnvAmount: 0.9, lfoRate: 8, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.75 } },
  { name: '808 Bass', factory: true, params: { oscillatorType: 'sine', osc2Type: 'sine', osc2Detune: 0, osc2Mix: 0, attack: 0.005, decay: 0.8, sustain: 0.0, release: 0.5, filterFreq: 220, filterQ: 0.8, filterEnvAmount: 0, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.9 } },
  { name: 'Reese Bass', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'sawtooth', osc2Detune: -14, osc2Mix: 0.95, attack: 0.01, decay: 0.3, sustain: 0.8, release: 0.2, filterFreq: 400, filterQ: 2, filterEnvAmount: 0.1, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.7 } },
  { name: 'Wobble Bass', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'sawtooth', osc2Detune: 7, osc2Mix: 0.5, attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.25, filterFreq: 280, filterQ: 8, filterEnvAmount: 0.4, lfoRate: 4, lfoDepth: 380, lfoTarget: 'filter', masterGain: 0.7 } },
  { name: 'Pluck', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'triangle', osc2Detune: 5, osc2Mix: 0.3, attack: 0.001, decay: 0.12, sustain: 0.0, release: 0.15, filterFreq: 2200, filterQ: 3, filterEnvAmount: 0.7, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.7 } },
  { name: 'Glass Bell', factory: true, params: { oscillatorType: 'sine', osc2Type: 'triangle', osc2Detune: 12, osc2Mix: 0.4, attack: 0.002, decay: 0.6, sustain: 0.0, release: 1.2, filterFreq: 8000, filterQ: 1, filterEnvAmount: 0, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.6 } },
  { name: 'Brass Stab', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'square', osc2Detune: 3, osc2Mix: 0.45, attack: 0.005, decay: 0.08, sustain: 0.4, release: 0.1, filterFreq: 1800, filterQ: 3.5, filterEnvAmount: 0.85, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.7 } },
  { name: 'Rave Stab', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'sawtooth', osc2Detune: 7, osc2Mix: 0.7, attack: 0.001, decay: 0.06, sustain: 0.0, release: 0.06, filterFreq: 900, filterQ: 6, filterEnvAmount: 1.0, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.75 } },
  { name: 'Lush Pad', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'triangle', osc2Detune: 9, osc2Mix: 0.6, attack: 0.55, decay: 0.4, sustain: 0.75, release: 1.2, filterFreq: 1800, filterQ: 0.8, filterEnvAmount: 0.1, lfoRate: 0.3, lfoDepth: 120, lfoTarget: 'filter', masterGain: 0.6 } },
  { name: 'Cinematic', factory: true, params: { oscillatorType: 'sine', osc2Type: 'triangle', osc2Detune: -7, osc2Mix: 0.5, attack: 1.2, decay: 0.6, sustain: 0.65, release: 2.5, filterFreq: 2400, filterQ: 0.7, filterEnvAmount: 0, lfoRate: 0.15, lfoDepth: 80, lfoTarget: 'amp', masterGain: 0.6 } },
  { name: 'Soft Lead', factory: true, params: { oscillatorType: 'triangle', osc2Type: 'sine', osc2Detune: 6, osc2Mix: 0.3, attack: 0.02, decay: 0.25, sustain: 0.55, release: 0.4, filterFreq: 3200, filterQ: 1.2, filterEnvAmount: 0.2, lfoRate: 5, lfoDepth: 30, lfoTarget: 'pitch', masterGain: 0.65 } },
  { name: 'Dirty Lead', factory: true, params: { oscillatorType: 'square', osc2Type: 'sawtooth', osc2Detune: -5, osc2Mix: 0.7, attack: 0.005, decay: 0.1, sustain: 0.6, release: 0.2, filterFreq: 4500, filterQ: 4, filterEnvAmount: 0.4, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.65 } },
  { name: 'Sub Bass', factory: true, params: { oscillatorType: 'sine', osc2Type: 'sine', osc2Detune: 0, osc2Mix: 0, attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.3, filterFreq: 120, filterQ: 0.5, filterEnvAmount: 0, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.9 } },
  { name: 'Chip Lead', factory: true, params: { oscillatorType: 'square', osc2Type: 'square', osc2Detune: -12, osc2Mix: 0.3, attack: 0.001, decay: 0.05, sustain: 0.7, release: 0.05, filterFreq: 6000, filterQ: 1, filterEnvAmount: 0.1, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.65 } },
  { name: 'Moog Bass', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'sawtooth', osc2Detune: -1, osc2Mix: 0.5, attack: 0.006, decay: 0.35, sustain: 0.3, release: 0.25, filterFreq: 350, filterQ: 5, filterEnvAmount: 0.75, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.75 } },
  { name: 'Formant', factory: true, params: { oscillatorType: 'sawtooth', osc2Type: 'sine', osc2Detune: 0, osc2Mix: 0.2, attack: 0.08, decay: 0.3, sustain: 0.5, release: 0.5, filterFreq: 800, filterQ: 18, filterEnvAmount: 0.3, lfoRate: 0.8, lfoDepth: 200, lfoTarget: 'filter', masterGain: 0.6 } },
  { name: 'Vinyl Keys', factory: true, params: { oscillatorType: 'triangle', osc2Type: 'sine', osc2Detune: 0, osc2Mix: 0, attack: 0.003, decay: 0.5, sustain: 0.0, release: 0.6, filterFreq: 2800, filterQ: 1, filterEnvAmount: 0, lfoRate: 3, lfoDepth: 0, lfoTarget: 'filter', masterGain: 0.65 } },
  { name: 'Siren', factory: true, params: { oscillatorType: 'sine', osc2Type: 'sine', osc2Detune: 0, osc2Mix: 0, attack: 0.3, decay: 0.1, sustain: 0.8, release: 0.4, filterFreq: 18000, filterQ: 1, filterEnvAmount: 0, lfoRate: 2.5, lfoDepth: 400, lfoTarget: 'pitch', masterGain: 0.65 } },
];

const LS_KEY = 'musicOS98_synthPatches';

function loadUserPatches(): Patch[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function saveUserPatches(patches: Patch[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(patches));
}

// 5 octaves: C2 (36) to C7 (96) — 36 white keys, fits ~780px at 22px each
const KEY_W = 22; // white key width in px
const KEY_H = 88;
const BLACK_W = 13;
const BLACK_H = 54;

function buildWhiteNotes(start: number, end: number) {
  const whites: number[] = [];
  for (let n = start; n <= end; n++) {
    if (![1,3,6,8,10].includes(n % 12)) whites.push(n);
  }
  return whites;
}

function buildBlackKeys(start: number, end: number) {
  const blacks: { note: number; left: number }[] = [];
  let wIdx = 0;
  for (let n = start; n <= end; n++) {
    const semitone = n % 12;
    const isBlack = [1,3,6,8,10].includes(semitone);
    if (!isBlack) {
      const next = n + 1;
      if (next <= end && [1,3,6,8,10].includes(next % 12)) {
        blacks.push({ note: next, left: (wIdx + 1) * KEY_W - Math.floor(BLACK_W / 2) });
      }
      wIdx++;
    }
  }
  return blacks;
}

const KB_START = 36; // C2
const KB_END   = 96; // C7
const WHITE_NOTES = buildWhiteNotes(KB_START, KB_END);
const BLACK_KEYS  = buildBlackKeys(KB_START, KB_END);

// Keyboard mapping
const KEY_MAP: Record<string, number> = {
  'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67,
  'y': 68, 'h': 69, 'u': 70, 'j': 71, 'k': 72, 'o': 73, 'l': 74, 'p': 75,
};

// ── Dot Matrix Visualizer ────────────────────────────────────────────────────

const VIZ_COLS = 56;
const VIZ_ROWS = 9;
const DOT_GAP = 7;
const DOT_R = 2.4;
const VIZ_W = VIZ_COLS * DOT_GAP + 4;
const VIZ_H = VIZ_ROWS * DOT_GAP + 4;

// MIDI 48–83 mapped to columns 0–55
function noteToCol(midi: number) {
  return Math.max(0, Math.min(VIZ_COLS - 1, Math.round(((midi - 48) / 36) * (VIZ_COLS - 1))));
}

function SynthViz({ pressedKeys }: { pressedKeys: Set<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const energy = useRef(new Float32Array(VIZ_COLS * VIZ_ROWS).fill(0));
  const prevKeys = useRef<Set<number>>(new Set());
  const rafId = useRef<number>(0);
  const tick = useRef(0);
  // Stable ref so the animation loop always sees current pressedKeys without restarting
  const keysRef = useRef<Set<number>>(pressedKeys);
  keysRef.current = pressedKeys;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      rafId.current = requestAnimationFrame(draw);
      tick.current++;

      const keys = keysRef.current;

      // Detect newly pressed notes → add energy blob
      keys.forEach(midi => {
        if (!prevKeys.current.has(midi)) {
          const col = noteToCol(midi);
          for (let c = 0; c < VIZ_COLS; c++) {
            const dist = Math.abs(c - col);
            const splash = Math.exp(-(dist * dist) / 10);
            for (let r = 0; r < VIZ_ROWS; r++) {
              const rowBoost = 0.4 + ((VIZ_ROWS - r) / VIZ_ROWS) * 0.9;
              energy.current[r * VIZ_COLS + c] = Math.min(1, energy.current[r * VIZ_COLS + c] + splash * rowBoost);
            }
          }
        }
      });
      prevKeys.current = new Set(keys);

      // Decay
      const decay = keys.size > 0 ? 0.974 : 0.92;
      for (let i = 0; i < energy.current.length; i++) energy.current[i] *= decay;

      // Ambient shimmer when idle
      if (keys.size === 0 && tick.current % 6 === 0) {
        const c = Math.floor(Math.random() * VIZ_COLS);
        energy.current[(VIZ_ROWS - 1) * VIZ_COLS + c] = Math.max(
          energy.current[(VIZ_ROWS - 1) * VIZ_COLS + c],
          Math.random() * 0.15
        );
      }

      // Clear
      ctx.fillStyle = '#050008';
      ctx.fillRect(0, 0, VIZ_W, VIZ_H);

      // Draw dots
      for (let r = 0; r < VIZ_ROWS; r++) {
        for (let c = 0; c < VIZ_COLS; c++) {
          const e = energy.current[r * VIZ_COLS + c];
          const x = c * DOT_GAP + DOT_GAP / 2 + 2;
          const y = r * DOT_GAP + DOT_GAP / 2 + 2;

          if (e < 0.015) {
            ctx.beginPath();
            ctx.arc(x, y, DOT_R, 0, Math.PI * 2);
            ctx.fillStyle = '#160006';
            ctx.fill();
          } else {
            const bright = Math.min(1, e);
            const red = Math.round(160 + bright * 95);
            const green = Math.round(bright * bright * 130);
            const blue = Math.round(bright * 6);
            ctx.beginPath();
            ctx.arc(x, y, DOT_R, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${red},${green},${blue})`;
            ctx.fill();

            if (bright > 0.35) {
              const glow = ctx.createRadialGradient(x, y, 0, x, y, DOT_R * 4);
              glow.addColorStop(0, `rgba(${red},${green >> 1},0,${bright * 0.5})`);
              glow.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.beginPath();
              ctx.arc(x, y, DOT_R * 4, 0, Math.PI * 2);
              ctx.fillStyle = glow;
              ctx.fill();
            }
          }
        }
      }

      // Subtle scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      for (let scanY = 0; scanY < VIZ_H; scanY += 2) {
        ctx.fillRect(0, scanY, VIZ_W, 1);
      }
    };

    draw();
    return () => cancelAnimationFrame(rafId.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={VIZ_W}
      height={VIZ_H}
      style={{
        width: '100%',
        height: VIZ_H,
        imageRendering: 'pixelated',
        borderRadius: 2,
        boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8), 0 0 12px rgba(180,0,30,0.15)',
        border: '1px solid #2a0010',
        display: 'block',
      }}
    />
  );
}

// ── Knob ────────────────────────────────────────────────────────────────────

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
  format?: (v: number) => string;
}

function Knob({ label, value, min, max, step = 0.01, onChange, color = 'var(--px-cyan)', format }: KnobProps) {
  const dragStart = useRef<{ y: number; v: number } | null>(null);
  const range = max - min;
  const pct = (value - min) / range;
  const angle = -145 + pct * 290;

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { y: e.clientY, v: value };
    const onMove = (me: MouseEvent) => {
      if (!dragStart.current) return;
      const dy = dragStart.current.y - me.clientY;
      const newVal = Math.max(min, Math.min(max, dragStart.current.v + (dy / 150) * range));
      onChange(Math.round(newVal / step) * step);
    };
    const onUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="knob-container" onMouseDown={onMouseDown}>
      <div className="knob" style={{ '--knob-color': color } as any}>
        <div style={{
          position: 'absolute', width: 2, height: 12,
          background: color, left: '50%', top: 4,
          transformOrigin: '50% calc(100% + 2px)',
          transform: `translateX(-50%) rotate(${angle}deg)`,
          borderRadius: 1,
          boxShadow: `0 0 4px ${color}`,
        }} />
      </div>
      <div className="knob-label">{label}</div>
      <div className="knob-value" style={{ color }}>{format ? format(value) : value.toFixed(2)}</div>
    </div>
  );
}

// ── Patch Browser ─────────────────────────────────────────────────────────────
function PatchBrowser({ onLoad }: { onLoad: (p: Patch) => void }) {
  const [userPatches, setUserPatches] = useState<Patch[]>(loadUserPatches);
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const { synthParams, activeSynthPatch, setActiveSynthPatch } = useOSStore();

  const allPatches = [...FACTORY_PATCHES, ...userPatches];
  // Resolve activeName: use store value if it exists in patch list, else fall back to first patch
  const activeName = allPatches.find(p => p.name === activeSynthPatch) ? activeSynthPatch : FACTORY_PATCHES[0].name;

  const load = (p: Patch) => {
    setActiveSynthPatch(p.name);
    onLoad(p);
  };

  const saveNew = () => {
    const name = saveName.trim() || `Patch ${userPatches.length + 1}`;
    const newPatch: Patch = { name, params: { ...synthParams } };
    const updated = [...userPatches.filter(p => p.name !== name), newPatch];
    setUserPatches(updated);
    saveUserPatches(updated);
    setActiveSynthPatch(name);
    setSaveName('');
    setShowSave(false);
  };

  const deleteUserPatch = (name: string) => {
    const updated = userPatches.filter(p => p.name !== name);
    setUserPatches(updated);
    saveUserPatches(updated);
    if (activeName === name) setActiveSynthPatch(FACTORY_PATCHES[0].name);
  };

  const activeIsUser = !FACTORY_PATCHES.find(p => p.name === activeName);

  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,229,255,0.1)',
      borderRadius: 4, padding: '6px 8px', marginBottom: 8, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, color: 'rgba(0,229,255,0.6)', fontFamily: 'monospace', letterSpacing: 1, flexShrink: 0 }}>
          PATCHES
        </span>
        <select
          value={activeName}
          onChange={e => { const p = allPatches.find(x => x.name === e.target.value); if (p) load(p); }}
          style={{
            flex: 1, background: '#0a0b14', border: '1px solid rgba(0,229,255,0.25)',
            color: activeIsUser ? '#bf00ff' : '#00e5ff', fontSize: 10, padding: '3px 6px',
            borderRadius: 2, fontFamily: 'monospace', outline: 'none', cursor: 'pointer',
          }}
        >
          <optgroup label="— Factory —" style={{ color: 'rgba(0,229,255,0.5)', background: '#0a0b14' }}>
            {FACTORY_PATCHES.map(p => (
              <option key={p.name} value={p.name} style={{ color: '#00e5ff', background: '#0a0b14' }}>{p.name}</option>
            ))}
          </optgroup>
          {userPatches.length > 0 && (
            <optgroup label="— Saved —" style={{ color: 'rgba(191,0,255,0.6)', background: '#0a0b14' }}>
              {userPatches.map(p => (
                <option key={p.name} value={p.name} style={{ color: '#bf00ff', background: '#0a0b14' }}>{p.name}</option>
              ))}
            </optgroup>
          )}
        </select>
        {activeIsUser && (
          <button
            onClick={() => deleteUserPatch(activeName)}
            title="Delete patch"
            style={{
              fontSize: 9, padding: '3px 6px', cursor: 'pointer', flexShrink: 0,
              background: 'rgba(255,50,50,0.1)', color: 'rgba(255,100,100,0.7)',
              border: '1px solid rgba(255,50,50,0.3)', borderRadius: 2,
            }}
          >× DEL</button>
        )}
        {showSave ? (
          <>
            <input
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveNew(); if (e.key === 'Escape') setShowSave(false); }}
              placeholder="Name..."
              autoFocus
              style={{
                background: '#0a0b14', border: '1px solid rgba(0,229,255,0.3)',
                color: '#00e5ff', fontSize: 9, padding: '3px 6px', borderRadius: 2,
                fontFamily: 'monospace', width: 100, outline: 'none', flexShrink: 0,
              }}
            />
            <button onClick={saveNew} style={{
              fontSize: 9, padding: '3px 8px', cursor: 'pointer', flexShrink: 0,
              background: 'rgba(0,229,255,0.15)', color: '#00e5ff',
              border: '1px solid rgba(0,229,255,0.4)', borderRadius: 2,
            }}>OK</button>
            <button onClick={() => setShowSave(false)} style={{
              fontSize: 9, padding: '3px 5px', cursor: 'pointer', flexShrink: 0,
              background: 'transparent', color: 'rgba(255,255,255,0.3)',
              border: '1px solid #333', borderRadius: 2,
            }}>✕</button>
          </>
        ) : (
          <button onClick={() => setShowSave(true)} style={{
            fontSize: 9, padding: '3px 8px', cursor: 'pointer', flexShrink: 0,
            background: 'rgba(0,229,255,0.08)', color: 'rgba(0,229,255,0.6)',
            border: '1px solid rgba(0,229,255,0.2)', borderRadius: 2, fontFamily: 'monospace',
          }}>+ SAVE</button>
        )}
      </div>
    </div>
  );
}

// ── Synth ────────────────────────────────────────────────────────────────────

export default function Synth() {
  const { synthParams, updateSynthParam } = useOSStore();
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [octaveShift, setOctaveShift] = useState(0);
  const [midiOn, setMidiOn] = useState(false);
  const [midiDevices, setMidiDevices] = useState(0);

  const loadPatch = useCallback((p: Patch) => {
    const keys = Object.keys(p.params) as (keyof SynthParams)[];
    keys.forEach(k => updateSynthParam(k, p.params[k] as never));
  }, [updateSynthParam]);
  const channelIndex = 1;

  // Map: visual note (unshifted) → actual MIDI note playing in engine
  // Stored in a ref so handlers always read the latest state without stale closures
  const mouseHeldNotes = useRef<Map<number, number>>(new Map());
  const keyboardHeldNotes = useRef<Map<string, { shifted: number; visual: number }>>(new Map());

  // Direct noteOn that stores the shifted note in the ref
  const triggerNoteOn = useCallback((visualNote: number, ref: Map<number, number> | null, shiftAtPress: number) => {
    const shifted = visualNote + shiftAtPress * 12;
    if (ref) ref.set(visualNote, shifted);
    // Ensure context is running before scheduling — avoids the async-resume latency spike
    audioEngine.ensureRunning(() => audioEngine.noteOn(shifted, channelIndex));
    // Store actual MIDI pitch — rendering checks pressedKeys.has(note) directly
    setPressedKeys(prev => new Set([...prev, shifted]));
    return shifted;
  }, [channelIndex]);

  // Direct noteOff — removes the actual shifted pitch from pressedKeys
  const triggerNoteOff = useCallback((shifted: number) => {
    audioEngine.noteOff(shifted, channelIndex);
    setPressedKeys(prev => { const s = new Set(prev); s.delete(shifted); return s; });
  }, [channelIndex]);

  // Keyboard + global safety release
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      const baseNote = KEY_MAP[key];
      if (baseNote !== undefined && !keyboardHeldNotes.current.has(key)) {
        const shifted = baseNote + octaveShift * 12;
        keyboardHeldNotes.current.set(key, { shifted, visual: baseNote });
        // Ensure context is running before scheduling — avoids async-resume latency spike
        audioEngine.ensureRunning(() => audioEngine.noteOn(shifted, channelIndex));
        // Store actual MIDI pitch
        setPressedKeys(prev => new Set([...prev, shifted]));
      }
      if (e.key === 'z') setOctaveShift(o => Math.max(-2, o - 1));
      if (e.key === 'x') setOctaveShift(o => Math.min(2, o + 1));
    };

    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const entry = keyboardHeldNotes.current.get(key);
      if (entry !== undefined) {
        keyboardHeldNotes.current.delete(key);
        const { shifted } = entry;
        audioEngine.noteOff(shifted, channelIndex);
        setPressedKeys(prev => { const s = new Set(prev); s.delete(shifted); return s; });
      }
    };

    // Global mouseup: release any mouse-held notes (catch events outside key elements)
    const globalMouseUp = () => {
      if (mouseHeldNotes.current.size > 0) {
        mouseHeldNotes.current.forEach(shifted => audioEngine.noteOff(shifted, channelIndex));
        // mouseHeldNotes values are shifted pitches stored in pressedKeys
        const shiftedToRemove = new Set(mouseHeldNotes.current.values());
        mouseHeldNotes.current.clear();
        setPressedKeys(prev => {
          const s = new Set(prev);
          shiftedToRemove.forEach(n => s.delete(n));
          return s;
        });
      }
    };

    // Window blur: release all held notes
    const onBlur = () => {
      mouseHeldNotes.current.forEach(shifted => audioEngine.noteOff(shifted, channelIndex));
      const mouseShiftedToRemove = new Set(mouseHeldNotes.current.values());
      mouseHeldNotes.current.clear();

      keyboardHeldNotes.current.forEach(entry => audioEngine.noteOff(entry.shifted, channelIndex));
      const kbShiftedToRemove = new Set(Array.from(keyboardHeldNotes.current.values()).map(e => e.shifted));
      keyboardHeldNotes.current.clear();

      const allToRemove = new Set([...mouseShiftedToRemove, ...kbShiftedToRemove]);
      if (allToRemove.size > 0) {
        setPressedKeys(prev => {
          const s = new Set(prev);
          allToRemove.forEach(n => s.delete(n));
          return s;
        });
      }
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mouseup', globalMouseUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mouseup', globalMouseUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [octaveShift, channelIndex]);

  // MIDI: mirror external controller note events into pressedKeys so the on-screen
  // keyboard reflects hardware input. The bridge itself handles audioEngine note on/off.
  useEffect(() => {
    const unsub = midiBridge.onMessage(msg => {
      if (msg.type === 'on') setPressedKeys(prev => new Set([...prev, msg.note]));
      else setPressedKeys(prev => { const s = new Set(prev); s.delete(msg.note); return s; });
    });
    return unsub;
  }, []);

  const toggleMidi = useCallback(async () => {
    if (midiOn) {
      midiBridge.disable();
      setMidiOn(false);
      setMidiDevices(0);
    } else {
      // Ensure audio context is live so the very first MIDI note plays immediately
      audioEngine.ensureRunning(() => {});
      const ok = await midiBridge.enable();
      if (ok) {
        setMidiOn(true);
        setMidiDevices(midiBridge.connectedCount);
      } else {
        alert('Web MIDI not supported in this browser (try Chrome/Edge) or permission denied.');
      }
    }
  }, [midiOn]);

  const oscTypes: OscillatorType[] = ['sine', 'sawtooth', 'square', 'triangle'];

  return (
    <div className="plugin-bg" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ color: 'var(--px-cyan)', fontFamily: "'VT323', monospace", fontSize: 22 }}>
          🎹 SYNTHSTATION — SubTrax Engine
        </div>
        <button
          onClick={toggleMidi}
          title={midiBridge.isSupported() ? 'Toggle Web MIDI input' : 'Web MIDI not supported in this browser'}
          style={{
            padding: '3px 10px', fontSize: 10, cursor: 'pointer',
            background: midiOn ? 'rgba(57,255,20,0.18)' : '#0d0d1f',
            color: midiOn ? 'var(--px-green)' : 'var(--px-text-dim)',
            border: `1px solid ${midiOn ? 'var(--px-green)' : 'var(--px-border)'}`,
            borderRadius: 3, fontFamily: 'monospace',
          }}
        >
          {midiOn ? `● MIDI ON · ${midiDevices} dev` : '○ MIDI OFF'}
        </button>
      </div>

      <PatchBrowser onLoad={loadPatch} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {/* OSC 1 */}
        <div className="plugin-section" style={{ flex: 1 }}>
          <div className="plugin-section-title">OSC 1</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {oscTypes.map(t => (
              <button key={t} className="win98-btn" style={{
                minWidth: 0, padding: '2px 6px', fontSize: 9,
                background: synthParams.oscillatorType === t ? 'rgba(0,229,255,0.15)' : '#0d0d1f',
                color: synthParams.oscillatorType === t ? 'var(--px-cyan)' : 'var(--px-text-dim)',
                border: `1px solid ${synthParams.oscillatorType === t ? 'var(--px-cyan)' : 'var(--px-border)'}`,
              }} onClick={() => updateSynthParam('oscillatorType', t)}>
                {t === 'sawtooth' ? 'SAW' : t === 'triangle' ? 'TRI' : t.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Knob label="VOL" value={synthParams.masterGain} min={0} max={1}
              onChange={v => updateSynthParam('masterGain', v)}
              format={v => (v * 100).toFixed(0)} color="var(--px-cyan)" />
          </div>
        </div>

        {/* OSC 2 */}
        <div className="plugin-section" style={{ flex: 1 }}>
          <div className="plugin-section-title">OSC 2</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {oscTypes.map(t => (
              <button key={t} className="win98-btn" style={{
                minWidth: 0, padding: '2px 6px', fontSize: 9,
                background: synthParams.osc2Type === t ? 'rgba(191,0,255,0.15)' : '#0d0d1f',
                color: synthParams.osc2Type === t ? 'var(--px-purple)' : 'var(--px-text-dim)',
                border: `1px solid ${synthParams.osc2Type === t ? 'var(--px-purple)' : 'var(--px-border)'}`,
              }} onClick={() => updateSynthParam('osc2Type', t)}>
                {t === 'sawtooth' ? 'SAW' : t === 'triangle' ? 'TRI' : t.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Knob label="DETUNE" value={synthParams.osc2Detune} min={-50} max={50} step={1}
              onChange={v => updateSynthParam('osc2Detune', v)}
              format={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}`} color="var(--px-purple)" />
            <Knob label="MIX" value={synthParams.osc2Mix} min={0} max={1}
              onChange={v => updateSynthParam('osc2Mix', v)}
              format={v => (v * 100).toFixed(0)} color="var(--px-purple)" />
          </div>
        </div>

        {/* FILTER */}
        <div className="plugin-section" style={{ flex: 1 }}>
          <div className="plugin-section-title">FILTER</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Knob label="CUTOFF" value={synthParams.filterFreq} min={80} max={18000} step={1}
              onChange={v => updateSynthParam('filterFreq', v)}
              format={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v.toFixed(0)}`}
              color="var(--px-amber)" />
            <Knob label="RESO" value={synthParams.filterQ} min={0.1} max={20} step={0.1}
              onChange={v => updateSynthParam('filterQ', v)}
              format={v => v.toFixed(1)} color="var(--px-amber)" />
            <Knob label="ENV" value={synthParams.filterEnvAmount} min={0} max={1}
              onChange={v => updateSynthParam('filterEnvAmount', v)}
              format={v => (v * 100).toFixed(0)} color="var(--px-amber)" />
          </div>
        </div>

        {/* ADSR */}
        <div className="plugin-section" style={{ flex: 1 }}>
          <div className="plugin-section-title">ENVELOPE</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Knob label="A" value={synthParams.attack} min={0.001} max={2} step={0.001}
              onChange={v => updateSynthParam('attack', v)}
              format={v => `${(v*1000).toFixed(0)}ms`} color="#44ff88" />
            <Knob label="D" value={synthParams.decay} min={0.001} max={2} step={0.001}
              onChange={v => updateSynthParam('decay', v)}
              format={v => `${(v*1000).toFixed(0)}ms`} color="#44ff88" />
            <Knob label="S" value={synthParams.sustain} min={0} max={1}
              onChange={v => updateSynthParam('sustain', v)}
              format={v => (v * 100).toFixed(0)} color="#44ff88" />
            <Knob label="R" value={synthParams.release} min={0.01} max={4} step={0.01}
              onChange={v => updateSynthParam('release', v)}
              format={v => `${(v*1000).toFixed(0)}ms`} color="#44ff88" />
          </div>
        </div>

        {/* LFO */}
        <div className="plugin-section" style={{ flex: 1 }}>
          <div className="plugin-section-title">LFO</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {(['filter', 'pitch', 'amp'] as const).map(t => (
              <button key={t} className="win98-btn" style={{
                minWidth: 0, padding: '2px 4px', fontSize: 9,
                background: synthParams.lfoTarget === t ? 'rgba(255,179,0,0.15)' : '#0d0d1f',
                color: synthParams.lfoTarget === t ? 'var(--px-amber)' : 'var(--px-text-dim)',
                border: `1px solid ${synthParams.lfoTarget === t ? 'var(--px-amber)' : 'var(--px-border)'}`,
              }} onClick={() => updateSynthParam('lfoTarget', t)}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Knob label="RATE" value={synthParams.lfoRate} min={0.1} max={20} step={0.1}
              onChange={v => updateSynthParam('lfoRate', v)}
              format={v => `${v.toFixed(1)}Hz`} color="var(--px-pink)" />
            <Knob label="DEPTH" value={synthParams.lfoDepth} min={0} max={500} step={1}
              onChange={v => updateSynthParam('lfoDepth', v)}
              format={v => v.toFixed(0)} color="var(--px-pink)" />
          </div>
        </div>
      </div>

      {/* Piano Keyboard */}
      <div className="plugin-section" style={{ padding: '8px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div className="plugin-section-title" style={{ margin: 0 }}>KEYBOARD</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="win98-btn" style={{ minWidth: 0, padding: '1px 6px', fontSize: 10, background: '#0d0d1f', color: 'var(--px-text)', border: '1px solid var(--px-border)' }}
              onClick={() => setOctaveShift(o => Math.max(-2, o - 1))}>Z ◀</button>
            <span style={{ fontSize: 10, color: 'var(--px-cyan)', minWidth: 40, textAlign: 'center' }}>
              OCT {4 + octaveShift}
            </span>
            <button className="win98-btn" style={{ minWidth: 0, padding: '1px 6px', fontSize: 10, background: '#0d0d1f', color: 'var(--px-text)', border: '1px solid var(--px-border)' }}
              onClick={() => setOctaveShift(o => Math.min(2, o + 1))}>▶ X</button>
          </div>
          <span style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>
            A W S E D F T G Y H U J K O L P
          </span>
          {/* Voice indicator — inline with keyboard header */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>VOICES</span>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="led" style={
                i < pressedKeys.size
                  ? { background: 'var(--px-green)', boxShadow: '0 0 4px var(--px-green)' }
                  : { background: '#222240', border: '1px solid rgba(0,0,0,0.5)' }
              } />
            ))}
            <span style={{ fontSize: 9, color: 'var(--px-cyan)' }}>{pressedKeys.size}/8</span>
          </div>
        </div>

        {/* Keys — absolutely positioned, scrollable */}
        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{ position: 'relative', height: KEY_H + 4, width: WHITE_NOTES.length * KEY_W, flexShrink: 0 }}>
            {/* White keys */}
            {WHITE_NOTES.map((note, wi) => {
              const shifted = note + octaveShift * 12;
              const isPressed = pressedKeys.has(note); // note = actual MIDI, pressedKeys stores actual pitches
              return (
                <div
                  key={note}
                  style={{
                    position: 'absolute', left: wi * KEY_W, top: 0,
                    width: KEY_W - 1, height: KEY_H,
                    background: isPressed ? '#c8e8ff' : 'white',
                    border: '1px solid #555',
                    borderRadius: '0 0 3px 3px',
                    cursor: 'pointer',
                    boxShadow: isPressed ? 'none' : '1px 2px 0 rgba(0,0,0,0.2)',
                    zIndex: 1,
                    userSelect: 'none',
                  }}
                  onMouseDown={e => { e.preventDefault(); triggerNoteOn(note, mouseHeldNotes.current, octaveShift); }}
                  onMouseUp={() => {
                    const s = mouseHeldNotes.current.get(note);
                    if (s !== undefined) { mouseHeldNotes.current.delete(note); triggerNoteOff(s); }
                  }}
                  onMouseEnter={e => {
                    if (e.buttons === 1) triggerNoteOn(note, mouseHeldNotes.current, octaveShift);
                  }}
                  onMouseLeave={() => {
                    const s = mouseHeldNotes.current.get(note);
                    if (s !== undefined) { mouseHeldNotes.current.delete(note); triggerNoteOff(s); }
                  }}
                >
                  {note % 12 === 0 && (
                    <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', fontSize: 7, color: '#777', pointerEvents: 'none' }}>
                      C{Math.floor(note / 12) - 1}
                    </span>
                  )}
                </div>
              );
            })}
            {/* Black keys */}
            {BLACK_KEYS.map(({ note, left }) => {
              const shifted = note + octaveShift * 12;
              const isPressed = pressedKeys.has(note); // note = actual MIDI, pressedKeys stores actual pitches
              return (
                <div
                  key={note}
                  style={{
                    position: 'absolute', left, top: 0,
                    width: BLACK_W, height: BLACK_H,
                    background: isPressed ? '#444' : '#111',
                    border: '1px solid #000',
                    borderRadius: '0 0 2px 2px',
                    zIndex: 2,
                    cursor: 'pointer',
                    boxShadow: isPressed ? 'none' : '1px 3px 0 rgba(0,0,0,0.6)',
                    userSelect: 'none',
                  }}
                  onMouseDown={e => { e.preventDefault(); e.stopPropagation(); triggerNoteOn(note, mouseHeldNotes.current, octaveShift); }}
                  onMouseUp={e => {
                    e.stopPropagation();
                    const s = mouseHeldNotes.current.get(note);
                    if (s !== undefined) { mouseHeldNotes.current.delete(note); triggerNoteOff(s); }
                  }}
                  onMouseEnter={e => {
                    if (e.buttons === 1) { e.stopPropagation(); triggerNoteOn(note, mouseHeldNotes.current, octaveShift); }
                  }}
                  onMouseLeave={() => {
                    const s = mouseHeldNotes.current.get(note);
                    if (s !== undefined) { mouseHeldNotes.current.delete(note); triggerNoteOff(s); }
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Dot Matrix Visualizer — pressedKeys already holds actual MIDI pitches */}
        <div style={{ marginTop: 8 }}>
          <SynthViz pressedKeys={pressedKeys} />
        </div>
      </div>
    </div>
  );
}
