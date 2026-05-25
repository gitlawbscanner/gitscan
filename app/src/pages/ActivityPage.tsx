import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageNav from '../components/PageNav';

const API = import.meta.env.VITE_API_URL || '/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#555',
};
const SEV_DIM: Record<string, string> = {
  critical: 'rgba(255,68,68,0.08)', high: 'rgba(255,136,0,0.07)',
  medium: 'rgba(255,204,0,0.06)', low: 'rgba(68,255,136,0.06)',
  clean: 'rgba(68,255,136,0.06)', unknown: 'rgba(255,255,255,0.02)',
};

import { Link } from 'react-router-dom';

type Scan = {
  repo_url: string; repo_name: string; platform: string;
  risk_score: number; severity: string; timestamp: number; scan_count: number;
  last_job_id?: string;
};
type LiveScan = { job_id: string; repo_url: string; status: string; logs: string[] };
type Tab = 'recent' | 'dangerous' | 'most';

function timeAgo(ts: number) {
  const d = Date.now() / 1000 - ts;
  if (d < 10) return 'just now';
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function repoShort(url: string) {
  return url.replace('https://', '').replace('http://', '').replace(/\/$/, '');
}

function PlatformBadge({ platform }: { platform: string }) {
  const isGl = platform === 'gitlawb';
  return (
    <div style={{
      width: 30, height: 22, borderRadius: 2, flexShrink: 0,
      background: isGl ? 'rgba(100,140,255,0.15)' : 'rgba(255,255,255,0.09)',
      border: isGl ? '1px solid rgba(100,140,255,0.2)' : '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.05em', color: isGl ? 'rgba(140,170,255,0.8)' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
        {isGl ? 'GL' : 'GH'}
      </span>
    </div>
  );
}

function ScoreBar({ score, severity }: { score: number; severity: string }) {
  const color = SEV_COLOR[severity] || '#555';
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 72, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 18, color, lineHeight: 1, minWidth: 26, textAlign: 'right' }}>
        {score}
      </span>
    </div>
  );
}

