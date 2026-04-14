import { useOSStore } from '../store';
import { useEffect, useRef, useState } from 'react';

export default function TransportBar() {
  const { isPlaying, bpm, currentStep, loopEnabled, isRecording, projectName, drumStepCount,
    play, stop, setBPM, toggleLoop, toggleRecord, saveProject, loadProjectFromJSON, setProjectName } = useOSStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingBpm, setEditingBpm] = useState(false);
  const [bpmInput, setBpmInput] = useState(String(bpm));
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(projectName);
  const [cpu, setCpu] = useState(12);

  // Fake CPU meter
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setCpu(12 + Math.random() * 18 + (isRecording ? 15 : 0));
    }, 500);
    return () => clearInterval(id);
  }, [isPlaying, isRecording]);

  const steps = Array.from({ length: 16 }, (_, i) => i);
  const in32ndHalf = drumStepCount === 32 && currentStep >= 16; // currently in steps 16-31

  const handleBpmBlur = () => {
    const v = parseInt(bpmInput);
    if (!isNaN(v) && v >= 20 && v <= 300) setBPM(v);
    else setBpmInput(String(bpm));
    setEditingBpm(false);
  };

  return (
    <div className="transport-bar">
      {/* Play/Stop */}
      <button
        className={`transport-btn play${isPlaying ? ' active' : ''}`}
        title="Play (Space)"
        onClick={isPlaying ? stop : play}
      >
        {isPlaying ? '⏹' : '▶'}
      </button>

      <button
        className={`transport-btn stop`}
        title="Stop"
        onClick={stop}
      >
        ■
      </button>

      <button
        className={`transport-btn record${isRecording ? ' active' : ''}`}
        title="Record"
        onClick={toggleRecord}
      >
        ●
      </button>

      <div className="taskbar-separator" style={{ height: 20 }} />

      {/* BPM */}
      <div className="transport-bpm">
        <span className="transport-label">BPM</span>
        {editingBpm ? (
          <input
            className="transport-bpm-display"
            value={bpmInput}
            onChange={e => setBpmInput(e.target.value)}
            onBlur={handleBpmBlur}
            onKeyDown={e => { if (e.key === 'Enter') handleBpmBlur(); if (e.key === 'Escape') { setBpmInput(String(bpm)); setEditingBpm(false); } }}
            autoFocus
            style={{ cursor: 'text', userSelect: 'text', outline: 'none', border: '1px solid var(--px-cyan)', background: 'var(--px-bg2)', color: 'var(--px-cyan)', fontFamily: "'VT323', monospace", fontSize: 20, width: 52, textAlign: 'center' }}
          />
        ) : (
          <div
            className="transport-bpm-display"
            onClick={() => { setBpmInput(String(bpm)); setEditingBpm(true); }}
            title="Click to edit BPM"
          >
            {bpm}
          </div>
        )}
        <button
          className="transport-btn"
          style={{ fontSize: 10 }}
          onClick={() => setBPM(Math.min(300, bpm + 1))}
          title="+1 BPM"
        >▲</button>
        <button
          className="transport-btn"
          style={{ fontSize: 10 }}
          onClick={() => setBPM(Math.max(20, bpm - 1))}
          title="-1 BPM"
        >▼</button>
      </div>

      <div className="taskbar-separator" style={{ height: 20 }} />

      {/* Step indicator — 16 dots represent current bar; red in 32-step 2nd half */}
      <div className="transport-step-display">
        {steps.map(i => {
          // In 32-step mode, map display dot i to the actual step in the current half
          const mappedStep = drumStepCount === 32 ? i + (in32ndHalf ? 16 : 0) : i;
          const isActive = currentStep === mappedStep && isPlaying;
          const isBeat = i % 4 === 0;
          return (
            <div
              key={i}
              className={`transport-step-dot${isActive ? ' active' : ''}`}
              style={{
                ...(isBeat && !isActive ? { background: 'var(--px-text-dim)' } : {}),
                ...(isActive && in32ndHalf ? { background: '#ff4444', boxShadow: '0 0 6px #ff4444' } : {}),
                ...(isBeat && in32ndHalf && !isActive ? { background: '#662222' } : {}),
              }}
            />
          );
        })}
      </div>
      {drumStepCount === 32 && isPlaying && (
        <div style={{ fontSize: 9, color: in32ndHalf ? '#ff4444' : 'var(--px-cyan)', fontFamily: 'monospace', letterSpacing: 1, minWidth: 18, textAlign: 'center' }}>
          {in32ndHalf ? 'B2' : 'B1'}
        </div>
      )}

      <div className="taskbar-separator" style={{ height: 20 }} />

      {/* Loop */}
      <button
        className={`transport-btn${loopEnabled ? ' active' : ''}`}
        onClick={toggleLoop}
        title="Loop"
        style={{ fontSize: 13 }}
      >
        🔁
      </button>

      <div className="taskbar-separator" style={{ height: 20 }} />

      {/* Project name — click to rename */}
      {editingName ? (
        <input
          autoFocus
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onBlur={() => {
            const trimmed = nameInput.trim() || 'Untitled Project';
            setProjectName(trimmed);
            setNameInput(trimmed);
            setEditingName(false);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') { setNameInput(projectName); setEditingName(false); }
          }}
          style={{
            background: 'transparent', border: 'none', borderBottom: '1px solid var(--px-cyan)',
            color: 'var(--px-cyan)', fontSize: 10, fontFamily: "'Share Tech Mono', monospace",
            width: 120, outline: 'none', padding: '0 2px',
          }}
        />
      ) : (
        <span
          className="transport-project-name"
          title="Click to rename"
          style={{ cursor: 'text' }}
          onClick={() => { setNameInput(projectName); setEditingName(true); }}
        >
          {projectName}
        </span>
      )}

      <div className="taskbar-separator" style={{ height: 20 }} />

      {/* Save / Load */}
      <button
        className="transport-btn"
        title="Save Project"
        style={{ fontSize: 11, padding: '2px 8px', color: 'var(--px-cyan)' }}
        onClick={saveProject}
      >
        💾 Save
      </button>
      <button
        className="transport-btn"
        title="Load Project"
        style={{ fontSize: 11, padding: '2px 8px', color: 'var(--px-amber)' }}
        onClick={() => fileInputRef.current?.click()}
      >
        📂 Load
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mos98,.json"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => {
            const text = ev.target?.result;
            if (typeof text === 'string') loadProjectFromJSON(text);
          };
          reader.readAsText(file);
          e.target.value = '';
        }}
      />

      <div className="taskbar-separator" style={{ height: 20 }} />

      {/* CPU */}
      <div className="transport-cpu">
        <span className="transport-label">CPU</span>
        <div className="transport-cpu-bar">
          <div className="transport-cpu-fill" style={{ width: `${cpu}%` }} />
        </div>
        <span style={{ fontSize: 9, color: 'var(--px-text-dim)', fontFamily: 'monospace' }}>
          {cpu.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
