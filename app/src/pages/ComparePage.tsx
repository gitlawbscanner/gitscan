import { useState } from 'react';
import PageNav from '../components/PageNav';

const API = import.meta.env.VITE_API_URL || '/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#888',
};

const SEV_RANK: Record<string, number> = {
  critical: 5, high: 4, medium: 3, low: 2, clean: 1, unknown: 0,
};

type Report = {
  repo_url: string;
  report: {
    risk_score: number;
    severity: string;
    summary: string;
    secrets?: { count: number };
    sast?: { count: number };
    dependencies?: { count: number };
    malware?: { count: number; critical: number; high: number };
  };
};

function RepoInput({ label, value, onChange, loading, onScan }: {
  label: string; value: string; onChange: (v: string) => void;
  loading: boolean; onScan: () => void;
}) {
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://github.com/owner/repo"
          onKeyDown={e => e.key === 'Enter' && onScan()}
          style={{
            ...mono, flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
            color: '#fff', fontSize: 12, padding: '10px 12px',
            outline: 'none',
          }}
        />
        <button
          onClick={onScan}
          disabled={loading || !value.trim()}
          style={{
            ...mono, background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4,
            color: 'rgba(255,255,255,0.6)', fontSize: 11, padding: '10px 16px',
            cursor: loading ? 'wait' : 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {loading ? '...' : 'SCAN'}
        </button>
      </div>
    </div>
  );
}

function ScorePanel({ report, side }: { report: Report; side: 'left' | 'right' }) {
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
  const r = report.report;
  const sev = (r.severity || 'unknown').toLowerCase();
  const col = SEV_COLOR[sev] || '#888';

  const rows = [
    { label: 'Secrets', val: r.secrets?.count ?? 0 },
    { label: 'SAST', val: r.sast?.count ?? 0 },
    { label: 'Deps', val: r.dependencies?.count ?? 0 },
    { label: 'Malware', val: r.malware?.count ?? 0 },
  ];

  return (
    <div style={{
      flex: 1, background: 'rgba(255,255,255,0.025)',
      border: `1px solid ${col}30`, borderRadius: 6, padding: 24,
    }}>
      <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8, wordBreak: 'break-all' }}>
        {report.repo_url.replace(/^https?:\/\//, '')}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
        <span style={{ ...mono, fontSize: 52, fontWeight: 700, color: col, lineHeight: 1 }}>
          {r.risk_score ?? '?'}
        </span>
        <span style={{ ...mono, fontSize: 12, color: col, letterSpacing: '0.08em' }}>
          {sev.toUpperCase()}
        </span>
      </div>
      {rows.map(({ label, val }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
          <span style={{ ...mono, fontSize: 11, color: val > 0 ? '#ff8800' : '#44ff88' }}>{val}</span>
        </div>
      ))}
      {r.summary && (
        <p style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 16, lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          {r.summary.slice(0, 200)}{r.summary.length > 200 ? '...' : ''}
        </p>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [urlA, setUrlA] = useState('');
  const [urlB, setUrlB] = useState('');
  const [reportA, setReportA] = useState<Report | null>(null);
  const [reportB, setReportB] = useState<Report | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [errA, setErrA] = useState('');
  const [errB, setErrB] = useState('');

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

  async function scanRepo(url: string, setScan: (r: Report | null) => void, setLoading: (v: boolean) => void, setErr: (v: string) => void) {
    if (!url.trim()) return;
    setLoading(true);
    setErr('');
    setScan(null);
    try {
      const res = await fetch(`${API}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: url.trim() }),
      });
      const { job_id } = await res.json();

      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const poll = await fetch(`${API}/scan/${job_id}`);
        const job = await poll.json();
        if (job.status === 'complete') {
          setScan({ repo_url: url.trim(), report: job.result?.report });
          break;
        }
        if (job.status === 'error') {
          setErr(job.error || 'Scan failed');
          break;
        }
      }
    } catch (e: any) {
      setErr(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  const winner = reportA && reportB
    ? SEV_RANK[reportA.report.severity] < SEV_RANK[reportB.report.severity] ? 'A'
      : SEV_RANK[reportB.report.severity] < SEV_RANK[reportA.report.severity] ? 'B'
      : reportA.report.risk_score < reportB.report.risk_score ? 'A'
      : reportB.report.risk_score < reportA.report.risk_score ? 'B'
      : 'tie'
    : null;

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <PageNav />
      <div style={{ paddingTop: 100, maxWidth: 900, margin: '0 auto', padding: '100px 24px 80px' }}>
        <h1 style={{ ...mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 32 }}>
          Compare Repos
        </h1>

        <div style={{ display: 'flex', gap: 16, marginBottom: 40, flexWrap: 'wrap' }}>
          <RepoInput label="REPO A" value={urlA} onChange={setUrlA} loading={loadingA}
            onScan={() => scanRepo(urlA, setReportA, setLoadingA, setErrA)} />
          <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.2)', ...mono, fontSize: 14, paddingTop: 28 }}>VS</div>
          <RepoInput label="REPO B" value={urlB} onChange={setUrlB} loading={loadingB}
            onScan={() => scanRepo(urlB, setReportB, setLoadingB, setErrB)} />
        </div>

        {winner && winner !== 'tie' && (
          <div style={{ ...mono, fontSize: 11, color: '#44ff88', letterSpacing: '0.1em', marginBottom: 24, textAlign: 'center' }}>
            ✓ REPO {winner} IS SAFER
          </div>
        )}
        {winner === 'tie' && (
          <div style={{ ...mono, fontSize: 11, color: '#ffcc00', letterSpacing: '0.1em', marginBottom: 24, textAlign: 'center' }}>
            ≈ SIMILAR RISK LEVEL
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {(reportA || loadingA || errA) && (
            <div style={{ flex: 1, minWidth: 280 }}>
              {loadingA && <div style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Scanning...</div>}
              {errA && <div style={{ ...mono, fontSize: 11, color: '#ff4444' }}>{errA}</div>}
              {reportA && <ScorePanel report={reportA} side="left" />}
            </div>
          )}
          {(reportB || loadingB || errB) && (
            <div style={{ flex: 1, minWidth: 280 }}>
              {loadingB && <div style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Scanning...</div>}
              {errB && <div style={{ ...mono, fontSize: 11, color: '#ff4444' }}>{errB}</div>}
              {reportB && <ScorePanel report={reportB} side="right" />}
            </div>
          )}
        </div>

        {!reportA && !reportB && !loadingA && !loadingB && (
          <div style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 60, lineHeight: 2 }}>
            Enter two repository URLs above and scan them side by side.<br />
            The safer repo is highlighted automatically.
          </div>
        )}
      </div>
    </div>
  );
}
