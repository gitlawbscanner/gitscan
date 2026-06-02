import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageNav from '../components/PageNav';

const API = import.meta.env.VITE_API_URL || '/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#555',
};

type RepoInfo = { full_name: string; html_url: string; description: string; stargazers_count: number };
type ScanResult = { repo: string; job_id?: string; status: 'queued' | 'scanning' | 'complete' | 'error'; risk_score?: number; severity?: string; error?: string };

async function fetchOrgRepos(org: string, token?: string): Promise<RepoInfo[]> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(`https://api.github.com/orgs/${encodeURIComponent(org)}/repos?per_page=100&sort=updated`, { headers });
  if (!resp.ok) throw new Error(`GitHub API: ${resp.status} ${resp.statusText}`);
  return resp.json();
}

async function fetchUserRepos(user: string, token?: string): Promise<RepoInfo[]> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=updated`, { headers });
  if (!resp.ok) throw new Error(`GitHub API: ${resp.status} ${resp.statusText}`);
  return resp.json();
}

async function startScan(repoUrl: string): Promise<string> {
  const r = await fetch(`${API}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl }),
  });
  if (!r.ok) throw new Error('Scan initiation failed');
  const d = await r.json();
  return d.job_id;
}

async function pollScan(jobId: string): Promise<{ risk_score: number; severity: string }> {
  for (let i = 0; i < 60; i++) {
    await new Promise(res => setTimeout(res, 5000));
    const r = await fetch(`${API}/scan/${jobId}`);
    if (!r.ok) continue;
    const d = await r.json();
    if (d.status === 'complete') return { risk_score: d.result?.report?.risk_score ?? 0, severity: d.result?.report?.severity ?? 'unknown' };
    if (d.status === 'error') throw new Error(d.error || 'Scan failed');
  }
  throw new Error('Scan timed out');
}

