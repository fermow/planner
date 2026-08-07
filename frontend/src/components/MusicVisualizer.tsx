import { useEffect, useRef } from 'react';

const GRADIENTS: [string, string][] = [
  ['#22d3ee', '#3b82f6'],
  ['#f0c040', '#f97316'],
  ['#e040a0', '#8040e0'],
  ['#60d040', '#10b981'],
  ['#f43f5e', '#a855f7'],
  ['#38bdf8', '#14b8a6'],
];

export function coverGradient(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = GRADIENTS[h % GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Visualizer({ analyser, playing, className }: { analyser: AnalyserNode | null; playing: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let raf = 0;
    const data = new Uint8Array(analyser ? analyser.frequencyBinCount : 64);

    const draw = (time: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const bars = Math.min(48, Math.floor(w / 5));
      if (analyser && playing) {
        analyser.getByteFrequencyData(data);
      } else {
        data.fill(0);
      }

      const step = Math.max(1, Math.floor(data.length / bars));
      const gap = 2;
      const bw = (w - gap * (bars - 1)) / bars;
      for (let i = 0; i < bars; i++) {
        let value = data[i * step] / 255;
        if (!playing) {
          value = (Math.sin(time / 500 + i * 0.5) + 1) / 2 * 0.12;
        }
        const bh = Math.max(2, value * h * 0.95);
        const g = ctx.createLinearGradient(0, h, 0, h - bh);
        g.addColorStop(0, '#40e0d0');
        g.addColorStop(1, '#f0c040');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(i * (bw + gap), h - bh, bw, bh, bw / 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [analyser, playing]);

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%' }} />;
}
