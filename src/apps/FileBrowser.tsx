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
      { name: 'Drum Loops 128', description: '128 BPM drum loops', color: '#ffff00', samples: ['Loop A', 'Loop B', 'Loop C', 'Half-time', 'Broken Beat', 'Shuffle'] },
      { name: 'Ambient Pads', description: 'Atmospheric pad loops', color: '#8888ff', samples: ['Pad Warm', 'Pad Cold', 'Drone Atm', 'Space Pad', 'Choir Pad', 'Glass Pad'] },
    ],
  },
];

type PreviewState = 'idle' | 'loading' | 'playing';

function generateDrumSound(name: string): Promise<AudioBuffer> {
  return new Promise(resolve => {
    audioEngine.init();
    const ctx = audioEngine.ctx!;
    const sampleRate = ctx.sampleRate;
    const duration = 0.5;
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    const lname = name.toLowerCase();
    if (lname.includes('kick') || lname.includes('sub')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const freq = 150 * Math.exp(-8 * t);
        data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-6 * t);
      }
    } else if (lname.includes('snare') || lname.includes('clap') || lname.includes('snap')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-15 * t) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 180 * t));
      }
    } else if (lname.includes('hat') || lname.includes('cymbal') || lname.includes('ride')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const decay = lname.includes('open') || lname.includes('ride') ? 3 : 15;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-decay * t);
      }
    } else if (lname.includes('bass')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const freq = lname.includes('c') ? 65 : lname.includes('d') ? 73 : lname.includes('e') ? 82 : 65;
        data[i] = (Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(2 * Math.PI * freq * 2 * t)) * Math.exp(-4 * t) * 0.8;
      }
    } else if (lname.includes('pad') || lname.includes('drone') || lname.includes('atm')) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const attack = Math.min(1, t / 0.15);
        data[i] = (Math.sin(2 * Math.PI * 110 * t) + 0.5 * Math.sin(2 * Math.PI * 165 * t) + 0.3 * Math.sin(2 * Math.PI * 220 * t)) * attack * 0.3;
      }
    } else {
      // Generic percussion
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-10 * t) * 0.5;
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
