import { useState, useEffect, useRef } from 'react';
import { useOSStore } from '../store';
import { audioEngine } from '../audio/engine';

export default function TapeDeck() {
  const { isRecording, toggleRecord, projectName } = useOSStore();
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<{ name: string; url: string; duration: number }[]>([]);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [reelAngle, setReelAngle] = useState(0);

  useEffect(() => {
    if (isRecording) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - start) / 1000));
        setReelAngle(a => (a + 3) % 360);
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStopRecord = async () => {
    const duration = recordingTime;
    toggleRecord(); // This triggers the download in the store
    // Add to list (blob URL would be captured in real impl)
    setRecordings(prev => [...prev, {
      name: `${projectName} Take ${prev.length + 1}`,
      url: '', // In real impl, capture from stopRecording
      duration,
    }]);
    setRecordingTime(0);
  };

  return (
    <div className="plugin-bg" style={{ padding: 12 }}>
      <div style={{ color: 'var(--px-pink)', fontFamily: "'VT323', monospace", fontSize: 22, marginBottom: 12 }}>
        📼 TAPE DECK — Studio Recorder
      </div>

      {/* Tape deck visual */}
      <div style={{
        background: '#111122', border: '2px solid #333366',
        borderRadius: 8, padding: 16, marginBottom: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Left reel */}
        <div style={{ position: 'relative', width: 70, height: 70 }}>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            border: '3px solid #444',
            background: `conic-gradient(from ${reelAngle * (isRecording ? 1 : 0)}deg, #333 0deg, #555 60deg, #333 120deg, #555 180deg, #333 240deg, #555 300deg, #333 360deg)`,
            transition: 'transform 0.05s',
          }}>
            <div style={{
              position: 'absolute', inset: 10, borderRadius: '50%',
              background: '#1a1a3a', border: '2px solid #333',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#666' }} />
            </div>
          </div>
        </div>

        {/* Center display */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 40,
            color: isRecording ? '#ff4444' : 'var(--px-cyan)',
            textShadow: `0 0 20px ${isRecording ? '#ff4444' : 'var(--px-cyan)'}`,
          }}>
            {formatTime(recordingTime)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginTop: 4 }}>
            {isRecording ? (
              <span style={{ color: '#ff4444', animation: 'blink 0.5s infinite' }}>
                ● RECORDING
              </span>
            ) : 'READY'}
          </div>
          <style>{`@keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }`}</style>
        </div>

        {/* Right reel */}
        <div style={{ position: 'relative', width: 70, height: 70 }}>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            border: '3px solid #444',
            background: `conic-gradient(from ${-reelAngle * (isRecording ? 1 : 0)}deg, #333 0deg, #555 60deg, #333 120deg, #555 180deg, #333 240deg, #555 300deg, #333 360deg)`,
          }}>
            <div style={{
              position: 'absolute', inset: 10, borderRadius: '50%',
              background: '#1a1a3a', border: '2px solid #333',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#666' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
        {!isRecording ? (
          <button
            onClick={toggleRecord}
            style={{
              padding: '8px 24px', cursor: 'pointer',
              background: 'rgba(255,0,0,0.15)', color: '#ff4444',
              border: '2px solid #ff4444', borderRadius: 4,
              fontFamily: "'VT323', monospace", fontSize: 18,
              letterSpacing: 1,
            }}
          >
            ● RECORD
          </button>
        ) : (
          <button
            onClick={handleStopRecord}
            style={{
              padding: '8px 24px', cursor: 'pointer',
              background: 'rgba(255,64,0,0.15)', color: '#ff8800',
              border: '2px solid #ff8800', borderRadius: 4,
              fontFamily: "'VT323', monospace", fontSize: 18,
              letterSpacing: 1,
            }}
          >
            ■ STOP
          </button>
        )}
      </div>

      <div style={{
        fontSize: 9, color: 'var(--px-text-dim)', textAlign: 'center',
        padding: '8px 0', borderTop: '1px solid var(--px-border)', marginBottom: 12,
      }}>
        Recording will capture master audio output and download as WebM file
      </div>

      {/* Recent recordings */}
      {recordings.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Session Recordings
          </div>
          {recordings.map((rec, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
              background: 'var(--px-bg2)', border: '1px solid var(--px-border)',
              borderRadius: 3, marginBottom: 4,
            }}>
              <span style={{ fontSize: 14 }}>📼</span>
              <span style={{ flex: 1, fontSize: 11, color: 'var(--px-text)' }}>{rec.name}</span>
              <span style={{ fontSize: 10, color: 'var(--px-text-dim)', fontFamily: 'monospace' }}>
                {formatTime(rec.duration)}
              </span>
              {rec.url && (
                <>
                  <button
                    onClick={() => {
                      if (playingUrl === rec.url) {
                        audioRef.current?.pause();
                        setPlayingUrl(null);
                      } else {
                        const audio = new Audio(rec.url);
                        audioRef.current = audio;
                        audio.play();
                        setPlayingUrl(rec.url);
                        audio.onended = () => setPlayingUrl(null);
                      }
                    }}
                    style={{
                      padding: '2px 8px', fontSize: 10, cursor: 'pointer',
                      background: '#0d0d1f', color: 'var(--px-cyan)',
                      border: '1px solid var(--px-border)', borderRadius: 2,
                    }}
                  >
                    {playingUrl === rec.url ? '⏹' : '▶'}
                  </button>
                  <a
                    href={rec.url}
                    download={`${rec.name}.webm`}
                    style={{
                      padding: '2px 8px', fontSize: 10, cursor: 'pointer',
                      background: '#0d0d1f', color: 'var(--px-green)',
                      border: '1px solid var(--px-border)', borderRadius: 2,
                      textDecoration: 'none',
                    }}
                  >
                    ⬇ Save
                  </a>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
