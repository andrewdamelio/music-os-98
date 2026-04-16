// FreeCell — Windows 95 style
// Classic MS FreeCell LCG deal: game #1 matches the original exactly.
// Click-to-select + click-to-place (era-accurate, no drag needed).

import { useState, useCallback, useEffect, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Suit = 0 | 1 | 2 | 3; // Clubs, Diamonds, Hearts, Spades
interface Card { suit: Suit; rank: number; }

const SUIT_SYM = ['♣', '♦', '♥', '♠'] as const;
const SUIT_COL = ['#000000', '#cc0000', '#cc0000', '#000000'] as const;
const RANK_LBL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

const CW = 71;   // card width px
const CH = 96;   // card height px
const STRIDE = CW + 10;  // 81px per column (card + gap)
const PAD = 11;           // outer padding
const STACK_DY = 20;      // px offset per stacked card
const FELT = '#007000';
const FELT_DARK = '#005800';

// ── MS FreeCell LCG ───────────────────────────────────────────────────────────
function dealGame(seed: number): Card[][] {
  let s = (seed >>> 0);
  const next = () => {
    s = ((Math.imul(214013, s) + 2531011) & 0x7fffffff) >>> 0;
    return (s >> 16) & 0x7fff;
  };
  // Standard deck: suit = i%4, rank = floor(i/4)+1
  const deck: Card[] = Array.from({ length: 52 }, (_, i) => ({
    suit: (i % 4) as Suit,
    rank: Math.floor(i / 4) + 1,
  }));
  for (let i = 51; i > 0; i--) {
    const j = next() % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const cols: Card[][] = Array.from({ length: 8 }, () => []);
  for (let i = 0; i < 52; i++) cols[i % 8].push(deck[i]);
  return cols;
}

// ── Game logic ────────────────────────────────────────────────────────────────
const isRed = (s: Suit) => s === 1 || s === 2;

function emptyFC(fc: (Card | null)[]) { return fc.filter(c => c === null).length; }
function emptyTabs(tab: Card[][], skip = -1) { return tab.filter((c, i) => i !== skip && c.length === 0).length; }

function isValidSeq(cards: Card[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    if (isRed(cards[i].suit) === isRed(cards[i + 1].suit)) return false;
    if (cards[i].rank !== cards[i + 1].rank + 1) return false;
  }
  return true;
}

function canLandOnTab(bottom: Card, destCol: Card[]): boolean {
  if (destCol.length === 0) return true;
  const top = destCol[destCol.length - 1];
  return isRed(bottom.suit) !== isRed(top.suit) && bottom.rank === top.rank - 1;
}

function canLandOnFnd(card: Card, foundations: number[]): boolean {
  return card.rank === foundations[card.suit] + 1;
}

// Auto-move: safe if all cards of rank-2 are on foundations (avoids getting stuck)
function safeToAutoMove(card: Card, foundations: number[]): boolean {
  if (card.rank <= 2) return true;
  // Both cards of rank-2 of the opposite color must be on foundations
  const need = card.rank - 2;
  const opposites = isRed(card.suit) ? [0, 3] : [1, 2]; // black needs red, red needs black
  return opposites.every(s => foundations[s] >= need);
}

function deepClone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

// ── Snapshot for undo ─────────────────────────────────────────────────────────
interface Snap { tableau: Card[][]; freeCells: (Card | null)[]; foundations: number[]; moves: number; }

// ── Card face component ───────────────────────────────────────────────────────
function CardFace({ card, selected, ghost }: { card: Card; selected?: boolean; ghost?: boolean }) {
  const col = ghost ? '#aaa' : SUIT_COL[card.suit];
  const sym = SUIT_SYM[card.suit];
  const lbl = RANK_LBL[card.rank];
  return (
    <div style={{
      width: CW, height: CH, flexShrink: 0,
      background: ghost ? '#e0e0e0' : selected ? '#ffffc8' : '#ffffff',
      border: `1px solid ${selected ? '#000080' : '#808080'}`,
      borderRadius: 2,
      outline: selected ? '2px solid #000080' : 'none',
      outlineOffset: -2,
      position: 'relative', overflow: 'hidden',
      cursor: 'pointer',
      userSelect: 'none',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: 3,
        color: col, fontSize: 12, fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif', lineHeight: 1.15,
      }}>
        <div>{lbl}</div>
        <div style={{ fontSize: 11 }}>{sym}</div>
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: col, fontSize: 30, lineHeight: 1, pointerEvents: 'none',
      }}>
        {sym}
      </div>
      <div style={{
        position: 'absolute', bottom: 2, right: 3,
        color: col, fontSize: 12, fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif', lineHeight: 1.15,
        transform: 'rotate(180deg)', textAlign: 'center',
        pointerEvents: 'none',
      }}>
        <div>{lbl}</div>
        <div style={{ fontSize: 11 }}>{sym}</div>
      </div>
    </div>
  );
}

