import { useEffect, useRef, useState, useCallback } from 'react';

type PooState = 'idle' | 'walk' | 'run' | 'sleep' | 'jump' | 'spin' | 'poop' | 'happy';
type PooDir = 1 | -1;

const FACES: Record<PooState, { eyes: string; mouth: string }> = {
  idle:  { eyes: '• •',  mouth: '—' },
  walk:  { eyes: '• •',  mouth: '~' },
  run:   { eyes: '> >',  mouth: 'D' },
  sleep: { eyes: '- -',  mouth: 'z' },
  jump:  { eyes: '^ ^',  mouth: 'O' },
  spin:  { eyes: '@ @',  mouth: '~' },
  poop:  { eyes: '> <',  mouth: 'u' },
  happy: { eyes: '^ ^',  mouth: 'U' },
};

const MESSAGES: Partial<Record<PooState, string[]>> = {
  idle:  ['...', 'hmm.', 'bored', '💭'],
  sleep: ['zzz', 'zZz', '💤'],
  poop:  ['uhhh...', 'ngh!', '💩'],
  happy: ['yay!', '♪', 'wee!', '😊'],
  spin:  ['woooo!', '🌀', 'dizzy'],
  jump:  ['boing!', 'wheee', '⬆️'],
};

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export default function ScreenMate() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    x: 200, y: 200,
    vx: 0, vy: 0,
    state: 'idle' as PooState,
    dir: 1 as PooDir,
    timer: 0,
    nextState: 60,
    frame: 0,
    bobPhase: 0,
    dragging: false,
    dragOffX: 0, dragOffY: 0,
    message: null as string | null,
    messageTTL: 0,
    poopCount: 0,
    clicks: 0,
  });
  const [renderTick, setRenderTick] = useState(0);
  const rafRef = useRef<number>(0);
  const [bounds, setBounds] = useState({ w: 600, h: 440 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setBounds({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    const g = stateRef.current;
    g.frame++;
    g.bobPhase += 0.18;

    if (g.messageTTL > 0) g.messageTTL--;
    else g.message = null;

    if (g.dragging) { setRenderTick(t => t + 1); return; }

    const W = bounds.w, H = bounds.h;
    const SIZE = 64;

    g.timer++;
    if (g.timer >= g.nextState) {
      g.timer = 0;
      // State machine transitions
      const roll = Math.random();
      const prev = g.state;
      if (prev === 'sleep') {
        g.state = 'idle';
        g.nextState = randomBetween(40, 100);
      } else if (prev === 'jump') {
        g.state = 'happy';
        g.vy = 0;
        g.nextState = 30;
      } else if (prev === 'spin') {
        g.state = 'idle';
        g.nextState = 40;
        g.message = '💫';
        g.messageTTL = 80;
      } else if (prev === 'poop') {
        g.poopCount++;
        g.state = 'happy';
        g.nextState = 40;
        g.message = '💩 done!';
        g.messageTTL = 100;
      } else if (prev === 'happy') {
        g.state = 'idle';
        g.nextState = randomBetween(30, 80);
      } else {
        if (roll < 0.25)      { g.state = 'walk'; g.nextState = randomBetween(60, 180); g.vx = (Math.random() < 0.5 ? -1 : 1) * randomBetween(0.8, 1.8); g.dir = g.vx > 0 ? 1 : -1; }
        else if (roll < 0.38) { g.state = 'run';  g.nextState = randomBetween(30, 80);  g.vx = g.dir * randomBetween(2.5, 4); }
        else if (roll < 0.50) { g.state = 'idle'; g.nextState = randomBetween(40, 120); g.vx = 0; }
        else if (roll < 0.60) { g.state = 'sleep';g.nextState = randomBetween(100, 200);g.vx = 0; }
        else if (roll < 0.68) { g.state = 'jump'; g.nextState = 40; g.vy = -6; }
        else if (roll < 0.74) { g.state = 'spin'; g.nextState = 60; g.vx = 0; }
        else if (roll < 0.79) { g.state = 'poop'; g.nextState = randomBetween(60, 100); g.vx = 0; }
        else                  { g.state = 'walk'; g.nextState = 60; g.vx = -g.vx || 1; g.dir = g.vx > 0 ? 1 : -1; }

        if (MESSAGES[g.state] && Math.random() < 0.5) {
          const msgs = MESSAGES[g.state]!;
          g.message = msgs[Math.floor(Math.random() * msgs.length)];
          g.messageTTL = 90;
        }
      }
    }

    // Physics
    g.vy += 0.35; // gravity
    g.x += g.vx;
    g.y += g.vy;

    // Floor
    if (g.y > H - SIZE) { g.y = H - SIZE; g.vy = 0; if (g.state === 'jump') { g.state = 'happy'; g.nextState = 30; } }
    // Walls
    if (g.x < 0)          { g.x = 0;          g.vx = Math.abs(g.vx); g.dir = 1; }
    if (g.x > W - SIZE)   { g.x = W - SIZE;   g.vx = -Math.abs(g.vx); g.dir = -1; }

    // Idle drift deceleration
    if (g.state === 'idle' || g.state === 'sleep' || g.state === 'poop' || g.state === 'spin') {
      g.vx *= 0.85;
    }

    setRenderTick(t => t + 1);
  }, [bounds]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const g = stateRef.current;

  // Render the poo SVG
  const SIZE = 64;
  const face = FACES[g.state];
  const bob = g.state === 'sleep' ? Math.sin(g.bobPhase * 0.3) * 1 : Math.sin(g.bobPhase) * (g.state === 'walk' || g.state === 'run' ? 3 : 1.5);
  const squish = g.state === 'jump' ? 0.85 : g.state === 'run' ? 1.15 : 1;
  const rot = g.state === 'spin' ? (g.frame * 15) % 360 : 0;
  const shake = g.state === 'poop' && g.frame % 4 < 2 ? 2 : 0;

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    g.dragging = true;
    g.dragOffX = e.clientX - rect.left - g.x;
    g.dragOffY = e.clientY - rect.top - g.y;
    g.vx = 0; g.vy = 0;

    const onMove = (me: MouseEvent) => {
      const r = el.getBoundingClientRect();
      g.x = Math.max(0, Math.min(bounds.w - SIZE, me.clientX - r.left - g.dragOffX));
      g.y = Math.max(0, Math.min(bounds.h - SIZE, me.clientY - r.top - g.dragOffY));
    };
    const onUp = (me: MouseEvent) => {
      g.dragging = false;
      g.vy = -3;
      g.vx = (me.clientX - (el.getBoundingClientRect().left + g.x + g.dragOffX)) * 0.05;
      g.state = 'jump';
      g.message = '✈️';
      g.messageTTL = 60;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onClick = () => {
    g.clicks++;
    const msgs = ['ow!', 'hey!', '😤', 'stop!', '...', 'uwu', '💫'];
    g.message = msgs[g.clicks % msgs.length];
    g.messageTTL = 70;
    if (g.state !== 'spin') { g.state = 'happy'; g.nextState = 30; }
  };

  const renderTally = renderTick; // just to use it for dep tracking

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'radial-gradient(ellipse at bottom, #0a1018 0%, #060810 100%)',
      overflow: 'hidden', cursor: 'default',
    }}>
      {/* Ground line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
      }} />

      {/* Poop drops left on ground */}
      {Array.from({ length: g.poopCount }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', bottom: 4, left: 60 + i * 45,
          fontSize: 16, opacity: 0.6, filter: 'grayscale(0.3)',
        }}>💩</div>
      ))}

      {/* Speech bubble */}
      {g.message && (
        <div style={{
          position: 'absolute',
          left: g.x + SIZE / 2 - 20,
          top: Math.max(4, g.y + bob - 36),
          background: 'rgba(255,255,255,0.92)',
          color: '#222', fontSize: 11, padding: '3px 7px',
          borderRadius: 8, fontFamily: 'monospace',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
          zIndex: 10,
          opacity: g.messageTTL > 20 ? 1 : g.messageTTL / 20,
          pointerEvents: 'none',
        }}>
          {g.message}
          <div style={{
            position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '6px solid rgba(255,255,255,0.92)',
          }} />
        </div>
      )}

      {/* The poo */}
      <div
        onMouseDown={onMouseDown}
        onClick={onClick}
        style={{
          position: 'absolute',
          left: g.x + shake,
          top: g.y + bob,
          width: SIZE, height: SIZE,
          transform: `rotate(${rot}deg) scaleX(${g.dir === -1 ? -1 : 1}) scaleY(${squish})`,
          cursor: 'grab',
          userSelect: 'none',
          transition: 'transform 0.05s',
          zIndex: 5,
        }}
      >
        <svg viewBox="0 0 64 64" width={SIZE} height={SIZE} style={{ overflow: 'visible' }}>
          {/* Shadow */}
          <ellipse cx="32" cy="62" rx={14 * (1/squish)} ry="3" fill="rgba(0,0,0,0.3)" />

          {/* Main poo body — three stacked swirl bumps */}
          {/* Bottom / widest */}
          <ellipse cx="32" cy="52" rx="20" ry="10" fill="#6b3d11" />
          <ellipse cx="32" cy="52" rx="20" ry="10" fill="url(#pooGrad1)" />
          {/* Middle */}
          <ellipse cx="32" cy="41" rx="15" ry="9" fill="#7c4812" />
          <ellipse cx="32" cy="41" rx="15" ry="9" fill="url(#pooGrad2)" />
          {/* Top / point */}
          <ellipse cx="32" cy="31" rx="10" ry="8" fill="#8b5213" />
          <ellipse cx="32" cy="31" rx="10" ry="8" fill="url(#pooGrad3)" />
          {/* Tip swirl */}
          <path d="M32 23 Q36 16 32 12 Q28 8 30 14" stroke="#6b3d11" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="30" cy="13" r="3" fill="#8b5213" />

          {/* Highlight shine */}
          <ellipse cx="26" cy="39" rx="4" ry="3" fill="rgba(255,255,255,0.18)" transform="rotate(-20,26,39)" />
          <ellipse cx="27" cy="50" rx="5" ry="3" fill="rgba(255,255,255,0.12)" transform="rotate(-15,27,50)" />

          {/* Face */}
          {/* Eyes */}
          <circle cx="27" cy="30" r="3.5" fill="white" />
          <circle cx="37" cy="30" r="3.5" fill="white" />
          <circle cx={g.state === 'sleep' ? 27 : 27.5} cy={g.state === 'sleep' ? 31 : 30.5} r="2"
            fill={g.state === 'happy' || g.state === 'jump' ? '#3a1a00' : '#1a0800'} />
          <circle cx={g.state === 'sleep' ? 37 : 37.5} cy={g.state === 'sleep' ? 31 : 30.5} r="2"
            fill={g.state === 'happy' || g.state === 'jump' ? '#3a1a00' : '#1a0800'} />
          {/* Sleep lines */}
          {g.state === 'sleep' && <>
            <line x1="24" y1="29" x2="30" y2="29" stroke="#1a0800" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="34" y1="29" x2="40" y2="29" stroke="#1a0800" strokeWidth="1.5" strokeLinecap="round" />
          </>}
          {/* Angry brows for run/spin */}
          {(g.state === 'run' || g.state === 'spin') && <>
            <line x1="24" y1="26" x2="30" y2="27.5" stroke="#3a0000" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="40" y1="26" x2="34" y2="27.5" stroke="#3a0000" strokeWidth="1.5" strokeLinecap="round" />
          </>}
          {/* Mouth */}
          {g.state === 'happy' || g.state === 'jump' ? (
            <path d="M26 36 Q32 40 38 36" stroke="#1a0800" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          ) : g.state === 'sleep' ? (
            <line x1="28" y1="36" x2="36" y2="36" stroke="#1a0800" strokeWidth="1.5" strokeLinecap="round" />
          ) : g.state === 'poop' ? (
            <path d="M27 37 Q32 34 37 37" stroke="#1a0800" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M27 36 Q32 38 37 36" stroke="#1a0800" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          )}

          {/* Sleep Z's */}
          {g.state === 'sleep' && (
            <text x={42 + Math.sin(g.bobPhase * 0.2) * 2} y={20 - (g.frame % 120) * 0.1}
              fontSize="8" fill="rgba(180,220,255,0.7)" fontFamily="monospace">
              {g.frame % 60 < 30 ? 'z' : 'Z'}
            </text>
          )}

          {/* Walking legs (two dots at bottom) */}
          {(g.state === 'walk' || g.state === 'run') && (
            <>
              <circle cx={28 + Math.sin(g.bobPhase * 2) * 3} cy="60" r="3" fill="#4a2808" />
              <circle cx={36 - Math.sin(g.bobPhase * 2) * 3} cy="60" r="3" fill="#4a2808" />
            </>
          )}
          {/* Arms waving for happy/spin */}
          {(g.state === 'happy' || g.state === 'spin') && (
            <>
              <circle cx={14 + Math.sin(g.bobPhase) * 4} cy={44 + Math.cos(g.bobPhase) * 3} r="3" fill="#5a3008" />
              <circle cx={50 - Math.sin(g.bobPhase) * 4} cy={44 + Math.cos(g.bobPhase + Math.PI) * 3} r="3" fill="#5a3008" />
            </>
          )}

          <defs>
            <radialGradient id="pooGrad1" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="rgba(255,200,80,0.2)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <radialGradient id="pooGrad2" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="rgba(255,200,80,0.15)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <radialGradient id="pooGrad3" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="rgba(255,200,80,0.15)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Info overlay */}
      <div style={{ position: 'absolute', bottom: 8, right: 10,
        fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace',
        textAlign: 'right', lineHeight: 1.6, pointerEvents: 'none' }}>
        <div>STATE: {g.state.toUpperCase()}</div>
        <div>💩 × {g.poopCount}</div>
        <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.1)' }}>click · drag · watch</div>
      </div>
    </div>
  );
}
