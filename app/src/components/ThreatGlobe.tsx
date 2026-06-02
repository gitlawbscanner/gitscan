import { useEffect, useRef } from 'react';

type Props = { criticalCount: number; size?: number };

const STATIC_DOTS = [
  [0.15, 0.35], [0.28, 0.42], [0.18, 0.6], [0.35, 0.25], [0.45, 0.55],
  [0.55, 0.3], [0.62, 0.45], [0.72, 0.38], [0.8, 0.55], [0.88, 0.32],
  [0.5, 0.7], [0.3, 0.72], [0.65, 0.68], [0.42, 0.18], [0.78, 0.72],
  [0.22, 0.2], [0.92, 0.48], [0.08, 0.5], [0.58, 0.82], [0.38, 0.85],
];

function latLonToXY(lat: number, lon: number, cx: number, cy: number, r: number) {
  const angle = (lon * Math.PI) / 180;
  const tilt = (lat * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(tilt) * Math.sin(angle),
    y: cy - r * Math.sin(tilt),
    z: Math.cos(tilt) * Math.cos(angle),
  };
}

export default function ThreatGlobe({ criticalCount, size = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2, r = size * 0.38;

    const dots = STATIC_DOTS.map(([u, v]) => ({
      lat: (v - 0.5) * -160,
      lon: (u - 0.5) * 340,
      critical: Math.random() > 0.65,
    }));

    function draw() {
      ctx.clearRect(0, 0, size, size);

      // Globe outline
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Grid lines (meridians + parallels)
      for (let lon = -150; lon <= 180; lon += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 5) {
          const { x, y, z } = latLonToXY(lat, lon + angleRef.current, cx, cy, r);
          if (z < 0) { first = true; continue; }
          first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          first = false;
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lon = -180; lon <= 180; lon += 4) {
          const { x, y, z } = latLonToXY(lat, lon + angleRef.current, cx, cy, r);
          if (z < 0) { first = true; continue; }
          first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          first = false;
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      // Threat dots
      const now = Date.now();
      dots.forEach(dot => {
        const { x, y, z } = latLonToXY(dot.lat, dot.lon + angleRef.current, cx, cy, r);
        if (z < 0) return;

        const pulse = 0.5 + 0.5 * Math.sin(now / 800 + dot.lon);

        // Pulse ring for critical
        if (dot.critical) {
          ctx.beginPath();
          ctx.arc(x, y, 4 + pulse * 5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,68,68,${0.3 * (1 - pulse * 0.6)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(x, y, dot.critical ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = dot.critical ? `rgba(255,68,68,${0.7 + pulse * 0.3})` : 'rgba(100,100,100,0.5)';
        ctx.fill();
      });

      // Glow center
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(255,40,40,0.04)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      angleRef.current += 0.12;
      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [size, criticalCount]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
        color: criticalCount > 0 ? '#ff4444' : 'rgba(255,255,255,0.2)',
        letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        {criticalCount > 0 ? `${criticalCount} active threats` : 'threat globe'}
      </div>
    </div>
  );
}
