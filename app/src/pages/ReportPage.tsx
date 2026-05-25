import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageNav from '../components/PageNav';

const API = import.meta.env.VITE_API_URL || '/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#888',
};
const SEV_DIM: Record<string, string> = {
  critical: 'rgba(255,68,68,0.1)', high: 'rgba(255,136,0,0.08)',
  medium: 'rgba(255,204,0,0.07)', low: 'rgba(68,255,136,0.07)',
  clean: 'rgba(68,255,136,0.07)', unknown: 'rgba(255,255,255,0.03)',
};
const CAT_LABEL: Record<string, string> = {
  secrets: 'SECRETS', sast: 'SAST', dependencies: 'DEPS',
};

function RiskArc({ score, severity }: { score: number; severity: string }) {
  const r = 52, circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ * 0.75;
  const color = SEV_COLOR[severity] || '#fff';
  return (
    <svg width={140} height={100} viewBox="0 0 140 100">
      <circle cx={70} cy={80} r={r} fill="none" stroke="rgba(255,255,255,0.07)"
        strokeWidth={6} strokeDasharray={`${circ * 0.75} ${circ}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round" />
      <circle cx={70} cy={80} r={r} fill="none" stroke={color}
        strokeWidth={6} strokeDasharray={`${dash} ${circ - dash + circ * 0.25}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 10px ${color}88)` }} />
      <text x={70} y={74} textAnchor="middle" fill="#fff"
        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 400 }}>{pct}</text>
      <text x={70} y={90} textAnchor="middle" fill="rgba(255,255,255,0.3)"
        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 2 }}>RISK</text>
    </svg>
  );
}

function FindingCard({ finding }: { finding: any }) {
  const [open, setOpen] = useState(false);
  const color = SEV_COLOR[finding.severity] || '#fff';
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      border: `1px solid ${open ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
      borderLeft: `3px solid ${color}`,
      padding: '14px 18px', marginBottom: 8, cursor: 'pointer',
      background: open ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em',
            textTransform: 'uppercase', padding: '2px 7px',
            border: `1px solid ${color}44`, color, background: `${color}11`,
          }}>{finding.severity}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#fff' }}>{finding.title}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
            {CAT_LABEL[finding.category] || finding.category}
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 12px' }}>{finding.description}</p>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color, letterSpacing: '0.1em' }}>FIX → </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{finding.recommendation}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [badgeCopied, setBadgeCopied] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    fetch(`${API}/report/${jobId}`)
      .then(r => {
        if (r.status === 202) return null;
        if (!r.ok) throw new Error('Report not found');
        return r.json();
      })
      .then(d => { if (d) setData(d); else setError('Scan still in progress — check back soon.'); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [jobId]);

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const report = data?.report;
  const repoUrl = data?.repo_url || '';
  const repoName = repoUrl.replace('https://', '').replace('http://', '');
  const sevColor = SEV_COLOR[report?.severity] || '#fff';
  const sevDim = SEV_DIM[report?.severity] || 'rgba(255,255,255,0.03)';
  const badgeUrl = `${window.location.origin}/report/${jobId}`;
  const badgeMd = `[![gitscan score](https://img.shields.io/badge/gitscan-${report?.risk_score || '?'}%2F100-${report?.severity === 'critical' ? 'red' : report?.severity === 'high' ? 'orange' : report?.severity === 'medium' ? 'yellow' : 'brightgreen'})](${badgeUrl})`;

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <PageNav />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(88px,11vw,130px) clamp(16px,4vw,32px) 80px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>
            LOADING REPORT...
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>{error}</p>
            <button onClick={() => navigate('/')} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.6)', padding: '10px 24px',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: 'pointer', letterSpacing: '0.1em',
            }}>← BACK TO SCAN</button>
          </div>
        )}

        {report && (
          <>
            {/* Header */}
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 10px' }}>
              // Security Report
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 'clamp(14px,2vw,20px)', fontWeight: 400, color: 'rgba(255,255,255,0.7)', margin: '0 0 6px', letterSpacing: '0.04em' }}>
                  <a href={repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}>
                    {repoName} ↗
                  </a>
                </h1>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.1em',
                    textTransform: 'uppercase', padding: '3px 10px',
                    border: `1px solid ${sevColor}55`, color: sevColor, background: `${sevColor}11`,
                  }}>{report.severity}</span>
                  {report.severity === 'critical' && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#ff4444', border: '1px solid rgba(255,68,68,0.4)', padding: '2px 8px', background: 'rgba(255,68,68,0.08)' }}>⚠ DON'T RUN</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={copyLink} style={{
                  background: copied ? 'rgba(68,255,136,0.1)' : 'transparent',
                  border: `1px solid ${copied ? 'rgba(68,255,136,0.4)' : 'rgba(255,255,255,0.15)'}`,
                  color: copied ? '#44ff88' : 'rgba(255,255,255,0.6)',
                  padding: '8px 16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                  cursor: 'pointer', letterSpacing: '0.08em', transition: 'all 0.2s',
                }}>{copied ? '✓ COPIED' : '⎘ SHARE'}</button>
                <button onClick={() => { navigator.clipboard?.writeText(badgeMd); setBadgeCopied(true); setTimeout(() => setBadgeCopied(false), 2000); }} style={{
                  background: badgeCopied ? 'rgba(68,255,136,0.08)' : 'transparent',
                  border: `1px solid ${badgeCopied ? 'rgba(68,255,136,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: badgeCopied ? '#44ff88' : 'rgba(255,255,255,0.45)', padding: '8px 16px',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em', transition: 'all 0.2s',
                }}>{badgeCopied ? '✓ BADGE COPIED' : '⎘ COPY BADGE'}</button>
                <button onClick={() => navigate(`/?prefill=${encodeURIComponent(repoUrl)}`)} style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.45)', padding: '8px 16px',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em',
                }}>↺ RESCAN</button>
              </div>
            </div>

            {/* Badge embed — always visible */}
            <div style={{ border: '1px solid rgba(255,255,255,0.07)', padding: '14px 18px', marginBottom: 24, background: 'rgba(255,255,255,0.015)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>README BADGE</p>
                <img src={`https://img.shields.io/badge/gitscan-${report?.risk_score ?? '?'}%2F100-${report?.severity === 'critical' ? 'red' : report?.severity === 'high' ? 'orange' : report?.severity === 'medium' ? 'yellow' : 'brightgreen'}?style=flat-square&logo=shield`} alt="gitscan badge" style={{ height: 20, display: 'block' }} />
              </div>
              <code style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.35)', flex: 1, overflow: 'auto', whiteSpace: 'nowrap', minWidth: 0 }}>{badgeMd}</code>
            </div>

            {/* Score + summary */}
            <div style={{ border: `1px solid ${sevColor}22`, background: sevDim, padding: '28px 32px', marginBottom: 28, display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              <RiskArc score={report.risk_score} severity={report.severity} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 10px' }}>AI SUMMARY</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, margin: 0 }}>{report.summary}</p>
                {report.gitlawb_notes && (
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(100,140,255,0.7)', lineHeight: 1.6, margin: '12px 0 0', borderLeft: '2px solid rgba(100,140,255,0.3)', paddingLeft: 12 }}>
                    ⬡ {report.gitlawb_notes}
                  </p>
                )}
              </div>
            </div>

            {/* Findings */}
            {report.findings_summary?.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>
                  FINDINGS — {report.findings_summary.length}
                </p>
                {report.findings_summary.map((f: any, i: number) => <FindingCard key={i} finding={f} />)}
              </div>
            )}

            {/* Recommendations */}
            {report.top_recommendations?.length > 0 && (
              <div style={{ border: '1px solid rgba(255,255,255,0.07)', padding: '22px 24px' }}>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
                  TOP RECOMMENDATIONS
                </p>
                {report.top_recommendations.map((rec: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: sevColor, flexShrink: 0, marginTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
