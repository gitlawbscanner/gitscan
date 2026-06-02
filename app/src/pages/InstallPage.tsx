import PageNav from '../components/PageNav';

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

const STEPS = [
  {
    n: '01',
    title: 'Download ZIP',
    desc: 'Download the latest extension release from GitHub.',
    action: { label: 'Download from GitHub →', href: 'https://github.com/gitlawbscanner/gitscan/releases' },
  },
  {
    n: '02',
    title: 'Open Extensions',
    desc: 'In Chrome, go to chrome://extensions and enable Developer Mode (toggle in top-right corner).',
    code: 'chrome://extensions',
  },
  {
    n: '03',
    title: 'Load Unpacked',
    desc: 'Click "Load unpacked" and select the extracted extension/ folder.',
    code: 'Load unpacked → select /extension folder',
  },
  {
    n: '04',
    title: 'Done',
    desc: 'Pin the gitscan icon to your toolbar. Navigate to any GitHub or Gitlawb repo and click the icon to scan.',
  },
];

const FEATURES = [
  ['One-click scan', 'Scan any public GitHub or Gitlawb repo from the toolbar'],
  ['AI risk score', 'MiniMax M2.7 + Claude Sonnet generate a 0-100 security score'],
  ['Secrets detection', 'Finds leaked API keys, tokens, private keys'],
  ['Malware scan', 'Detects miners, backdoors, obfuscated code'],
  ['SAST analysis', 'Static analysis via Semgrep or Bandit'],
  ['Dep vulnerabilities', 'Checks OSV.dev for known CVEs in dependencies'],
  ['Share card', 'Post your scan result to X/Twitter in one click'],
];

const PERMS = [
  ['activeTab', 'Read the current tab URL to extract repo path'],
  ['storage', 'Cache scan results locally for quick re-open'],
  ['host: gitscan-production.up.railway.app', 'Send scan requests to our backend API'],
];

export default function InstallPage() {
  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <PageNav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '100px 24px 80px' }}>

        <div style={{ marginBottom: 56 }}>
          <h1 style={{ ...mono, fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '-0.01em' }}>
            Install gitscan
          </h1>
          <p style={{ ...mono, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
            Chrome extension for instant GitHub & Gitlawb security scanning.
          </p>
        </div>

        {/* Install steps */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginBottom: 20 }}>
            MANUAL INSTALL (SIDELOAD)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {STEPS.map(s => (
              <div key={s.n} style={{
                display: 'flex', gap: 24, padding: '20px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.1)', minWidth: 32, flexShrink: 0, lineHeight: 1 }}>
                  {s.n}
                </div>
                <div>
                  <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{s.title}</div>
                  <p style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                  {s.code && (
                    <div style={{
                      ...mono, fontSize: 11, color: 'rgba(255,255,255,0.5)',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 4, padding: '6px 10px', marginTop: 10, display: 'inline-block',
                    }}>
                      {s.code}
                    </div>
                  )}
                  {s.action && (
                    <a
                      href={s.action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...mono, display: 'inline-block', marginTop: 10, fontSize: 11,
                        color: '#fff', background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4,
                        padding: '8px 14px', textDecoration: 'none',
                      }}
                    >
                      {s.action.label}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginBottom: 16 }}>
            FEATURES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {FEATURES.map(([feat, desc]) => (
              <div key={feat} style={{ display: 'flex', gap: 20, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ ...mono, fontSize: 11, color: '#44ff88', minWidth: 140 }}>✓ {feat}</span>
                <span style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions */}
        <div>
          <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginBottom: 16 }}>
            PERMISSIONS EXPLAINED
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {PERMS.map(([perm, reason]) => (
              <div key={perm} style={{ display: 'flex', gap: 20, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                <code style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                  {perm}
                </code>
                <span style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 56, ...mono, fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 2 }}>
          No data is collected beyond the repository URL you submit.{' '}
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
