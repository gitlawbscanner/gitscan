import { useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (target === 0 || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(tick);
      else setVal(target);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return val;
}

function Stat({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  const display = useCountUp(value);
  return (
    <div style={{ textAlign: 'center', padding: '28px 20px', flex: 1 }}>
      <div style={{
        fontFamily: "'Geist Pixel', monospace",
        fontSize: 'clamp(28px, 3.5vw, 44px)',
        fontWeight: 400, color: '#fff', lineHeight: 1,
        letterSpacing: '0.02em',
      }}>
        {display.toLocaleString()}{suffix}
      </div>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.28)',
        marginTop: 10,
      }}>
        {label}
      </div>
    </div>
  );
}

export default function StatsBar() {
  const [stats, setStats] = useState({ total_scans: 0, completed_scans: 0, total_vulns: 0 });
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch(`${API}/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{
      background: '#000',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{
        maxWidth: 860, margin: '0 auto',
        display: 'flex', alignItems: 'stretch',
      }}>
        <Stat label="Repos scanned" value={visible ? stats.total_scans : 0} />
        <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
        <Stat label="Vulnerabilities found" value={visible ? stats.total_vulns : 0} />
        <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
        <Stat label="Scans completed" value={visible ? stats.completed_scans : 0} />
      </div>
    </section>
  );
}
