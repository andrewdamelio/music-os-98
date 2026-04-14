import { useRef, useState, useCallback } from 'react';
import { useOSStore } from '../store';
import { audioEngine } from '../audio/engine';

const NOTE_HEIGHT = 13;
const BEAT_WIDTH = 64;
const NUM_NOTES = 48; // C2–B5
const START_NOTE = 36; // C2
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PIANO_W = 52;

function noteName(midi: number) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
function isBlackKey(midi: number) {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

// Note colors by channel/type
const NOTE_COLORS = {
  white: { bg: 'linear-gradient(90deg, #00c8ff, #0088cc)', border: '#00e5ff', glow: '#00e5ff' },
  black: { bg: 'linear-gradient(90deg, #aa44ff, #7711cc)', border: '#cc66ff', glow: '#aa44ff' },
};

const BEAT_OPTIONS = [1, 2, 4, 8, 16];

// ── Toolbar Button ────────────────────────────────────────────────────────────
function TBtn({ active, onClick, children, accentColor = '#00e5ff' }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; accentColor?: string;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 9px', fontSize: 9, cursor: 'pointer',
      fontFamily: "'Share Tech Mono', monospace", letterSpacing: 0.5,
      background: active
        ? `linear-gradient(to bottom, ${accentColor}22, ${accentColor}11)`
        : 'linear-gradient(to bottom, #1e1f2c, #141520)',
      color: active ? accentColor : 'rgba(255,255,255,0.3)',
      border: `1px solid ${active ? accentColor + '66' : '#1e1f2c'}`,
      borderRadius: 3,
      boxShadow: active
        ? `0 0 6px ${accentColor}33, inset 0 1px 0 rgba(255,255,255,0.08)`
        : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      textTransform: 'uppercase',
    }}>
      {children}
    </button>
  );
}

// ── Toolbar Group ─────────────────────────────────────────────────────────────
function TGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 7, color: '#334', letterSpacing: 1.5, fontFamily: 'monospace', textAlign: 'center' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 2 }}>{children}</div>
    </div>
  );
}

