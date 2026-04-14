import { useState } from 'react';
import { audioEngine } from '../audio/engine';
import { DRUM_CHANNELS } from '../audio/engine';

// Synthetic sample library — generated sounds described
const SAMPLE_LIBRARY = [
  {
    category: '🥁 Drum Kits',
    packs: [
      { name: '808 Classic', description: 'Classic 808 drum machine sounds', color: '#ff4488', samples: ['Kick 808', 'Snare 808', 'Hat 808', 'Clap 808', 'Tom Hi', 'Tom Lo'] },
      { name: 'Acoustic Room', description: 'Live room drum recordings', color: '#ffaa00', samples: ['Kick Room', 'Snare Crack', 'Hat Tight', 'Open Hat', 'Ride Bell', 'Crash'] },
      { name: 'Electronic', description: 'Electronic/EDM drums', color: '#00ffcc', samples: ['Sub Kick', 'Clicky Snare', 'Perc Hat', 'Distorted Clap', 'Glitch Tom', 'Cymbal'] },
      { name: 'Lo-Fi Beats', description: 'Lo-fi hip hop drum samples', color: '#aa44ff', samples: ['Kick Dusty', 'Snare Warm', 'Hat Swing', 'Shaker', 'Tambourine', 'Snap'] },
    ],
  },
  {
    category: '🎵 One-shots',
    packs: [
      { name: 'Bass Hits', description: 'Short bass stabs and hits', color: '#ff8800', samples: ['Bass Sub C', 'Bass Sub D', 'Bass Sub E', 'Bass Pluck', 'Bass Stab', 'Bass Moog'] },
      { name: 'Synth Hits', description: 'Synth stabs and chords', color: '#00aaff', samples: ['Lead Hit', 'Pad Swell', 'Pluck Bell', 'Stab A', 'Stab Bb', 'Chord Maj'] },
      { name: 'Foley', description: 'Real world sound effects', color: '#44ff88', samples: ['Button Click', 'Vinyl Crackle', 'Coffee Stir', 'Paper Shuffle', 'Door Knock', 'Tape Rewind'] },
    ],
  },
  {
    category: '🌊 Loops',
    packs: [
      { name: 'Ambient Pads', description: 'Atmospheric pad loops', color: '#8888ff', samples: ['Pad Warm', 'Pad Cold', 'Drone Atm', 'Space Pad', 'Choir Pad', 'Glass Pad'] },
    ],
  },
];

type PreviewState = 'idle' | 'loading' | 'playing';

