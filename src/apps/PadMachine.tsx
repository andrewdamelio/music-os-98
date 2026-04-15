import { useState, useRef, useCallback, useEffect } from 'react';
import { audioEngine } from '../audio/engine';
import { useOSStore } from '../store';
import { addUserSample, getUserSampleNames, subscribeUserSamples, userSampleBuffers } from '../store/userSamples';

// ── Module-level state — survives component unmount ───────────────────────────
// Hold sources keep playing even when the app window is closed
const padHoldSources = new Map<number, AudioBufferSourceNode>();
// Buffer cache so we don't regenerate on every re-open
const padBufferCache = new Map<string, AudioBuffer>();

// ── Sample library ────────────────────────────────────────────────────────────

const SAMPLE_LIBRARY = [
  {
    category: '🥁 Drum Kits',
    packs: [
      { name: '808 Classic',    color: '#ff4488', samples: ['Kick 808', 'Snare 808', 'Hat 808', 'Clap 808', 'Tom Hi', 'Tom Lo'] },
      { name: 'Acoustic Room',  color: '#ffaa00', samples: ['Kick Room', 'Snare Crack', 'Hat Tight', 'Open Hat', 'Ride Bell', 'Crash'] },
      { name: 'Electronic',     color: '#00ffcc', samples: ['Sub Kick', 'Clicky Snare', 'Perc Hat', 'Distorted Clap', 'Glitch Tom', 'Cymbal'] },
      { name: 'Lo-Fi Beats',    color: '#aa44ff', samples: ['Kick Dusty', 'Snare Warm', 'Hat Swing', 'Shaker', 'Tambourine', 'Snap'] },
    ],
  },
  {
    category: '🎵 One-shots',
    packs: [
      { name: 'Bass Hits',  color: '#ff8800', samples: ['Bass Sub C', 'Bass Sub D', 'Bass Sub E', 'Bass Pluck', 'Bass Stab', 'Bass Moog'] },
      { name: 'Synth Hits', color: '#00aaff', samples: ['Lead Hit', 'Pad Swell', 'Pluck Bell', 'Stab A', 'Stab Bb', 'Chord Maj'] },
      { name: 'Foley',      color: '#44ff88', samples: ['Button Click', 'Vinyl Crackle', 'Coffee Stir', 'Paper Shuffle', 'Door Knock', 'Tape Rewind'] },
    ],
  },
  {
    category: '🌊 Loops',
    packs: [
      { name: 'Ambient Pads', color: '#8888ff', samples: ['Pad Warm', 'Pad Cold', 'Drone Atm', 'Space Pad', 'Choir Pad', 'Glass Pad'] },
    ],
  },
];

