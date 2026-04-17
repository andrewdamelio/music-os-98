// Minesweeper — Windows 95 style (authentic rules + visuals)
// Three difficulties + custom. First click is always safe (and its 3×3 zone).
// Left-click reveals, right-click cycles flag → question → hidden, chord (both buttons
// or middle-click) on a satisfied numbered cell reveals its unflagged neighbors.

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useOSStore } from '../store';

// ── Types ────────────────────────────────────────────────────────────────────
type CellState = 'hidden' | 'revealed' | 'flag' | 'question';

interface Cell {
  state: CellState;
  mine: boolean;
  adj: number;
  exploded?: boolean;
  wrongFlag?: boolean;
}

type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'custom';
type GameStatus = 'ready' | 'playing' | 'won' | 'dead';
type FaceState = 'play' | 'pressed' | 'won' | 'dead';

const CONFIGS: Record<'beginner' | 'intermediate' | 'expert', { rows: number; cols: number; mines: number }> = {
  beginner:     { rows: 9,  cols: 9,  mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert:       { rows: 16, cols: 30, mines: 99 },
};

const CELL = 16;
const BG = '#c0c0c0';
const DARK = '#808080';
const LIGHT = '#ffffff';

const NUM_COLORS = [
  '',         // 0 — unused
  '#0000ff',  // 1 blue
  '#007b00',  // 2 green
  '#ff0000',  // 3 red
  '#00007b',  // 4 navy
  '#7b0000',  // 5 maroon
  '#007b7b',  // 6 teal
  '#000000',  // 7 black
  '#7b7b7b',  // 8 grey
] as const;

// ── Board logic ──────────────────────────────────────────────────────────────
function makeEmpty(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ state: 'hidden' as CellState, mine: false, adj: 0 })),
  );
}

function placeMines(rows: number, cols: number, mineCount: number, safeR: number, safeC: number): Cell[][] {
  const total = rows * cols;
  // Forbid the clicked cell + its 8 neighbors (so the first click opens a pocket).
  const forbidden = new Set<number>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = safeR + dr, c = safeC + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) forbidden.add(r * cols + c);
    }
  }
  // If there aren't enough non-forbidden squares (pathological custom game), only protect the clicked cell.
  let pool: number[] = [];
  for (let i = 0; i < total; i++) if (!forbidden.has(i)) pool.push(i);
  if (pool.length < mineCount) {
    forbidden.clear();
    forbidden.add(safeR * cols + safeC);
    pool = [];
    for (let i = 0; i < total; i++) if (!forbidden.has(i)) pool.push(i);
  }
  // Fisher–Yates partial shuffle to pick `mineCount` positions.
  for (let i = 0; i < mineCount && i < pool.length; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const mines = new Set(pool.slice(0, mineCount));

  const board = makeEmpty(rows, cols);
  for (const idx of mines) {
    board[Math.floor(idx / cols)][idx % cols].mine = true;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) n++;
        }
      }
      board[r][c].adj = n;
    }
  }
  return board;
}

function cloneBoard(b: Cell[][]): Cell[][] {
  return b.map(row => row.map(c => ({ ...c })));
}

function floodReveal(board: Cell[][], sr: number, sc: number): Cell[][] {
  const rows = board.length, cols = board[0].length;
  const next = cloneBoard(board);
  const stack: Array<[number, number]> = [[sr, sc]];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    const cell = next[r][c];
    if (cell.state === 'revealed' || cell.state === 'flag') continue;
    if (cell.mine) continue;
    cell.state = 'revealed';
    if (cell.adj === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const nb = next[nr][nc];
            if (nb.state === 'hidden' || nb.state === 'question') stack.push([nr, nc]);
          }
        }
      }
    }
  }
  return next;
}

