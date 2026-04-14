import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/engine';

type VizMode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

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
];

function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h},${s}%,${l}%,${a})`;
}

export default function MilkDrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const modeRef = useRef<VizMode>(0);
  const [mode, setMode] = useState<VizMode>(0);
  const timeRef = useRef(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; hue: number }[]>([]);
  const matrixRef = useRef<{ y: number; speed: number; chars: string; hue: number }[]>([]);

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

      // Bass / mid / high energy
      const bassEnergy = freq.slice(0, 8).reduce((s, v) => s + v, 0) / 8 / 255;
      const midEnergy  = freq.slice(30, 100).reduce((s, v) => s + v, 0) / 70 / 255;
      const highEnergy = freq.slice(150, 300).reduce((s, v) => s + v, 0) / 150 / 255;
      const totalEnergy = (bassEnergy * 2 + midEnergy + highEnergy * 0.5) / 3.5;

      // ── Background ──────────────────────────────────────────────────────────
      if (m === 0 || m === 2 || m === 4 || m === 6 || m === 8 || m === 9) {
        ctx.fillStyle = `rgba(0,0,0,${m === 6 ? 0.05 : 0.12})`;
      } else if (m === 7) {
        ctx.fillStyle = 'rgba(0,0,8,0.18)';
      } else {
        ctx.fillStyle = 'rgba(0,0,6,0.25)';
      }
      ctx.fillRect(0, 0, W, H);

      switch (m) {

        // ── 0: Spectrum Storm ───────────────────────────────────────────────
        case 0: {
          const numBars = 128;
          const barW = W / numBars;
          for (let i = 0; i < numBars; i++) {
            const fi = Math.floor((i / numBars) * freq.length * 0.7);
            const v = (freq[fi] ?? 0) / 255;
            const barH = v * H * 0.85 * (playing ? 1 : 0.03 + 0.02 * Math.sin(t / 30 + i));
            const hue = (i / numBars) * 280 + t * 0.5;

            // Glow
            ctx.fillStyle = hsl(hue, 100, 60, 0.15);
            ctx.fillRect(i * barW, H - barH - 4, barW - 1, barH + 4);

            // Core
            const grad = ctx.createLinearGradient(0, H - barH, 0, H);
            grad.addColorStop(0, hsl(hue, 100, 75, 1));
            grad.addColorStop(0.5, hsl(hue, 100, 55, 0.9));
            grad.addColorStop(1, hsl(hue, 100, 35, 0.5));
            ctx.fillStyle = grad;
            ctx.fillRect(i * barW, H - barH, barW - 1, barH);

            // Peak flash
            if (v > 0.7) {
              ctx.fillStyle = 'rgba(255,255,255,0.9)';
              ctx.fillRect(i * barW, H - barH - 2, barW - 1, 2);
            }
          }
          break;
        }

        // ── 1: Waveform Tunnel ──────────────────────────────────────────────
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

        // ── 2: Starburst ────────────────────────────────────────────────────
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

          // Center pulse
          const pulseR = bassEnergy * 30 + 8;
          const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR * 2);
          grd.addColorStop(0, hsl((t * 2) % 360, 100, 80, 0.9));
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath(); ctx.arc(cx, cy, pulseR * 2, 0, Math.PI * 2);
          ctx.fillStyle = grd; ctx.fill();
          break;
        }

        // ── 3: Aurora Borealis ──────────────────────────────────────────────
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

        // ── 4: Particle Swarm ───────────────────────────────────────────────
        case 4: {
          const ps = particlesRef.current;
          // Spawn particles on beat
          if (bassEnergy > 0.4 || (!playing && Math.random() < 0.02)) {
            const count = Math.floor(bassEnergy * 8) + 1;
            for (let i = 0; i < count; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = (1 + bassEnergy * 4) * (Math.random() * 0.8 + 0.5);
              ps.push({
                x: W / 2 + (Math.random() - 0.5) * 20,
                y: H / 2 + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                hue: (t * 2 + Math.random() * 60) % 360,
              });
            }
          }
          // Update + draw
          for (let i = ps.length - 1; i >= 0; i--) {
            const p = ps[i];
            p.x += p.vx * (1 + midEnergy);
            p.y += p.vy * (1 + midEnergy);
            p.vy += 0.04;
            p.life -= 0.012;
            if (p.life <= 0 || p.x < 0 || p.x > W || p.y > H) { ps.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.life * 3 + 1, 0, Math.PI * 2);
            ctx.fillStyle = hsl(p.hue, 100, 65, p.life);
            ctx.shadowColor = hsl(p.hue, 100, 70, 1);
            ctx.shadowBlur = 6;
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          // Keep pool bounded
          if (ps.length > 800) ps.splice(0, ps.length - 800);
          break;
        }

        // ── 5: Radial Rings ─────────────────────────────────────────────────
        case 5: {
          const cx = W / 2, cy = H / 2;
          const numRings = 32;
          for (let r = 0; r < numRings; r++) {
            const fi = Math.floor((r / numRings) * 150);
            const v = (freq[fi] ?? 0) / 255;
            const radius = (r + 1) * (Math.min(W, H) / (numRings * 2 + 2)) + v * 15;
            const hue = (r * 11 + t * 0.5) % 360;

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = hsl(hue, 100, 55 + v * 25, v * 0.9 + 0.1);
            ctx.lineWidth = v * 4 + 0.5;
            ctx.shadowColor = hsl(hue, 100, 70, 1);
            ctx.shadowBlur = v * 10;
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
          break;
        }

        // ── 6: Matrix Rain ──────────────────────────────────────────────────
        case 6: {
          const cols = Math.floor(W / 14);
          const charset = '01アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF';

          if (matrixRef.current.length !== cols) {
            matrixRef.current = Array.from({ length: cols }, () => ({
              y: Math.random() * H,
              speed: 1.5 + Math.random() * 3,
              chars: charset,
              hue: 140 + Math.random() * 80,
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

            // Trail
            for (let trail = 1; trail < 8; trail++) {
              ctx.fillStyle = hsl(hue, 100, 45, 0.2 - trail * 0.025);
              ctx.fillText(charset[Math.floor(t / trail) % charset.length], i * 14, col.y - trail * 14);
            }
          });
          break;
        }

        // ── 7: Plasma Wave ──────────────────────────────────────────────────
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

        // ── 8: Lissajous ────────────────────────────────────────────────────
        case 8: {
          const cx = W / 2, cy = H / 2;
          const size = Math.min(W, H) * 0.45;
          const step = 4;
          const numSamples = Math.min(wave.length, 1024);

          ctx.beginPath();
          for (let i = 0; i < numSamples - step; i++) {
            const xVal = wave[i] * size * (1 + bassEnergy * 0.5);
            const yVal = wave[(i + Math.floor(numSamples / 4)) % numSamples] * size * (1 + bassEnergy * 0.5);
            const rx = cx + xVal;
            const ry = cy + yVal;
            const hue = (i / numSamples * 360 + t * 0.5) % 360;
            if (i === 0) {
              ctx.moveTo(rx, ry);
            } else {
              ctx.strokeStyle = hsl(hue, 100, 60, 0.3 + totalEnergy * 0.5);
              ctx.lineWidth = 1.5;
              ctx.shadowColor = hsl(hue, 100, 70, 0.8);
              ctx.shadowBlur = 6;
              ctx.lineTo(rx, ry);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(rx, ry);
            }
          }
          ctx.shadowBlur = 0;
          break;
        }

        // ── 9: Kaleidoscope ─────────────────────────────────────────────────
        case 9: {
          const cx = W / 2, cy = H / 2;
          const slices = 8;
          const sliceAngle = (Math.PI * 2) / slices;
          ctx.save();
          ctx.translate(cx, cy);
          for (let slice = 0; slice < slices; slice++) {
            ctx.save();
            ctx.rotate(slice * sliceAngle + t * 0.004 * (slice % 2 === 0 ? 1 : -1));
            for (let i = 0; i < 40; i++) {
              const fi = Math.floor(i / 40 * 120);
              const v = (freq[fi] ?? 0) / 255;
              const r = i * (Math.min(W, H) / 80);
              const angle = v * Math.PI + Math.sin(t * 0.02 + i * 0.3) * 0.5;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              const hue = (i * 9 + t * 0.7 + slice * 45) % 360;
              const size = v * 8 + 2;
              ctx.beginPath();
              ctx.arc(x, y, size, 0, Math.PI * 2);
              ctx.fillStyle = hsl(hue, 100, 60, v * 0.7 + 0.1);
              ctx.shadowColor = hsl(hue, 100, 70, 1);
              ctx.shadowBlur = size * 2;
              ctx.fill();
            }
            ctx.restore();
          }
          ctx.shadowBlur = 0;
          ctx.restore();
          break;
        }
      }

      // ── Title overlay ──────────────────────────────────────────────────────
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillText(`${modeRef.current + 1}/10  ${VIZ_NAMES[modeRef.current]}`, 10, H - 10);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cycleMode = () => {
    setMode(prev => ((prev + 1) % 10) as VizMode);
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
      {/* Mode dots */}
      <div style={{
        position: 'absolute', bottom: 24, right: 10,
        display: 'flex', gap: 4,
      }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            onClick={e => { e.stopPropagation(); setMode(i as VizMode); }}
            style={{
              width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
              background: mode === i ? '#fff' : 'rgba(255,255,255,0.2)',
              boxShadow: mode === i ? '0 0 4px #fff' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}