function generateSound(name: string): Promise<AudioBuffer> {
  return new Promise(resolve => {
    audioEngine.init();
    const ctx = audioEngine.ctx!;
    const sr = ctx.sampleRate;
    const dur = 0.6;
    const buf = ctx.createBuffer(1, sr * dur, sr);
    const d = buf.getChannelData(0);
    const n = name.toLowerCase();
    if (n.includes('kick') || n.includes('sub')) {
      for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(2 * Math.PI * 150 * Math.exp(-8 * t) * t) * Math.exp(-6 * t); }
    } else if (n.includes('snare') || n.includes('clap') || n.includes('snap')) {
      for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.exp(-15 * t) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 180 * t)); }
    } else if (n.includes('hat') || n.includes('cymbal') || n.includes('ride') || n.includes('crash')) {
      for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.exp(-(n.includes('open') || n.includes('ride') || n.includes('crash') ? 3 : 15) * t); }
    } else if (n.includes('bass')) {
      const f = n.includes(' d') ? 73 : n.includes(' e') ? 82 : 65;
      for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(4 * Math.PI * f * t)) * Math.exp(-4 * t) * 0.8; }
    } else if (n.includes('pad') || n.includes('drone') || n.includes('atm') || n.includes('choir') || n.includes('glass') || n.includes('space')) {
      // 4-second buffer. Every frequency is an exact multiple of 0.25 Hz so all
      // oscillators complete whole cycles — zero phase gap at the loop point.
      const padLen = Math.floor(sr * 4);
      const padBuf = ctx.createBuffer(1, padLen, sr);
      const pd = padBuf.getChannelData(0);
      type Osc = { f: number; a: number };
      let oscs: Osc[] = [];
      let lfoRate = 0.25, lfoDepth = 0; // LFO rate must also be multiple of 0.25 Hz
      if (n.includes('warm')) {
        // Three detuned oscillators beating against each other (0.25–0.5 Hz beat) → slow shimmer
        oscs = [{ f:110, a:.35 }, { f:109.75, a:.2 }, { f:110.25, a:.2 }, { f:110.5, a:.12 }, { f:220, a:.08 }];
        lfoRate = 0.25; lfoDepth = 0.04;
      } else if (n.includes('cold')) {
        oscs = [{ f:220, a:.25 }, { f:219.75, a:.15 }, { f:220.25, a:.15 }, { f:330, a:.1 }, { f:440, a:.05 }];
        lfoRate = 0.5; lfoDepth = 0.03;
      } else if (n.includes('drone')) {
        oscs = [{ f:55, a:.3 }, { f:110, a:.25 }, { f:109.75, a:.15 }, { f:165, a:.1 }, { f:220, a:.05 }];
        lfoRate = 0.25; lfoDepth = 0.1;
      } else if (n.includes('atm')) {
        oscs = [{ f:82.5, a:.2 }, { f:82.25, a:.15 }, { f:165, a:.12 }, { f:247.5, a:.08 }];
        lfoRate = 0.5; lfoDepth = 0.06;
      } else if (n.includes('space')) {
        // Wide chorus: 5 closely-detuned oscillators spanning ±0.75 Hz
        oscs = [{ f:165, a:.2 }, { f:164.75, a:.18 }, { f:165.25, a:.18 }, { f:164.5, a:.12 }, { f:165.5, a:.1 }];
        lfoRate = 0.5; lfoDepth = 0.12;
      } else if (n.includes('choir')) {
        oscs = [{ f:220, a:.2 }, { f:220.25, a:.12 }, { f:440, a:.18 }, { f:660, a:.08 }, { f:880, a:.04 }];
        lfoRate = 0.25; lfoDepth = 0.05;
      } else { // glass
        oscs = [{ f:880, a:.2 }, { f:879.75, a:.12 }, { f:880.25, a:.1 }, { f:1320, a:.06 }];
        lfoRate = 1.0; lfoDepth = 0.08; // 4 complete cycles in 4s
      }
      for (let i = 0; i < padLen; i++) {
        const t = i / sr;
        let s = 0;
        for (const o of oscs) s += Math.sin(2 * Math.PI * o.f * t) * o.a;
        if (lfoDepth > 0) s *= 1 - lfoDepth * 0.5 + lfoDepth * 0.5 * Math.sin(2 * Math.PI * lfoRate * t);
        pd[i] = s;
      }
      // 50ms safety crossfade at loop point (masks any sub-sample rounding)
      const fl = Math.floor(sr * 0.05);
      for (let i = 0; i < fl; i++) { const a = i / fl; pd[padLen - fl + i] = pd[padLen - fl + i] * (1 - a) + pd[i] * a; }
      return resolve(padBuf);
    } else if (n.includes('pluck') || n.includes('bell')) {
      const f2 = 880;
      for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(2 * Math.PI * f2 * t) * Math.exp(-8 * t) * 0.7; }
    } else if (n.includes('stab') || n.includes('hit') || n.includes('chord')) {
      const f3 = n.includes('bb') ? 466 : 440;
      for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.sin(2 * Math.PI * f3 * t) + 0.7 * Math.sin(2 * Math.PI * f3 * 1.5 * t) + 0.5 * Math.sin(2 * Math.PI * f3 * 2 * t)) * Math.exp(-5 * t) * 0.5; }
    } else if (n.includes('vinyl') || n.includes('crackle') || n.includes('tape')) {
      for (let i = 0; i < d.length; i++) { d[i] = (Math.random() * 2 - 1) * 0.08 * (1 + 0.5 * Math.sin(2 * Math.PI * 60 * i / sr)); }
    } else {
      for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.exp(-10 * t) * 0.5; }
    }
    resolve(buf);
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PadState {
  label: string;
  sampleName: string | null;
  buffer: AudioBuffer | null;
  mode: 'oneshot' | 'hold';
  color: string;
  loading: boolean;
}

const PAD_COLORS = [
  '#ff4488', '#ff8800', '#ffcc00', '#44ff88',
  '#00aaff', '#aa44ff', '#ff44aa', '#00ffcc',
  '#ff6644', '#aaffaa', '#44ccff', '#ff44ff',
  '#ffaa44', '#44ffdd', '#ff2244', '#44aaff',
];