function revealAllMines(board: Cell[][], lostR: number, lostC: number): Cell[][] {
  const next = cloneBoard(board);
  for (let r = 0; r < next.length; r++) {
    for (let c = 0; c < next[r].length; c++) {
      const cell = next[r][c];
      if (cell.mine && cell.state !== 'flag') {
        cell.state = 'revealed';
        if (r === lostR && c === lostC) cell.exploded = true;
      } else if (!cell.mine && cell.state === 'flag') {
        cell.wrongFlag = true;
      }
    }
  }
  return next;
}

function flagAllMines(board: Cell[][]): Cell[][] {
  const next = cloneBoard(board);
  for (const row of next) for (const c of row) if (c.mine && c.state !== 'flag') c.state = 'flag';
  return next;
}

function allSafeRevealed(board: Cell[][]): boolean {
  for (const row of board) for (const c of row) if (!c.mine && c.state !== 'revealed') return false;
  return true;
}

function countFlags(board: Cell[][]): number {
  let n = 0;
  for (const row of board) for (const c of row) if (c.state === 'flag') n++;
  return n;
}

// ── LCD 3-digit display ──────────────────────────────────────────────────────
const SEG: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
  '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  '-': 'g', ' ': '',
};

function LCDDigit({ char }: { char: string }) {
  const on = SEG[char] || '';
  const ON = '#ff0000', OFF = '#380000';
  const fill = (k: string) => (on.includes(k) ? ON : OFF);
  return (
    <svg width={13} height={23} style={{ display: 'block' }}>
      <rect width={13} height={23} fill="#000" />
      <path d="M2,1 L11,1 L9,3 L4,3 Z"   fill={fill('a')} />
      <path d="M11,2 L11,10 L9,8 L9,4 Z"   fill={fill('b')} />
      <path d="M11,13 L11,21 L9,19 L9,15 Z" fill={fill('c')} />
      <path d="M2,22 L11,22 L9,20 L4,20 Z"  fill={fill('d')} />
      <path d="M2,13 L4,15 L4,19 L2,21 Z"   fill={fill('e')} />
      <path d="M2,2 L4,4 L4,8 L2,10 Z"      fill={fill('f')} />
      <path d="M3,11.5 L4,10.5 L9,10.5 L10,11.5 L9,12.5 L4,12.5 Z" fill={fill('g')} />
    </svg>
  );
}

function LCDDisplay({ value }: { value: number }) {
  const v = Math.max(-99, Math.min(999, value));
  let text: string;
  if (v < 0) text = '-' + String(Math.abs(v)).padStart(2, '0');
  else text = String(v).padStart(3, '0');
  return (
    <div style={{
      display: 'flex',
      border: '1px solid',
      borderColor: `${DARK} ${LIGHT} ${LIGHT} ${DARK}`,
      background: '#000',
    }}>
      {text.split('').map((d, i) => <LCDDigit key={i} char={d} />)}
    </div>
  );
}

