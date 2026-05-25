import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '/api';
const HISTORY_KEY = 'gitscan_history';
const MAX_HISTORY = 8;

const STAGE_LABELS: Record<string, string> = {
  queued: 'QUEUED', cloning: 'CLONING', scanning: 'SCANNING', analyzing: 'ANALYZING',
};
const STAGE_IDX: Record<string, number> = {
  queued: 0, cloning: 1, scanning: 2, analyzing: 3,
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#888',
};
const SEVERITY_DIM: Record<string, string> = {
  critical: 'rgba(255,68,68,0.12)', high: 'rgba(255,136,0,0.1)',
  medium: 'rgba(255,204,0,0.08)', low: 'rgba(68,255,136,0.08)',
  clean: 'rgba(68,255,136,0.08)', unknown: 'rgba(255,255,255,0.04)',
};

type HistoryItem = {
  jobId: string; repoUrl: string; riskScore: number;
  severity: string; timestamp: number;
};
type GhRepo = { name: string; full_name: string; description: string | null; stargazers_count: number; language: string | null; html_url: string };
type GlRepo = { name: string; description: string | null; clone_url: string; star_count: number };

function loadHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(item: HistoryItem) {
  const prev = loadHistory().filter(h => h.jobId !== item.jobId);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...prev].slice(0, MAX_HISTORY)));
}

// ── URL detection ────────────────────────────────────────────────────────────

function detectUrlType(raw: string): 'github-profile' | 'gitlawb-profile' | 'repo' | null {
  const url = raw.trim();
  const gh = url.match(/^https?:\/\/github\.com\/([^/]+)\/?$/);
  if (gh) return 'github-profile';
  const gl = url.match(/^https?:\/\/gitlawb\.com\/([^/]+)\/?$/);
  if (gl && !['node','start','agents','pricing','install','token'].includes(gl[1])) return 'gitlawb-profile';
  if (url.includes('github.com/') || url.includes('gitlawb.com/')) return 'repo';
  return null;
}

async function fetchGithubRepos(url: string): Promise<GhRepo[]> {
  const m = url.match(/github\.com\/([^/]+)/);
  if (!m) return [];
  const user = m[1];
  const r = await fetch(`https://api.github.com/users/${user}/repos?per_page=50&sort=updated&type=public`);
  if (!r.ok) throw new Error(`GitHub user "${user}" not found`);
  return r.json();
}