function makePad(idx: number): PadState {
  return { label: `PAD ${idx + 1}`, sampleName: null, buffer: null, mode: 'oneshot', color: PAD_COLORS[idx % PAD_COLORS.length], loading: false };
}

// ── PadMachine ────────────────────────────────────────────────────────────────

export default function PadMachine() {
  const { padAssignments, updatePadAssignment } = useOSStore();

  // Init pads from store assignments (buffers are loaded async below)
  const [pads, setPads] = useState<PadState[]>(() =>
    padAssignments.map((a, i) => ({
      ...makePad(i),
      sampleName: a.sampleName,
      mode: a.mode,
      color: a.color || PAD_COLORS[i % PAD_COLORS.length],
    }))
  );

  const [selectedPad, setSelectedPad] = useState<number | null>(null);
  // Init activePads from currently-playing hold sources (survived last close)
  const [activePads, setActivePads] = useState<Set<number>>(() => new Set(padHoldSources.keys()));
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [userSampleNames, setUserSampleNames] = useState<string[]>(() => getUserSampleNames());
  const uploadRef = useRef<HTMLInputElement>(null);

  // Stay in sync when new samples are uploaded
  useEffect(() => { return subscribeUserSamples(setUserSampleNames); }, []);

  // On mount: restore buffers for all assigned pads from cache or regenerate
  useEffect(() => {
    padAssignments.forEach((assignment, i) => {
      if (!assignment.sampleName) return;
      const name = assignment.sampleName;
      const cached = padBufferCache.get(name) ?? userSampleBuffers.get(name) ?? null;
      if (cached) {
        padBufferCache.set(name, cached);
        setPads(prev => {
          const next = [...prev];
          next[i] = { ...next[i], buffer: cached, loading: false };
          return next;
        });
      } else {
        setPads(prev => { const n2 = [...prev]; n2[i] = { ...n2[i], loading: true }; return n2; });
        generateSound(name).then(buf => {
          padBufferCache.set(name, buf);
          setPads(prev => {
            const next = [...prev];
            next[i] = { ...next[i], buffer: buf, loading: false };
            return next;
          });
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignSample = useCallback(async (padIdx: number, sampleName: string, color: string, preloadedBuffer?: AudioBuffer) => {
    const effectiveColor = color || PAD_COLORS[padIdx % PAD_COLORS.length];
    setPads(prev => {
      const next = [...prev];
      next[padIdx] = { ...next[padIdx], sampleName, color: effectiveColor, loading: !preloadedBuffer };
      return next;
    });
    updatePadAssignment(padIdx, { sampleName, color: effectiveColor });

    audioEngine.init();
    if (audioEngine.ctx?.state === 'suspended') audioEngine.ctx.resume();

    let buffer: AudioBuffer;
    if (preloadedBuffer) {
      buffer = preloadedBuffer;
    } else {
      const cached = padBufferCache.get(sampleName) ?? userSampleBuffers.get(sampleName);
      buffer = cached ?? await generateSound(sampleName);
    }
    padBufferCache.set(sampleName, buffer);

    setPads(prev => {
      const next = [...prev];
      next[padIdx] = { ...next[padIdx], buffer, loading: false };
      return next;
    });
  }, [updatePadAssignment]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    audioEngine.init();
    if (audioEngine.ctx?.state === 'suspended') audioEngine.ctx.resume();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      try {
        const audioBuffer = await audioEngine.ctx!.decodeAudioData(arrayBuffer);
        const name = file.name.replace(/\.[^.]+$/, '');
        addUserSample(name, audioBuffer);
        padBufferCache.set(name, audioBuffer);
      } catch {
        console.warn('Could not decode', file.name);
      }
    }
  }, []);

  const triggerPad = useCallback((padIdx: number) => {
    const pad = pads[padIdx];
    if (!pad.buffer) return;
    audioEngine.ensureRunning(() => {
      const ctx = audioEngine.ctx!;
      if (pad.mode === 'hold') {
        const existing = padHoldSources.get(padIdx);
        if (existing) {
          try { existing.stop(); } catch {}
          padHoldSources.delete(padIdx);
          setActivePads(prev => { const s = new Set(prev); s.delete(padIdx); return s; });
          return;
        }
        const src = ctx.createBufferSource();
        src.buffer = pad.buffer!;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0.9;
        src.connect(gain);
        gain.connect(audioEngine.mixerInputs[2] ?? audioEngine.masterGain!);
        src.start();
        padHoldSources.set(padIdx, src);
        setActivePads(prev => new Set([...prev, padIdx]));
        src.onended = () => {
          padHoldSources.delete(padIdx);
          setActivePads(prev => { const s = new Set(prev); s.delete(padIdx); return s; });
        };
      } else {
        const src = ctx.createBufferSource();
        src.buffer = pad.buffer!;
        const gain = ctx.createGain();
        gain.gain.value = 0.9;
        src.connect(gain);
        gain.connect(audioEngine.mixerInputs[2] ?? audioEngine.masterGain!);
        src.start();
        setActivePads(prev => new Set([...prev, padIdx]));
        src.onended = () => setActivePads(prev => { const s = new Set(prev); s.delete(padIdx); return s; });
      }
    });
  }, [pads]);

  // NOTE: no cleanup on unmount — hold pads intentionally keep playing after close

  const toggleMode = (padIdx: number) => {
    setPads(prev => {
      const next = [...prev];
      const pad = next[padIdx];
      if (pad.mode === 'hold') {
        const src = padHoldSources.get(padIdx);
        if (src) { try { src.stop(); } catch {} padHoldSources.delete(padIdx); }
        setActivePads(pr => { const s = new Set(pr); s.delete(padIdx); return s; });
      }
      const newMode: 'oneshot' | 'hold' = pad.mode === 'oneshot' ? 'hold' : 'oneshot';
      next[padIdx] = { ...pad, mode: newMode };
      updatePadAssignment(padIdx, { mode: newMode });
      return next;
    });
  };

  const clearPad = (padIdx: number) => {
    const src = padHoldSources.get(padIdx);
    if (src) { try { src.stop(); } catch {} padHoldSources.delete(padIdx); }
    setActivePads(prev => { const s = new Set(prev); s.delete(padIdx); return s; });
    const def = makePad(padIdx);
    setPads(prev => { const next = [...prev]; next[padIdx] = def; return next; });
    updatePadAssignment(padIdx, { sampleName: null, mode: 'oneshot', color: PAD_COLORS[padIdx % PAD_COLORS.length] });
  };

  return (
    <div className="plugin-bg" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
        borderBottom: '1px solid var(--px-border)', flexShrink: 0,
      }}>
        <div style={{ color: 'var(--px-amber)', fontFamily: "'VT323', monospace", fontSize: 20 }}>
          🎛️ PAD MACHINE
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--px-text-dim)' }}>
          Click pad to trigger · Hold mode = toggle loop · HOLD pads play through app close
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Pad grid */}
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flex: 1 }}>
            {pads.map((pad, idx) => {
              const isActive = activePads.has(idx);
              const isSelected = selectedPad === idx;
              return (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    background: isActive
                      ? `${pad.color}55`
                      : isSelected
                      ? `${pad.color}22`
                      : 'rgba(0,0,0,0.4)',
                    border: `2px solid ${isActive ? pad.color : isSelected ? `${pad.color}88` : 'var(--px-border)'}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 4, padding: 8,
                    boxShadow: isActive ? `0 0 16px ${pad.color}66, inset 0 0 8px ${pad.color}33` : 'none',
                    transition: 'background 0.05s, border-color 0.05s, box-shadow 0.05s',
                    userSelect: 'none',
                    minHeight: 80,
                  }}
                  onClick={() => { setSelectedPad(idx); triggerPad(idx); }}
                >
                  {/* Mode badge */}
                  <div style={{
                    position: 'absolute', top: 4, right: 4,
                    fontSize: 7, padding: '1px 4px',
                    background: pad.mode === 'hold' ? `${pad.color}33` : 'rgba(0,0,0,0.4)',
                    border: `1px solid ${pad.mode === 'hold' ? pad.color : 'var(--px-border)'}`,
                    color: pad.mode === 'hold' ? pad.color : 'var(--px-text-dim)',
                    borderRadius: 2,
                  }}>
                    {pad.mode === 'hold' ? '⏸ HOLD' : '▶ 1SHOT'}
                  </div>

                  {/* Sample name */}
                  <div style={{
                    fontSize: pad.sampleName ? 9 : 8,
                    color: pad.sampleName ? pad.color : 'var(--px-text-dim)',
                    textAlign: 'center', lineHeight: 1.2,
                    maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {pad.loading ? '⏳...' : pad.sampleName ?? '— empty —'}
                  </div>

                  <div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>{pad.label}</div>

                  {isActive && pad.mode === 'hold' && (
                    <div style={{ fontSize: 8, color: pad.color }}>● PLAYING</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected pad controls */}
          {selectedPad !== null && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center', padding: '6px 8px',
              border: '1px solid var(--px-border)', borderRadius: 3, background: 'rgba(0,0,0,0.3)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, color: pads[selectedPad].color }}>
                {pads[selectedPad].label}
              </span>
              <span style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>
                {pads[selectedPad].sampleName ?? 'no sample'}
              </span>
              <div style={{ flex: 1 }} />
              <button
                className="win98-btn"
                style={{
                  minWidth: 0, padding: '2px 10px', fontSize: 9,
                  background: pads[selectedPad].mode === 'hold' ? `${pads[selectedPad].color}22` : '#0d0d1f',
                  color: pads[selectedPad].mode === 'hold' ? pads[selectedPad].color : 'var(--px-text-dim)',
                  border: `1px solid ${pads[selectedPad].mode === 'hold' ? pads[selectedPad].color : 'var(--px-border)'}`,
                }}
                onClick={() => toggleMode(selectedPad)}
              >
                {pads[selectedPad].mode === 'hold' ? '⏸ HOLD' : '▶ ONESHOT'}
              </button>
              <button
                className="win98-btn"
                style={{ minWidth: 0, padding: '2px 8px', fontSize: 9, background: '#0d0d1f', color: 'var(--px-pink)', border: '1px solid var(--px-border)' }}
                onClick={() => clearPad(selectedPad)}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={uploadRef}
          type="file"
          accept="audio/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleUpload}
        />

        {/* Sample browser sidebar */}
        <div style={{
          width: 200, flexShrink: 0,
          borderLeft: '1px solid var(--px-border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--px-border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--px-green)' }}>📁 SAMPLES</span>
              <button
                className="win98-btn"
                style={{ marginLeft: 'auto', minWidth: 0, padding: '1px 6px', fontSize: 8, background: '#0d0d1f', color: 'var(--px-cyan)', border: '1px solid var(--px-border)' }}
                onClick={() => uploadRef.current?.click()}
                title="Upload your own audio files"
              >
                + Upload
              </button>
            </div>
            {selectedPad !== null && (
              <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginTop: 2 }}>
                Click to assign to {pads[selectedPad].label}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* User-uploaded samples */}
            {userSampleNames.length > 0 && (
              <div>
                <div style={{
                  fontSize: 9, color: 'var(--px-cyan)', padding: '4px 8px',
                  background: 'rgba(0,229,255,0.08)', borderBottom: '1px solid var(--px-border)',
                  fontWeight: 'bold',
                }}>
                  ⬆️ My Uploads
                </div>
                {userSampleNames.map(name => (
                  <div
                    key={name}
                    style={{ padding: '3px 8px', cursor: 'pointer', fontSize: 9, color: 'var(--px-text)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    onClick={() => {
                      if (selectedPad !== null) {
                        const buf = userSampleBuffers.get(name);
                        assignSample(selectedPad, name, '#00e5ff', buf ?? undefined);
                      }
                    }}
                  >
                    🎤 {name}
                  </div>
                ))}
              </div>
            )}

            {/* Built-in sample library */}
            {SAMPLE_LIBRARY.map(cat => (
              <div key={cat.category}>
                <div style={{
                  fontSize: 9, color: 'var(--px-text-dim)', padding: '4px 8px',
                  background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--px-border)',
                  fontWeight: 'bold',
                }}>
                  {cat.category}
                </div>
                {cat.packs.map(pack => (
                  <div key={pack.name}>
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', cursor: 'pointer',
                        background: expandedPack === pack.name ? `${pack.color}15` : 'transparent',
                        fontSize: 9,
                      }}
                      onClick={() => setExpandedPack(expandedPack === pack.name ? null : pack.name)}
                    >
                      <span style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>
                        {expandedPack === pack.name ? '▼' : '▶'}
                      </span>
                      <span style={{ color: pack.color }}>{pack.name}</span>
                    </div>
                    {expandedPack === pack.name && pack.samples.map(sample => (
                      <div
                        key={sample}
                        style={{ padding: '2px 8px 2px 20px', cursor: 'pointer', fontSize: 9, color: 'var(--px-text)', background: 'transparent' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${pack.color}20`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        onClick={() => {
                          if (selectedPad !== null) assignSample(selectedPad, sample, pack.color);
                        }}
                      >
                        🎵 {sample}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
