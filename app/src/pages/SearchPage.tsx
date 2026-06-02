import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PageNav from '../components/PageNav';

const API = import.meta.env.VITE_API_URL || '/api';

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00',
  low: '#44ff88', clean: '#44ff88', unknown: '#555',
};

type Scan = {
  repo_url: string; repo_name: string; platform: string;
  risk_score: number; severity: string; timestamp: number; scan_count: number;
  last_job_id?: string;
};

function timeAgo(ts: number) {
  const d = Date.now() / 1000 - ts;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query.trim()), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function doSearch(q: string) {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}&limit=30`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <PageNav />
      <div style={{ paddingTop: 100, maxWidth: 760, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ ...mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
            Search
          </h1>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>⌕</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="github.com/owner/repo or keyword..."
              style={{
                ...mono, width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                color: '#fff', fontSize: 13, padding: '14px 14px 14px 40px',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.25)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>
        </div>

        {loading && (
          <div style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
            Searching...
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div style={{ ...mono, fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 60 }}>
            No scanned repos match "{query}"
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', marginBottom: 12 }}>
              {results.length} RESULT{results.length !== 1 ? 'S' : ''}
            </div>
            {results.map((s, i) => {
              const sev = (s.severity || 'unknown').toLowerCase();
              const col = SEV_COLOR[sev] || '#555';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4,
                  gap: 16,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={s.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...mono, fontSize: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', wordBreak: 'break-all' }}
                    >
                      {s.repo_url.replace(/^https?:\/\//, '')}
                    </a>
                    <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                      {s.timestamp ? timeAgo(s.timestamp) : ''}{s.scan_count > 1 ? ` · scanned ${s.scan_count}×` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ ...mono, fontSize: 11, color: col, letterSpacing: '0.06em' }}>
                      {sev.toUpperCase()}
                    </span>
                    <span style={{ ...mono, fontSize: 18, fontWeight: 700, color: col }}>
                      {s.risk_score ?? '?'}
                    </span>
                    {s.last_job_id && (
                      <Link to={`/report/${s.last_job_id}`} style={{
                        ...mono, fontSize: 10, color: 'rgba(255,255,255,0.3)',
                        textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '4px 8px', borderRadius: 3,
                      }}>
                        REPORT →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!searched && (
          <div style={{ marginTop: 60, ...mono, fontSize: 11, color: 'rgba(255,255,255,0.18)', lineHeight: 2 }}>
            Search across all previously scanned repositories.<br />
            Try a GitHub username, org name, or repo keyword.
          </div>
        )}
      </div>
    </div>
  );
}