function EmptySlot({ label, suit }: { label?: string; suit?: Suit }) {
  return (
    <div style={{
      width: CW, height: CH, flexShrink: 0,
      border: `1px solid #408040`,
      borderRadius: 2,
      background: FELT_DARK,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      userSelect: 'none', cursor: 'default',
    }}>
      {suit !== undefined ? (
        <span style={{ color: '#408040', fontSize: 24 }}>{SUIT_SYM[suit]}</span>
      ) : label ? (
        <span style={{ color: '#408040', fontSize: 10, fontFamily: 'Tahoma, sans-serif' }}>{label}</span>
      ) : null}
    </div>
  );
}

// ── Selection type ────────────────────────────────────────────────────────────
type Sel =
  | { type: 'tableau'; col: number; row: number }
  | { type: 'freecell'; idx: number }
  | null;

// ── Main component ────────────────────────────────────────────────────────────
export default function FreeCell() {
  const [gameNum, setGameNum] = useState(1);
  const [gameInput, setGameInput] = useState('1');
  const [tableau, setTableau] = useState<Card[][]>(() => dealGame(1));
  const [freeCells, setFreeCells] = useState<(Card | null)[]>([null, null, null, null]);
  const [foundations, setFoundations] = useState<number[]>([0, 0, 0, 0]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [history, setHistory] = useState<Snap[]>([]);
  const [sel, setSel] = useState<Sel>(null);
  const [winAnim, setWinAnim] = useState(false);

  // Always-current ref for event handlers
  const gsRef = useRef({ tableau, freeCells, foundations, moves });
  useEffect(() => { gsRef.current = { tableau, freeCells, foundations, moves }; },
    [tableau, freeCells, foundations, moves]);

  // ── New game ────────────────────────────────────────────────────────────────
  const startGame = useCallback((n: number) => {
    const num = Math.max(1, Math.min(32000, n));
    setGameNum(num);
    setGameInput(String(num));
    setTableau(dealGame(num));
    setFreeCells([null, null, null, null]);
    setFoundations([0, 0, 0, 0]);
    setMoves(0);
    setWon(false);
    setWinAnim(false);
    setHistory([]);
    setSel(null);
  }, []);

  // ── Undo ────────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setSel(null);
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const snap = prev[prev.length - 1];
      setTableau(snap.tableau);
      setFreeCells(snap.freeCells);
      setFoundations(snap.foundations);
      setMoves(snap.moves);
      setWon(false);
      return prev.slice(0, -1);
    });
  }, []);

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.key === 'Escape') setSel(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [undo]);

  // ── Auto-move to foundations after each state change ─────────────────────
  useEffect(() => {
    if (won) return;
    let changed = true;
    let tab = tableau.map(c => [...c]);
    let fc = [...freeCells];
    let fnd = [...foundations];
    let mv = moves;
    let anyMoved = false;

    while (changed) {
      changed = false;
      // Check freecells
      fc = fc.map(card => {
        if (card && canLandOnFnd(card, fnd) && safeToAutoMove(card, fnd)) {
          fnd = [...fnd]; fnd[card.suit]++; mv++; changed = true; anyMoved = true;
          return null;
        }
        return card;
      });
      // Check tableau bottoms
      tab = tab.map(col => {
        if (col.length === 0) return col;
        const card = col[col.length - 1];
        if (canLandOnFnd(card, fnd) && safeToAutoMove(card, fnd)) {
          fnd = [...fnd]; fnd[card.suit]++; mv++; changed = true; anyMoved = true;
          return col.slice(0, -1);
        }
        return col;
      });
    }

    if (anyMoved) {
      setHistory(prev => [...prev.slice(-49), deepClone({ tableau, freeCells, foundations, moves })]);
      setTableau(tab);
      setFreeCells(fc);
      setFoundations(fnd);
      setMoves(mv);
      if (fnd.every(v => v === 13)) {
        setWon(true);
        setTimeout(() => setWinAnim(true), 200);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableau, freeCells, foundations]);

  // ── Core move executor ───────────────────────────────────────────────────────
  const executeMove = useCallback((
    src: NonNullable<Sel>,
    dest: { type: 'tableau'; col: number } | { type: 'freecell'; idx: number } | { type: 'foundation'; suit: number },
  ) => {
    const { tableau: tab, freeCells: fc, foundations: fnd, moves: mv } = gsRef.current;

    // Get cards from source
    let cards: Card[] = [];
    if (src.type === 'freecell') {
      const c = fc[src.idx];
      if (!c) return false;
      cards = [c];
    } else {
      cards = tab[src.col].slice(src.row);
      if (!isValidSeq(cards)) return false;
    }
    if (cards.length === 0) return false;

    // Validate destination
    if (dest.type === 'freecell') {
      if (cards.length !== 1 || fc[dest.idx] !== null) return false;
    } else if (dest.type === 'foundation') {
      if (cards.length !== 1 || !canLandOnFnd(cards[0], fnd)) return false;
    } else {
      if (!canLandOnTab(cards[0], tab[dest.col])) return false;
      const srcColIdx = src.type === 'tableau' ? src.col : -1;
      // Exclude both source AND destination from the empty-column count:
      // destination (when empty) is being filled, not available for temp storage
      const emptyColCount = tab.filter((col, i) =>
        i !== srcColIdx && i !== dest.col && col.length === 0
      ).length;
      const movable = (emptyFC(fc) + 1) * Math.pow(2, emptyColCount);
      if (cards.length > movable) return false;
    }

    // Save snapshot
    setHistory(prev => [...prev.slice(-49), deepClone({ tableau: tab, freeCells: fc, foundations: fnd, moves: mv })]);

    // Apply
    const newTab = tab.map(c => [...c]);
    const newFC = [...fc];
    const newFnd = [...fnd];

    if (src.type === 'freecell') newFC[src.idx] = null;
    else newTab[src.col] = newTab[src.col].slice(0, src.row);

    if (dest.type === 'freecell') newFC[dest.idx] = cards[0];
    else if (dest.type === 'foundation') newFnd[cards[0].suit]++;
    else newTab[dest.col].push(...cards);

    setTableau(newTab);
    setFreeCells(newFC);
    setFoundations(newFnd);
    setMoves(mv + 1);
    setSel(null);
    return true;
  }, []);

  // ── Click handlers ────────────────────────────────────────────────────────
  const handleClickFC = useCallback((idx: number) => {
    const { freeCells: fc } = gsRef.current;
    if (sel) {
      // Try to move selection here
      if (sel.type === 'freecell' && sel.idx === idx) { setSel(null); return; }
      const ok = executeMove(sel, { type: 'freecell', idx });
      if (!ok) {
        // Keep original selection on failed move
        return;
      }
    } else {
      if (fc[idx]) setSel({ type: 'freecell', idx });
    }
  }, [sel, executeMove]);

  const handleClickFnd = useCallback((suit: Suit) => {
    if (!sel) return;
    executeMove(sel, { type: 'foundation', suit });
  }, [sel, executeMove]);

  const handleClickCard = useCallback((col: number, row: number) => {
    const { tableau: tab } = gsRef.current;
    const card = tab[col][row];
    if (!card) return;

    if (sel) {
      if (sel.type === 'tableau' && sel.col === col && sel.row === row) { setSel(null); return; }
      // Try move
      const ok = executeMove(sel, { type: 'tableau', col });
      if (!ok) {
        // Keep original selection — don't silently switch to a different card on failed move
        return;
      }
    } else {
      const substack = tab[col].slice(row);
      if (isValidSeq(substack)) setSel({ type: 'tableau', col, row });
    }
  }, [sel, executeMove]);

  const handleClickEmptyTab = useCallback((col: number) => {
    if (!sel) return;
    executeMove(sel, { type: 'tableau', col });
  }, [sel, executeMove]);

  // ── Foundation rank label ─────────────────────────────────────────────────
  const fndTopCard = (suit: number): Card | null =>
    foundations[suit] > 0 ? { suit: suit as Suit, rank: foundations[suit] } : null;

  // ── Render ────────────────────────────────────────────────────────────────
  const gameAreaWidth = PAD * 2 + 8 * STRIDE - 10; // 638 + 22 = 660

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#d4d0c8',
      fontFamily: 'Tahoma, "MS Sans Serif", Arial, sans-serif',
      userSelect: 'none',
      overflow: 'hidden',
    }}>

      {/* ── Win95 toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '2px 4px',
        background: '#d4d0c8',
        borderBottom: '1px solid #808080',
        flexShrink: 0,
      }}>
        {/* Menu-style buttons */}
        {(['Game', 'Help'] as const).map(label => (
          <div key={label} style={{
            padding: '2px 8px', fontSize: 11, cursor: 'default',
            background: 'transparent',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#000080', e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = '#000')}
          >
            {label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={undo}
          disabled={history.length === 0}
          style={{
            padding: '2px 8px', fontSize: 11,
            background: '#d4d0c8', border: '1px solid',
            borderColor: history.length > 0 ? '#ffffff #808080 #808080 #ffffff' : '#c0c0c0',
            cursor: history.length > 0 ? 'pointer' : 'default',
            color: history.length > 0 ? '#000' : '#808080',
          }}
        >
          Undo
        </button>
        <button
          onClick={() => startGame(gameNum)}
          style={{
            padding: '2px 8px', fontSize: 11,
            background: '#d4d0c8', border: '1px solid',
            borderColor: '#ffffff #808080 #808080 #ffffff',
            cursor: 'pointer',
          }}
        >
          Restart
        </button>
        <button
          onClick={() => startGame(Math.floor(Math.random() * 32000) + 1)}
          style={{
            padding: '2px 8px', fontSize: 11,
            background: '#d4d0c8', border: '1px solid',
            borderColor: '#ffffff #808080 #808080 #ffffff',
            cursor: 'pointer',
          }}
        >
          New Game
        </button>

        {/* Game # input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          <span style={{ fontSize: 11 }}>Game #</span>
          <input
            value={gameInput}
            onChange={e => setGameInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { const n = parseInt(gameInput); if (!isNaN(n)) startGame(n); } }}
            style={{
              width: 48, padding: '1px 3px', fontSize: 11,
              border: '1px solid', borderColor: '#808080 #ffffff #ffffff #808080',
              background: '#ffffff',
            }}
          />
        </div>

        {/* Move counter */}
        <div style={{ fontSize: 11, marginLeft: 8, minWidth: 60 }}>
          Moves: {moves}
        </div>
      </div>

      {/* ── Game area ── */}
      <div
        style={{
          flex: 1, overflow: 'auto',
          background: FELT,
          position: 'relative',
          minWidth: gameAreaWidth,
        }}
        onClick={() => { if (!sel) return; }}
      >
        <div style={{ padding: PAD, minWidth: gameAreaWidth }}>

          {/* ── Top row: free cells (0-3) + foundations (4-7) ── */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {/* Free cells */}
            {freeCells.map((card, idx) => (
              <div
                key={`fc-${idx}`}
                onClick={() => handleClickFC(idx)}
                style={{ cursor: card ? 'pointer' : 'default', position: 'relative' }}
              >
                {card
                  ? <CardFace card={card} selected={sel?.type === 'freecell' && sel.idx === idx} />
                  : <EmptySlot label="Free" />
                }
              </div>
            ))}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Foundations */}
            {([0, 1, 2, 3] as Suit[]).map(suit => {
              const top = fndTopCard(suit);
              return (
                <div
                  key={`fnd-${suit}`}
                  onClick={() => handleClickFnd(suit)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  {top
                    ? <CardFace card={top} />
                    : <EmptySlot suit={suit} />
                  }
                  {foundations[suit] > 0 && (
                    <div style={{
                      position: 'absolute', top: 2, right: 3,
                      fontSize: 9, color: '#aaa',
                      fontFamily: 'Tahoma, sans-serif',
                      pointerEvents: 'none',
                    }}>
                      {foundations[suit]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Tableau ── */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {tableau.map((col, colIdx) => {
              const colHeight = col.length === 0 ? CH : CH + (col.length - 1) * STACK_DY;
              return (
                <div
                  key={`col-${colIdx}`}
                  style={{ position: 'relative', width: CW, height: colHeight, flexShrink: 0 }}
                  onClick={() => { if (col.length === 0) handleClickEmptyTab(colIdx); }}
                >
                  {col.length === 0 ? (
                    <EmptySlot />
                  ) : (
                    col.map((card, rowIdx) => {
                      const isSel = sel?.type === 'tableau' && sel.col === colIdx && sel.row <= rowIdx;
                      const isGhost = sel?.type === 'tableau' && sel.col === colIdx && sel.row <= rowIdx;
                      void isGhost;
                      return (
                        <div
                          key={`c-${colIdx}-${rowIdx}`}
                          onClick={e => { e.stopPropagation(); handleClickCard(colIdx, rowIdx); }}
                          style={{
                            position: 'absolute',
                            top: rowIdx * STACK_DY,
                            left: 0,
                            zIndex: rowIdx + 1,
                            cursor: 'pointer',
                          }}
                        >
                          <CardFace
                            card={card}
                            selected={isSel}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* ── Win overlay ── */}
        {won && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,80,0,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: '#d4d0c8',
              border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff',
              boxShadow: '4px 4px 0 #000',
              padding: '0 0 16px',
              minWidth: 280, textAlign: 'center',
            }}>
              {/* Title bar */}
              <div style={{
                background: 'linear-gradient(90deg, #000080, #1084d0)',
                color: '#fff', padding: '3px 8px', marginBottom: 16,
                fontSize: 12, fontWeight: 'bold', textAlign: 'left',
              }}>
                FreeCell
              </div>
              <div style={{ fontSize: 24, marginBottom: 8 }}>♠ ♥ ♦ ♣</div>
              <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
                You Win!
              </div>
              <div style={{ fontSize: 11, color: '#444', marginBottom: 16 }}>
                Game #{gameNum} — {moves} moves
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  onClick={() => startGame(Math.floor(Math.random() * 32000) + 1)}
                  style={{
                    padding: '4px 20px', fontSize: 11, cursor: 'pointer',
                    background: '#d4d0c8', border: '2px solid',
                    borderColor: '#ffffff #808080 #808080 #ffffff',
                  }}
                >
                  New Game
                </button>
                <button
                  onClick={() => { setWon(false); setWinAnim(false); }}
                  style={{
                    padding: '4px 20px', fontSize: 11, cursor: 'pointer',
                    background: '#d4d0c8', border: '2px solid',
                    borderColor: '#ffffff #808080 #808080 #ffffff',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Selected card preview floating label ── */}
        {sel && (
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            background: '#ffffaa',
            border: '1px solid #808080',
            padding: '2px 10px', fontSize: 11,
            boxShadow: '1px 1px 0 #808080',
            pointerEvents: 'none',
            zIndex: 500,
          }}>
            {sel.type === 'freecell'
              ? `Moving: ${RANK_LBL[freeCells[sel.idx]!.rank]}${SUIT_SYM[freeCells[sel.idx]!.suit]}`
              : (() => {
                  const cards = tableau[sel.col].slice(sel.row);
                  return cards.length === 1
                    ? `Moving: ${RANK_LBL[cards[0].rank]}${SUIT_SYM[cards[0].suit]}`
                    : `Moving: ${cards.length} cards`;
                })()
            }
            {' '}— click destination or Esc to cancel
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{
        padding: '2px 8px',
        borderTop: '1px solid #808080',
        fontSize: 11,
        background: '#d4d0c8',
        flexShrink: 0,
        display: 'flex', gap: 16,
      }}>
        <span>Game #{gameNum}</span>
        <span style={{ color: '#444' }}>
          {won ? '✓ Game complete!' : sel ? 'Select destination' : 'Click a card to select it'}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#666' }}>Ctrl+Z = Undo · Esc = Cancel</span>
      </div>

    </div>
  );
}
