import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageNav from '../components/PageNav';
import ThreatGlobe from '../components/ThreatGlobe';

const API = import.meta.env.VITE_API_URL || '/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#444',
};
const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'clean', 'unknown'];

type Scan = { repo_url: string; repo_name: string; platform: string; risk_score: number; severity: string; scan_count: number; timestamp: number; last_job_id?: string };
type Intel = {
  total_scanned: number; severity_dist: Record<string, number>; avg_risk_score: number;
  most_dangerous: Scan[]; most_scanned: Scan[]; recent_critical: Scan[];
  auto_scanned: number; gitlawb_count: number; github_count: number;
};

function timeAgo(ts: number) {
  const d = Date.now() / 1000 - ts;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}


function StatBox({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '22px 24px', borderRight: '1px solid rgba(255,255,255,0.07)', flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 'clamp(28px,3vw,44px)', color: color || 'rgba(255,255,255,0.8)', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>{label}</div>
      {sub && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.18)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SeverityBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase', color, minWidth: 64,
      }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${color}66` }} />
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.4)', minWidth: 40, textAlign: 'right' }}>{count} <span style={{ color: 'rgba(255,255,255,0.2)' }}>({pct}%)</span></span>
    </div>
  );
}

function RepoRow({ scan, rank, navigate }: { scan: Scan; rank?: number; navigate: (url: string) => void }) {
  const color = SEV_COLOR[scan.severity] || '#444';
  const isCrit = scan.severity === 'critical' || scan.risk_score >= 85;
  return (
    <div
      onClick={() => navigate(`/?prefill=${encodeURIComponent(scan.repo_url)}`)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.15s',
        borderLeft: `2px solid ${isCrit ? '#ff444433' : 'transparent'}`,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {rank !== undefined && (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.15)', minWidth: 18, textAlign: 'right' }}>{rank}</span>
      )}
      <div style={{
        width: 26, height: 18, borderRadius: 2, flexShrink: 0,
        background: scan.platform === 'gitlawb' ? 'rgba(100,140,255,0.15)' : 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
          {scan.platform === 'gitlawb' ? 'GL' : 'GH'}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <a
          href={scan.repo_url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', display: 'block' }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >{scan.repo_name} ↗</a>
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{scan.severity}</span>
          {scan.scan_count > 1 && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{scan.scan_count}× scanned</span>}
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,0.18)' }}>{timeAgo(scan.timestamp)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 52, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
          <div style={{ width: `${Math.min(100, scan.risk_score)}%`, height: '100%', background: color, borderRadius: 2 }} />
        </div>
        <span style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 16, color, minWidth: 22, textAlign: 'right' }}>{scan.risk_score}</span>
        {scan.last_job_id && (
          <Link
            to={`/report/${scan.last_job_id}`}
            onClick={e => e.stopPropagation()}
            style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
              color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em',
              textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)',
              padding: '3px 8px', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >REPORT</Link>
        )}
      </div>
    </div>
  );
}

export default function IntelPage() {
  const [intel, setIntel] = useState<Intel | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchIntel = async () => {
    try {
      const r = await fetch(`${API}/intel`);
      if (r.ok) setIntel(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchIntel();
    const t = setInterval(fetchIntel, 10000);
    return () => clearInterval(t);
  }, []);

  const total = intel?.total_scanned || 0;
  const dist = intel?.severity_dist || {};

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <PageNav />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(88px,11vw,130px) clamp(16px,4vw,32px) 80px' }}>

        {/* Header */}
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 14px' }}>
          // Security Intelligence
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 'clamp(28px,4.5vw,56px)', fontWeight: 400, textTransform: 'uppercase', color: '#fff', margin: '0 0 12px', lineHeight: 1 }}>
              INTEL
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#44ff88', boxShadow: '0 0 6px #44ff88', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#44ff88', letterSpacing: '0.12em' }}>AUTO-SCANNING GITLAWB</span>
            </div>
          </div>
          <ThreatGlobe criticalCount={intel?.severity_dist?.critical || 0} size={160} />
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Loading intelligence...</div>
        ) : !intel || intel.total_scanned === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
            No data yet. <span style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/')}>Trigger a scan →</span>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24, overflow: 'hidden' }}>
              <StatBox label="Repos Tracked" value={total} />
              <StatBox label="Avg Risk Score" value={intel.avg_risk_score} color={intel.avg_risk_score > 60 ? '#ff8800' : intel.avg_risk_score > 30 ? '#ffcc00' : '#44ff88'} />
              <StatBox label="Critical Repos" value={dist.critical || 0} color={dist.critical ? '#ff4444' : undefined} />
              <StatBox label="Auto-Scanned" value={intel.auto_scanned} sub="by Gitlawb watcher" color="#44ff88" />
              <StatBox label="Gitlawb Repos" value={intel.gitlawb_count} color="rgba(140,170,255,0.8)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Severity distribution */}
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '24px 24px 20px' }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', margin: '0 0 20px' }}>
                  Severity Distribution
                </p>
                {SEV_ORDER.filter(s => dist[s]).map(sev => (
                  <SeverityBar key={sev} label={sev} count={dist[sev] || 0} total={total} color={SEV_COLOR[sev]} />
                ))}
                {Object.keys(dist).length === 0 && (
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>No data</p>
                )}
              </div>

              {/* Most scanned */}
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', margin: 0, padding: '18px 20px 12px' }}>
                  Most Scanned
                </p>
                {intel.most_scanned.map((s, i) => <RepoRow key={s.repo_url} scan={s} rank={i + 1} navigate={navigate} />)}
              </div>
            </div>

            {/* Hall of Danger */}
            <div style={{ border: '1px solid rgba(255,68,68,0.25)', marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
              <div style={{ padding: '20px 24px 16px', background: 'rgba(255,30,30,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff4444', boxShadow: '0 0 10px #ff4444', animation: 'pulse 1s ease-in-out infinite' }} />
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.2em', color: '#ff4444', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>
                    Hall of Danger
                  </p>
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,100,100,0.4)', letterSpacing: '0.1em' }}>highest risk scores ever recorded</span>
              </div>
              {intel.most_dangerous.slice(0, 8).map((s, i) => {
                const isCrit = s.severity === 'critical' || s.risk_score >= 75;
                const col = SEV_COLOR[s.severity] || '#555';
                const intensity = Math.min(1, s.risk_score / 100);
                return (
                  <div
                    key={s.repo_url}
                    onClick={() => navigate(`/?prefill=${encodeURIComponent(s.repo_url)}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px',
                      borderBottom: '1px solid rgba(255,68,68,0.08)', cursor: 'pointer',
                      background: `rgba(255,68,68,${intensity * 0.045})`,
                      transition: 'background 0.2s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `rgba(255,68,68,${intensity * 0.1})`)}
                    onMouseLeave={e => (e.currentTarget.style.background = `rgba(255,68,68,${intensity * 0.045})`)}
                  >
                    {/* Rank */}
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(255,68,68,0.25)', minWidth: 20, fontWeight: 700 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {/* Score */}
                    <div style={{
                      fontFamily: "'Geist Pixel', monospace", fontSize: 32, fontWeight: 400,
                      color: col, lineHeight: 1, minWidth: 48, textAlign: 'right', flexShrink: 0,
                      textShadow: isCrit ? `0 0 20px ${col}` : 'none',
                      animation: isCrit ? 'score-glow 2s ease-in-out infinite alternate' : 'none',
                    }}>{s.risk_score}</div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={s.repo_url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                          color: isCrit ? '#fff' : 'rgba(255,255,255,0.7)',
                          textDecoration: 'none', display: 'block',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          fontWeight: isCrit ? 700 : 400,
                        }}>
                        {s.repo_name || s.repo_url.replace(/^https?:\/\//, '')}
                      </a>
                      <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                        <span className={isCrit ? 'glitch-text' : ''} style={{
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.12em',
                          color: col, textTransform: 'uppercase', fontWeight: 700,
                        }}>{s.severity}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
                          {s.platform === 'gitlawb' ? '· Gitlawb' : '· GitHub'} · {timeAgo(s.timestamp)}
                        </span>
                      </div>
                    </div>
                    {/* Risk bar */}
                    <div style={{ width: 80, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, flexShrink: 0 }}>
                      <div style={{
                        width: `${Math.min(100, s.risk_score)}%`, height: '100%', background: col,
                        borderRadius: 2, boxShadow: isCrit ? `0 0 8px ${col}88` : 'none',
                      }} />
                    </div>
                    {s.last_job_id && (
                      <Link to={`/report/${s.last_job_id}`} onClick={e => e.stopPropagation()}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,100,100,0.45)', textDecoration: 'none', border: '1px solid rgba(255,68,68,0.2)', padding: '3px 8px', flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ff4444'; e.currentTarget.style.borderColor = 'rgba(255,68,68,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,100,100,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,68,68,0.2)'; }}
                      >REPORT</Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recent critical */}
            {intel.recent_critical.length > 0 && (
              <div style={{ border: '1px solid rgba(255,68,68,0.15)', overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '18px 20px 12px', background: 'rgba(255,68,68,0.03)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4444', animation: 'pulse 1s ease-in-out infinite' }} />
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,100,100,0.6)', textTransform: 'uppercase', margin: 0 }}>
                    Recent Critical — Avoid These
                  </p>
                </div>
                {intel.recent_critical.map(s => <RepoRow key={s.repo_url} scan={s} navigate={navigate} />)}
              </div>
            )}

            {/* Platform split */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', margin: '0 0 16px' }}>Platform Split</p>
                {[
                  { label: 'GitHub', count: intel.github_count, color: '#888' },
                  { label: 'Gitlawb', count: intel.gitlawb_count, color: 'rgba(140,170,255,0.8)' },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color }}>{label}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{count}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <div style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, height: '100%', background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}66` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', margin: '0 0 16px' }}>Risk Breakdown</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Critical+High', val: (dist.critical || 0) + (dist.high || 0), col: '#ff4444' },
                    { label: 'Medium', val: dist.medium || 0, col: '#ffcc00' },
                    { label: 'Low+Clean', val: (dist.low || 0) + (dist.clean || 0), col: '#44ff88' },
                  ].map(({ label, val, col }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0, boxShadow: `0 0 6px ${col}66` }} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.4)', flex: 1 }}>{label}</span>
                      <span style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 18, color: col }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.12)', textAlign: 'center', marginTop: 8 }}>
              updates every 10s · Gitlawb watcher polls every 90s · {total} repos in dataset
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes score-glow {
          0%   { text-shadow: 0 0 8px #ff4444; }
          100% { text-shadow: 0 0 24px #ff4444, 0 0 40px #ff000088; }
        }
        @keyframes glitch {
          0%  { clip-path: inset(0 0 98% 0); transform: translate(-2px, 0); }
          10% { clip-path: inset(40% 0 50% 0); transform: translate(2px, 0); }
          20% { clip-path: inset(70% 0 10% 0); transform: translate(-1px, 0); }
          30% { clip-path: inset(10% 0 80% 0); transform: translate(2px, 0); }
          40% { clip-path: inset(0 0 0 0); transform: translate(0); }
          100%{ clip-path: inset(0 0 0 0); transform: translate(0); }
        }
        .glitch-text {
          position: relative;
          animation: none;
        }
        .glitch-text::before {
          content: attr(data-text);
          position: absolute; top: 0; left: 0;
          color: #ff0000;
          animation: glitch 3s infinite step-start;
          opacity: 0.6;
        }
        @media (max-width: 700px) {
          .grid-2col { grid-template-columns: 1fr !important; }
          nav { padding: 14px 18px !important; }
        }
        @media (max-width: 560px) {
          .stat-row { flex-wrap: wrap !important; }
          .stat-row > div { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07); min-width: 50% !important; }
        }
      `}</style>
    </div>
  );
}