// ── Smiley ────────────────────────────────────────────────────────────────────
function Smiley({ state, down, onClick, onMouseDown, onMouseUp, onMouseLeave }: {
  state: FaceState;
  down: boolean;
  onClick: () => void;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}) {
  const size = 26;
  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onContextMenu={e => e.preventDefault()}
      style={{
        width: size, height: size,
        background: BG,
        border: '2px solid',
        borderColor: down
          ? `${DARK} ${LIGHT} ${LIGHT} ${DARK}`
          : `${LIGHT} ${DARK} ${DARK} ${LIGHT}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <SmileyFace state={state} size={down ? 16 : 18} />
    </div>
  );
}

function SmileyFace({ state, size }: { state: FaceState; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
      <circle cx={10} cy={10} r={9} fill="#ffff00" stroke="#000" strokeWidth={1} />
      {state === 'dead' ? (
        <>
          <path d="M4,5 L8,9 M8,5 L4,9" stroke="#000" strokeWidth={1.3} strokeLinecap="round" />
          <path d="M12,5 L16,9 M16,5 L12,9" stroke="#000" strokeWidth={1.3} strokeLinecap="round" />
          <path d="M5.5,15 Q10,11 14.5,15" stroke="#000" strokeWidth={1.2} fill="none" />
        </>
      ) : state === 'won' ? (
        <>
          <rect x={2.5} y={6.5} width={5.5} height={3} fill="#000" />
          <rect x={12} y={6.5} width={5.5} height={3} fill="#000" />
          <path d="M8,7.7 L12,7.7" stroke="#000" strokeWidth={0.8} />
          <path d="M2.5,7.7 L1,7.7" stroke="#000" strokeWidth={0.8} />
          <path d="M17.5,7.7 L19,7.7" stroke="#000" strokeWidth={0.8} />
          <path d="M5.5,12 Q10,16 14.5,12" stroke="#000" strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </>
      ) : state === 'pressed' ? (
        <>
          <circle cx={7} cy={8} r={1.1} fill="#000" />
          <circle cx={13} cy={8} r={1.1} fill="#000" />
          <circle cx={10} cy={13} r={2} stroke="#000" strokeWidth={1} fill="none" />
        </>
      ) : (
        <>
          <circle cx={7} cy={8} r={1.1} fill="#000" />
          <circle cx={13} cy={8} r={1.1} fill="#000" />
          <path d="M5.5,12 Q10,16 14.5,12" stroke="#000" strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// ── Cell glyphs ──────────────────────────────────────────────────────────────
function MineGlyph({ exploded }: { exploded?: boolean }) {
  return (
    <svg width={12} height={12} viewBox="0 0 10 10" style={{ display: 'block' }}>
      {exploded && <rect width={10} height={10} fill="#ff0000" />}
      <path d="M5,0.5 L5,9.5 M0.5,5 L9.5,5 M1.7,1.7 L8.3,8.3 M8.3,1.7 L1.7,8.3"
        stroke="#000" strokeWidth={1} />
      <circle cx={5} cy={5} r={2.6} fill="#000" />
      <rect x={3.6} y={3.6} width={1.1} height={1.1} fill="#fff" />
    </svg>
  );
}

function FlagGlyph() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" style={{ display: 'block' }}>
      <path d="M3,1 L9,3.5 L3,6 Z" fill="#ff0000" />
      <path d="M3,1 L3,9" stroke="#000" strokeWidth={1} />
      <rect x={1} y={9} width={8} height={1.5} fill="#000" />
      <rect x={0.5} y={10.5} width={9} height={1.5} fill="#000" />
    </svg>
  );
}

function WrongFlagGlyph() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" style={{ display: 'block' }}>
      <circle cx={6} cy={6} r={2.6} fill="#000" />
      <path d="M0,0 L12,12 M12,0 L0,12" stroke="#ff0000" strokeWidth={1.5} />
    </svg>
  );
}

// ── Single cell ──────────────────────────────────────────────────────────────
interface CellBoxProps {
  cell: Cell;
  pressed: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function CellBox({ cell, pressed, onMouseDown, onMouseUp, onMouseEnter, onContextMenu }: CellBoxProps) {
  const revealed = cell.state === 'revealed';
  const showAsPressed = pressed && cell.state !== 'flag' && !revealed;

  let borders: React.CSSProperties;
  if (revealed || showAsPressed) {
    // Flat sunken look: single 1px dark line on top/left, rest bg
    borders = {
      borderTop: `1px solid ${DARK}`,
      borderLeft: `1px solid ${DARK}`,
      borderRight: `1px solid ${BG}`,
      borderBottom: `1px solid ${BG}`,
    };
  } else {
    // Raised look: 2px bevel
    borders = {
      borderTop: `2px solid ${LIGHT}`,
      borderLeft: `2px solid ${LIGHT}`,
      borderRight: `2px solid ${DARK}`,
      borderBottom: `2px solid ${DARK}`,
    };
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseEnter={onMouseEnter}
      onContextMenu={onContextMenu}
      style={{
        width: CELL, height: CELL,
        boxSizing: 'border-box',
        background: cell.exploded ? '#ff0000' : BG,
        ...borders,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'default',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {renderCellBody(cell)}
    </div>
  );
}

function renderCellBody(cell: Cell) {
  if (cell.wrongFlag) return <WrongFlagGlyph />;
  if (cell.state === 'flag') return <FlagGlyph />;
  if (cell.state === 'question') {
    return (
      <span style={{
        color: '#000', fontWeight: 'bold', fontSize: 13, lineHeight: 1,
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
      }}>?</span>
    );
  }
  if (cell.state === 'revealed') {
    if (cell.mine) return <MineGlyph exploded={cell.exploded} />;
    if (cell.adj === 0) return null;
    return (
      <span style={{
        color: NUM_COLORS[cell.adj],
        fontWeight: 'bold', fontSize: 13, lineHeight: 1,
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
      }}>
        {cell.adj}
      </span>
    );
  }
  return null;
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [custom, setCustom] = useState({ rows: 16, cols: 16, mines: 40 });
  const [useMarks, setUseMarks] = useState(true);

  const { rows, cols, mines } = useMemo(() => {
    if (difficulty === 'custom') return custom;
    return CONFIGS[difficulty];
  }, [difficulty, custom]);

  const [board, setBoard] = useState<Cell[][]>(() => makeEmpty(rows, cols));
  const [status, setStatus] = useState<GameStatus>('ready');
  const [seconds, setSeconds] = useState(0);
  const [faceDown, setFaceDown] = useState(false);
  const [showMenu, setShowMenu] = useState<null | 'game' | 'help'>(null);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [bestTimes, setBestTimes] = useState<Record<'beginner' | 'intermediate' | 'expert', number>>(() => {
    try {
      const raw = localStorage.getItem('minesweeper_best');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { beginner: 999, intermediate: 999, expert: 999 };
  });

  // Mouse tracking for press-down visuals and chord detection
  const pressedCell = useRef<{ r: number; c: number } | null>(null);
  const buttonsDown = useRef<number>(0); // bitmask: 1=left, 2=right
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [chordCells, setChordCells] = useState<Set<string>>(new Set());

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => setSeconds(s => (s < 999 ? s + 1 : s)), 1000);
    return () => clearInterval(id);
  }, [status]);

  // ── Reset board on size change ──────────────────────────────────────────────
  useEffect(() => {
    setBoard(makeEmpty(rows, cols));
    setStatus('ready');
    setSeconds(0);
  }, [rows, cols, mines]);

  const newGame = useCallback(() => {
    setBoard(makeEmpty(rows, cols));
    setStatus('ready');
    setSeconds(0);
    setFaceDown(false);
    pressedCell.current = null;
    buttonsDown.current = 0;
    setPressedKey(null);
    setChordCells(new Set());
  }, [rows, cols]);

  // ── Win check & best-time save ──────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing') return;
    if (allSafeRevealed(board)) {
      setBoard(b => flagAllMines(b));
      setStatus('won');
      if (difficulty !== 'custom') {
        setBestTimes(prev => {
          const t = seconds;
          if (t >= prev[difficulty]) return prev;
          const next = { ...prev, [difficulty]: t };
          try { localStorage.setItem('minesweeper_best', JSON.stringify(next)); } catch {}
          return next;
        });
      }
    }
  }, [board, status, difficulty, seconds]);

  // ── Cell interaction ────────────────────────────────────────────────────────
  const chordNeighborKeys = useCallback((r: number, c: number): Set<string> => {
    const s = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) s.add(`${nr},${nc}`);
      }
    }
    s.add(`${r},${c}`);
    return s;
  }, [rows, cols]);

  const startChordHighlight = useCallback((r: number, c: number) => {
    const cell = board[r]?.[c];
    if (cell && cell.state === 'revealed' && cell.adj > 0) {
      setChordCells(chordNeighborKeys(r, c));
    } else {
      setPressedKey(`${r},${c}`);
    }
  }, [board, chordNeighborKeys]);

  const handleMouseDownCell = (r: number, c: number, btn: number) => {
    if (status === 'won' || status === 'dead') return;
    if (btn === 0) buttonsDown.current |= 1;
    else if (btn === 2) buttonsDown.current |= 2;
    else if (btn === 1) buttonsDown.current |= 4;
    pressedCell.current = { r, c };
    // Smiley only goes "o-face" pressed on left-click or chord/middle-click — not plain right-click.
    if (btn !== 2 || (buttonsDown.current & 1)) setFaceDown(true);

    // Chord if both left+right are down, OR middle button
    if ((buttonsDown.current & 3) === 3 || (buttonsDown.current & 4) !== 0) {
      startChordHighlight(r, c);
    } else if (btn === 0) {
      // Left-click-only press: highlight just this cell
      const cell = board[r][c];
      if (cell.state === 'hidden' || cell.state === 'question') {
        setPressedKey(`${r},${c}`);
      }
    }
  };

  const handleMouseEnterCell = (r: number, c: number) => {
    if (buttonsDown.current === 0) return;
    pressedCell.current = { r, c };
    if ((buttonsDown.current & 3) === 3 || (buttonsDown.current & 4) !== 0) {
      startChordHighlight(r, c);
    } else if (buttonsDown.current & 1) {
      const cell = board[r][c];
      if (cell.state === 'hidden' || cell.state === 'question') {
        setPressedKey(`${r},${c}`);
        setChordCells(new Set());
      } else {
        setPressedKey(null);
        setChordCells(new Set());
      }
    }
  };

  const revealAt = (r: number, c: number) => {
    setBoard(prev => {
      let b = prev;
      if (status === 'ready') {
        b = placeMines(rows, cols, mines, r, c);
      }
      const cell = b[r][c];
      if (cell.state === 'flag' || cell.state === 'revealed') return b;
      if (cell.mine) {
        setStatus('dead');
        return revealAllMines(b, r, c);
      }
      const next = floodReveal(b, r, c);
      if (status === 'ready') setStatus('playing');
      return next;
    });
  };

  const chordReveal = (r: number, c: number) => {
    setBoard(prev => {
      const cell = prev[r][c];
      if (cell.state !== 'revealed' || cell.adj === 0) return prev;
      let flagCount = 0;
      const toReveal: Array<[number, number]> = [];
      let hitMine: [number, number] | null = null;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const nb = prev[nr][nc];
          if (nb.state === 'flag') flagCount++;
          else if (nb.state === 'hidden' || nb.state === 'question') {
            toReveal.push([nr, nc]);
            if (nb.mine && hitMine === null) hitMine = [nr, nc];
          }
        }
      }
      if (flagCount !== cell.adj) return prev;
      if (hitMine) {
        setStatus('dead');
        return revealAllMines(prev, hitMine[0], hitMine[1]);
      }
      let b = prev;
      for (const [nr, nc] of toReveal) b = floodReveal(b, nr, nc);
      return b;
    });
  };

  const handleMouseUpCell = (r: number, c: number, btn: number) => {
    if (status === 'won' || status === 'dead') {
      buttonsDown.current = 0;
      setFaceDown(false);
      setPressedKey(null);
      setChordCells(new Set());
      return;
    }
    const wasBoth = (buttonsDown.current & 3) === 3;
    const wasMiddle = (buttonsDown.current & 4) !== 0;
    if (btn === 0) buttonsDown.current &= ~1;
    else if (btn === 2) buttonsDown.current &= ~2;
    else if (btn === 1) buttonsDown.current &= ~4;

    // Chord completion: any button released while both were held, or middle button released
    if (wasBoth || wasMiddle) {
      if (pressedCell.current) {
        const { r: cr, c: cc } = pressedCell.current;
        chordReveal(cr, cc);
      }
    } else if (btn === 0) {
      // Plain left-click release — reveal if we're still over the same cell
      if (pressedCell.current && pressedCell.current.r === r && pressedCell.current.c === c) {
        revealAt(r, c);
      }
    }

    if (buttonsDown.current === 0) {
      setFaceDown(false);
      setPressedKey(null);
      setChordCells(new Set());
      pressedCell.current = null;
    }
  };

  const handleRightDown = (r: number, c: number) => {
    // Right-click only cycles flag state on click-down, when left is NOT also held (that's chord prep).
    if (status === 'won' || status === 'dead') return;
    if (buttonsDown.current & 1) return; // chord prep, not flag toggle
    setBoard(prev => {
      const next = cloneBoard(prev);
      const cell = next[r][c];
      if (cell.state === 'revealed') return prev;
      if (cell.state === 'hidden') cell.state = 'flag';
      else if (cell.state === 'flag') cell.state = useMarks ? 'question' : 'hidden';
      else if (cell.state === 'question') cell.state = 'hidden';
      return next;
    });
    if (status === 'ready') setStatus('playing');
  };

  // Reset button-state if mouse leaves the board entirely
  const handleBoardLeave = () => {
    if (buttonsDown.current === 0) return;
    setPressedKey(null);
    setChordCells(new Set());
  };

  // Global mouseup safety net — if user releases outside any cell
  useEffect(() => {
    const up = () => {
      if (buttonsDown.current === 0) return;
      buttonsDown.current = 0;
      setFaceDown(false);
      setPressedKey(null);
      setChordCells(new Set());
      pressedCell.current = null;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  // Resize the containing window to match the current board size — authentic
  // Win95 Minesweeper auto-resizes when difficulty changes.
  useEffect(() => {
    const width  = cols * CELL + 40;  // board + frame + window chrome slack
    const height = rows * CELL + 130; // board + panel + menu + titlebar slack
    const { windows, resizeWindow } = useOSStore.getState();
    const win = windows.find(w => w.appId === 'minesweeper');
    if (win) resizeWindow(win.instanceId, width, height);
  }, [rows, cols]);

  // F2 = new game (authentic Minesweeper shortcut)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'F2') { e.preventDefault(); newGame(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [newGame]);

  const minesLeft = mines - countFlags(board);

  const faceState: FaceState =
    status === 'dead' ? 'dead'
    : status === 'won' ? 'won'
    : faceDown && (buttonsDown.current !== 0) ? 'pressed'
    : 'play';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={() => setShowMenu(null)}
      style={{
        height: '100%',
        background: BG,
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        fontSize: 11,
        display: 'flex', flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Menu bar */}
      <div style={{
        display: 'flex', gap: 0,
        background: BG,
        borderBottom: `1px solid ${DARK}`,
        padding: '1px 2px',
        flexShrink: 0,
      }}>
        <MenuBarItem label="Game" open={showMenu === 'game'} onToggle={() => setShowMenu(m => m === 'game' ? null : 'game')}>
          <MenuDropdown>
            <MenuItem label="New" shortcut="F2" onClick={() => { newGame(); setShowMenu(null); }} />
            <MenuSep />
            <MenuItem label="Beginner" check={difficulty === 'beginner'} onClick={() => { setDifficulty('beginner'); setShowMenu(null); }} />
            <MenuItem label="Intermediate" check={difficulty === 'intermediate'} onClick={() => { setDifficulty('intermediate'); setShowMenu(null); }} />
            <MenuItem label="Expert" check={difficulty === 'expert'} onClick={() => { setDifficulty('expert'); setShowMenu(null); }} />
            <MenuItem label="Custom..." check={difficulty === 'custom'} onClick={() => { setShowCustomDialog(true); setShowMenu(null); }} />
            <MenuSep />
            <MenuItem label="Marks (?)" check={useMarks} onClick={() => { setUseMarks(v => !v); setShowMenu(null); }} />
            <MenuSep />
            <MenuItem label="Best Times..." onClick={() => {
              setShowMenu(null);
              const b = bestTimes;
              alert(
                `Beginner:     ${b.beginner >= 999 ? '—' : b.beginner + ' sec'}\n` +
                `Intermediate: ${b.intermediate >= 999 ? '—' : b.intermediate + ' sec'}\n` +
                `Expert:       ${b.expert >= 999 ? '—' : b.expert + ' sec'}`,
              );
            }} />
          </MenuDropdown>
        </MenuBarItem>
        <MenuBarItem label="Help" open={showMenu === 'help'} onToggle={() => setShowMenu(m => m === 'help' ? null : 'help')}>
          <MenuDropdown>
            <MenuItem label="About Minesweeper" onClick={() => {
              setShowMenu(null);
              alert('Minesweeper\n\nReveal all non-mine cells to win.\n\nLeft-click: reveal\nRight-click: flag / question\nMiddle-click or Left+Right: chord reveal');
            }} />
          </MenuDropdown>
        </MenuBarItem>
      </div>

      {/* Main game frame (outer raised bevel) */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 6,
        background: BG,
      }}>
        <div style={{
          display: 'inline-block',
          background: BG,
          border: '3px solid',
          borderColor: `${LIGHT} ${DARK} ${DARK} ${LIGHT}`,
          padding: 6,
        }}>
          {/* Status panel (sunken) */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '3px 6px',
            background: BG,
            border: '2px solid',
            borderColor: `${DARK} ${LIGHT} ${LIGHT} ${DARK}`,
            marginBottom: 6,
          }}>
            <LCDDisplay value={minesLeft} />
            <Smiley
              state={faceState}
              down={faceDown && buttonsDown.current !== 0}
              onClick={newGame}
              onMouseDown={() => setFaceDown(true)}
              onMouseUp={() => setFaceDown(false)}
              onMouseLeave={() => setFaceDown(false)}
            />
            <LCDDisplay value={seconds} />
          </div>

          {/* Grid (sunken) */}
          <div
            onMouseLeave={handleBoardLeave}
            style={{
              display: 'inline-block',
              border: '3px solid',
              borderColor: `${DARK} ${LIGHT} ${LIGHT} ${DARK}`,
              background: BG,
            }}
          >
            {board.map((row, r) => (
              <div key={r} style={{ display: 'flex', height: CELL }}>
                {row.map((cell, c) => {
                  const key = `${r},${c}`;
                  const isPressed = pressedKey === key || chordCells.has(key);
                  return (
                    <CellBox
                      key={c}
                      cell={cell}
                      pressed={isPressed}
                      onMouseDown={e => { e.preventDefault(); handleMouseDownCell(r, c, e.button); }}
                      onMouseUp={e => { e.preventDefault(); handleMouseUpCell(r, c, e.button); }}
                      onMouseEnter={() => handleMouseEnterCell(r, c)}
                      onContextMenu={e => { e.preventDefault(); handleRightDown(r, c); }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom difficulty dialog */}
      {showCustomDialog && (
        <CustomDialog
          initial={custom}
          onCancel={() => setShowCustomDialog(false)}
          onOK={(next) => {
            setCustom(next);
            setDifficulty('custom');
            setShowCustomDialog(false);
          }}
        />
      )}
    </div>
  );
}

// ── Menu bits ────────────────────────────────────────────────────────────────
function MenuBarItem({ label, open, onToggle, children }: {
  label: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onToggle(); }}
      style={{
        padding: '2px 8px',
        position: 'relative',
        cursor: 'default',
        background: open ? '#000080' : 'transparent',
        color: open ? '#fff' : '#000',
      }}
    >
      <span style={{ textDecoration: 'underline' }}>{label[0]}</span>{label.slice(1)}
      {open && children}
    </div>
  );
}

function MenuDropdown({ children }: { children: React.ReactNode }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '100%', left: 0,
        minWidth: 160,
        background: BG,
        border: '2px solid',
        borderColor: `${LIGHT} ${DARK} ${DARK} ${LIGHT}`,
        boxShadow: '2px 2px 3px rgba(0,0,0,0.4)',
        color: '#000',
        zIndex: 100,
        padding: 2,
      }}
    >
      {children}
    </div>
  );
}

function MenuItem({ label, shortcut, check, onClick }: {
  label: string; shortcut?: string; check?: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.background = '#000080'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; }}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '2px 18px 2px 20px',
        fontSize: 11, cursor: 'default',
        position: 'relative',
      }}
    >
      {check && <span style={{ position: 'absolute', left: 6 }}>✓</span>}
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && <span style={{ marginLeft: 18, opacity: 0.75 }}>{shortcut}</span>}
    </div>
  );
}

function MenuSep() {
  return <div style={{ height: 0, borderTop: `1px solid ${DARK}`, borderBottom: `1px solid ${LIGHT}`, margin: '3px 2px' }} />;
}

// ── Custom difficulty dialog ────────────────────────────────────────────────
function CustomDialog({ initial, onOK, onCancel }: {
  initial: { rows: number; cols: number; mines: number };
  onOK: (v: { rows: number; cols: number; mines: number }) => void;
  onCancel: () => void;
}) {
  const [h, setH] = useState(String(initial.rows));
  const [w, setW] = useState(String(initial.cols));
  const [m, setM] = useState(String(initial.mines));
  const submit = () => {
    const rows = Math.max(8, Math.min(24, parseInt(h) || 16));
    const cols = Math.max(8, Math.min(30, parseInt(w) || 16));
    // Leave at least 9 non-mine cells for a valid safe-zone start
    const maxMines = Math.max(1, rows * cols - 9);
    const mines = Math.max(1, Math.min(maxMines, parseInt(m) || 10));
    onOK({ rows, cols, mines });
  };
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.2)', zIndex: 500,
    }}>
      <div style={{
        background: BG,
        border: '2px solid',
        borderColor: `${LIGHT} ${DARK} ${DARK} ${LIGHT}`,
        boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
        minWidth: 240,
      }}>
        <div style={{
          background: 'linear-gradient(90deg, #000080, #1084d0)',
          color: '#fff', padding: '3px 6px', fontSize: 11, fontWeight: 'bold',
        }}>
          Custom Field
        </div>
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'center' }}>
          <label>Height:</label>
          <input value={h} onChange={e => setH(e.target.value)} style={dlgInput} />
          <label>Width:</label>
          <input value={w} onChange={e => setW(e.target.value)} style={dlgInput} />
          <label>Mines:</label>
          <input value={m} onChange={e => setM(e.target.value)} style={dlgInput} />
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', padding: '0 12px 12px' }}>
          <button onClick={submit} style={dlgBtn}>OK</button>
          <button onClick={onCancel} style={dlgBtn}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const dlgInput: React.CSSProperties = {
  padding: '1px 3px', fontSize: 11, width: 60,
  border: '1px solid', borderColor: `${DARK} ${LIGHT} ${LIGHT} ${DARK}`,
  background: '#fff',
};

const dlgBtn: React.CSSProperties = {
  padding: '2px 16px', fontSize: 11,
  background: BG,
  border: '2px solid',
  borderColor: `${LIGHT} ${DARK} ${DARK} ${LIGHT}`,
  cursor: 'pointer',
  minWidth: 64,
};

// ── Icon export (for the desktop) ────────────────────────────────────────────
export function MinesweeperIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      {/* Grey tile background with raised bevel — mirrors an unrevealed cell */}
      <rect x={0} y={0} width={32} height={32} fill="#c0c0c0" />
      <path d="M0,0 H32 V3 H3 V32 H0 Z" fill="#ffffff" />
      <path d="M32,0 V32 H0 V29 H29 V0 Z" fill="#808080" />
      {/* Mine spikes (cross + X) */}
      <g stroke="#000" strokeWidth={2.5} strokeLinecap="square">
        <line x1={16} y1={4} x2={16} y2={28} />
        <line x1={4} y1={16} x2={28} y2={16} />
        <line x1={7} y1={7} x2={25} y2={25} />
        <line x1={25} y1={7} x2={7} y2={25} />
      </g>
      {/* Mine body */}
      <circle cx={16} cy={16} r={8} fill="#000000" />
      {/* Shine */}
      <rect x={12} y={12} width={3} height={3} fill="#ffffff" />
    </svg>
  );
}
