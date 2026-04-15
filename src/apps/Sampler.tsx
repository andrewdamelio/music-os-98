import { useState, useRef, useCallback } from 'react';
import { audioEngine } from '../audio/engine';

interface Sample {
  id: string;
  name: string;
  buffer: AudioBuffer;
  start: number;
  end: number;
  pitch: number;
  reverse: boolean;
  loop: boolean;
}

export default function Sampler() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selected = samples.find(s => s.id === selectedId);

  const loadFile = useCallback(async (file: File) => {
    if (!audioEngine.ctx) audioEngine.init();
    const ctx = audioEngine.ctx!;
    const arrayBuf = await file.arrayBuffer();
    try {
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      const sample: Sample = {
        id: `sample-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        buffer: audioBuf,
        start: 0,
        end: 1,
        pitch: 0,
        reverse: false,
        loop: false,
      };
      setSamples(prev => [...prev, sample]);
      setSelectedId(sample.id);
      // Draw waveform
      setTimeout(() => drawWaveform(sample), 50);
    } catch (err) {
      alert('Failed to load audio file. Supported: WAV, MP3, OGG');
    }
  }, []);

  const drawWaveform = (sample: Sample) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = sample.buffer.getChannelData(0);
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0d0d1f';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(0,229,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += w / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

    // Waveform
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 2;
    ctx.beginPath();
    const step = Math.ceil(data.length / w);
    for (let i = 0; i < w; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j] ?? 0;
        if (d < min) min = d;
        if (d > max) max = d;
      }
      const y1 = (1 - max) / 2 * h;
      const y2 = (1 - min) / 2 * h;
      if (i === 0) ctx.moveTo(i, y1); else ctx.lineTo(i, y1);
      ctx.lineTo(i, y2);
    }
    ctx.stroke();

    // Start/end markers
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sample.start * w, 0); ctx.lineTo(sample.start * w, h); ctx.stroke();
    ctx.strokeStyle = '#ff4088';
    ctx.beginPath(); ctx.moveTo(sample.end * w, 0); ctx.lineTo(sample.end * w, h); ctx.stroke();
  };

  const playSample = (sample: Sample) => {
    audioEngine.ensureRunning(() => {
      const ctx = audioEngine.ctx!;
      const source = ctx.createBufferSource();
      source.buffer = sample.buffer;
      source.playbackRate.value = Math.pow(2, sample.pitch / 12);
      source.loop = sample.loop;

      const g = ctx.createGain();
      g.connect(audioEngine.mixerInputs[2] || audioEngine.masterGain!);
      source.connect(g);

      const dur = sample.buffer.duration;
      const startTime = sample.start * dur;
      const endTime = sample.end * dur;
      source.start(ctx.currentTime, startTime, endTime - startTime);
      if (!sample.loop) setTimeout(() => { try { source.stop(); } catch {} }, (endTime - startTime) * 1000 + 100);
    });
  };

  const updateSample = (id: string, update: Partial<Sample>) => {
    setSamples(prev => prev.map(s => s.id === id ? { ...s, ...update } : s));
    const updated = samples.find(s => s.id === id);
    if (updated) setTimeout(() => drawWaveform({ ...updated, ...update }), 10);
  };

  return (
    <div className="plugin-bg" style={{ padding: 12 }}>
      <div style={{ color: 'var(--px-amber)', fontFamily: "'VT323', monospace", fontSize: 22, marginBottom: 10 }}>
        💿 SAMPLER — Drag & Drop Audio
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={async e => {
          e.preventDefault();
          setDragging(false);
          const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
          for (const f of files) await loadFile(f);
        }}
        style={{
          border: `2px dashed ${dragging ? 'var(--px-cyan)' : 'var(--px-border)'}`,
          borderRadius: 4, padding: 12, textAlign: 'center', marginBottom: 10,
          background: dragging ? 'rgba(0,229,255,0.05)' : 'var(--px-bg2)',
          transition: 'all 0.15s',
          cursor: 'pointer',
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'audio/*';
          input.multiple = true;
          input.onchange = async () => {
            if (input.files) for (const f of Array.from(input.files)) await loadFile(f);
          };
          input.click();
        }}
      >
        <div style={{ fontSize: 24 }}>💿</div>
        <div style={{ fontSize: 11, color: 'var(--px-text-dim)', marginTop: 4 }}>
          Drop audio files here or click to browse
        </div>
        <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginTop: 2 }}>
          WAV, MP3, OGG, FLAC supported
        </div>
      </div>

      {/* Sample list */}
      {samples.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {samples.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedId(s.id); setTimeout(() => drawWaveform(s), 50); }}
              onDoubleClick={() => playSample(s)}
              style={{
                padding: '4px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap',
                background: selectedId === s.id ? 'rgba(255,179,0,0.2)' : 'var(--px-bg2)',
                color: selectedId === s.id ? 'var(--px-amber)' : 'var(--px-text)',
                border: `1px solid ${selectedId === s.id ? 'var(--px-amber)' : 'var(--px-border)'}`,
                borderRadius: 3,
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Waveform display */}
      <canvas
        ref={canvasRef}
        width={500}
        height={100}
        style={{
          width: '100%', height: 100, border: '1px solid var(--px-border)',
          borderRadius: 3, display: 'block', marginBottom: 10,
          background: 'var(--px-bg)',
        }}
      />

      {/* Controls */}
      {selected && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'var(--px-text-dim)', width: 36 }}>START</span>
              <input type="range" min={0} max={0.99} step={0.001} value={selected.start}
                onChange={e => updateSample(selected.id, { start: parseFloat(e.target.value) })}
                style={{ width: 120 }} />
              <span style={{ fontSize: 10, color: 'var(--px-green)', width: 40, fontFamily: 'monospace' }}>
                {(selected.start * selected.buffer.duration).toFixed(2)}s
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'var(--px-text-dim)', width: 36 }}>END</span>
              <input type="range" min={0.01} max={1} step={0.001} value={selected.end}
                onChange={e => updateSample(selected.id, { end: parseFloat(e.target.value) })}
                style={{ width: 120 }} />
              <span style={{ fontSize: 10, color: 'var(--px-pink)', width: 40, fontFamily: 'monospace' }}>
                {(selected.end * selected.buffer.duration).toFixed(2)}s
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'var(--px-text-dim)', width: 36 }}>PITCH</span>
              <input type="range" min={-24} max={24} step={0.5} value={selected.pitch}
                onChange={e => updateSample(selected.id, { pitch: parseFloat(e.target.value) })}
                style={{ width: 120 }} />
              <span style={{ fontSize: 10, color: 'var(--px-cyan)', width: 40, fontFamily: 'monospace' }}>
                {selected.pitch > 0 ? '+' : ''}{selected.pitch} st
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => updateSample(selected.id, { reverse: !selected.reverse })}
              style={{
                padding: '4px 10px', fontSize: 10, cursor: 'pointer',
                background: selected.reverse ? 'rgba(191,0,255,0.2)' : '#0d0d1f',
                color: selected.reverse ? 'var(--px-purple)' : 'var(--px-text-dim)',
                border: `1px solid ${selected.reverse ? 'var(--px-purple)' : 'var(--px-border)'}`,
                borderRadius: 3,
              }}
            >
              ⏮ Reverse
            </button>
            <button
              onClick={() => updateSample(selected.id, { loop: !selected.loop })}
              style={{
                padding: '4px 10px', fontSize: 10, cursor: 'pointer',
                background: selected.loop ? 'rgba(0,255,170,0.2)' : '#0d0d1f',
                color: selected.loop ? '#00ffaa' : 'var(--px-text-dim)',
                border: `1px solid ${selected.loop ? '#00ffaa' : 'var(--px-border)'}`,
                borderRadius: 3,
              }}
            >
              🔁 Loop
            </button>
            <button
              onClick={() => playSample(selected)}
              style={{
                padding: '4px 14px', fontSize: 11, cursor: 'pointer',
                background: 'rgba(0,229,255,0.15)', color: 'var(--px-cyan)',
                border: '1px solid var(--px-cyan)', borderRadius: 3,
              }}
            >
              ▶ Play
            </button>
            <button
              onClick={() => { setSamples(prev => prev.filter(s => s.id !== selected.id)); setSelectedId(null); }}
              style={{
                padding: '4px 10px', fontSize: 10, cursor: 'pointer',
                background: 'rgba(255,64,136,0.1)', color: 'var(--px-pink)',
                border: '1px solid var(--px-border)', borderRadius: 3,
              }}
            >
              🗑️ Delete
            </button>
          </div>

          <div style={{ fontSize: 9, color: 'var(--px-text-dim)', lineHeight: 1.6 }}>
            <div>Duration: {selected.buffer.duration.toFixed(2)}s</div>
            <div>Sample Rate: {selected.buffer.sampleRate.toLocaleString()} Hz</div>
            <div>Channels: {selected.buffer.numberOfChannels}</div>
          </div>
        </div>
      )}
    </div>
  );
}
