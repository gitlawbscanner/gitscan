import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageNav from '../components/PageNav';

const API = import.meta.env.VITE_API_URL || '/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#555',
};

type Scan = {
  repo_url: string; repo_name: string; platform: string;
  risk_score: number; severity: string; scan_count: number;
  last_scanned?: number; timestamp?: number; last_job_id?: string;
};

function timeAgo(ts: number) {
  const d = Date.now() / 1000 - ts;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function trendingScore(s: Scan): number {
  const ts = s.last_scanned ?? s.timestamp ?? Date.now() / 1000;
  const hoursAgo = (Date.now() / 1000 - ts) / 3600;
  return (s.scan_count ?? 1) / (1 + Math.log1p(hoursAgo));
}

function TrendBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div style={{ width: 60, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'rgba(255,255,255,0.35)', borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  );
}

export default function TrendingPage() {
  const [repos, setRepos] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTrending = async () => {
    try {
      const r = await fetch(`${API}/trending`);
      if (r.ok) setRepos(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchTrending();
    const t = setInterval(fetchTrending, 30000);
    return () => clearInterval(t);
  }, []);

  const maxScore = repos.length > 0 ? trendingScore(repos[0]) : 1;

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <PageNav />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(88px,11vw,130px) clamp(16px,4vw,32px) 80px' }}>

        {/* Header */}
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 14px' }}>
          // Trending Repos
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 'clamp(28px,4.5vw,56px)', fontWeight: 400, textTransform: 'uppercase', color: '#fff', margin: 0, lineHeight: 1 }}>
            TRENDING
          </h1>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em' }}>
            ranked by scan frequency × recency
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            LOADING...
          </div>
        ) : repos.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            No data yet — scans will appear here automatically.
          </div>
        ) : (
          <div style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 12 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', minWidth: 20, textAlign: 'right' }}>#</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', flex: 1 }}>REPO</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>TREND</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', minWidth: 48, textAlign: 'right' }}>SCANS</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', minWidth: 36, textAlign: 'right' }}>RISK</span>
              <span style={{ width: 60 }} />
            </div>

            {repos.map((s, i) => {
              const color = SEV_COLOR[s.severity] || '#555';
              const ts = s.last_scanned ?? s.timestamp ?? 0;
              const score = trendingScore(s);
              const isCritical = s.severity === 'critical' || s.risk_score >= 85;

              return (
                <div
                  key={s.repo_url}
                  onClick={() => navigate(`/?prefill=${encodeURIComponent(s.repo_url)}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 20px',
                    borderBottom: i < repos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    borderLeft: `2px solid ${isCritical ? '#ff444422' : i < 3 ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Rank */}
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: i < 3 ? 13 : 11,
                    color: i === 0 ? 'rgba(255,255,255,0.7)' : i === 1 ? 'rgba(255,255,255,0.45)' : i === 2 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
                    minWidth: 20, textAlign: 'right', flexShrink: 0,
                  }}>{i + 1}</span>

                  {/* Platform badge */}
                  <div style={{
                    width: 26, height: 18, borderRadius: 2, flexShrink: 0,
                    background: s.platform === 'gitlawb' ? 'rgba(100,140,255,0.15)' : 'rgba(255,255,255,0.08)',
                    border: s.platform === 'gitlawb' ? '1px solid rgba(100,140,255,0.2)' : '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: s.platform === 'gitlawb' ? 'rgba(140,170,255,0.8)' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                      {s.platform === 'gitlawb' ? 'GL' : 'GH'}
                    </span>
                  </div>

                  {/* Repo info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a
                        href={s.repo_url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#fff', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                      >{s.repo_name} ↗</a>
                      {isCritical && (
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)', padding: '1px 5px', flexShrink: 0 }}>⚠</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.severity}</span>
                      {ts > 0 && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,0.18)' }}>{timeAgo(ts)}</span>}
                    </div>
                  </div>

                  {/* Trend bar */}
                  <TrendBar score={score} max={maxScore} />

                  {/* Scan count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 48, justifyContent: 'flex-end', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{s.scan_count}×</span>
                  </div>

                  {/* Risk score */}
                  <span style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 18, color, minWidth: 36, textAlign: 'right', flexShrink: 0 }}>{s.risk_score}</span>

                  {/* Report link */}
                  {s.last_job_id ? (
                    <Link
                      to={`/report/${s.last_job_id}`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                        color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em',
                        textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)',
                        padding: '3px 8px', whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    >REPORT</Link>
                  ) : (
                    <span style={{ width: 60, flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