function generateDrumSound(name: string): Promise<AudioBuffer> {
  return new Promise(resolve => {
    audioEngine.init();
    const ctx = audioEngine.ctx!;
    const sr = ctx.sampleRate;
    const lname = name.toLowerCase();

    const dur = lname.includes('pad') || lname.includes('drone') || lname.includes('loop') || lname.includes('atm') || lname.includes('choir') || lname.includes('glass') ? 1.2 : 0.6;
    const buffer = ctx.createBuffer(1, Math.floor(sr * dur), sr);
    const data = buffer.getChannelData(0);

    const pi2 = Math.PI * 2;
    const sin = Math.sin;
    const exp = Math.exp;
    const rnd = () => Math.random() * 2 - 1;

    if (lname.includes('kick') || lname.includes('808') && lname.includes('kick')) {
      // Sub kick with punch
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const f = 180 * exp(-9 * t) + 30;
        data[i] = (sin(pi2 * f * t) * 1.1 + rnd() * 0.04) * exp(-5 * t);
      }
    } else if (lname.includes('kick') || (lname.includes('sub') && !lname.includes('bass'))) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = sin(pi2 * (160 * exp(-10 * t) + 28) * t) * exp(-6 * t);
      }
    } else if (lname.includes('snare') || lname.includes('crack') || lname.includes('warm') && lname.includes('snare')) {
      const isWarm = lname.includes('warm');
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const decay = isWarm ? 12 : 18;
        const tone = sin(pi2 * (isWarm ? 160 : 200) * t) * exp(-decay * 0.6 * t);
        const noise = rnd() * exp(-decay * t);
        data[i] = (tone * 0.5 + noise * 0.8);
      }
    } else if (lname.includes('clap') || lname.includes('distorted clap')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        // Multi-layer clap
        const burst1 = rnd() * exp(-40 * t);
        const burst2 = rnd() * exp(-30 * Math.max(0, t - 0.012));
        const burst3 = rnd() * exp(-20 * Math.max(0, t - 0.022));
        data[i] = (burst1 + burst2 * 0.8 + burst3 * 0.6) * 0.7;
      }
    } else if (lname.includes('snap')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = rnd() * exp(-60 * t) * (1 + sin(pi2 * 1200 * t)) * 0.5;
      }
    } else if (lname.includes('open') && (lname.includes('hat') || lname.includes('ht'))) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = rnd() * exp(-3 * t) * 0.5;
      }
    } else if (lname.includes('hat') || lname.includes('hi-hat') || lname.includes('tight') && lname.includes('hat')) {
      const swing = lname.includes('swing') ? 0.8 : 1.0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = rnd() * exp(-20 * t * swing) * 0.45;
      }
    } else if (lname.includes('ride')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const bell = sin(pi2 * 880 * t) * exp(-5 * t) * 0.3;
        const sizzle = rnd() * exp(-4 * t) * 0.25;
        data[i] = bell + sizzle;
      }
    } else if (lname.includes('cymbal') || lname.includes('crash')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = rnd() * exp(-2.5 * t) * (1 + sin(pi2 * 440 * t) * 0.15) * 0.4;
      }
    } else if (lname.includes('tom')) {
      const freq = lname.includes('hi') || lname.includes('glitch') ? 200 : 100;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = sin(pi2 * (freq * exp(-8 * t) + freq * 0.4) * t) * exp(-8 * t) * 1.2
                + rnd() * exp(-40 * t) * 0.3;
      }
    } else if (lname.includes('shaker') || lname.includes('tambourine')) {
      const repeat = lname.includes('shaker') ? 3 : 6;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const phase = (t * repeat) % 1;
        data[i] = rnd() * exp(-30 * phase) * 0.4;
      }
    } else if (lname.includes('bass moog') || lname.includes('pluck')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const f = lname.includes('pluck') ? 220 : 80;
        const env = exp(-6 * t);
        data[i] = (sin(pi2 * f * t) + sin(pi2 * f * 2 * t) * 0.5 + sin(pi2 * f * 3 * t) * 0.25) * env * 0.6;
      }
    } else if (lname.includes('bass') || lname.includes('stab')) {
      const f = lname.includes('sub c') ? 65 : lname.includes('sub d') ? 73 : lname.includes('sub e') ? 82 : lname.includes('stab') ? 110 : 65;
      const decay = lname.includes('stab') ? 10 : 4;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = (sin(pi2 * f * t) + sin(pi2 * f * 2 * t) * 0.4 + rnd() * 0.02) * exp(-decay * t) * 0.7;
      }
    } else if (lname.includes('lead') || lname.includes('stab a') || lname.includes('stab b') || lname.includes('chord')) {
      const f = lname.includes('stab a') ? 220 : lname.includes('stab b') ? 233 : lname.includes('chord') ? 261 : 440;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const env = exp(-8 * t);
        const saw = ((f * t) % 1) * 2 - 1; // sawtooth
        data[i] = (saw + sin(pi2 * f * 2 * t) * 0.3) * env * 0.4;
      }
    } else if (lname.includes('pluck bell') || lname.includes('bell')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = (sin(pi2 * 880 * t) * exp(-5 * t) + sin(pi2 * 1760 * t) * exp(-8 * t) * 0.3) * 0.5;
      }
    } else if (lname.includes('button') || lname.includes('click')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = sin(pi2 * 1200 * t) * exp(-80 * t) * 0.6;
      }
    } else if (lname.includes('vinyl') || lname.includes('crackle')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = (Math.random() < 0.002 ? rnd() : rnd() * 0.04) * (1 - t / dur);
      }
    } else if (lname.includes('pad') || lname.includes('swell') || lname.includes('space') || lname.includes('choir') || lname.includes('glass')) {
      const freqs = lname.includes('cold') ? [220, 330, 440] : lname.includes('glass') ? [523, 659, 784] : lname.includes('choir') ? [261, 329, 392] : [110, 165, 220];
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const att = Math.min(1, t / 0.2);
        const rel = Math.max(0, 1 - (t - 0.9) / 0.3);
        const env = att * rel;
        data[i] = freqs.reduce((s, f) => s + sin(pi2 * f * t) * (0.5 / freqs.length), 0) * env * 0.4;
      }
    } else if (lname.includes('drone') || lname.includes('atm') || lname.includes('warm')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const att = Math.min(1, t / 0.3);
        data[i] = (sin(pi2 * 55 * t) + sin(pi2 * 82.5 * t) * 0.6 + sin(pi2 * 110 * t) * 0.3) * att * 0.3;
      }
    } else if (lname.includes('loop') || lname.includes('half-time') || lname.includes('broken') || lname.includes('shuffle')) {
      // Drum loop — kick + snare pattern
      const bpm = 128;
      const beat = 60 / bpm;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const phase = (t / beat) % 4;
        const kick = phase < 0.05 || (phase > 2 && phase < 2.05);
        const snare = phase > 1 && phase < 1.05;
        const hat = (t * (bpm / 60) * 2) % 1 < 0.04;
        const kickF = 150 * exp(-20 * ((t / beat) % 1));
        data[i] = (kick ? sin(pi2 * kickF * t) * exp(-20 * ((t / beat) % 1)) : 0)
                + (snare ? rnd() * exp(-20 * (((t - beat) / beat) % 1)) * 0.7 : 0)
                + (hat ? rnd() * exp(-60 * ((t * (bpm / 60) * 2) % 1)) * 0.2 : 0);
      }
    } else {
      // Fallback: pitched tone
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = sin(pi2 * 440 * t) * exp(-8 * t) * 0.4;
      }
    }
    resolve(buffer);
  });
}

