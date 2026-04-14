import { useEffect, useRef, useState, useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const W = 560;
const H = 420;
const SKIER_W = 16;
const SKIER_H = 20;
const SCROLL_SPEED_BASE = 2.5;
const MONSTER_SPEED = 3.8;

type GameState = 'title' | 'playing' | 'dead' | 'eaten';

interface Obstacle {
  id: number;
  x: number;
  y: number;
  type: 'tree' | 'rock' | 'flag' | 'lift';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

let nextId = 1;

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawSkier(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, crashed: boolean) {
  ctx.save();
  ctx.translate(x, y);
  if (crashed) {
    // X marks the spot
    ctx.strokeStyle = '#ff2244';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(-8, 8); ctx.stroke();
    ctx.restore();
    return;
  }
  // Body
  ctx.fillStyle = '#e8c88a';
  ctx.beginPath(); ctx.arc(0, -7, 5, 0, Math.PI * 2); ctx.fill(); // head
  ctx.fillStyle = '#2266cc';
  ctx.fillRect(-4, -2, 8, 9); // torso/jacket
  ctx.fillStyle = '#111133';
  ctx.fillRect(-4, 7, 3, 5); // left leg
  ctx.fillRect(1, 7, 3, 5); // right leg
  // Skis — angled by dir
  ctx.strokeStyle = '#cc8844';
  ctx.lineWidth = 2;
  const spread = dir * 12;
  ctx.beginPath(); ctx.moveTo(-5 + spread / 2, 12); ctx.lineTo(-5 - spread / 2 + 2, 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5 + spread / 2, 12); ctx.lineTo(5 - spread / 2 + 2, 12); ctx.stroke();
  // Poles
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-10 - dir * 5, 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(10 - dir * 5, 10); ctx.stroke();
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save(); ctx.translate(x, y);
  // Trunk
  ctx.fillStyle = '#6b3d11';
  ctx.fillRect(-3, 0, 6, 12);
  // Layers
  ctx.fillStyle = '#1a6b2e';
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(0, -18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#228833';
  ctx.beginPath(); ctx.moveTo(-11, -10); ctx.lineTo(11, -10); ctx.lineTo(0, -26); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#33aa44';
  ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(8, -20); ctx.lineTo(0, -34); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#667788';
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#99aabb';
  ctx.beginPath();
  ctx.ellipse(-2, -2, 5, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke();
  const wave = Math.sin(t * 0.08) * 3;
  ctx.fillStyle = t % 80 < 40 ? '#ff2244' : '#ffdd00';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(12 + wave, -16);
  ctx.lineTo(0, -12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLift(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save(); ctx.translate(x, y);
  // Pole
  ctx.fillStyle = '#888';
  ctx.fillRect(-3, -40, 6, 55);
  // Cross arm
  ctx.fillRect(-20, -38, 40, 4);
  // Cables
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-20, -36); ctx.lineTo(20, -36); ctx.stroke();
  // Chair
  ctx.fillStyle = '#4488cc';
  ctx.fillRect(-10, -30, 20, 8);
  ctx.restore();
}

function drawMonster(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save(); ctx.translate(x, y);
  const bob = Math.sin(t * 0.18) * 3;
  ctx.translate(0, bob);
  const armSwing = Math.sin(t * 0.18) * 0.4;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(0, 26, 18, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Lower body (big round)
  ctx.fillStyle = '#e8eef2';
  ctx.beginPath(); ctx.ellipse(0, 10, 20, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c0ccd4'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 10, 20, 18, 0, 0, Math.PI * 2); ctx.stroke();

  // Upper body / chest
  ctx.fillStyle = '#dde6ec';
  ctx.beginPath(); ctx.ellipse(0, -8, 15, 14, 0, 0, Math.PI * 2); ctx.fill();

  // Fur spikes around body
  ctx.fillStyle = '#ccd6de';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + t * 0.02;
    const bx = Math.cos(a) * 18, by = 10 + Math.sin(a) * 16;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a) * 7, by + Math.sin(a) * 7);
    ctx.lineTo(bx + Math.cos(a + 0.4) * 4, by + Math.sin(a + 0.4) * 4);
    ctx.closePath(); ctx.fill();
  }

  // Left arm reaching out
  ctx.save(); ctx.translate(-15, -5); ctx.rotate(-0.6 - armSwing);
  ctx.fillStyle = '#dde6ec';
  ctx.beginPath(); ctx.ellipse(0, 0, 5, 14, 0, 0, Math.PI * 2); ctx.fill();
  // Claws
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(i * 3, 13); ctx.lineTo(i * 4, 19); ctx.stroke();
  }
  ctx.restore();

  // Right arm
  ctx.save(); ctx.translate(15, -5); ctx.rotate(0.6 + armSwing);
  ctx.fillStyle = '#dde6ec';
  ctx.beginPath(); ctx.ellipse(0, 0, 5, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(i * 3, 13); ctx.lineTo(i * 4, 19); ctx.stroke();
  }
  ctx.restore();

  // Head
  ctx.fillStyle = '#eef4f8';
  ctx.beginPath(); ctx.arc(0, -22, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c0ccd4'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, -22, 13, 0, Math.PI * 2); ctx.stroke();

  // Beady eyes — red/black like original SkiFree yeti
  ctx.fillStyle = '#cc0000';
  ctx.beginPath(); ctx.arc(-5, -25, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -25, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#220000';
  ctx.beginPath(); ctx.arc(-4, -25, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -25, 2, 0, Math.PI * 2); ctx.fill();

  // Snout / nose
  ctx.fillStyle = '#ffaa66';
  ctx.beginPath(); ctx.ellipse(0, -20, 4, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Mouth with sharp teeth
  ctx.fillStyle = '#330000';
  ctx.beginPath();
  ctx.moveTo(-8, -15); ctx.quadraticCurveTo(0, -11, 8, -15);
  ctx.quadraticCurveTo(0, -10, -8, -15);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(i * 3, -15); ctx.lineTo(i * 3 + 1.5, -12); ctx.lineTo(i * 3 + 3, -15); ctx.fill();
  }

  ctx.restore();
}

// ── SkiFree Component ─────────────────────────────────────────────────────────

export default function SkiFree() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>('title');
  const [displayState, setDisplayState] = useState<GameState>('title');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('skifree_hi') || '0', 10));

  const gameRef = useRef({
    skierX: W / 2,
    skierY: H * 0.35,
    velX: 0,
    dir: 0, // -1 to 1
    scrollY: 0,
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    monsterY: -100,
    monsterX: W / 2,
    monsterActive: false,
    spawnFrontier: H + 60, // world-Y at which we've spawned up to
    score: 0,
    tick: 0,
    keys: new Set<string>(),
    crashed: false,
    crashTimer: 0,
    scoreTimer: 0,
    restartTimer: 0,
  });

  const resetGame = useCallback(() => {
    const g = gameRef.current;
    g.skierX = W / 2;
    g.skierY = H * 0.38;
    g.velX = 0;
    g.dir = 0;
    g.scrollY = 0;
    g.obstacles = [];
    g.particles = [];
    g.monsterY = -100;
    g.monsterX = W / 2;
    g.monsterActive = false;
    g.score = 0;
    g.spawnFrontier = H + 60;
    g.restartTimer = 0;
    g.tick = 0;
    g.crashed = false;
    g.crashTimer = 0;
    g.scoreTimer = 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let rafId = 0;
    let lastScore = -1;

    const spawnObstacle = (y: number) => {
      const r = Math.random();
      const type: Obstacle['type'] = r < 0.45 ? 'tree' : r < 0.75 ? 'rock' : r < 0.9 ? 'flag' : 'lift';
      gameRef.current.obstacles.push({
        id: nextId++,
        x: Math.random() * (W - 40) + 20,
        y,
        type,
      });
    };

    const spawnParticles = (x: number, y: number) => {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        gameRef.current.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: `hsl(${200 + Math.random() * 40},80%,${80 + Math.random() * 20}%)`,
        });
      }
    };

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const g = gameRef.current;
      const state = stateRef.current;

      // ── Draw background — pure Win95 white snow ──
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      if (state === 'title') {
        // Win95-style title dialog
        const bx = W / 2 - 160, by = H / 2 - 80, bw = 320, bh = 160;
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(bx, by, bw, bh);
        // Raised border
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx, by + bh); ctx.lineTo(bx, by); ctx.lineTo(bx + bw, by); ctx.stroke();
        ctx.strokeStyle = '#808080';
        ctx.beginPath(); ctx.moveTo(bx + bw, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx, by + bh); ctx.stroke();
        // Title bar
        ctx.fillStyle = '#000080';
        ctx.fillRect(bx + 2, by + 2, bw - 4, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SkiFree', bx + bw / 2, by + 15);
        // Body text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px "Arial", sans-serif';
        ctx.fillText('⛷  SkiFree', bx + bw / 2, by + 60);
        ctx.font = '11px "Arial", sans-serif';
        ctx.fillText('Use arrow keys or A / D to steer', bx + bw / 2, by + 85);
        ctx.fillText('Press SPACE or click to start', bx + bw / 2, by + 102);
        if (highScore > 0) {
          ctx.fillStyle = '#000080';
          ctx.fillText(`Best: ${highScore}m`, bx + bw / 2, by + 122);
        }
        ctx.textAlign = 'left';
        return;
      }

      if (state === 'playing' || state === 'dead' || state === 'eaten') {
        g.tick++;

        const speed = state === 'playing' && !g.crashed
          ? SCROLL_SPEED_BASE + g.score * 0.0004
          : 0;

        if (state === 'playing' && !g.crashed) {
          // Controls
          const leftPressed = g.keys.has('ArrowLeft') || g.keys.has('a');
          const rightPressed = g.keys.has('ArrowRight') || g.keys.has('d');
          if (leftPressed)  g.dir = Math.max(-1, g.dir - 0.08);
          if (rightPressed) g.dir = Math.min(1, g.dir + 0.08);
          if (!leftPressed && !rightPressed) g.dir *= 0.85;

          g.velX = g.dir * (speed * 1.4);
          g.skierX = Math.max(SKIER_W, Math.min(W - SKIER_W, g.skierX + g.velX));
          g.scrollY += speed;
          g.score += speed;

          // Score display update throttled
          g.scoreTimer++;
          if (g.scoreTimer > 10) {
            g.scoreTimer = 0;
            const sc = Math.floor(g.score / 10);
            if (sc !== lastScore) { lastScore = sc; setScore(sc); }
          }

          // Spawn obstacles row by row as we scroll — frontier tracks world Y below screen
          const ROW_SPACING = 55; // px between spawn rows
          const targetFrontier = g.scrollY + H + 80;
          while (g.spawnFrontier < targetFrontier) {
            const worldY = g.spawnFrontier;
            const screenY = worldY - g.scrollY; // will be off-screen when first spawned
            // 1-3 obstacles per row, spread horizontally with minimum gap
            const count = Math.floor(Math.random() * 3) + 1;
            const usedX: number[] = [];
            for (let k = 0; k < count; k++) {
              let attempts = 0;
              let x = 0;
              do {
                x = Math.random() * (W - 60) + 30;
                attempts++;
              } while (usedX.some(ux => Math.abs(ux - x) < 50) && attempts < 8);
              usedX.push(x);
              const r = Math.random();
              const type: Obstacle['type'] = r < 0.50 ? 'tree' : r < 0.80 ? 'rock' : r < 0.94 ? 'flag' : 'lift';
              g.obstacles.push({ id: nextId++, x, y: screenY, type });
            }
            // Edge blockers — trees hugging both sides so players can't cheat by wall-hugging
            // ~65% chance per row on each edge, so there's almost always something to dodge near walls
            if (Math.random() < 0.65) {
              g.obstacles.push({ id: nextId++, x: 6 + Math.random() * 22, y: screenY, type: 'tree' });
            }
            if (Math.random() < 0.65) {
              g.obstacles.push({ id: nextId++, x: W - 6 - Math.random() * 22, y: screenY, type: 'tree' });
            }
            g.spawnFrontier += ROW_SPACING;
          }

          // Scroll obstacles
          g.obstacles.forEach(o => { o.y -= speed; });
          g.obstacles = g.obstacles.filter(o => o.y > -60);

          // Collision detection
          const sLeft = g.skierX - SKIER_W / 2;
          const sRight = g.skierX + SKIER_W / 2;
          const sTop = g.skierY - SKIER_H / 2;
          const sBot = g.skierY + SKIER_H / 2;

          for (const o of g.obstacles) {
            let hw = 0, hh = 0;
            if (o.type === 'tree')  { hw = 8; hh = 12; }
            if (o.type === 'rock')  { hw = 10; hh = 7; }
            if (o.type === 'lift')  { hw = 3; hh = 20; }
            if (o.type === 'flag')  { continue; } // flags are just decoration
            const hit = sRight > o.x - hw && sLeft < o.x + hw && sBot > o.y - hh && sTop < o.y + hh;
            if (hit) {
              // Crash = end of run, same as being eaten
              g.crashed = true;
              g.crashTimer = 999; // keep X visible until reset
              spawnParticles(g.skierX, g.skierY);
              stateRef.current = 'dead';
              setDisplayState('dead');
              const sc = Math.floor(g.score / 10);
              setScore(sc);
              if (sc > highScore) {
                setHighScore(sc);
                localStorage.setItem('skifree_hi', String(sc));
              }
              g.restartTimer = 180; // 3s auto-reset
              break;
            }
          }

          // Monster spawn — probabilistic after 500m, chance ramps up with distance
          // Checked once per second (every 60 ticks) to avoid per-frame noise
          if (!g.monsterActive && g.score > 5000 && g.tick % 60 === 0) {
            // distancePast500 in metres
            const distPast500 = (g.score - 5000) / 10;
            // 2% at 500m → ramps to 40% per second by ~800m+
            const chancePerSec = Math.min(0.40, 0.02 + distPast500 * 0.0013);
            if (Math.random() < chancePerSec) {
              g.monsterActive = true;
              g.monsterX = W / 2;
              g.monsterY = -60;
            }
          }
          // Monster chase
          if (g.monsterActive) {
            g.monsterY += MONSTER_SPEED;
            g.monsterX = g.skierX; // home toward skier horizontally
            // If monster catches skier
            if (g.monsterY > g.skierY - 10 && Math.abs(g.monsterX - g.skierX) < 40) {
              stateRef.current = 'eaten';
              setDisplayState('eaten');
              const sc = Math.floor(g.score / 10);
              setScore(sc);
              if (sc > highScore) {
                setHighScore(sc);
                localStorage.setItem('skifree_hi', String(sc));
              }
              g.restartTimer = 180; // 3 seconds at 60fps
            }
          }
        }

        // Crash timer countdown
        if (g.crashed) {
          g.crashTimer--;
          if (g.crashTimer <= 0) {
            g.crashed = false;
            g.dir = 0;
            g.velX = 0;
          }
        }

        // Draw obstacles
        for (const o of g.obstacles) {
          if (o.type === 'tree')  drawTree(ctx, o.x, o.y);
          if (o.type === 'rock')  drawRock(ctx, o.x, o.y);
          if (o.type === 'flag')  drawFlag(ctx, o.x, o.y, g.tick);
          if (o.type === 'lift')  drawLift(ctx, o.x, o.y);
        }

        // Draw skier
        drawSkier(ctx, g.skierX, g.skierY, g.dir, g.crashed);

        // Draw monster
        if (g.monsterActive) {
          drawMonster(ctx, g.monsterX, g.monsterY, g.tick);
        }

        // Particles
        g.particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.03;
        });
        g.particles = g.particles.filter(p => p.life > 0);
        for (const p of g.particles) {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Win95-style HUD — score in top-left gray bar
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(0, 0, W, 20);
        ctx.strokeStyle = '#808080'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(W, 20); ctx.stroke();
        ctx.fillStyle = '#000000';
        ctx.font = '11px "Arial", sans-serif';
        ctx.fillText(`Distance: ${Math.floor(g.score / 10)} m`, 8, 14);
        if (highScore > 0) {
          ctx.fillText(`Best: ${highScore} m`, 140, 14);
        }

        if (g.monsterActive) {
          // Win95-style warning in red
          ctx.fillStyle = '#ff0000';
          ctx.font = 'bold 11px "Arial", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('WARNING: Abominable Snow Monster!', W / 2, 14);
          ctx.textAlign = 'left';
        } else if (g.score > 5000) {
          // Subtle danger ramp indicator — flickers faster as threat probability rises
          const distPast500 = (g.score - 5000) / 10;
          const danger = Math.min(1, distPast500 / 300); // 0→1 over 300m past 500m
          const flickerRate = 30 + Math.floor(danger * 60); // flicker period 30→90 ticks
          if (g.tick % flickerRate < flickerRate / 2) {
            ctx.fillStyle = `rgba(180,60,0,${0.5 + danger * 0.5})`;
            ctx.font = `bold 11px "Arial", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('⚠ DANGER ZONE — Monster may appear', W / 2, 14);
            ctx.textAlign = 'left';
          }
        }

        // Dead / eaten overlay — Win95 dialog style, auto-resets after 3 seconds
        if (state === 'dead' || state === 'eaten') {
          // Auto-restart countdown
          if (g.restartTimer > 0) {
            g.restartTimer--;
            if (g.restartTimer === 0) {
              resetGame();
              stateRef.current = 'playing';
              setDisplayState('playing');
              return;
            }
          }

          const sc = Math.floor(g.score / 10);
          const isNewHigh = sc >= highScore && highScore > 0;
          const dh = isNewHigh ? 140 : 120;
          const bx = W / 2 - 160, by = H / 2 - dh / 2, bw = 320, bh = dh;
          // Win95 dialog box
          ctx.fillStyle = '#c0c0c0';
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(bx, by + bh); ctx.lineTo(bx, by); ctx.lineTo(bx + bw, by); ctx.stroke();
          ctx.strokeStyle = '#808080';
          ctx.beginPath(); ctx.moveTo(bx + bw, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx, by + bh); ctx.stroke();
          // Title bar
          ctx.fillStyle = '#000080';
          ctx.fillRect(bx + 2, by + 2, bw - 4, 18);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px "Arial", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(state === 'eaten' ? 'SkiFree' : 'SkiFree', bx + bw / 2, by + 15);
          // Message
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 13px "Arial", sans-serif';
          ctx.fillText(state === 'eaten' ? 'You have been eaten by the Abominable' : 'You crashed!', bx + bw / 2, by + 46);
          if (state === 'eaten') {
            ctx.fillText('Snow Monster!', bx + bw / 2, by + 62);
          }
          ctx.font = '12px "Arial", sans-serif';
          ctx.fillStyle = '#000080';
          ctx.fillText(`Distance skied: ${sc} m`, bx + bw / 2, by + (state === 'eaten' ? 82 : 68));
          if (isNewHigh) {
            ctx.fillStyle = '#008000';
            ctx.font = 'bold 12px "Arial", sans-serif';
            ctx.fillText('New personal best!', bx + bw / 2, by + (state === 'eaten' ? 100 : 86));
          }
          // Win95-style OK button
          const btnY = by + bh - 28;
          ctx.fillStyle = '#c0c0c0';
          ctx.fillRect(bx + bw / 2 - 36, btnY, 72, 20);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.strokeRect(bx + bw / 2 - 36, btnY, 72, 20);
          ctx.strokeStyle = '#808080';
          ctx.beginPath();
          ctx.moveTo(bx + bw / 2 + 36, btnY); ctx.lineTo(bx + bw / 2 + 36, btnY + 20);
          ctx.lineTo(bx + bw / 2 - 36, btnY + 20); ctx.stroke();
          ctx.fillStyle = '#000000';
          ctx.font = '11px "Arial", sans-serif';
          ctx.fillText('OK', bx + bw / 2, btnY + 14);
          ctx.textAlign = 'left';
        }
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [highScore, resetGame]);

  // Key events
  useEffect(() => {
    const g = gameRef.current;
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      g.keys.add(e.key);
      if (e.code === 'Space') {
        e.preventDefault();
        if (stateRef.current === 'title' || stateRef.current === 'dead' || stateRef.current === 'eaten') {
          resetGame();
          stateRef.current = 'playing';
          setDisplayState('playing');
        }
      }
    };
    const up = (e: KeyboardEvent) => { g.keys.delete(e.key); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [resetGame]);

  const handleClick = useCallback(() => {
    const state = stateRef.current;
    if (state === 'title' || state === 'dead' || state === 'eaten') {
      resetGame();
      stateRef.current = 'playing';
      setDisplayState('playing');
    }
    // If playing, focus the canvas for keyboard events
  }, [resetGame]);

  return (
    <div className="plugin-bg" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#001020' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ cursor: 'crosshair', display: 'block', imageRendering: 'pixelated' }}
        onClick={handleClick}
      />
      <div style={{ padding: '4px 8px', fontSize: 9, color: 'var(--px-text-dim)', textAlign: 'center' }}>
        {displayState === 'playing'
          ? `← → or A/D to steer · Best: ${highScore}m`
          : displayState === 'title'
          ? 'Classic Windows SkiFree · Click or press SPACE to start'
          : `Score: ${score}m · Best: ${highScore}m · Click or SPACE to retry`
        }
      </div>
    </div>
  );
}
