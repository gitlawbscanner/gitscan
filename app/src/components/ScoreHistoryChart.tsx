import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#555',
};

type HistoryPoint = { scanned_at: number; risk_score: number; severity: string; job_id?: string };

function fmt(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function ScoreHistoryChart({ repoUrl }: { repoUrl: string }) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    if (!repoUrl) return;
    fetch(`${API}/history?repo=${encodeURIComponent(repoUrl)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setHistory([...data].sort((a, b) => a.scanned_at - b.scanned_at));
        }
      })
      .catch(() => {});
  }, [repoUrl]);

  if (history.length < 2) return null;

  const W = 480, H = 100, pad = { t: 12, r: 16, b: 28, l: 36 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const scores = history.map(h => h.risk_score);
  const minS = Math.max(0, Math.min(...scores) - 5);
  const maxS = Math.min(100, Math.max(...scores) + 5);
  const rangeS = maxS - minS || 1;

  const toX = (i: number) => pad.l + (i / (history.length - 1)) * innerW;
  const toY = (s: number) => pad.t + innerH - ((s - minS) / rangeS) * innerH;

  const pts = history.map((h, i) => `${toX(i)},${toY(h.risk_score)}`).join(' ');

  // Area fill path
  const areaPath = [
    `M ${toX(0)},${toY(history[0].risk_score)}`,
    ...history.map((h, i) => `L ${toX(i)},${toY(h.risk_score)}`),
    `L ${toX(history.length - 1)},${pad.t + innerH}`,
    `L ${pad.l},${pad.t + innerH}`,
    'Z',
  ].join(' ');

  const latest = history[history.length - 1];
  const latestColor = SEV_COLOR[latest.severity] || '#888';

  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 10px' }}>
        SCORE HISTORY — {history.length} SCANS
      </p>
      <div style={{ overflowX: 'auto' }}>
        <svg width={W} height={H} style={{ display: 'block', minWidth: 240 }}>
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={latestColor} stopOpacity="0.15" />
              <stop offset="100%" stopColor={latestColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y grid lines */}
          {[0, 25, 50, 75, 100].filter(v => v >= minS && v <= maxS).map(v => (
            <g key={v}>
              <line x1={pad.l} x2={pad.l + innerW} y1={toY(v)} y2={toY(v)} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
              <text x={pad.l - 4} y={toY(v) + 3.5} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={7} fontFamily="'IBM Plex Mono', monospace">{v}</text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#area-grad)" />

          {/* Line */}
          <polyline points={pts} fill="none" stroke={latestColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 3px ${latestColor}66)` }} />

          {/* Dots + tooltips */}
          {history.map((h, i) => {
            const x = toX(i), y = toY(h.risk_score);
            const col = SEV_COLOR[h.severity] || '#888';
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={3} fill={col} stroke="#000" strokeWidth={1} />
                <title>{`${fmt(h.scanned_at)}: ${h.risk_score} (${h.severity})`}</title>
              </g>
            );
          })}

          {/* X axis labels — first and last */}
          <text x={toX(0)} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={7} fontFamily="'IBM Plex Mono', monospace">{fmt(history[0].scanned_at)}</text>
          <text x={toX(history.length - 1)} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={7} fontFamily="'IBM Plex Mono', monospace">{fmt(latest.scanned_at)}</text>
        </svg>
      </div>
    </div>
  );
}