export default function FileBrowser() {
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>('idle');
  const [selectedSample, setSelectedSample] = useState<string | null>(null);

  const previewSample = async (sampleName: string) => {
    setPreviewState('loading');
    setSelectedSample(sampleName);
    audioEngine.init();
    if (audioEngine.ctx?.state === 'suspended') audioEngine.ctx.resume();
    const buffer = await generateDrumSound(sampleName);
    const ctx = audioEngine.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = 0.8;
    source.connect(g);
    g.connect(audioEngine.masterGain!);
    source.start();
    setPreviewState('playing');
    source.onended = () => setPreviewState('idle');
    setTimeout(() => source.stop(), 1500);
  };

  return (
    <div className="plugin-bg" style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ color: 'var(--px-green)', fontFamily: "'VT323', monospace", fontSize: 22, marginBottom: 10 }}>
        📁 SAMPLE LIBRARY
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 10, display: 'flex', gap: 6 }}>
        <input
          placeholder="Search samples..."
          className="win98-input"
          style={{
            flex: 1, background: 'var(--px-bg)', border: '1px solid var(--px-border)',
            color: 'var(--px-text)', borderRadius: 2,
          }}
        />
        <button className="win98-btn" style={{ background: '#0d0d1f', color: 'var(--px-cyan)', border: '1px solid var(--px-border)', minWidth: 0, padding: '2px 10px' }}>
          🔍
        </button>
      </div>

      {/* Library tree */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {SAMPLE_LIBRARY.map(cat => (
          <div key={cat.category} style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 11, color: 'var(--px-text)', fontWeight: 'bold',
              padding: '4px 0', borderBottom: '1px solid var(--px-border)',
              marginBottom: 4,
            }}>
              {cat.category}
            </div>
            {cat.packs.map(pack => (
              <div key={pack.name}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 8px', cursor: 'pointer', borderRadius: 2,
                    background: expandedPack === pack.name ? `${pack.color}22` : 'transparent',
                    border: `1px solid ${expandedPack === pack.name ? pack.color + '44' : 'transparent'}`,
                    marginBottom: 1,
                  }}
                  onClick={() => setExpandedPack(expandedPack === pack.name ? null : pack.name)}
                >
                  <span style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>
                    {expandedPack === pack.name ? '▼' : '▶'}
                  </span>
                  <span style={{ fontSize: 11, color: pack.color }}>{pack.name}</span>
                  <span style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>— {pack.description}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--px-text-dim)' }}>
                    {pack.samples.length}
                  </span>
                </div>

                {expandedPack === pack.name && (
                  <div style={{ paddingLeft: 16, marginBottom: 4 }}>
                    {pack.samples.map(sample => (
                      <div
                        key={sample}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '3px 8px', cursor: 'pointer', borderRadius: 2,
                          background: selectedSample === sample ? `${pack.color}15` : 'transparent',
                          marginBottom: 1,
                        }}
                        onDoubleClick={() => previewSample(sample)}
                        onClick={() => setSelectedSample(sample)}
                      >
                        <span style={{ fontSize: 10 }}>
                          {previewState !== 'idle' && selectedSample === sample ? '🔊' : '🎵'}
                        </span>
                        <span style={{
                          fontSize: 10,
                          color: selectedSample === sample ? pack.color : 'var(--px-text)',
                        }}>
                          {sample}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--px-text-dim)' }}>
                          WAV
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div style={{
        borderTop: '1px solid var(--px-border)', paddingTop: 6, marginTop: 6,
        fontSize: 9, color: 'var(--px-text-dim)', display: 'flex', gap: 12,
      }}>
        <span>Double-click to preview</span>
        <span style={{ marginLeft: 'auto', color: previewState === 'playing' ? 'var(--px-green)' : 'var(--px-text-dim)' }}>
          {previewState === 'playing' ? '▶ PLAYING' : previewState === 'loading' ? '⏳ LOADING...' : '⬤ READY'}
        </span>
      </div>
    </div>
  );
}
