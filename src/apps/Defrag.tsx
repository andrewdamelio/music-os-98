// Defrag.tsx — Windows 98-authentic Disk Defragmenter simulation

import { useState, useRef, useEffect, useCallback } from 'react';

// More blocks, smaller — closer to Win98's dense cluster map
const COLS = 56;
const ROWS = 16;
const TOTAL = COLS * ROWS; // 896 blocks
const BLOCK_W = 8;
const BLOCK_H = 5;
const GAP = 1;

type BlockType = 'empty' | 'used' | 'fragmented' | 'system' | 'active';
type Phase = 'idle' | 'analyzing' | 'defragging' | 'restarting' | 'done';

// Win98-authentic colors on WHITE background
const BLOCK_COLORS: Record<BlockType, string> = {
  empty:      '#ffffff',
  used:       '#0000aa',
  fragmented: '#ff0000',
  system:     '#00aaaa',
  active:     '#00cc00',
};

const CANVAS_W = COLS * (BLOCK_W + GAP) - GAP;
const CANVAS_H = ROWS * (BLOCK_H + GAP) - GAP;

function buildInitialBlocks(): BlockType[] {
  const blocks: BlockType[] = new Array(TOTAL).fill('empty');

  // Dense used block at top (~28%)
  const solidEnd = Math.floor(TOTAL * 0.28);
  for (let i = 0; i < solidEnd; i++) blocks[i] = 'used';

  // System (unmovable) files scattered across first 60%
  for (let i = 0; i < Math.floor(TOTAL * 0.60); i++) {
    if (Math.random() < 0.05) blocks[i] = 'system';
  }

  // Heavy mixed zone 28–60%: lots of fragments + used
  for (let i = solidEnd; i < Math.floor(TOTAL * 0.60); i++) {
    const r = Math.random();
    if (r < 0.42) blocks[i] = 'fragmented';
    else if (r < 0.58) blocks[i] = 'used';
  }

  // Medium zone 60–80%: still plenty of fragments, some gaps
  for (let i = Math.floor(TOTAL * 0.60); i < Math.floor(TOTAL * 0.80); i++) {
    const r = Math.random();
    if (r < 0.30) blocks[i] = 'fragmented';
    else if (r < 0.37) blocks[i] = 'used';
  }

  // Sparse scatter 80–95%: isolated red dots
  for (let i = Math.floor(TOTAL * 0.80); i < Math.floor(TOTAL * 0.95); i++) {
    const r = Math.random();
    if (r < 0.16) blocks[i] = 'fragmented';
    else if (r < 0.19) blocks[i] = 'used';
  }

  // Very sparse tail 95–100%
  for (let i = Math.floor(TOTAL * 0.95); i < TOTAL; i++) {
    if (Math.random() < 0.08) blocks[i] = 'fragmented';
  }

  return blocks;
}

function drawBlocks(ctx: CanvasRenderingContext2D, blocks: BlockType[]) {
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (let i = 0; i < TOTAL; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * (BLOCK_W + GAP);
    const y = row * (BLOCK_H + GAP);
    const t = blocks[i];
    if (t === 'empty') continue; // white on white = skip
    ctx.fillStyle = BLOCK_COLORS[t];
    ctx.fillRect(x, y, BLOCK_W, BLOCK_H);
  }
}

const ANALYZE_STATUSES = [
  'Reading drive C: file allocation table...',
  'Scanning clusters 0–1,024...',
  'Scanning clusters 1,024–2,048...',
  'Scanning clusters 2,048–4,096...',
  'Checking for bad sectors...',
  'Scanning clusters 4,096–8,192...',
  'Analyzing fragmentation...',
  'Building defragmentation map...',
];

const DEFRAG_STATUSES = [
  'Defragmenting drive C:...',
  'Moving file clusters...',
  'Compacting free space...',
  'Moving WINDOWS\\SYSTEM files...',
  'Moving USER.DAT...',
  'Moving SYSTEM.DAT...',
  'Consolidating free space...',
  'Moving temporary files...',
  'Defragmenting...',
  'Moving WIN386.SWP...',
];

// Win98 gray chrome helpers
const w98 = {
  bg: '#c0c0c0',
  border: {
    raised: '2px solid',
    raisedColors: 'white white #808080 #808080',
    sunken: '2px solid',
    sunkenColors: '#808080 #808080 white white',
  },
};

