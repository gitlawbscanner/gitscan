import { useState } from 'react';
import PageNav from '../components/PageNav';

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const BASE = 'https://gitscan-production.up.railway.app';

type Endpoint = {
  method: 'GET' | 'POST';
  path: string;
  desc: string;
  body?: string;
  response: string;
  params?: { name: string; type: string; desc: string }[];
};

const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/scan',
    desc: 'Start a new security scan. Returns a job ID for polling.',
    body: JSON.stringify({ repo_url: 'https://github.com/owner/repo', branch: 'main' }, null, 2),
    response: JSON.stringify({ job_id: 'uuid-here', status: 'queued' }, null, 2),
  },
  {
    method: 'GET',
    path: '/scan/{job_id}',
    desc: 'Poll scan status. status: queued | running | complete | error.',
    params: [{ name: 'job_id', type: 'string', desc: 'UUID returned from POST /scan' }],
    response: JSON.stringify({ status: 'complete', result: { report: { risk_score: 12, severity: 'low', summary: '...' } } }, null, 2),
  },
  {
    method: 'GET',
    path: '/report/{job_id}',
    desc: 'Get the full report for a completed scan (also checks database for old scans).',
    params: [{ name: 'job_id', type: 'string', desc: 'UUID from scan creation' }],
    response: JSON.stringify({ job_id: '...', repo_url: '...', report: { risk_score: 12, severity: 'low', secrets: {}, sast: {}, dependencies: {}, malware: {} } }, null, 2),
  },
  {
    method: 'GET',
    path: '/recent',
    desc: 'List the 100 most recently scanned repos.',
    response: JSON.stringify([{ repo_url: '...', risk_score: 45, severity: 'medium', timestamp: 1717200000 }], null, 2),
  },
  {
    method: 'GET',
    path: '/trending',
    desc: 'Repos ranked by a recency-weighted scan count score.',
    response: JSON.stringify([{ repo_url: '...', scan_count: 12, risk_score: 30 }], null, 2),
  },
  {
    method: 'GET',
    path: '/search',
    desc: 'Search scanned repos by URL substring.',
    params: [
      { name: 'q', type: 'string', desc: 'Search query (partial URL or keyword)' },
      { name: 'limit', type: 'integer', desc: 'Max results (default 20, max 100)' },
    ],
    response: JSON.stringify([{ repo_url: '...', risk_score: 20, severity: 'low' }], null, 2),
  },
  {
    method: 'GET',
    path: '/badge',
    desc: 'Get an SVG badge for a repo. Embed in your README.',
    params: [{ name: 'repo', type: 'string', desc: 'Full repo URL (e.g. https://github.com/owner/repo)' }],
    response: '<!-- SVG badge image -->',
  },
  {
    method: 'GET',
    path: '/intel',
    desc: 'Aggregate security intelligence across all scanned repos.',
    response: JSON.stringify({ total_scanned: 420, avg_risk_score: 34.2, severity_dist: { clean: 80, low: 120, medium: 160, high: 40, critical: 20 } }, null, 2),
  },
  {
    method: 'GET',
    path: '/stats',
    desc: 'Live scan counters.',
    response: JSON.stringify({ scans_started: 1024, scans_completed: 1000 }, null, 2),
  },
  {
    method: 'GET',
    path: '/live',
    desc: 'Currently running scans (WebSocket-friendly polling).',
    response: JSON.stringify([{ job_id: '...', repo_url: '...', status: 'running', logs: ['Cloning...', 'Running SAST...'] }], null, 2),
  },
];

function MethodBadge({ method }: { method: string }) {
  const col = method === 'POST' ? '#ff8800' : '#44ff88';
  return (
    <span style={{
      ...mono, fontSize: 10, fontWeight: 700, color: col,
      border: `1px solid ${col}60`, borderRadius: 3, padding: '2px 6px',
      letterSpacing: '0.06em', minWidth: 40, display: 'inline-block', textAlign: 'center',
    }}>
      {method}
    </span>
  );
}

export default function ApiDocsPage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <PageNav />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '100px 24px 80px' }}>

        <div style={{ marginBottom: 48 }}>
          <h1 style={{ ...mono, fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '-0.01em' }}>
            API Reference
          </h1>
          <p style={{ ...mono, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
            REST API — no auth required. Base URL:{' '}
            <code style={{ color: 'rgba(255,255,255,0.55)' }}>{BASE}</code>
          </p>
        </div>

        {/* Quick badge embed */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: 20, marginBottom: 40 }}>
          <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginBottom: 12 }}>
            README BADGE
          </div>
          <div style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.9 }}>
            {'![gitscan]('}{BASE}{'/badge?repo=https://github.com/owner/repo)'}
          </div>
          <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
            Paste this into your README.md — the badge auto-updates from the latest scan.
          </div>
        </div>

        {/* Endpoints */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ENDPOINTS.map(ep => {
            const key = ep.method + ep.path;
            const isOpen = open === key;
            return (
              <div key={key} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                <button
                  onClick={() => setOpen(isOpen ? null : key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', background: isOpen ? 'rgba(255,255,255,0.04)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <MethodBadge method={ep.method} />
                  <span style={{ ...mono, fontSize: 12, color: '#fff', flex: 1 }}>{ep.path}</span>
                  <span style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginRight: 8 }}>
                    {ep.desc.slice(0, 60)}{ep.desc.length > 60 ? '...' : ''}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '16px 0' }}>{ep.desc}</p>

                    {ep.params && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 8 }}>PARAMETERS</div>
                        {ep.params.map(p => (
                          <div key={p.name} style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                            <code style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.6)', minWidth: 80 }}>{p.name}</code>
                            <code style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.25)', minWidth: 50 }}>{p.type}</code>
                            <span style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{p.desc}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {ep.body && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 8 }}>REQUEST BODY</div>
                        <pre style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: 12, overflow: 'auto', margin: 0 }}>
                          {ep.body}
                        </pre>
                      </div>
                    )}

                    <div>
                      <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 8 }}>RESPONSE</div>
                      <pre style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: 12, overflow: 'auto', margin: 0 }}>
                        {ep.response}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 48, ...mono, fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 2 }}>
          The API is free and open. Rate limits may apply during high load.{' '}
          <a href="https://github.com/gitlawbscanner/gitscan" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Source on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}