export default function PianoRoll() {
  const { pianoNotes, addPianoNote, removePianoNote, pianoRollEnabled, togglePianoRoll,
    isPlaying, pianoRollBeats, setPianoRollBeats } = useOSStore();
  const BEATS = pianoRollBeats;
  const [snapTo, setSnapTo] = useState(0.25);
  const [noteDuration, setNoteDuration] = useState(0.25);
  const [selectedTool, setSelectedTool] = useState<'draw' | 'erase'>('draw');
  const [zoom, setZoom] = useState(1);
  const [hoveredKey, setHoveredKey] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<HTMLDivElement>(null);

  const beatW = BEAT_WIDTH * zoom;
  const totalW = BEATS * beatW;
  const totalH = NUM_NOTES * NOTE_HEIGHT;

  const playheadX = isPlaying ? ((audioEngine.pianoRollDisplayBeat / (BEATS * 4)) * totalW) : -1;

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + gridRef.current.scrollLeft;
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    const beat = x / beatW;
    const snappedBeat = Math.floor(beat / snapTo) * snapTo;
    const noteFromTop = Math.floor(y / NOTE_HEIGHT);
    const midi = START_NOTE + NUM_NOTES - 1 - noteFromTop;
    if (midi < START_NOTE || midi >= START_NOTE + NUM_NOTES) return;

    if (selectedTool === 'draw') {
      const overlapping = pianoNotes.find(n =>
        n.note === midi && n.beat <= snappedBeat && n.beat + n.duration > snappedBeat
      );
      if (overlapping) { removePianoNote(overlapping.id); return; }
      addPianoNote({ id: `note-${Date.now()}-${Math.random()}`, note: midi, beat: snappedBeat, duration: noteDuration, channel: 1 });
    } else {
      const target = pianoNotes.find(n =>
        n.note === midi && n.beat <= snappedBeat && n.beat + n.duration > snappedBeat
      );
      if (target) removePianoNote(target.id);
    }
  }, [beatW, snapTo, pianoNotes, addPianoNote, removePianoNote, selectedTool, noteDuration]);

  // Sync scroll between piano keys and grid
  const onGridScroll = useCallback(() => {
    if (gridRef.current && keysRef.current) {
      keysRef.current.scrollTop = gridRef.current.scrollTop;
    }
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0c0d16',
      fontFamily: "'Share Tech Mono', monospace",
    }}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-end', padding: '8px 12px',
        background: 'linear-gradient(180deg, #0e0f1c, #0a0b16)',
        borderBottom: '1px solid #111',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, marginRight: 4, alignSelf: 'center' }}>
          <div style={{
            fontSize: 15, fontFamily: "'VT323', monospace", letterSpacing: 4,
            background: 'linear-gradient(to bottom, #ddd, #888)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>PIANO ROLL</div>
        </div>

        <div style={{ width: 1, height: 28, background: '#1a1b26', alignSelf: 'center' }} />

        {/* Tool */}
        <TGroup label="TOOL">
          <TBtn active={selectedTool === 'draw'} onClick={() => setSelectedTool('draw')} accentColor="#00e5ff">
            ✏ Draw
          </TBtn>
          <TBtn active={selectedTool === 'erase'} onClick={() => setSelectedTool('erase')} accentColor="#ff4466">
            ✕ Erase
          </TBtn>
        </TGroup>

        <div style={{ width: 1, height: 28, background: '#1a1b26', alignSelf: 'center' }} />

        {/* Snap */}
        <TGroup label="SNAP">
          {([0.125, 0.25, 0.5, 1] as const).map(s => (
            <TBtn key={s} active={snapTo === s} onClick={() => setSnapTo(s)} accentColor="#00e5ff">
              {s === 0.125 ? '1/32' : s === 0.25 ? '1/16' : s === 0.5 ? '1/8' : '1/4'}
            </TBtn>
          ))}
        </TGroup>

        <div style={{ width: 1, height: 28, background: '#1a1b26', alignSelf: 'center' }} />

        {/* Duration */}
        <TGroup label="LENGTH">
          {([0.125, 0.25, 0.5, 1, 2] as const).map(d => (
            <TBtn key={d} active={noteDuration === d} onClick={() => setNoteDuration(d)} accentColor="#ff9900">
              {d === 0.125 ? '1/32' : d === 0.25 ? '1/16' : d === 0.5 ? '1/8' : d === 1 ? '1/4' : '1/2'}
            </TBtn>
          ))}
        </TGroup>

        <div style={{ width: 1, height: 28, background: '#1a1b26', alignSelf: 'center' }} />

        {/* Bars */}
        <TGroup label="BARS">
          {BEAT_OPTIONS.map(b => (
            <TBtn key={b} active={BEATS === b} onClick={() => setPianoRollBeats(b)} accentColor="#aa44ff">
              {b}
            </TBtn>
          ))}
        </TGroup>

        <div style={{ flex: 1 }} />

        {/* Zoom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignSelf: 'flex-end' }}>
          <div style={{ fontSize: 7, color: '#334', letterSpacing: 1.5, textAlign: 'center' }}>ZOOM</div>
          <input type="range" min={0.5} max={3} step={0.1} value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ width: 60, accentColor: '#00e5ff', cursor: 'pointer' }} />
        </div>

        <div style={{ width: 1, height: 28, background: '#1a1b26', alignSelf: 'center' }} />

        {/* Enable + Clear */}
        <div style={{ display: 'flex', gap: 4, alignSelf: 'flex-end' }}>
          <TBtn active={pianoRollEnabled} onClick={() => togglePianoRoll(!pianoRollEnabled)} accentColor="#39ff14">
            {pianoRollEnabled ? '▶ ON' : '■ OFF'}
          </TBtn>
          <TBtn active={false} onClick={() => useOSStore.getState().setPianoNotes([])} accentColor="#ff4466">
            ✕ Clear
          </TBtn>
        </div>
      </div>

      {/* ── Roll area ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

        {/* Piano keys */}
        <div ref={keysRef} style={{
          width: PIANO_W, flexShrink: 0,
          overflowY: 'hidden',
          borderRight: '2px solid #000',
          background: '#0a0b14',
        }}>
          {/* Header space to align with beat ruler */}
          <div style={{ height: 20, background: '#08090f', borderBottom: '1px solid #111' }} />
          <div style={{ height: totalH, position: 'relative' }}>
            {Array.from({ length: NUM_NOTES }, (_, i) => {
              const midi = START_NOTE + NUM_NOTES - 1 - i;
              const isBlack = isBlackKey(midi);
              const isC = midi % 12 === 0;
              const hovered = hoveredKey === midi;

              return (
                <div key={i} style={{
                  position: 'absolute', top: i * NOTE_HEIGHT,
                  left: 0, right: 0, height: NOTE_HEIGHT,
                  display: 'flex', alignItems: 'center',
                  cursor: 'pointer',
                  background: hovered
                    ? isBlack ? '#332244' : '#334455'
                    : isBlack
                    ? 'linear-gradient(to right, #0d0d12, #181820 60%, #0d0d12)'
                    : isC
                    ? 'linear-gradient(to right, #e0e0ee, #ccccdd 60%, #aaaacc)'
                    : 'linear-gradient(to right, #d0d0e0, #bbbbcc 60%, #9999aa)',
                  borderBottom: `1px solid ${isBlack ? '#000' : '#aaaacc'}`,
                  borderLeft: isBlack ? '3px solid #000' : 'none',
                  zIndex: isBlack ? 2 : 1,
                }}>
                  {/* Black key gloss */}
                  {isBlack && (
                    <div style={{
                      position: 'absolute', top: 1, left: 3, width: '55%', height: 2,
                      background: 'linear-gradient(to right, rgba(255,255,255,0.15), transparent)',
                      borderRadius: 1,
                    }} />
                  )}
                  {isC && (
                    <span style={{
                      fontSize: 7, color: '#5566aa', paddingLeft: 3,
                      fontFamily: 'monospace', letterSpacing: 0,
                    }}>
                      {noteName(midi)}
                    </span>
                  )}
                  {/* Invisible hit area */}
                  <div style={{ position: 'absolute', inset: 0 }}
                    onMouseEnter={() => setHoveredKey(midi)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onMouseDown={() => {
                      audioEngine.init();
                      if (audioEngine.ctx?.state === 'suspended') audioEngine.ctx.resume();
                      audioEngine.noteOn(midi, 1);
                      const up = () => { audioEngine.noteOff(midi, 1); window.removeEventListener('mouseup', up); };
                      window.addEventListener('mouseup', up);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Beat ruler */}
          <div style={{
            height: 20, flexShrink: 0, overflowX: 'hidden',
            background: '#08090f', borderBottom: '1px solid #111',
            position: 'relative',
          }}>
            <div style={{ width: totalW, height: '100%', position: 'relative' }}>
              {Array.from({ length: BEATS }, (_, b) => (
                <div key={b} style={{
                  position: 'absolute', top: 0, left: b * beatW,
                  height: '100%', width: beatW,
                  borderLeft: `1px solid ${b === 0 ? 'transparent' : '#1a1b28'}`,
                  display: 'flex', alignItems: 'center',
                }}>
                  <span style={{
                    fontSize: 9, color: '#445', fontFamily: 'monospace',
                    paddingLeft: 4, letterSpacing: 0,
                  }}>
                    {b + 1}
                  </span>
                  {/* Sub-beat ticks */}
                  {[1, 2, 3].map(sub => (
                    <div key={sub} style={{
                      position: 'absolute', left: sub * beatW / 4, top: 12,
                      width: 1, height: 8, background: '#1e1f2c',
                    }} />
                  ))}
                </div>
              ))}
              {/* Playhead triangle on ruler */}
              {playheadX >= 0 && (
                <div style={{
                  position: 'absolute', top: 0, left: playheadX - 4,
                  width: 0, height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '8px solid #00ff88',
                  filter: 'drop-shadow(0 0 4px #00ff88)',
                }} />
              )}
            </div>
          </div>

          {/* Scrollable grid */}
          <div ref={gridRef} onScroll={onGridScroll} style={{
            flex: 1, overflow: 'auto', position: 'relative',
            cursor: selectedTool === 'draw' ? 'crosshair' : 'cell',
          }} onClick={handleGridClick}>
            <div style={{ width: totalW, height: totalH, position: 'relative' }}>

              {/* Row backgrounds */}
              {Array.from({ length: NUM_NOTES }, (_, i) => {
                const midi = START_NOTE + NUM_NOTES - 1 - i;
                const black = isBlackKey(midi);
                const isC = midi % 12 === 0;
                return (
                  <div key={i} style={{
                    position: 'absolute', top: i * NOTE_HEIGHT, left: 0, right: 0, height: NOTE_HEIGHT,
                    background: black
                      ? 'rgba(0,0,0,0.25)'
                      : isC
                      ? 'rgba(0,229,255,0.03)'
                      : 'transparent',
                    borderBottom: `1px solid ${isC ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)'}`,
                    pointerEvents: 'none',
                  }} />
                );
              })}

              {/* Beat grid lines */}
              {Array.from({ length: BEATS * 4 + 1 }, (_, b) => (
                <div key={b} style={{
                  position: 'absolute', top: 0, bottom: 0, left: b * beatW / 4, width: 1,
                  background: b % 4 === 0
                    ? 'rgba(0,229,255,0.18)'
                    : b % 2 === 0
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(255,255,255,0.015)',
                  pointerEvents: 'none',
                }} />
              ))}

              {/* Notes */}
              {pianoNotes.map(note => {
                const row = START_NOTE + NUM_NOTES - 1 - note.note;
                if (row < 0 || row >= NUM_NOTES) return null;
                const black = isBlackKey(note.note);
                const c = black ? NOTE_COLORS.black : NOTE_COLORS.white;
                return (
                  <div key={note.id} style={{
                    position: 'absolute',
                    top: row * NOTE_HEIGHT + 1,
                    left: note.beat * beatW + 1,
                    width: Math.max(8, note.duration * beatW - 3),
                    height: NOTE_HEIGHT - 2,
                    background: c.bg,
                    border: `1px solid ${c.border}66`,
                    borderRadius: 2,
                    boxShadow: `0 0 6px ${c.glow}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    cursor: selectedTool === 'erase' ? 'pointer' : 'default',
                    overflow: 'hidden',
                    zIndex: 3,
                  }}
                    onClick={e => {
                      e.stopPropagation();
                      if (selectedTool === 'erase') removePianoNote(note.id);
                    }}
                    title={noteName(note.note)}
                  >
                    {/* Note inner shine */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: 'rgba(255,255,255,0.25)', borderRadius: '2px 2px 0 0',
                    }} />
                    {/* Note label if wide enough */}
                    {note.duration * beatW > 20 && (
                      <div style={{
                        fontSize: 7, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace',
                        paddingLeft: 3, paddingTop: 3, letterSpacing: 0,
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                        userSelect: 'none', pointerEvents: 'none',
                      }}>
                        {noteName(note.note)}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Playhead */}
              {playheadX >= 0 && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, width: 2,
                  left: playheadX,
                  background: 'linear-gradient(to bottom, #00ff88, #00cc6688)',
                  boxShadow: '0 0 8px #00ff8888',
                  pointerEvents: 'none', zIndex: 10,
                }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '4px 12px',
        borderTop: '1px solid #0d0e18',
        background: '#080910',
        fontSize: 8, color: '#334', display: 'flex', gap: 16,
        flexShrink: 0, fontFamily: 'monospace', letterSpacing: 0.5,
      }}>
        <span style={{ color: '#445' }}>NOTES <span style={{ color: pianoNotes.length > 0 ? '#00e5ff' : '#223' }}>{pianoNotes.length}</span></span>
        <span style={{ color: '#445' }}>BARS <span style={{ color: '#556' }}>{BEATS}</span></span>
        <span style={{ color: '#445' }}>SNAP <span style={{ color: '#556' }}>{snapTo === 0.125 ? '1/32' : snapTo === 0.25 ? '1/16' : snapTo === 0.5 ? '1/8' : '1/4'}</span></span>
        <span style={{ color: '#445' }}>LEN <span style={{ color: '#556' }}>{noteDuration === 0.125 ? '1/32' : noteDuration === 0.25 ? '1/16' : noteDuration === 0.5 ? '1/8' : noteDuration === 1 ? '1/4' : '1/2'}</span></span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#334' }}>Click to draw · Click note to delete · Piano keys playable</span>
        <span style={{
          color: pianoRollEnabled ? '#39ff14' : '#334',
          textShadow: pianoRollEnabled ? '0 0 6px #39ff1466' : 'none',
        }}>
          {pianoRollEnabled ? '● SEQUENCER ON' : '○ SEQUENCER OFF'}
        </span>
      </div>
    </div>
  );
}
