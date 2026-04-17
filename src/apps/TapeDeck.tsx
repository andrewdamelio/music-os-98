import { useState, useEffect, useRef } from 'react';
import { useOSStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

// ── Reel SVG ──────────────────────────────────────────────────────────────────
function Reel({ angle, size = 54, filled = 0.5 }: { angle: number; size?: number; filled?: number }) {
  const r = size / 2;
  const hub = r * 0.28;
  const spoke = r * 0.72;
  const tapeR = r * 0.76;
  const tapeInner = hub + (tapeR - hub) * (1 - filled);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* Tape fill (dark brown ring) */}
      <circle cx={r} cy={r} r={tapeR} fill="#3d1f0a" />
      <circle cx={r} cy={r} r={tapeInner} fill="#111" />
      {/* Spokes */}
      <g transform={`rotate(${angle} ${r} ${r})`}>
        {[0, 60, 120, 180, 240, 300].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const x1 = r + hub * Math.cos(rad);
          const y1 = r + hub * Math.sin(rad);
          const x2 = r + spoke * Math.cos(rad);
          const y2 = r + spoke * Math.sin(rad);
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#888" strokeWidth="2.5" strokeLinecap="round" />;
        })}
        {/* Hub */}
        <circle cx={r} cy={r} r={hub} fill="#555" stroke="#888" strokeWidth="1.5" />
        <circle cx={r} cy={r} r={hub * 0.45} fill="#333" />
        {/* Hub dot */}
        <circle cx={r} cy={r} r={hub * 0.15} fill="#aaa" />
      </g>
      {/* Rim */}
      <circle cx={r} cy={r} r={tapeR} fill="none" stroke="#555" strokeWidth="1.5" />
    </svg>
  );
}