function W98Box({ sunken = false, children, style = {} }: { sunken?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: w98.bg,
      borderStyle: 'solid',
      borderWidth: 2,
      borderColor: sunken ? '#808080 #ffffff #ffffff #808080' : '#ffffff #808080 #808080 #ffffff',
      padding: 4,
      ...style,
    }}>
      {children}
    </div>
  );
}

function W98Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: w98.bg,
        border: '2px solid',
        borderColor: disabled ? '#808080 #808080 #808080 #808080' : '#ffffff #808080 #808080 #ffffff',
        padding: '3px 14px',
        fontFamily: '"Arial", sans-serif',
        fontSize: 11,
        cursor: disabled ? 'default' : 'pointer',
        minWidth: 74,
        color: disabled ? '#808080' : '#000000',
        outline: 'none',
        userSelect: 'none',
      }}
      onMouseDown={e => {
        if (disabled) return;
        const el = e.currentTarget;
        el.style.borderColor = '#808080 #ffffff #ffffff #808080';
        el.style.paddingTop = '4px';
        el.style.paddingLeft = '15px';
      }}
      onMouseUp={e => {
        const el = e.currentTarget;
        el.style.borderColor = '#ffffff #808080 #808080 #ffffff';
        el.style.paddingTop = '3px';
        el.style.paddingLeft = '14px';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.borderColor = disabled ? '#808080 #808080 #808080 #808080' : '#ffffff #808080 #808080 #ffffff';
        el.style.paddingTop = '3px';
        el.style.paddingLeft = '14px';
      }}
    >
      {children}
    </button>
  );
}

const LEGEND: { type: BlockType | 'reading'; label: string }[] = [
  { type: 'used',       label: 'Optimized' },
  { type: 'fragmented', label: 'Fragmented' },
  { type: 'system',     label: 'Unmovable' },
  { type: 'active',     label: 'Reading' },
  { type: 'empty',      label: 'Free space' },
];