function LiveRow({ scan }: { scan: LiveScan }) {
  const short = repoShort(scan.repo_url);
  const lastLog = scan.logs[scan.logs.length - 1] || '...';
  const STAGE: Record<string, string> = { queued: 'QUEUED', cloning: 'CLONING', scanning: 'SCANNING', analyzing: 'ANALYZING' };
  return (
    <div style={{
      padding: '14px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'rgba(68,255,136,0.02)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#44ff88', boxShadow: '0 0 8px #44ff88aa', animation: 'livePulse 1.2s ease-in-out infinite' }} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#44ff8888', letterSpacing: '0.12em' }}>
          {STAGE[scan.status] || scan.status.toUpperCase()}
        </span>
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.85)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {short}
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
        {lastLog}
      </span>
    </div>
  );
}

export default function ActivityPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [live, setLive] = useState<LiveScan[]>([]);
  const [tab, setTab] = useState<Tab>('recent');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const prevLen = useRef(0);
  const [newItem, setNewItem] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [rRecent, rLive] = await Promise.all([
        fetch(`${API}/recent`),
        fetch(`${API}/live`),
      ]);
      if (rRecent.ok) {
        const data: Scan[] = await rRecent.json();
        if (data.length > prevLen.current && prevLen.current > 0) {
          setNewItem(data[0]?.repo_name || null);
          setTimeout(() => setNewItem(null), 3000);
        }
        prevLen.current = data.length;
        setScans(data);
      }
      if (rLive.ok) setLive(await rLive.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 2500);
    return () => clearInterval(t);
  }, []);

  const displayed = [...scans].sort((a, b) => {
    if (tab === 'dangerous') return b.risk_score - a.risk_score;
    if (tab === 'most') return b.scan_count - a.scan_count;
    return b.timestamp - a.timestamp;
  });

  const goScan = (url: string) => navigate(`/?prefill=${encodeURIComponent(url)}`);

  const criticalCount = scans.filter(s => s.severity === 'critical').length;

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>

      <PageNav />

      <div style={{ maxWidth: 840, margin: '0 auto', padding: 'clamp(88px,11vw,130px) clamp(16px,4vw,32px) 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 14px' }}>
              // Public Activity Feed
            </p>
            <h1 style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 'clamp(28px,4.5vw,58px)', fontWeight: 400, textTransform: 'uppercase', color: '#fff', margin: 0, letterSpacing: '0.01em', lineHeight: 1 }}>
              LATEST SCANS
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#44ff88', boxShadow: '0 0 8px #44ff88', animation: 'livePulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#44ff88', letterSpacing: '0.12em' }}>LIVE</span>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, marginBottom: 32, border: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { label: 'Repos Tracked', value: scans.length },
            { label: 'Critical', value: criticalCount, color: criticalCount > 0 ? '#ff4444' : undefined },
            { label: 'Scanning Now', value: live.length, color: live.length > 0 ? '#44ff88' : undefined },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '20px 24px', background: 'rgba(255,255,255,0.01)',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 32, color: s.color || 'rgba(255,255,255,0.7)', lineHeight: 1, marginBottom: 6 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Live scans */}
        {live.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.16em', color: '#44ff8866', textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#44ff88', animation: 'livePulse 1s ease-in-out infinite' }} />
              Scanning now — {live.length} active
            </p>
            <div style={{ border: '1px solid rgba(68,255,136,0.15)', overflow: 'hidden' }}>
              {live.map(s => <LiveRow key={s.job_id} scan={s} />)}
            </div>
          </div>
        )}

        {/* New item toast */}
        {newItem && (
          <div style={{
            position: 'fixed', bottom: 32, right: 32, zIndex: 200,
            background: 'rgba(0,0,0,0.95)', border: '1px solid rgba(68,255,136,0.3)',
            padding: '12px 20px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            color: '#44ff88', animation: 'fadeUp 0.3s ease',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>+</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{newItem}</span>
            <span>added</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 0 }}>
          {([['recent', 'Recent'], ['dangerous', 'Dangerous'], ['most', 'Most Scanned']] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 20px',
              background: 'transparent', border: 'none',
              borderBottom: tab === key ? '2px solid #fff' : '2px solid transparent',
              color: tab === key ? '#fff' : 'rgba(255,255,255,0.3)',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.15s', marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            Loading...
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '64px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
            No scans yet. <span style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/')}>Scan a repo →</span>
          </div>
        ) : (
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none' }}>
            {displayed.map((s, i) => {
              const color = SEV_COLOR[s.severity] || '#555';
              const dim = SEV_DIM[s.severity] || 'transparent';
              const isCritical = s.severity === 'critical' || s.risk_score >= 85;
              const isDangerous = s.severity === 'high' || s.risk_score >= 70;
              return (
                <div
                  key={s.repo_url}
                  onClick={() => goScan(s.repo_url)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 20px',
                    borderBottom: i < displayed.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    borderLeft: `2px solid ${isCritical ? '#ff444433' : isDangerous ? '#ff880022' : 'transparent'}`,
                    cursor: 'pointer', transition: 'background 0.15s',
                    background: i === 0 && tab === 'recent' ? 'rgba(255,255,255,0.015)' : 'transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = dim || 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i === 0 && tab === 'recent' ? 'rgba(255,255,255,0.015)' : 'transparent')}
                >
                  <PlatformBadge platform={s.platform} />

                  {/* Repo info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <a
                        href={s.repo_url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                      >{s.repo_name} ↗</a>
                      {isCritical && (
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.08em',
                          padding: '2px 6px', background: 'rgba(255,68,68,0.12)',
                          border: '1px solid rgba(255,68,68,0.35)', color: '#ff4444',
                          textTransform: 'uppercase', flexShrink: 0,
                        }}>⚠ DON'T RUN</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.08em',
                        textTransform: 'uppercase', padding: '1px 6px',
                        color, border: `1px solid ${color}33`,
                        background: `${color}0a`,
                      }}>
                        {s.severity}
                      </span>
                      {s.scan_count > 1 && (
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>
                          scanned {s.scan_count}×
                        </span>
                      )}
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
                        {timeAgo(s.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ flexShrink: 0 }}>
                    <ScoreBar score={s.risk_score} severity={s.severity} />
                  </div>

                  {/* Report link */}
                  {s.last_job_id && (
                    <Link
                      to={`/report/${s.last_job_id}`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                        color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em',
                        textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
                        border: '1px solid rgba(255,255,255,0.08)', padding: '3px 8px',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    >REPORT</Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.14)', textAlign: 'center', marginTop: 24 }}>
          auto-refreshes every 2.5s · click any repo to scan it · {scans.length} repos tracked
        </p>
      </div>

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width: 640px) {
          nav { padding: 14px 18px !important; }
          nav > div { gap: 16px !important; }
        }
        @media (max-width: 480px) {
          nav > div a[href="/activity"] ~ a { display: none; }
        }
      `}</style>
    </div>
  );
}