async function fetchGitlawbRepos(url: string): Promise<GlRepo[]> {
  const m = url.match(/gitlawb\.com\/([^/]+)/);
  if (!m) return [];
  const did = m[1];
  const r = await fetch(`https://node.gitlawb.com/api/v1/repos/${did}`);
  if (!r.ok) throw new Error(`Gitlawb user "${did}" not found`);
  const data = await r.json();
  return Array.isArray(data) ? data : (data.repos || []);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RiskArc({ score, severity }: { score: number; severity: string }) {
  const r = 52, circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ * 0.75;
  const color = SEVERITY_COLOR[severity] || '#fff';
  return (
    <svg width={140} height={100} viewBox="0 0 140 100">
      <circle cx={70} cy={80} r={r} fill="none" stroke="rgba(255,255,255,0.07)"
        strokeWidth={6} strokeDasharray={`${circ * 0.75} ${circ}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round" />
      <circle cx={70} cy={80} r={r} fill="none" stroke={color}
        strokeWidth={6} strokeDasharray={`${dash} ${circ - dash + circ * 0.25}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${color}88)` }} />
      <text x={70} y={74} textAnchor="middle" fill="#fff"
        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 400 }}>{pct}</text>
      <text x={70} y={90} textAnchor="middle" fill="rgba(255,255,255,0.35)"
        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 2 }}>RISK SCORE</text>
    </svg>
  );
}

function ScanProgress({ status, repoUrl, logs = [] }: { status: string; repoUrl: string; logs?: string[] }) {
  const [shown, setShown] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logs.length <= shown) return;
    const target = logs.length;
    const t = setInterval(() => {
      setShown(n => {
        if (n >= target) { clearInterval(t); return n; }
        return n + 1;
      });
    }, 200);
    return () => clearInterval(t);
  }, [logs.length]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [shown]);

  const stageIdx = STAGE_IDX[status] ?? 0;
  const stages = Object.entries(STAGE_LABELS);

  return (
    <div style={{ marginTop: 32, animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        {stages.map(([key, label], i) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', flex: i < stages.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i <= stageIdx ? '#fff' : 'rgba(255,255,255,0.12)',
                boxShadow: i === stageIdx ? '0 0 12px rgba(255,255,255,0.9)' : 'none',
                animation: i === stageIdx ? 'pulse 1.2s ease-in-out infinite' : 'none',
              }} />
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.1em',
                color: i <= stageIdx ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)', whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
            {i < stages.length - 1 && (
              <div style={{
                flex: 1, height: 1, margin: '0 8px', marginBottom: 14,
                background: i < stageIdx ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.07)',
                transition: 'background 0.5s',
              }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)' }}>
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />)}
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
            glscan — {repoUrl.replace('https://', '')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#44ff88', boxShadow: '0 0 6px #44ff8866', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#44ff8866', letterSpacing: '0.1em' }}>LIVE</span>
          </div>
        </div>

        <div ref={logRef} style={{ padding: '16px 20px', height: 190, overflowY: 'auto' }}>
          {logs.slice(0, shown).map((line, i) => (
            <div key={i} style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              letterSpacing: '0.04em', lineHeight: 1.8,
              display: 'flex', gap: 8,
            }}>
              <span style={{ color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>{'>'}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>{line}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              Waiting for scan engine...
            </div>
          )}
          <span style={{
            display: 'inline-block', width: 7, height: 13,
            background: 'rgba(255,255,255,0.55)',
            animation: 'blink 1s step-end infinite',
            verticalAlign: 'middle', marginLeft: 2,
          }} />
        </div>
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: any }) {
  const [open, setOpen] = useState(false);
  const color = SEVERITY_COLOR[finding.severity] || '#fff';
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      border: `1px solid ${open ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 2, padding: '14px 18px', marginBottom: 8,
      cursor: 'pointer', background: open ? 'rgba(255,255,255,0.03)' : 'transparent',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.12em',
            textTransform: 'uppercase', padding: '2px 8px',
            border: `1px solid ${color}44`, color, background: `${color}11`,
          }}>{finding.severity}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#fff' }}>{finding.title}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{finding.category}</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 12px' }}>{finding.description}</p>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color, letterSpacing: '0.1em' }}>FIX → </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{finding.recommendation}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function RepoPicker({ repos, platform, onSelect, onClose }: {
  repos: (GhRepo | GlRepo)[]; platform: 'github' | 'gitlawb';
  onSelect: (url: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = repos.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.12)',
        width: '100%', maxWidth: 560, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.25s ease',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
            {platform === 'github' ? '⬡ GitHub' : '⬡ Gitlawb'} — {repos.length} repos
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            autoFocus
            placeholder="Filter repos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', padding: '10px 14px', outline: 'none',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map((repo) => {
            const url = 'html_url' in repo ? repo.html_url : repo.clone_url?.replace('.git', '') || '';
            const stars = 'stargazers_count' in repo ? repo.stargazers_count : (repo as GlRepo).star_count;
            const lang = 'language' in repo ? repo.language : null;
            return (
              <div key={repo.name} onClick={() => onSelect(url)}
                style={{
                  padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', transition: 'background 0.15s',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#fff', marginBottom: 3 }}>{repo.name}</div>
                  {repo.description && (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.description}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                  {lang && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{lang}</span>}
                  {stars > 0 && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>★ {stars}</span>}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>SCAN →</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No repos found</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScanHistory({ onLoad }: { onLoad: (jobId: string, repoUrl: string) => void }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => { setHistory(loadHistory()); }, []);
  if (history.length === 0) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
        color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {open ? '▲' : '▼'} RECENT SCANS ({history.length})
      </button>
      {open && (
        <div style={{ marginTop: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          {history.map((h, i) => {
            const color = SEVERITY_COLOR[h.severity] || '#fff';
            return (
              <div key={h.jobId} onClick={() => onLoad(h.jobId, h.repoUrl)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 16px', cursor: 'pointer', gap: 12,
                  borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}88` }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.repoUrl.replace('https://', '')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 16, color }}>{h.riskScore}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h.severity}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScanSection() {
  const [url, setUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // Profile picker
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [pickerRepos, setPickerRepos] = useState<(GhRepo | GlRepo)[] | null>(null);
  const [pickerPlatform, setPickerPlatform] = useState<'github' | 'gitlawb'>('github');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('scan');
    const prefill = params.get('prefill');
    if (sid) {
      setJobId(sid);
      setLoading(true);
      setJobData({ status: 'queued' });
    } else if (prefill) {
      setUrl(decodeURIComponent(prefill));
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, []);

  const reset = () => {
    setJobData(null); setJobId(null); setUrl(''); setError('');
    window.history.replaceState({}, '', window.location.pathname);
  };

  const startScan = async (scanUrl?: string) => {
    const target = (scanUrl || url).trim();
    if (!target || loading) return;

    const type = detectUrlType(target);

    // Profile URL — fetch repos and show picker
    if (type === 'github-profile' || type === 'gitlawb-profile') {
      setFetchingRepos(true);
      setError('');
      try {
        const repos = type === 'github-profile'
          ? await fetchGithubRepos(target)
          : await fetchGitlawbRepos(target);
        if (repos.length === 0) { setError('No public repos found for this profile.'); return; }
        setPickerPlatform(type === 'github-profile' ? 'github' : 'gitlawb');
        setPickerRepos(repos);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setFetchingRepos(false);
      }
      return;
    }

    setError(''); setJobData(null); setJobId(null); setLoading(true);
    if (scanUrl) setUrl(scanUrl);
    window.history.replaceState({}, '', window.location.pathname);

    try {
      const r = await fetch(`${API}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: target }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setJobId(d.job_id);
      setJobData({ status: 'queued' });
    } catch (e: any) {
      setError(`Scan failed: ${e.message}`);
      setLoading(false);
    }
  };

  const loadScan = (id: string, repoUrl: string) => {
    setUrl(repoUrl); setJobId(id);
    setJobData({ status: 'complete' }); setLoading(true);
    window.history.pushState({}, '', `?scan=${id}`);
  };

  const shareResult = () => {
    const link = `${window.location.origin}/report/${jobId}`;
    navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  useEffect(() => {
    if (!jobId) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/scan/${jobId}`);
        if (r.status === 404) { clearInterval(pollRef.current!); setLoading(false); setError('Scan not found.'); return; }
        const d = await r.json();
        setJobData(d);
        if (d.status === 'complete' || d.status === 'error') {
          clearInterval(pollRef.current!);
          setLoading(false);
          if (d.status === 'complete' && d.result?.report) {
            window.history.pushState({}, '', `?scan=${jobId}`);
            saveHistory({ jobId: jobId!, repoUrl: d.result.repo_url || url, riskScore: d.result.report.risk_score, severity: d.result.report.severity, timestamp: Date.now() });
          }
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
      } catch {}
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId]);

  const report = jobData?.result?.report;
  const raw = jobData?.result?.raw;
  const sevColor = SEVERITY_COLOR[report?.severity] || '#fff';
  const sevDim = SEVERITY_DIM[report?.severity] || 'rgba(255,255,255,0.04)';

  return (
    <section id="scan" style={{ background: '#000', padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,40px)', position: 'relative' }}>
      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      {pickerRepos && (
        <RepoPicker
          repos={pickerRepos}
          platform={pickerPlatform}
          onSelect={u => { setPickerRepos(null); startScan(u); }}
          onClose={() => setPickerRepos(null)}
        />
      )}

      <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 28px' }}>
          // Scan Your Repo
        </p>
        <h2 style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 400, textTransform: 'uppercase', color: '#fff', margin: '0 0 48px', lineHeight: 1.1, letterSpacing: '0.015em' }}>
          DROP A REPO URL.<br />GET THE FULL REPORT.
        </h2>

        {/* Input */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{
            flex: 1, position: 'relative',
            border: `1px solid ${inputFocused ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.14)'}`,
            boxShadow: inputFocused ? '0 0 0 3px rgba(255,255,255,0.04)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startScan()}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="github.com/user  ·  github.com/user/repo  ·  gitlawb.com/z6Mk.../repo"
              style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={() => startScan()} disabled={loading || fetchingRepos || !url.trim()} style={{
            padding: '16px 32px',
            background: loading || fetchingRepos ? 'transparent' : '#fff',
            color: loading || fetchingRepos ? 'rgba(255,255,255,0.3)' : '#000',
            border: `1px solid ${loading || fetchingRepos ? 'rgba(255,255,255,0.15)' : '#fff'}`,
            cursor: loading || fetchingRepos || !url.trim() ? 'not-allowed' : 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', transition: 'all 0.2s',
          }}>
            {fetchingRepos ? 'LOADING...' : loading ? 'SCANNING...' : 'SCAN →'}
          </button>
        </div>

        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.22)', margin: '0 0 4px', letterSpacing: '0.04em' }}>
          Paste a <strong style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>profile</strong> URL to browse repos, or a <strong style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>repo</strong> URL to scan directly · GitHub + Gitlawb supported
        </p>

        {error && (
          <div style={{ border: '1px solid rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.05)', padding: '12px 16px', marginTop: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(255,120,120,0.9)' }}>
            {error}
          </div>
        )}

        <ScanHistory onLoad={loadScan} />

        {jobData && !['complete', 'error'].includes(jobData.status) && <ScanProgress status={jobData.status} repoUrl={url} logs={jobData.logs || []} />}

        {jobData?.status === 'error' && (
          <div style={{ border: '1px solid rgba(255,255,255,0.12)', padding: 24, marginTop: 24, background: 'rgba(255,255,255,0.02)' }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(255,150,150,0.8)', margin: 0 }}>
              SCAN FAILED — {jobData.error}
            </p>
          </div>
        )}

        {/* ── Results ── */}
        {jobData?.status === 'complete' && report && (
          <div ref={resultsRef} style={{ marginTop: 40, animation: 'fadeUp 0.5s ease' }}>

            {/* Share bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.22)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%' }}>
                {(url || jobData?.result?.repo_url || '').replace('https://', '')}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={shareResult} style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                  color: copied ? '#44ff88' : 'rgba(255,255,255,0.35)',
                  padding: '6px 14px', cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                  letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s',
                }}>
                  {copied ? '✓ COPIED' : '⎘ SHARE'}
                </button>
                <button onClick={() => navigate(`/report/${jobId}`)} style={{
                  background: '#fff', border: '1px solid #fff',
                  color: '#000', padding: '6px 16px', cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                  letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                }}>
                  VIEW REPORT →
                </button>
              </div>
            </div>

            {/* Risk arc + summary */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 36,
              border: `1px solid ${sevColor}22`,
              background: sevDim,
              padding: '32px 36px', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <RiskArc score={report.risk_score} severity={report.severity} />
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.15em',
                  textTransform: 'uppercase', padding: '3px 12px',
                  border: `1px solid ${sevColor}44`, color: sevColor, background: `${sevColor}11`,
                }}>
                  {report.severity?.toUpperCase()}
                </span>
              </div>
              <div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>EXECUTIVE SUMMARY</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.85, margin: '0 0 20px' }}>{report.summary}</p>
                {report.gitlawb_notes && (
                  <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '10px 16px', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}>
                      ⬡ GITLAWB — {report.gitlawb_notes}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'SECRETS', count: raw?.secrets?.count ?? 0, color: '#ff4444' },
                { label: 'SAST', count: raw?.sast?.count ?? 0, color: '#ff8800' },
                { label: 'DEPS', count: raw?.dependencies?.count ?? 0, color: '#ffcc00' },
              ].map(s => (
                <div key={s.label} style={{
                  border: `1px solid ${s.count > 0 ? s.color + '33' : 'rgba(255,255,255,0.08)'}`,
                  background: s.count > 0 ? s.color + '08' : 'transparent',
                  padding: '24px', textAlign: 'center', transition: 'all 0.3s',
                }}>
                  <div style={{ fontFamily: "'Geist Pixel', monospace", fontSize: 'clamp(28px,3vw,40px)', color: s.count > 0 ? s.color : 'rgba(255,255,255,0.4)', lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Findings */}
            {report.findings_summary?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', margin: '0 0 14px' }}>
                  FINDINGS ({report.findings_summary.length})
                </p>
                {report.findings_summary.map((f: any, i: number) => <FindingCard key={i} finding={f} />)}
              </div>
            )}

            {/* Recommendations */}
            {report.top_recommendations?.length > 0 && (
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '28px 32px', marginBottom: 16, background: 'rgba(255,255,255,0.01)' }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', margin: '0 0 20px' }}>TOP RECOMMENDATIONS</p>
                {report.top_recommendations.map((rec: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.25)', minWidth: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75 }}>{rec}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={reset} style={{
              marginTop: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.4)', padding: '12px 24px', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
            >
              ← SCAN ANOTHER REPO
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        input::placeholder { color: rgba(255,255,255,0.18) !important; }
        @media (max-width: 640px) {
          #scan > div > div[style*="grid-template-columns: auto 1fr"] { grid-template-columns: 1fr !important; }
          #scan > div > div[style*="grid-template-columns: repeat(3"] { grid-template-columns: repeat(3,1fr) !important; }
        }
      `}</style>
    </section>
  );
}