export default function Defrag() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blocksRef = useRef<BlockType[]>(buildInitialBlocks());
  const abortRef = useRef(false);
  const restartCountRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [restartMsg, setRestartMsg] = useState('');
  const [drive, setDrive] = useState('C:');

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBlocks(ctx, blocksRef.current);
  }, []);

  useEffect(() => { redraw(); }, [redraw]);

  const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

  const runDefrag = useCallback(async () => {
    abortRef.current = false;
    restartCountRef.current = 0;
    blocksRef.current = buildInitialBlocks();
    redraw();

    // ── ANALYZE ──────────────────────────────────────────────────────────
    setPhase('analyzing');
    setProgress(0);
    setRestartMsg('');

    const batchSize = Math.ceil(TOTAL / 50);
    for (let sweep = 0; sweep < 50; sweep++) {
      if (abortRef.current) return;
      const start = sweep * batchSize;
      const end = Math.min(start + batchSize, TOTAL);
      const saved: BlockType[] = [];
      for (let i = start; i < end; i++) {
        saved.push(blocksRef.current[i]);
        if (blocksRef.current[i] !== 'empty') blocksRef.current[i] = 'active';
      }
      redraw();
      await sleep(50);
      for (let i = start; i < end; i++) blocksRef.current[i] = saved[i - start];
      redraw();
      setStatus(ANALYZE_STATUSES[Math.min(Math.floor(sweep / 50 * ANALYZE_STATUSES.length), ANALYZE_STATUSES.length - 1)]);
      setProgress(Math.floor((sweep / 50) * 100));
    }

    setStatus('Analysis complete.');
    await sleep(700);

    // ── DEFRAG ───────────────────────────────────────────────────────────
    const doDefrag = async (): Promise<boolean> => {
      setPhase('defragging');
      setProgress(0);
      setRestartMsg('');

      const initialFrag = blocksRef.current.filter(b => b === 'fragmented').length;
      let moved = 0;
      let opsSinceRestart = 0;
      let writePos = blocksRef.current.findIndex(b => b === 'empty');

      const nextEmpty = (from: number) => {
        for (let i = from; i < TOTAL; i++) if (blocksRef.current[i] === 'empty') return i;
        return -1;
      };
      const nextFrag = () => {
        for (let i = TOTAL - 1; i >= writePos; i--) if (blocksRef.current[i] === 'fragmented') return i;
        return -1;
      };

      while (true) {
        if (abortRef.current) return false;
        const readPos = nextFrag();
        if (readPos === -1 || writePos === -1 || readPos <= writePos) break;

        opsSinceRestart++;
        const pct = moved / Math.max(initialFrag, 1);
        if (restartCountRef.current < 2 && pct > 0.18 && opsSinceRestart > 10 && Math.random() < 0.015) {
          restartCountRef.current++;
          setPhase('restarting');
          setRestartMsg('Windows has determined that another program has written to drive ' + drive + '.\nDefragmenter must start over.');
          setStatus('Defragmenter must start over.');
          await sleep(3500);
          return false;
        }

        // Read
        const origRead = blocksRef.current[readPos];
        blocksRef.current[readPos] = 'active';
        redraw();
        await sleep(40 + Math.random() * 35);

        // Write
        blocksRef.current[readPos] = 'empty';
        blocksRef.current[writePos] = 'active';
        redraw();
        await sleep(30 + Math.random() * 25);

        blocksRef.current[writePos] = 'used';
        redraw();

        moved++;
        opsSinceRestart++;
        setProgress(Math.min(99, Math.floor((moved / initialFrag) * 100)));
        setStatus(DEFRAG_STATUSES[Math.floor(Math.random() * DEFRAG_STATUSES.length)]);
        writePos = nextEmpty(writePos + 1);
        if (writePos === -1) break;
      }
      return true;
    };

    let done = false;
    while (!done && !abortRef.current) {
      done = await doDefrag();
      if (!done && !abortRef.current) await sleep(400);
    }
    if (abortRef.current) return;

    setPhase('done');
    setProgress(100);
    setStatus('Defragmentation of drive ' + drive + ' is complete.');
    setRestartMsg('');
  }, [redraw, drive]);

  const handleStop = () => {
    abortRef.current = true;
    setPhase('idle');
    setProgress(0);
    setStatus('');
    setRestartMsg('');
    blocksRef.current = buildInitialBlocks();
    redraw();
  };

  const running = phase === 'analyzing' || phase === 'defragging' || phase === 'restarting';

  return (
    <div style={{
      background: w98.bg,
      fontFamily: '"Arial", sans-serif',
      fontSize: 11,
      color: '#000000',
      padding: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      height: '100%',
      boxSizing: 'border-box',
    }}>

      {/* Drive row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Drive:</span>
        <select
          value={drive}
          onChange={e => setDrive(e.target.value)}
          disabled={running}
          style={{
            background: '#ffffff', border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080',
            fontFamily: '"Arial", sans-serif', fontSize: 11, padding: '1px 4px',
          }}
        >
          <option>C:</option>
          <option>D:</option>
        </select>
      </div>

      {/* Cluster map — sunken white box, grows to fill available space */}
      <div style={{
        border: '2px solid',
        borderColor: '#808080 #ffffff #ffffff #808080',
        background: '#ffffff',
        padding: 2,
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: 'block' }}
        />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', padding: '2px 0' }}>
        {LEGEND.map(({ type, label }) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{
              width: 14, height: 9,
              background: BLOCK_COLORS[type as BlockType],
              border: '1px solid #808080',
            }} />
            <span style={{ fontSize: 10 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Restart warning */}
      {restartMsg && (
        <div style={{
          border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080',
          background: '#ffffff', padding: '4px 6px', fontSize: 11,
          color: '#000080', whiteSpace: 'pre-wrap',
        }}>
          ⚠ {restartMsg}
        </div>
      )}

      {/* Status bar */}
      <div style={{
        border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080',
        background: '#ffffff', padding: '2px 4px', minHeight: 18, fontSize: 11,
      }}>
        {status || '\u00a0'}
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          flex: 1, height: 16,
          border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080',
          background: '#ffffff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progress}%`,
            background: phase === 'done' ? '#000080' : '#000080',
            transition: 'width 0.15s',
          }}>
            {progress > 5 && (
              <span style={{
                position: 'absolute', left: 4, top: 0, bottom: 0,
                display: 'flex', alignItems: 'center',
                color: '#ffffff', fontSize: 10,
              }}>
                {progress}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 2 }}>
        <W98Btn onClick={runDefrag} disabled={running}>
          {phase === 'done' ? 'Run Again' : 'Start'}
        </W98Btn>
        <W98Btn onClick={handleStop} disabled={!running}>
          Stop
        </W98Btn>
        <W98Btn disabled>
          Settings...
        </W98Btn>
      </div>
    </div>
  );
}
