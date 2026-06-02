import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#555',
};

type Scan = { repo_url: string; risk_score: number; severity: string };

function trimUrl(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export default function LiveScanTicker() {
  const [items, setItems] = useState<Scan[]>([]);
  const [live, setLive] = useState<Scan[]>([]);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => {
      Promise.all([
        fetch(`${API}/recent`).then(r => r.json()).catch(() => []),
        fetch(`${API}/live`).then(r => r.json()).catch(() => []),
      ]).then(([recent, liveScans]) => {
        const all: Scan[] = Array.isArray(recent)
          ? recent.slice(0, 30).filter((s: any) => s.repo_url && s.severity)
          : [];
        setItems(all);
        const running: Scan[] = Array.isArray(liveScans)
          ? liveScans.map((s: any) => ({ repo_url: s.repo_url, risk_score: 0, severity: 'scanning' }))
          : [];
        setLive(running);
      });
    };
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, []);

  const all = [...live, ...items];
  if (all.length < 3) return null;

  const doubled = [...all, ...all];

  return (
    <div
      style={{ background: 'rgba(255,255,255,0.018)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative', height: 34 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* fade edges */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to right, #000 60%, transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to left, #000 60%, transparent)', zIndex: 2, pointerEvents: 'none' }} />

      <div
        ref={containerRef}
        style={{
          display: 'flex', alignItems: 'center', gap: 0,
          whiteSpace: 'nowrap', height: '100%',
          animation: `ticker-scroll ${all.length * 4}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {doubled.map((s, i) => {
          const sev = (s.severity || 'unknown').toLowerCase();
          const col = sev === 'scanning' ? 'rgba(255,255,255,0.4)' : (SEV_COLOR[sev] || '#555');
          const isScanning = sev === 'scanning';
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 24px' }}>
              <span style={{
                fontSize: 9, letterSpacing: '0.1em', fontWeight: 700, color: col,
                border: `1px solid ${col}44`, padding: '1px 5px',
                animation: isScanning ? 'ticker-blink 1s ease-in-out infinite' : 'none',
              }}>
                {isScanning ? '◉ LIVE' : sev.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}>
                {trimUrl(s.repo_url)}
              </span>
              {!isScanning && s.risk_score > 0 && (
                <span style={{ fontSize: 10, color: col, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                  {s.risk_score}
                </span>
              )}
              <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 8, paddingLeft: 16 }}>·</span>
            </span>
          );
        })}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ticker-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