export default function OrgScanPage() {
  const navigate = useNavigate();
  const [handle, setHandle] = useState('');
  const [token, setToken] = useState('');
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [maxConcurrent] = useState(3);

  const fetchRepos = async () => {
    if (!handle.trim()) return;
    setLoading(true);
    setError('');
    setRepos([]);
    setSelected(new Set());
    setResults([]);
    try {
      let data: RepoInfo[];
      try {
        data = await fetchOrgRepos(handle.trim(), token.trim() || undefined);
      } catch {
        data = await fetchUserRepos(handle.trim(), token.trim() || undefined);
      }
      setRepos(data);
      setSelected(new Set(data.slice(0, 20).map(r => r.html_url)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === repos.length) setSelected(new Set());
    else setSelected(new Set(repos.map(r => r.html_url)));
  };

  const toggle = (url: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(url) ? s.delete(url) : s.add(url);
      return s;
    });
  };

  const startBulkScan = async () => {
    const urls = [...selected];
    if (urls.length === 0) return;
    setScanning(true);
    setResults(urls.map(u => ({ repo: u, status: 'queued' })));

    const queue = [...urls];
    let active = 0;
    const updateResult = (repo: string, update: Partial<ScanResult>) => {
      setResults(prev => prev.map(r => r.repo === repo ? { ...r, ...update } : r));
    };

    await new Promise<void>(resolve => {
      const next = () => {
        if (queue.length === 0 && active === 0) { resolve(); return; }
        while (active < maxConcurrent && queue.length > 0) {
          const repo = queue.shift()!;
          active++;
          updateResult(repo, { status: 'scanning' });
          startScan(repo)
            .then(jobId => {
              updateResult(repo, { job_id: jobId });
              return pollScan(jobId);
            })
            .then(({ risk_score, severity }) => {
              updateResult(repo, { status: 'complete', risk_score, severity });
            })
            .catch(e => {
              updateResult(repo, { status: 'error', error: e.message });
            })
            .finally(() => { active--; next(); });
        }
      };
      next();
    });

    setScanning(false);
  };

  const exportCSV = () => {
    const header = 'repo,status,risk_score,severity';
    const rows = results.map(r => `"${r.repo}","${r.status}",${r.risk_score ?? ''},${r.severity ?? ''}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gitscan-org-${handle.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click();
  };

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
  const done = results.filter(r => r.status === 'complete' || r.status === 'error').length;
  const total = results.length;

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', ...mono }}>
      <PageNav />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(88px,11vw,130px) clamp(16px,4vw,32px) 80px' }}>

        <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 10px' }}>// Bulk Scanner</p>
        <h1 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 8px', textTransform: 'uppercase' }}>ORG / BULK SCAN</h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 40px' }}>Scan all repositories in a GitHub organization or user account simultaneously.</p>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchRepos()}
            placeholder="org or username (e.g. vercel)"
            style={{
              flex: 1, minWidth: 200, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', padding: '12px 16px', fontSize: 12, outline: 'none', ...mono,
            }}
          />
          <input
            value={token}
            onChange={e => setToken(e.target.value)}
            type="password"
            placeholder="GitHub token (optional, for private repos)"
            style={{
              flex: 2, minWidth: 200, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', padding: '12px 16px', fontSize: 12, outline: 'none', ...mono,
            }}
          />
          <button onClick={fetchRepos} disabled={loading || !handle.trim()} style={{
            background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)', color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
            padding: '12px 24px', fontSize: 11, letterSpacing: '0.1em', cursor: loading ? 'default' : 'pointer', ...mono,
          }}>
            {loading ? 'LOADING...' : 'FETCH REPOS'}
          </button>
        </div>

        {error && <p style={{ fontSize: 11, color: '#ff4444', margin: '0 0 16px' }}>{error}</p>}

        {/* Repo list */}
        {repos.length > 0 && results.length === 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{repos.length} repos found — {selected.size} selected</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={toggleAll} style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)',
                  padding: '6px 14px', fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', ...mono,
                }}>
                  {selected.size === repos.length ? 'DESELECT ALL' : 'SELECT ALL'}
                </button>
                <button onClick={startBulkScan} disabled={selected.size === 0 || scanning} style={{
                  background: selected.size > 0 ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: `1px solid ${selected.size > 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: selected.size > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                  padding: '6px 18px', fontSize: 11, letterSpacing: '0.1em', cursor: selected.size > 0 ? 'pointer' : 'default', ...mono,
                }}>
                  SCAN {selected.size > 0 ? `(${selected.size})` : ''}
                </button>
              </div>
            </div>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', maxHeight: 400, overflowY: 'auto' }}>
              {repos.map(r => {
                const isSelected = selected.has(r.html_url);
                return (
                  <div key={r.html_url} onClick={() => toggle(r.html_url)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
                    background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent',
                    transition: 'background 0.15s',
                  }}>
                    <div style={{
                      width: 12, height: 12, border: `1px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.25)'}`,
                      background: isSelected ? '#fff' : 'transparent', flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: isSelected ? '#fff' : 'rgba(255,255,255,0.55)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.full_name}
                      </p>
                      {r.description && (
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.description}
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>★ {r.stargazers_count}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Scan results */}
        {results.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {scanning ? `Scanning… ${done}/${total}` : `Done — ${done}/${total}`}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {!scanning && (
                  <button onClick={exportCSV} style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)',
                    padding: '6px 14px', fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', ...mono,
                  }}>⬇ CSV</button>
                )}
                <button onClick={() => { setResults([]); }} style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)',
                  padding: '6px 14px', fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', ...mono,
                }}>RESET</button>
              </div>
            </div>

            {/* Progress bar */}
            {scanning && (
              <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }}>
                <div style={{ height: '100%', background: '#fff', width: `${(done / total) * 100}%`, transition: 'width 0.3s' }} />
              </div>
            )}

            <div style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {results.map((r, i) => {
                const col = r.severity ? (SEV_COLOR[r.severity] || '#555') : 'rgba(255,255,255,0.2)';
                const repoName = r.repo.replace('https://github.com/', '');
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.status === 'scanning' ? '#ffcc00' : r.status === 'complete' ? col : r.status === 'error' ? '#ff4444' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repoName}</span>
                    {r.status === 'scanning' && <span style={{ fontSize: 9, color: '#ffcc00', letterSpacing: '0.1em' }}>SCANNING…</span>}
                    {r.status === 'queued' && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>QUEUED</span>}
                    {r.status === 'error' && <span style={{ fontSize: 9, color: '#ff4444' }}>{r.error?.slice(0, 40)}</span>}
                    {r.status === 'complete' && r.severity && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: col, fontWeight: 700 }}>{r.risk_score}</span>
                        <span style={{ fontSize: 9, color: col, border: `1px solid ${col}44`, padding: '1px 6px', letterSpacing: '0.08em' }}>{r.severity?.toUpperCase()}</span>
                        {r.job_id && (
                          <button onClick={() => navigate(`/report/${r.job_id}`)} style={{
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)',
                            padding: '2px 10px', fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', ...mono,
                          }}>REPORT →</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
