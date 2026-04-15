import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/engine';

const NUM_VIZ = 20;
type VizMode = number;

const VIZ_NAMES = [
  'Spectrum Storm',
  'Waveform Tunnel',
  'Starburst',
  'Aurora Borealis',
  'Particle Swarm',
  'Radial Rings',
  'Matrix Rain',
  'Plasma Wave',
  'Lissajous',
  'Kaleidoscope',
  'DNA Helix',
  'Nebula Drift',
  'Hypnotic Spiral',
  'Fire Storm',
  'Grid Warp',
  'Oscilloscope Ring',
  'Mirror Bars',
  'Star Tunnel',
  'Ripple Pool',
  'Fractal Web',
];

function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h},${s}%,${l}%,${a})`;
}

const STORAGE_KEY = 'musicOS98_milkdrop_mode';

export default function MilkDrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const modeRef = useRef<VizMode>(0);
  const [mode, setMode] = useState<VizMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Math.min(parseInt(saved, 10) % NUM_VIZ, NUM_VIZ - 1) : 0;
  });
  const timeRef = useRef(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; hue: number }[]>([]);
  const matrixRef = useRef<{ y: number; speed: number; chars: string; hue: number }[]>([]);
  const starsRef = useRef<{ x: number; y: number; z: number; pz: number }[]>([]);
  const ripplesRef = useRef<{ x: number; y: number; r: number; maxR: number; alpha: number; hue: number }[]>([]);
  const webRef = useRef<{ x: number; y: number; vx: number; vy: number; hue: number }[]>([]);
  const fireRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; hue: number; size: number }[]>([]);

  const setAndSaveMode = (m: VizMode) => {
    localStorage.setItem(STORAGE_KEY, String(m));
    setMode(m);
  };

  // Keep mode ref in sync for the rAF loop
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      timeRef.current += 1;
      const t = timeRef.current;
      const W = canvas.width;
      const H = canvas.height;
      const m = modeRef.current;

      const freq = audioEngine.getFrequencyData() ?? new Uint8Array(1024);
      const wave = audioEngine.getWaveformData() ?? new Float32Array(2048);
      const playing = audioEngine.isPlaying;

      const bassEnergy = freq.slice(0, 8).reduce((s, v) => s + v, 0) / 8 / 255;
      const midEnergy  = freq.slice(30, 100).reduce((s, v) => s + v, 0) / 70 / 255;
      const highEnergy = freq.slice(150, 300).reduce((s, v) => s + v, 0) / 150 / 255;
      const totalEnergy = (bassEnergy * 2 + midEnergy + highEnergy * 0.5) / 3.5;

      // ── Background ───────────────────────────────────────────────────────────
      const bgAlphas: Record<number, number> = { 6: 0.05, 7: 0.18, 10: 0.15, 13: 0.08, 17: 0.1, 18: 0.2, 19: 0.12 };
      ctx.fillStyle = `rgba(0,0,${m === 7 ? 8 : 0},${bgAlphas[m] ?? 0.12})`;
      ctx.fillRect(0, 0, W, H);

      switch (m) {

        // ── 0: Spectrum Storm ─────────────────────────────────────────────────
        case 0: {
          const numBars = 128;
          const barW = W / numBars;
          for (let i = 0; i < numBars; i++) {
            const fi = Math.floor((i / numBars) * freq.length * 0.7);
            const v = (freq[fi] ?? 0) / 255;
            const barH = v * H * 0.85 * (playing ? 1 : 0.03 + 0.02 * Math.sin(t / 30 + i));
            const hue = (i / numBars) * 280 + t * 0.5;
            ctx.fillStyle = hsl(hue, 100, 60, 0.15);
            ctx.fillRect(i * barW, H - barH - 4, barW - 1, barH + 4);
            const grad = ctx.createLinearGradient(0, H - barH, 0, H);
            grad.addColorStop(0, hsl(hue, 100, 75, 1));
            grad.addColorStop(0.5, hsl(hue, 100, 55, 0.9));
            grad.addColorStop(1, hsl(hue, 100, 35, 0.5));
            ctx.fillStyle = grad;
            ctx.fillRect(i * barW, H - barH, barW - 1, barH);
            if (v > 0.7) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(i * barW, H - barH - 2, barW - 1, 2); }
          }
          break;
        }

        // ── 1: Waveform Tunnel ────────────────────────────────────────────────
        case 1: {
          const cx = W / 2, cy = H / 2;
          for (let ring = 0; ring < 24; ring++) {
            const z = ((t * 0.5 + ring * 14) % 340) / 340;
            const r = z * Math.min(W, H) * 0.6;
            const alpha = z * (1 - z) * 3;
            const waveOffset = Math.floor(ring * 3) % wave.length;
            const waveVal = wave[waveOffset] ?? 0;
            const radius = r + waveVal * 30 * (bassEnergy + 0.2);
            const hue = (ring * 15 + t * 0.8) % 360;
            ctx.beginPath();
            for (let j = 0; j <= 64; j++) {
              const angle = (j / 64) * Math.PI * 2;
              const wi = Math.floor(j / 64 * wave.length);
              const distort = (wave[wi] ?? 0) * 20 * (bassEnergy + 0.1);
              const rx = cx + Math.cos(angle) * (radius + distort);
              const ry = cy + Math.sin(angle) * (radius * 0.5 + distort * 0.5);
              j === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            ctx.strokeStyle = hsl(hue, 100, 65, alpha * 0.8);
            ctx.lineWidth = 1.5 - z;
            ctx.stroke();
          }
          break;
        }

        // ── 2: Starburst ──────────────────────────────────────────────────────
        case 2: {
          const cx = W / 2, cy = H / 2;
          const numRays = 256;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 0.003 + bassEnergy * 0.1);
          for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            const fi = Math.floor((i / numRays) * freq.length * 0.6);
            const v = (freq[fi] ?? 0) / 255;
            const len = v * Math.min(W, H) * 0.45 * (playing ? 1 : 0.05);
            const hue = (i / numRays * 360 + t * 0.6) % 360;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            ctx.strokeStyle = hsl(hue, 100, 60, v * 0.9 + 0.1);
            ctx.lineWidth = v * 2 + 0.5;
            ctx.shadowColor = hsl(hue, 100, 70, 1);
            ctx.shadowBlur = v * 8;
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
          ctx.restore();
          const pulseR = bassEnergy * 30 + 8;
          const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR * 2);
          grd.addColorStop(0, hsl((t * 2) % 360, 100, 80, 0.9));
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath(); ctx.arc(cx, cy, pulseR * 2, 0, Math.PI * 2);
          ctx.fillStyle = grd; ctx.fill();
          break;
        }

        // ── 3: Aurora Borealis ────────────────────────────────────────────────
        case 3: {
          const bands = 12;
          for (let b = 0; b < bands; b++) {
            const fi = Math.floor((b / bands) * 80);
            const v = (freq[fi] ?? 0) / 255;
            const y0 = H * 0.15 + b * (H * 0.6 / bands);
            const amplitude = v * 60 * (playing ? 1 : 0.3) + 5;
            const hue = (b * 22 + t * 0.3) % 360;
            const alpha = v * 0.5 + 0.05;
            ctx.beginPath();
            ctx.moveTo(0, y0);
            for (let x = 0; x <= W; x += 4) {
              const phase = x / W * Math.PI * 4 + t * 0.02 + b * 0.7;
              const y = y0 + Math.sin(phase) * amplitude + Math.sin(phase * 2.3) * amplitude * 0.3;
              ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
            ctx.fillStyle = hsl(hue, 85, 55, alpha);
            ctx.fill();
          }
          break;
        }

        // ── 4: Particle Swarm ─────────────────────────────────────────────────
        case 4: {
          const ps = particlesRef.current;
          if (bassEnergy > 0.4 || (!playing && Math.random() < 0.02)) {
            const count = Math.floor(bassEnergy * 8) + 1;
            for (let i = 0; i < count; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = (1 + bassEnergy * 4) * (Math.random() * 0.8 + 0.5);
              ps.push({ x: W / 2 + (Math.random() - 0.5) * 20, y: H / 2 + (Math.random() - 0.5) * 20, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, hue: (t * 2 + Math.random() * 60) % 360 });
            }
          }
          for (let i = ps.length - 1; i >= 0; i--) {
            const p = ps[i];
            p.x += p.vx * (1 + midEnergy); p.y += p.vy * (1 + midEnergy); p.vy += 0.04; p.life -= 0.012;
            if (p.life <= 0 || p.x < 0 || p.x > W || p.y > H) { ps.splice(i, 1); continue; }
            ctx.beginPath(); ctx.arc(p.x, p.y, p.life * 3 + 1, 0, Math.PI * 2);
            ctx.fillStyle = hsl(p.hue, 100, 65, p.life);
            ctx.shadowColor = hsl(p.hue, 100, 70, 1); ctx.shadowBlur = 6; ctx.fill();
          }
          ctx.shadowBlur = 0;
          if (ps.length > 800) ps.splice(0, ps.length - 800);
          break;
        }

        // ── 5: Radial Rings ───────────────────────────────────────────────────
        case 5: {
          const cx = W / 2, cy = H / 2;
          const numRings = 32;
          for (let r = 0; r < numRings; r++) {
            const fi = Math.floor((r / numRings) * 150);
            const v = (freq[fi] ?? 0) / 255;
            const radius = (r + 1) * (Math.min(W, H) / (numRings * 2 + 2)) + v * 15;
            const hue = (r * 11 + t * 0.5) % 360;
            ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = hsl(hue, 100, 55 + v * 25, v * 0.9 + 0.1);
            ctx.lineWidth = v * 4 + 0.5;
            ctx.shadowColor = hsl(hue, 100, 70, 1); ctx.shadowBlur = v * 10; ctx.stroke();
          }
          ctx.shadowBlur = 0;
          break;
        }

        // ── 6: Matrix Rain ────────────────────────────────────────────────────
        case 6: {
          const cols = Math.floor(W / 14);
          const charset = '01アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF';
          if (matrixRef.current.length !== cols) {
            matrixRef.current = Array.from({ length: cols }, () => ({
              y: Math.random() * H, speed: 1.5 + Math.random() * 3, chars: charset, hue: 140 + Math.random() * 80,
            }));
          }
          ctx.font = 'bold 12px monospace';
          matrixRef.current.forEach((col, i) => {
            const v = (freq[Math.floor(i / cols * 100)] ?? 0) / 255;
            col.speed = 1.5 + v * 5;
            col.y += col.speed * (playing ? (1 + bassEnergy * 2) : 0.5);
            if (col.y > H) col.y = -14;
            const ch = charset[Math.floor(Math.random() * charset.length)];
            const hue = col.hue + v * 60;
            ctx.fillStyle = hsl(hue, 100, 80, 0.95);
            ctx.fillText(ch, i * 14, col.y);
            for (let trail = 1; trail < 8; trail++) {
              ctx.fillStyle = hsl(hue, 100, 45, 0.2 - trail * 0.025);
              ctx.fillText(charset[Math.floor(t / trail) % charset.length], i * 14, col.y - trail * 14);
            }
          });
          break;
        }

        // ── 7: Plasma Wave ────────────────────────────────────────────────────
        case 7: {
          const step = 6;
          for (let y = 0; y < H; y += step) {
            for (let x = 0; x < W; x += step) {
              const fi = Math.floor((x / W) * 80);
              const v = (freq[fi] ?? 0) / 255;
              const plasma =
                Math.sin(x * 0.015 + t * 0.05 + bassEnergy * 3) +
                Math.sin(y * 0.015 - t * 0.04) +
                Math.sin((x + y) * 0.01 + t * 0.03) +
                Math.sin(Math.sqrt(x * x + y * y) * 0.02 - t * 0.06);
              const norm = (plasma + 4) / 8;
              const hue = (norm * 360 + t * 0.8) % 360;
              const bright = 35 + v * 30 + norm * 25;
              ctx.fillStyle = hsl(hue, 90, bright, 0.55 + v * 0.35);
              ctx.fillRect(x, y, step, step);
            }
          }
          break;
        }

        // ── 8: Lissajous ──────────────────────────────────────────────────────
        case 8: {
          const cx = W / 2, cy = H / 2;
          const size = Math.min(W, H) * 0.45;
          const numSamples = Math.min(wave.length, 1024);
          ctx.beginPath();
          for (let i = 0; i < numSamples - 4; i++) {
            const xVal = wave[i] * size * (1 + bassEnergy * 0.5);
            const yVal = wave[(i + Math.floor(numSamples / 4)) % numSamples] * size * (1 + bassEnergy * 0.5);
            const rx = cx + xVal; const ry = cy + yVal;
            const hue = (i / numSamples * 360 + t * 0.5) % 360;
            if (i === 0) { ctx.moveTo(rx, ry); } else {
              ctx.strokeStyle = hsl(hue, 100, 60, 0.3 + totalEnergy * 0.5);
              ctx.lineWidth = 1.5; ctx.shadowColor = hsl(hue, 100, 70, 0.8); ctx.shadowBlur = 6;
              ctx.lineTo(rx, ry); ctx.stroke(); ctx.beginPath(); ctx.moveTo(rx, ry);
            }
          }
          ctx.shadowBlur = 0;
          break;
        }

        // ── 9: Kaleidoscope ───────────────────────────────────────────────────
        case 9: {
          const cx = W / 2, cy = H / 2;
          const slices = 8;
          const sliceAngle = (Math.PI * 2) / slices;
          ctx.save(); ctx.translate(cx, cy);
          for (let slice = 0; slice < slices; slice++) {
            ctx.save();
            ctx.rotate(slice * sliceAngle + t * 0.004 * (slice % 2 === 0 ? 1 : -1));
            for (let i = 0; i < 40; i++) {
              const fi = Math.floor(i / 40 * 120);
              const v = (freq[fi] ?? 0) / 255;
              const r = i * (Math.min(W, H) / 80);
              const angle = v * Math.PI + Math.sin(t * 0.02 + i * 0.3) * 0.5;
              const x = Math.cos(angle) * r; const y = Math.sin(angle) * r;
              const hue = (i * 9 + t * 0.7 + slice * 45) % 360;
              const sz = v * 8 + 2;
              ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2);
              ctx.fillStyle = hsl(hue, 100, 60, v * 0.7 + 0.1);
              ctx.shadowColor = hsl(hue, 100, 70, 1); ctx.shadowBlur = sz * 2; ctx.fill();
            }
            ctx.restore();
          }
          ctx.shadowBlur = 0; ctx.restore();
          break;
        }

        // ── 10: DNA Helix ─────────────────────────────────────────────────────
        case 10: {
          const cx = W / 2;
          const amplitude = H * 0.35 * (1 + bassEnergy * 0.3);
          const speed = t * 0.04;
          const nodes = 40;
          // Draw two strands
          for (let strand = 0; strand < 2; strand++) {
            ctx.beginPath();
            for (let i = 0; i <= nodes; i++) {
              const y = (i / nodes) * H;
              const phase = (i / nodes) * Math.PI * 6 + speed + strand * Math.PI;
              const x = cx + Math.cos(phase) * amplitude;
              const fi = Math.floor((i / nodes) * freq.length * 0.6);
              const v = (freq[fi] ?? 0) / 255;
              const hue = (i * 9 + t * 0.5 + strand * 120) % 360;
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
              // Nodes
              if (i % 4 === 0) {
                ctx.stroke(); ctx.beginPath();
                ctx.arc(x, y, 3 + v * 6, 0, Math.PI * 2);
                ctx.fillStyle = hsl(hue, 100, 65, 0.9);
                ctx.shadowColor = hsl(hue, 100, 80, 1); ctx.shadowBlur = v * 12; ctx.fill();
                ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(x, y);
              }
            }
            const hue = (strand * 160 + t * 0.3) % 360;
            ctx.strokeStyle = hsl(hue, 90, 60, 0.7); ctx.lineWidth = 2; ctx.stroke();
          }
          // Cross rungs
          for (let i = 0; i <= nodes; i += 4) {
            const y = (i / nodes) * H;
            const phase = (i / nodes) * Math.PI * 6 + speed;
            const x1 = cx + Math.cos(phase) * amplitude;
            const x2 = cx + Math.cos(phase + Math.PI) * amplitude;
            const fi = Math.floor((i / nodes) * 80);
            const v = (freq[fi] ?? 0) / 255;
            const hue = (i * 9 + t) % 360;
            ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
            ctx.strokeStyle = hsl(hue, 80, 60, v * 0.6 + 0.1); ctx.lineWidth = 1.5; ctx.stroke();
          }
          break;
        }

        // ── 11: Nebula Drift ──────────────────────────────────────────────────
        case 11: {
          const cx = W / 2, cy = H / 2;
          // Nebula clouds
          for (let cloud = 0; cloud < 6; cloud++) {
            const angle = cloud / 6 * Math.PI * 2 + t * 0.003;
            const dist = 80 + Math.sin(t * 0.01 + cloud) * 40 + bassEnergy * 60;
            const cx2 = cx + Math.cos(angle) * dist;
            const cy2 = cy + Math.sin(angle) * dist;
            const fi = Math.floor(cloud / 6 * 80);
            const v = (freq[fi] ?? 0) / 255;
            const r = 60 + v * 80;
            const hue = (cloud * 60 + t * 0.2) % 360;
            const grd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r);
            grd.addColorStop(0, hsl(hue, 80, 50, v * 0.4 + 0.05));
            grd.addColorStop(0.5, hsl(hue + 30, 70, 35, v * 0.2 + 0.02));
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(cx2 - r, cy2 - r, r * 2, r * 2);
          }
          // Stars
          for (let s = 0; s < 60; s++) {
            const sx = ((s * 137 + t * 0.1) % W + W) % W;
            const sy = ((s * 91 + t * 0.07) % H + H) % H;
            const v = (freq[s % freq.length] ?? 0) / 255;
            const size = 0.5 + v * 2;
            const hue = (s * 17 + t * 0.3) % 360;
            ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fillStyle = hsl(hue, 60, 90, 0.7 + v * 0.3);
            ctx.shadowColor = hsl(hue, 100, 80, 1); ctx.shadowBlur = size * 4; ctx.fill();
          }
          ctx.shadowBlur = 0;
          break;
        }

        // ── 12: Hypnotic Spiral ───────────────────────────────────────────────
        case 12: {
          const cx = W / 2, cy = H / 2;
          const turns = 8;
          const pointsPerTurn = 60;
          const totalPoints = turns * pointsPerTurn;
          ctx.beginPath();
          for (let i = 0; i <= totalPoints; i++) {
            const angle = (i / pointsPerTurn) * Math.PI * 2 + t * 0.015;
            const progress = i / totalPoints;
            const fi = Math.floor(progress * freq.length * 0.8);
            const v = (freq[fi] ?? 0) / 255;
            const baseR = progress * Math.min(W, H) * 0.48;
            const r = baseR + v * 20 * (1 + bassEnergy);
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            const hue = (progress * 360 + t * 0.8) % 360;
            ctx.strokeStyle = hsl(hue, 100, 55 + v * 20, 0.6 + v * 0.3);
            ctx.lineWidth = 1 + v * 3;
            ctx.shadowColor = hsl(hue, 100, 70, 0.8); ctx.shadowBlur = 4;
            if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); }
          }
          ctx.shadowBlur = 0;
          break;
        }

        // ── 13: Fire Storm ────────────────────────────────────────────────────
        case 13: {
          const fire = fireRef.current;
          const spawnRate = Math.floor(bassEnergy * 12) + 3;
          for (let i = 0; i < spawnRate; i++) {
            const x = W * 0.2 + Math.random() * W * 0.6;
            const spread = 2 + bassEnergy * 4;
            fire.push({
              x, y: H - 10, vx: (Math.random() - 0.5) * spread, vy: -(1 + Math.random() * 4 + bassEnergy * 6),
              life: 1, hue: 10 + Math.random() * 30, size: 3 + Math.random() * 6 + bassEnergy * 8,
            });
          }
          for (let i = fire.length - 1; i >= 0; i--) {
            const p = fire[i];
            p.x += p.vx; p.vy += 0.05; p.y += p.vy;
            p.vx *= 0.99; p.life -= 0.018; p.hue += 1;
            if (p.life <= 0 || p.y < 0) { fire.splice(i, 1); continue; }
            const hue = Math.min(60, p.hue + (1 - p.life) * 40);
            const sz = p.size * p.life;
            const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz);
            grd.addColorStop(0, hsl(hue, 100, 80, p.life * 0.9));
            grd.addColorStop(0.5, hsl(hue - 10, 100, 55, p.life * 0.5));
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
            ctx.fillStyle = grd; ctx.fill();
          }
          if (fire.length > 1200) fire.splice(0, fire.length - 1200);
          break;
        }

        // ── 14: Grid Warp ─────────────────────────────────────────────────────
        case 14: {
          const cols = 24, rows = 16;
          const cw = W / cols, rh = H / rows;
          ctx.lineWidth = 0.8;
          for (let gy = 0; gy <= rows; gy++) {
            ctx.beginPath();
            for (let gx = 0; gx <= cols; gx++) {
              const fi = Math.floor(gx / cols * freq.length * 0.6);
              const v = (freq[fi] ?? 0) / 255;
              const wx = gx * cw + Math.sin(gy * 0.5 + t * 0.04) * v * 20;
              const wy = gy * rh + Math.cos(gx * 0.3 + t * 0.035 + bassEnergy * 2) * v * 18;
              const hue = (gx * 15 + gy * 10 + t * 0.5) % 360;
              ctx.strokeStyle = hsl(hue, 80, 55, 0.2 + v * 0.6);
              gx === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
            }
            ctx.stroke();
          }
          for (let gx = 0; gx <= cols; gx++) {
            ctx.beginPath();
            for (let gy = 0; gy <= rows; gy++) {
              const fi = Math.floor(gx / cols * freq.length * 0.6);
              const v = (freq[fi] ?? 0) / 255;
              const wx = gx * cw + Math.sin(gy * 0.5 + t * 0.04) * v * 20;
              const wy = gy * rh + Math.cos(gx * 0.3 + t * 0.035 + bassEnergy * 2) * v * 18;
              const hue = (gx * 15 + gy * 10 + t * 0.5) % 360;
              ctx.strokeStyle = hsl(hue, 80, 55, 0.2 + v * 0.6);
              gy === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
            }
            ctx.stroke();
          }
          break;
        }

        // ── 15: Oscilloscope Ring ─────────────────────────────────────────────
        case 15: {
          const cx = W / 2, cy = H / 2;
          const numRings = 3;
          for (let ring = 0; ring < numRings; ring++) {
            const baseR = (0.15 + ring * 0.12) * Math.min(W, H);
            const numPoints = 256;
            ctx.beginPath();
            for (let i = 0; i <= numPoints; i++) {
              const angle = (i / numPoints) * Math.PI * 2;
              const wi = Math.floor((i / numPoints) * Math.min(wave.length, 512));
              const wv = wave[wi] ?? 0;
              const r = baseR + wv * 60 * (1 + bassEnergy * 0.5) + ring * bassEnergy * 20;
              const x = cx + Math.cos(angle) * r;
              const y = cy + Math.sin(angle) * r;
              const hue = (angle / Math.PI * 180 + t * 0.8 + ring * 120) % 360;
              if (i === 0) { ctx.moveTo(x, y); } else {
                ctx.strokeStyle = hsl(hue, 100, 60, 0.8);
                ctx.lineWidth = 2; ctx.shadowColor = hsl(hue, 100, 70, 1); ctx.shadowBlur = 6;
                ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
              }
            }
            ctx.closePath();
          }
          ctx.shadowBlur = 0;
          // Center dot
          const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20 + bassEnergy * 30);
          grd.addColorStop(0, hsl((t * 2) % 360, 100, 80, 0.9));
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath(); ctx.arc(cx, cy, 20 + bassEnergy * 30, 0, Math.PI * 2);
          ctx.fillStyle = grd; ctx.fill();
          break;
        }

        // ── 16: Mirror Bars ───────────────────────────────────────────────────
        case 16: {
          const numBars = 96;
          const barW = W / numBars;
          const cy = H / 2;
          for (let i = 0; i < numBars; i++) {
            const fi = Math.floor((i / numBars) * freq.length * 0.75);
            const v = (freq[fi] ?? 0) / 255;
            const barH = v * cy * 0.9 * (playing ? 1 : 0.04);
            const hue = (i / numBars * 360 + t * 0.4) % 360;
            const grad = ctx.createLinearGradient(0, cy - barH, 0, cy);
            grad.addColorStop(0, hsl(hue, 100, 75, 1));
            grad.addColorStop(1, hsl(hue, 100, 45, 0.4));
            ctx.fillStyle = grad;
            ctx.fillRect(i * barW, cy - barH, barW - 1, barH);
            const grad2 = ctx.createLinearGradient(0, cy, 0, cy + barH);
            grad2.addColorStop(0, hsl(hue, 100, 45, 0.4));
            grad2.addColorStop(1, hsl(hue, 100, 75, 1));
            ctx.fillStyle = grad2;
            ctx.fillRect(i * barW, cy, barW - 1, barH);
            if (v > 0.75) {
              ctx.fillStyle = 'rgba(255,255,255,0.8)';
              ctx.fillRect(i * barW, cy - barH - 2, barW - 1, 2);
              ctx.fillRect(i * barW, cy + barH, barW - 1, 2);
            }
          }
          // Center line
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(0, cy - 0.5, W, 1);
          break;
        }

        // ── 17: Star Tunnel ───────────────────────────────────────────────────
        case 17: {
          const cx = W / 2, cy = H / 2;
          const stars = starsRef.current;
          if (stars.length === 0) {
            for (let i = 0; i < 300; i++) {
              stars.push({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: Math.random() * W, pz: 0 });
            }
          }
          const speed = 3 + bassEnergy * 12;
          for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.pz = s.z; s.z -= speed;
            if (s.z <= 0) { s.x = (Math.random() - 0.5) * W; s.y = (Math.random() - 0.5) * H; s.z = W; s.pz = s.z; continue; }
            const sx = (s.x / s.z) * W + cx;
            const sy = (s.y / s.z) * H + cy;
            const px = (s.x / s.pz) * W + cx;
            const py = (s.y / s.pz) * H + cy;
            const size = Math.max(0.3, (1 - s.z / W) * 3);
            const hue = ((i * 7 + t * 0.5) % 360);
            const bright = 0.4 + (1 - s.z / W) * 0.6;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy);
            ctx.strokeStyle = hsl(hue, 80, 80, bright);
            ctx.lineWidth = size;
            ctx.shadowColor = hsl(hue, 100, 90, 0.8); ctx.shadowBlur = size * 3; ctx.stroke();
          }
          ctx.shadowBlur = 0;
          break;
        }

        // ── 18: Ripple Pool ───────────────────────────────────────────────────
        case 18: {
          const ripples = ripplesRef.current;
          if (bassEnergy > 0.35 || (!playing && Math.random() < 0.015)) {
            ripples.push({
              x: W * 0.2 + Math.random() * W * 0.6,
              y: H * 0.2 + Math.random() * H * 0.6,
              r: 0, maxR: 80 + bassEnergy * 120 + Math.random() * 60,
              alpha: 0.8, hue: (t * 3 + Math.random() * 60) % 360,
            });
          }
          for (let i = ripples.length - 1; i >= 0; i--) {
            const rp = ripples[i];
            rp.r += 2 + bassEnergy * 3; rp.alpha -= 0.008;
            if (rp.alpha <= 0 || rp.r > rp.maxR) { ripples.splice(i, 1); continue; }
            const progress = rp.r / rp.maxR;
            ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
            ctx.strokeStyle = hsl(rp.hue, 90, 60, rp.alpha * (1 - progress));
            ctx.lineWidth = 2 - progress;
            ctx.shadowColor = hsl(rp.hue, 100, 70, 0.5); ctx.shadowBlur = 8; ctx.stroke();
          }
          ctx.shadowBlur = 0;
          if (ripples.length > 40) ripples.splice(0, ripples.length - 40);
          break;
        }

        // ── 19: Fractal Web ───────────────────────────────────────────────────
        case 19: {
          const web = webRef.current;
          if (web.length === 0) {
            for (let i = 0; i < 60; i++) {
              web.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, hue: Math.random() * 360 });
            }
          }
          const maxDist = 100 + bassEnergy * 60;
          // Update nodes
          for (const node of web) {
            node.x += node.vx * (1 + midEnergy); node.y += node.vy * (1 + midEnergy);
            if (node.x < 0 || node.x > W) node.vx *= -1;
            if (node.y < 0 || node.y > H) node.vy *= -1;
            node.hue = (node.hue + 0.3 + bassEnergy) % 360;
          }
          // Draw connections
          for (let i = 0; i < web.length; i++) {
            for (let j = i + 1; j < web.length; j++) {
              const dx = web[i].x - web[j].x; const dy = web[i].y - web[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < maxDist) {
                const alpha = (1 - dist / maxDist) * 0.6;
                const hue = (web[i].hue + web[j].hue) / 2;
                ctx.beginPath(); ctx.moveTo(web[i].x, web[i].y); ctx.lineTo(web[j].x, web[j].y);
                ctx.strokeStyle = hsl(hue, 90, 60, alpha); ctx.lineWidth = (1 - dist / maxDist) * 2;
                ctx.shadowColor = hsl(hue, 100, 70, 0.4); ctx.shadowBlur = 3; ctx.stroke();
              }
            }
          }
          ctx.shadowBlur = 0;
          // Node dots
          for (const node of web) {
            ctx.beginPath(); ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = hsl(node.hue, 100, 70, 0.8); ctx.fill();
          }
          break;
        }
      }

      // ── Title overlay ──────────────────────────────────────────────────────
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillText(`${modeRef.current + 1}/${NUM_VIZ}  ${VIZ_NAMES[modeRef.current]}`, 10, H - 10);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cycleMode = () => {
    setAndSaveMode((mode + 1) % NUM_VIZ);
  };

  return (
    <div style={{
      width: '100%', height: '100%', background: '#000',
      display: 'flex', flexDirection: 'column', cursor: 'pointer',
      position: 'relative',
    }}
      onClick={cycleMode}
      title="Click to cycle visualization"
    >
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {/* Mode dots — two rows of 10 */}
      <div style={{
        position: 'absolute', bottom: 24, right: 10,
        display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end',
      }}>
        {[0, 1].map(row => (
          <div key={row} style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 10 }, (_, i) => {
              const idx = row * 10 + i;
              return (
                <div
                  key={idx}
                  onClick={e => { e.stopPropagation(); setAndSaveMode(idx); }}
                  style={{
                    width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
                    background: mode === idx ? '#fff' : 'rgba(255,255,255,0.2)',
                    boxShadow: mode === idx ? '0 0 4px #fff' : 'none',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
