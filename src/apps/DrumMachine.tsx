import { useOSStore } from '../store';
import { DRUM_CHANNELS } from '../audio/engine';
import { audioEngine } from '../audio/engine';

const CHANNEL_LABELS: Record<string, { label: string; color: string; accent: string }> = {
  kick:    { label: 'KICK',     color: '#ff3366', accent: '#ff6688' },
  snare:   { label: 'SNARE',   color: '#ff9900', accent: '#ffbb44' },
  hihat:   { label: 'HI-HAT',  color: '#00ffcc', accent: '#66ffdd' },
  openhat: { label: 'OPEN HT', color: '#00aaff', accent: '#44ccff' },
  clap:    { label: 'CLAP',    color: '#dd44ff', accent: '#ee88ff' },
  tom1:    { label: 'TOM HI',  color: '#ffee00', accent: '#ffff66' },
  tom2:    { label: 'TOM LO',  color: '#ff6600', accent: '#ff8833' },
  cymbal:  { label: 'CYMBAL',  color: '#aaaaff', accent: '#ccccff' },
};

const STEP_W = 28;
const STEP_GAP = 3;

// Chrome knob component
function ChromeKnob({ value, min, max, onChange, color = '#00e5ff', label, displayVal }: {
  value: number; min: number; max: number;
  onChange: (v: number) => void;
  color?: string; label: string; displayVal: string;
}) {
  const range = max - min;
  const pct = (value - min) / range;
  const angle = -135 + pct * 270;

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startV = value;
    const onMove = (me: MouseEvent) => {
      const dy = startY - me.clientY;
      const newVal = Math.max(min, Math.min(max, startV + (dy / 80) * range));
      onChange(newVal);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ fontSize: 8, color: 'rgba(200,210,220,0.5)', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
      <div
        onMouseDown={onMouseDown}
        style={{
          width: 34, height: 34, borderRadius: '50%', cursor: 'ns-resize', position: 'relative',
          background: 'radial-gradient(circle at 35% 30%, #606080, #1a1a2e)',
          boxShadow: '0 3px 8px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.15), 0 0 0 2px #2a2a3a',
        }}
      >
        {/* Tick ring */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 34 34">
          {Array.from({ length: 11 }, (_, i) => {
            const a = (-135 + i * 27) * (Math.PI / 180);
            const r1 = 15.5, r2 = 14;
            return (
              <line key={i}
                x1={17 + r1 * Math.cos(a)} y1={17 + r1 * Math.sin(a)}
                x2={17 + r2 * Math.cos(a)} y2={17 + r2 * Math.sin(a)}
                stroke={i * 27 / 270 <= pct ? color : 'rgba(255,255,255,0.15)'}
                strokeWidth="1.2"
              />
            );
          })}
        </svg>
        {/* Indicator */}
        <div style={{
          position: 'absolute', width: 3, height: 10,
          background: `linear-gradient(to bottom, ${color}, ${color}88)`,
          left: '50%', top: 4,
          transformOrigin: '50% calc(100% + 4px)',
          transform: `translateX(-50%) rotate(${angle}deg)`,
          borderRadius: 1.5,
          boxShadow: `0 0 6px ${color}`,
        }} />
      </div>
      <div style={{ fontSize: 10, fontFamily: "'VT323', monospace", color, textShadow: `0 0 8px ${color}`, letterSpacing: 1 }}>
        {displayVal}
      </div>
    </div>
  );
}

export default function DrumMachine() {
  const {
    drumPattern, drumStepCount, drumSwing, currentPatternIdx,
    currentStep, isPlaying,
    toggleDrumStep, clearDrumPattern, loadDefaultPattern,
    drumChannelGains, setDrumChannelGain,
    bpm, setBPM,
    setDrumSwing, setDrumStepCount, selectPattern,
  } = useOSStore();

  const handlePreviewDrum = (channel: number) => {
    audioEngine.ensureRunning(() => {
      audioEngine.triggerDrum(DRUM_CHANNELS[channel], audioEngine.ctx!.currentTime + audioEngine.scheduleOffset);
    });
  };

  const LABEL_W = 90;

  return (
    <div style={{
      padding: 0, minWidth: 660,
      background: 'linear-gradient(180deg, #1a1c28 0%, #12131e 100%)',
      border: '1px solid #333344',
      borderRadius: 6,
      overflow: 'hidden',
      fontFamily: "'Share Tech Mono', monospace",
    }}>

      {/* ── Header / Logo bar ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px',
        background: 'linear-gradient(90deg, #0d0e1a, #1a1020, #0d0e1a)',
        borderBottom: '2px solid #000',
        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <div style={{
            fontSize: 18, fontFamily: "'VT323', monospace", letterSpacing: 3,
            background: 'linear-gradient(to bottom, #fff 0%, #aaa 60%, #777 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            textShadow: 'none', filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.3))',
          }}>BEAT MACHINE</div>
          <div style={{ fontSize: 8, color: '#556', letterSpacing: 2, textTransform: 'uppercase' }}>
            MusicOS 98 · Step Sequencer
          </div>
        </div>

        {/* Status LED strip */}
        <div style={{ display: 'flex', gap: 3, marginLeft: 8 }}>
          {[isPlaying, false, false].map((on, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: on ? (i === 0 ? '#00ff44' : '#ff4400') : '#111',
              boxShadow: on ? `0 0 6px ${i === 0 ? '#00ff44' : '#ff4400'}` : 'none',
            }} />
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Pattern buttons */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#556', letterSpacing: 1, marginRight: 2 }}>BANK</span>
          {['A', 'B', 'C', 'D'].map((pat, idx) => (
            <button key={pat}
              onClick={() => selectPattern(idx)}
              style={{
                minWidth: 0, width: 26, height: 22, fontSize: 11,
                fontFamily: "'VT323', monospace", letterSpacing: 1,
                cursor: 'pointer',
                background: currentPatternIdx === idx
                  ? 'linear-gradient(to bottom, #cc3366, #881144)'
                  : 'linear-gradient(to bottom, #2a2a3a, #1a1a26)',
                color: currentPatternIdx === idx ? '#fff' : '#556',
                border: `1px solid ${currentPatternIdx === idx ? '#ff4488' : '#333344'}`,
                borderRadius: 3,
                boxShadow: currentPatternIdx === idx
                  ? '0 0 8px #ff448866, inset 0 1px 0 rgba(255,255,255,0.2)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              {pat}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={loadDefaultPattern} style={{
            padding: '3px 10px', fontSize: 9, cursor: 'pointer', letterSpacing: 0.5,
            background: 'linear-gradient(to bottom, #2a3a2a, #1a2a1a)',
            color: '#6f6', border: '1px solid #3a5a3a', borderRadius: 3,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
          }}>DEFAULT</button>
          <button onClick={clearDrumPattern} style={{
            padding: '3px 10px', fontSize: 9, cursor: 'pointer', letterSpacing: 0.5,
            background: 'linear-gradient(to bottom, #3a1a1a, #2a0e0e)',
            color: '#f66', border: '1px solid #5a2a2a', borderRadius: 3,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
          }}>CLEAR</button>
        </div>
      </div>

      {/* ── Step grid ─────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', padding: '10px 14px 6px' }}>

        {/* Beat number header */}
        <div style={{ display: 'flex', marginLeft: LABEL_W, marginBottom: 6, gap: STEP_GAP }}>
          {Array.from({ length: drumStepCount }, (_, i) => (
            <div key={i} style={{
              width: STEP_W, textAlign: 'center', fontSize: 8, flexShrink: 0,
              color: i % 4 === 0 ? 'rgba(0,229,255,0.7)' : 'rgba(255,255,255,0.12)',
              fontFamily: 'monospace', letterSpacing: 0,
            }}>
              {i % 4 === 0 ? i / 4 + 1 : '·'}
            </div>
          ))}
        </div>

        {/* Drum rows */}
        {DRUM_CHANNELS.map((ch, channelIdx) => {
          const info = CHANNEL_LABELS[ch];
          const row = (drumPattern[channelIdx] ?? []).slice(0, drumStepCount);
          const gain = drumChannelGains[channelIdx] ?? 0.8;

          return (
            <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: STEP_GAP, marginBottom: 5 }}>
              {/* Channel label */}
              <div style={{ width: LABEL_W, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                {/* Trigger button */}
                <div
                  onClick={() => handlePreviewDrum(channelIdx)}
                  title={`Preview ${info.label}`}
                  style={{
                    width: 52, height: 22, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, ${info.color}22, ${info.color}08)`,
                    border: `1px solid ${info.color}44`,
                    borderRadius: 3,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.5)`,
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* Shimmer line */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                    background: `linear-gradient(90deg, transparent, ${info.color}55, transparent)`,
                  }} />
                  <span style={{
                    fontSize: 8, fontFamily: 'monospace', letterSpacing: 0.5,
                    color: info.accent, fontWeight: 'bold',
                  }}>{info.label}</span>
                </div>
                {/* Volume mini-fader */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={gain}
                    onChange={e => setDrumChannelGain(channelIdx, parseFloat(e.target.value))}
                    style={{ width: 24, cursor: 'pointer', accentColor: info.color, transform: 'rotate(-90deg) scaleX(0.7)' }}
                    title={`Vol: ${Math.round(gain * 100)}%`}
                  />
                </div>
              </div>

              {/* Step buttons */}
              {row.map((active, stepIdx) => {
                const isCurrent = currentStep === stepIdx && isPlaying;
                const isGroupStart = stepIdx % 4 === 0;
                const isGroupEnd = stepIdx % 4 === 3;

                return (
                  <div
                    key={stepIdx}
                    onClick={() => toggleDrumStep(channelIdx, stepIdx)}
                    style={{
                      width: STEP_W, height: 22, flexShrink: 0,
                      cursor: 'pointer', borderRadius: 3,
                      marginLeft: isGroupStart && stepIdx > 0 ? 4 : 0,
                      // Active (lit LED)
                      background: active
                        ? `linear-gradient(135deg, ${info.color}, ${info.color}bb)`
                        : isCurrent
                        ? 'rgba(0,229,255,0.18)'
                        : isGroupStart
                        ? 'rgba(255,255,255,0.045)'
                        : 'rgba(255,255,255,0.022)',
                      border: active
                        ? `1px solid ${info.color}`
                        : isCurrent
                        ? '1px solid rgba(0,229,255,0.6)'
                        : `1px solid ${isGroupStart ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                      boxShadow: active
                        ? `0 0 8px ${info.color}99, 0 0 14px ${info.color}44, inset 0 1px 0 rgba(255,255,255,0.4)`
                        : isCurrent
                        ? '0 0 8px rgba(0,229,255,0.4)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                      // Inner bevel for 3D button effect
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {/* Top highlight bevel */}
                    {!active && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                        background: 'rgba(255,255,255,0.08)',
                      }} />
                    )}
                    {/* LED center dot when active */}
                    {active && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.9)',
                          boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                        }} />
                      </div>
                    )}
                    {/* Playhead indicator */}
                    {isCurrent && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                        background: 'var(--px-cyan)',
                        boxShadow: '0 0 4px var(--px-cyan)',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Beat group separators */}
        <div style={{ display: 'flex', marginLeft: LABEL_W + (STEP_W + 4) * 0, marginTop: 4, gap: STEP_GAP }}>
          {Array.from({ length: drumStepCount / 4 }, (_, beat) => (
            <div key={beat} style={{
              width: 4 * STEP_W + 3 * STEP_GAP + (beat > 0 ? 4 : 0),
              height: 3, borderRadius: 1, flexShrink: 0,
              background: beat % 2 === 0 ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.03)',
              marginLeft: beat === 0 ? 0 : 0,
            }} />
          ))}
        </div>
      </div>

      {/* ── Controls row ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20,
        padding: '10px 14px 12px',
        background: 'linear-gradient(180deg, #111218 0%, #0d0e18 100%)',
        borderTop: '1px solid #1e1f2e',
        flexWrap: 'wrap',
      }}>

        {/* BPM Knob */}
        <ChromeKnob
          label="BPM"
          value={bpm}
          min={40} max={240}
          onChange={v => setBPM(Math.round(v))}
          color="#00e5ff"
          displayVal={String(bpm)}
        />

        {/* Swing Knob */}
        <ChromeKnob
          label="SWING"
          value={drumSwing}
          min={0} max={0.45}
          onChange={v => setDrumSwing(parseFloat(v.toFixed(3)))}
          color="#ff9900"
          displayVal={`${Math.round(drumSwing * 200)}%`}
        />

        {/* Divider */}
        <div style={{ width: 1, height: 40, background: '#1e1f2e', alignSelf: 'center' }} />

        {/* Steps selector */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{ fontSize: 8, color: 'rgba(200,210,220,0.5)', fontFamily: 'monospace', letterSpacing: 1 }}>STEPS</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[16, 32].map(n => (
              <button key={n}
                onClick={() => setDrumStepCount(n)}
                style={{
                  width: 36, height: 26, fontSize: 11,
                  fontFamily: "'VT323', monospace", letterSpacing: 1,
                  cursor: 'pointer',
                  background: drumStepCount === n
                    ? 'linear-gradient(to bottom, #005577, #003344)'
                    : 'linear-gradient(to bottom, #1e1f2e, #141520)',
                  color: drumStepCount === n ? '#00e5ff' : '#446',
                  border: `1px solid ${drumStepCount === n ? '#00e5ff66' : '#222233'}`,
                  borderRadius: 3,
                  boxShadow: drumStepCount === n
                    ? '0 0 8px #00e5ff44, inset 0 1px 0 rgba(255,255,255,0.1)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Playhead step display */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        }}>
          <div style={{ fontSize: 8, color: 'rgba(200,210,220,0.5)', fontFamily: 'monospace', letterSpacing: 1 }}>STEP</div>
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 22,
            color: isPlaying ? '#00ff88' : '#226',
            textShadow: isPlaying ? '0 0 10px #00ff88' : 'none',
            minWidth: 32, textAlign: 'center', letterSpacing: 1,
          }}>
            {isPlaying ? String(currentStep + 1).padStart(2, '0') : '--'}
          </div>
        </div>

      </div>
    </div>
  );
}