// ── Cassette Body ─────────────────────────────────────────────────────────────
function Cassette({ reelAngle, isRecording, projectName, takeNum }: {
  reelAngle: number; isRecording: boolean; projectName: string; takeNum: number;
}) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: 140,
      background: 'linear-gradient(180deg, #222 0%, #1a1a1a 100%)',
      borderRadius: 6, border: '1px solid #444',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.8)',
      overflow: 'hidden',
    }}>
      {/* Corner screws */}
      {[[8,8],[8,132],[232,8],[232,132]].map(([cx,cy],i) => (
        <div key={i} style={{
          position: 'absolute', left: cx - 4, top: cy - 4,
          width: 8, height: 8, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #777, #333)',
          border: '1px solid #555',
        }}>
          <div style={{ position: 'absolute', inset: 1, borderRadius: '50%', background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 41%, transparent 56%)' }} />
        </div>
      ))}

      {/* Label area */}
      <div style={{
        position: 'absolute', left: 24, right: 24, top: 6, bottom: 44,
        background: 'linear-gradient(180deg, #1e0e04 0%, #150a02 100%)',
        borderRadius: 3, border: '1px solid #3a1a08',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Label text */}
        <div style={{ fontSize: 9, color: '#cc8844', fontFamily: "'VT323', monospace", letterSpacing: 2, marginBottom: 2 }}>
          ◆ MUSICOS 98 STUDIOS ◆
        </div>
        <div style={{ fontSize: 11, color: '#ffcc88', fontFamily: "'VT323', monospace", letterSpacing: 1, maxWidth: 120, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'center' }}>
          {projectName}
        </div>
        <div style={{ fontSize: 9, color: '#886633', fontFamily: "'VT323', monospace", marginTop: 2 }}>
          TAKE {takeNum} · TYPE II
        </div>

        {/* Reel windows */}
        <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
          {/* Reel window left */}
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            background: 'radial-gradient(circle, #0a0a0a 0%, #111 100%)',
            border: '2px solid #333',
            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.9)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Reel angle={reelAngle} size={54} filled={0.65} />
          </div>
          {/* Center tape path */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, paddingBottom: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#555', border: '1px solid #666' }} />
            <div style={{ width: 28, height: 2, background: isRecording ? '#883300' : '#3a2010', borderRadius: 1 }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#555', border: '1px solid #666' }} />
          </div>
          {/* Reel window right */}
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            background: 'radial-gradient(circle, #0a0a0a 0%, #111 100%)',
            border: '2px solid #333',
            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.9)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Reel angle={-reelAngle * 0.7} size={54} filled={0.35} />
          </div>
        </div>
      </div>

      {/* Bottom aperture / tape slot */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 0,
      }}>
        {/* Left guide */}
        <div style={{ width: 12, height: 28, background: '#333', borderRadius: '3px 0 0 3px', border: '1px solid #555', borderRight: 'none' }} />
        {/* Tape aperture */}
        <div style={{
          flex: 1, maxWidth: 150, height: 14,
          background: isRecording ? 'linear-gradient(90deg, #1a0800, #3a1500, #1a0800)' : '#0a0a0a',
          border: '1px solid #444', borderLeft: 'none', borderRight: 'none',
          boxShadow: isRecording ? 'inset 0 0 8px #ff440033' : 'none',
          transition: 'background 0.3s',
        }} />
        {/* Right guide */}
        <div style={{ width: 12, height: 28, background: '#333', borderRadius: '0 3px 3px 0', border: '1px solid #555', borderLeft: 'none' }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TapeDeck() {
  const { isRecording, toggleRecord, projectName } = useOSStore(useShallow(s => ({
    isRecording: s.isRecording,
    toggleRecord: s.toggleRecord,
    projectName: s.projectName,
  })));
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<{ name: string; url: string; duration: number }[]>([]);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [reelAngle, setReelAngle] = useState(0);
  const [takeNum, setTakeNum] = useState(1);

  useEffect(() => {
    if (isRecording) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - start) / 1000));
        setReelAngle(a => (a + 2.8) % 360);
      }, 40);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStopRecord = async () => {
    const duration = recordingTime;
    toggleRecord();
    setRecordings(prev => [...prev, {
      name: `${projectName} — Take ${takeNum}`,
      url: '',
      duration,
    }]);
    setTakeNum(n => n + 1);
    setRecordingTime(0);
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'linear-gradient(180deg, #0c0d18 0%, #080910 100%)',
      fontFamily: "'Share Tech Mono', monospace",
      color: 'var(--px-text)',
    }}>

      {/* Header */}
      <div style={{
        padding: '10px 16px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(90deg, #0c0d1a, #111228, #0c0d1a)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 20 }}>📼</span>
        <div>
          <div style={{ fontSize: 14, letterSpacing: 3, fontFamily: "'VT323', monospace", color: '#ff88cc' }}>TAPE DECK</div>
          <div style={{ fontSize: 8, color: 'var(--px-text-dim)', letterSpacing: 2 }}>Studio Recorder · 4-Track</div>
        </div>
        {isRecording && (
          <div style={{ marginLeft: 'auto', fontSize: 9, color: '#ff4444', letterSpacing: 1, animation: 'blink 0.8s infinite' }}>
            ● REC
          </div>
        )}
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1}50%{opacity:0.2} }`}</style>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>

        {/* Cassette visual */}
        <Cassette
          reelAngle={reelAngle}
          isRecording={isRecording}
          projectName={projectName}
          takeNum={takeNum}
        />

        {/* Counter */}
        <div style={{
          marginTop: 12, background: '#050508', border: '1px solid #1a1c2e',
          borderRadius: 4, padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
        }}>
          <div>
            <div style={{ fontSize: 7, color: '#444', letterSpacing: 2, marginBottom: 4 }}>COUNTER</div>
            <div style={{
              fontFamily: "'VT323', monospace", fontSize: 30,
              color: '#ff9900', textShadow: '0 0 8px #ff990066',
              letterSpacing: 3, lineHeight: 1,
            }}>
              {String(Math.floor(recordingTime / 60)).padStart(2,'0')}:{String(recordingTime % 60).padStart(2,'0')}
            </div>
          </div>
          <div style={{ fontSize: 7, color: '#443322', letterSpacing: 2, textAlign: 'right' }}>
            <div>TAKE {takeNum}</div>
            <div style={{ marginTop: 4 }}>TYPE II</div>
          </div>
        </div>

        {/* Transport controls */}
        <div style={{
          display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12,
          padding: '10px 0',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {!isRecording ? (
            <button onClick={toggleRecord} style={{
              padding: '8px 22px', cursor: 'pointer', borderRadius: 3,
              background: 'linear-gradient(180deg, #1a0606 0%, #0e0303 100%)',
              color: '#ff4444', border: '1px solid #aa2222',
              fontFamily: "'VT323', monospace", fontSize: 16, letterSpacing: 2,
              boxShadow: '0 0 10px #ff222211, inset 0 1px 0 rgba(255,255,255,0.05)',
              transition: 'all 0.1s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px #ff222244, inset 0 1px 0 rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 10px #ff222211, inset 0 1px 0 rgba(255,255,255,0.05)'; }}
            >
              ● REC
            </button>
          ) : (
            <button onClick={handleStopRecord} style={{
              padding: '8px 22px', cursor: 'pointer', borderRadius: 3,
              background: 'linear-gradient(180deg, #1a0e00 0%, #0e0800 100%)',
              color: '#ff8800', border: '1px solid #aa6600',
              fontFamily: "'VT323', monospace", fontSize: 16, letterSpacing: 2,
              boxShadow: '0 0 14px #ff880033, inset 0 1px 0 rgba(255,255,255,0.05)',
              animation: 'blink 1s infinite',
            }}>
              ■ STOP
            </button>
          )}
        </div>

        {/* Hint text */}
        <div style={{ fontSize: 9, color: '#2a2c40', textAlign: 'center', padding: '8px 0', letterSpacing: 1 }}>
          CAPTURES MASTER OUTPUT · DOWNLOADS AS WEBM
        </div>

        {/* Session recordings */}
        {recordings.length > 0 && (
          <div>
            <div style={{ fontSize: 8, color: '#444', marginBottom: 6, letterSpacing: 2 }}>SESSION RECORDINGS</div>
            {recordings.map((rec, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1c2e',
                borderRadius: 3, marginBottom: 3,
              }}>
                <span style={{ fontSize: 12 }}>📼</span>
                <span style={{ flex: 1, fontSize: 10, color: 'var(--px-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.name}</span>
                <span style={{ fontSize: 9, color: '#44ffaa', fontFamily: 'monospace' }}>{formatTime(rec.duration)}</span>
                {rec.url && (
                  <>
                    <button onClick={() => {
                      if (playingUrl === rec.url) { audioRef.current?.pause(); setPlayingUrl(null); }
                      else { const a = new Audio(rec.url); audioRef.current = a; a.play(); setPlayingUrl(rec.url); a.onended = () => setPlayingUrl(null); }
                    }} style={{ padding: '2px 7px', fontSize: 10, cursor: 'pointer', background: '#080a14', color: 'var(--px-cyan)', border: '1px solid #1a1c2e', borderRadius: 2 }}>
                      {playingUrl === rec.url ? '⏹' : '▶'}
                    </button>
                    <a href={rec.url} download={`${rec.name}.webm`} style={{ padding: '2px 7px', fontSize: 10, cursor: 'pointer', background: '#080a14', color: '#44ff88', border: '1px solid #1a1c2e', borderRadius: 2, textDecoration: 'none' }}>
                      ⬇
                    </a>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
