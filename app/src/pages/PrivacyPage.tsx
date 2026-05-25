import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  const s: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    background: '#000',
    minHeight: '100vh',
    color: 'rgba(255,255,255,0.85)',
    padding: 'clamp(48px, 8vw, 96px) clamp(20px, 8vw, 48px)',
  };

  const h1: React.CSSProperties = {
    fontSize: 'clamp(22px, 4vw, 32px)',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: 8,
  };

  const h2: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginTop: 40,
    marginBottom: 12,
    borderLeft: '2px solid rgba(255,255,255,0.3)',
    paddingLeft: 12,
  };

  const p: React.CSSProperties = {
    fontSize: 12,
    lineHeight: 1.8,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 12,
    maxWidth: 720,
  };

  const li: React.CSSProperties = {
    fontSize: 12,
    lineHeight: 1.8,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 6,
  };

  return (
    <div style={s}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link to="/" style={{
          fontSize: 11, color: 'rgba(255,255,255,0.35)',
          textDecoration: 'none', letterSpacing: '0.08em',
          textTransform: 'uppercase', display: 'inline-block', marginBottom: 40,
        }}>← Back to gitscan</Link>

        <h1 style={h1}>Privacy Policy</h1>
        <p style={{ ...p, color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 32 }}>
          Last updated: May 2026 · gitscan Chrome Extension &amp; Web App
        </p>

        <p style={p}>
          gitscan ("we", "our", or "the extension") is an open-source security scanner for Git repositories.
          This policy explains what data is collected, how it is used, and your rights regarding that data.
        </p>

        <h2 style={h2}>1. Data We Collect</h2>
        <p style={p}>The extension collects only the minimum data required to perform a security scan:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
          <li style={li}><strong style={{ color: '#fff' }}>Repository URL</strong> — the public Git repository URL you submit for scanning. This is sent to our backend API to initiate the scan.</li>
          <li style={li}><strong style={{ color: '#fff' }}>Scan results</strong> — security findings returned by the backend are displayed locally in the extension popup and on our web app.</li>
        </ul>
        <p style={p}>
          We do <strong style={{ color: '#fff' }}>not</strong> collect your name, email, IP address, browsing history,
          authentication tokens, or any other personal information.
        </p>

        <h2 style={h2}>2. How Data Is Used</h2>
        <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
          <li style={li}>Repository URLs are cloned temporarily on our server for static analysis, then deleted.</li>
          <li style={li}>Scan results are stored to generate a shareable report link (e.g. <code style={{ color: 'rgba(255,255,255,0.6)' }}>/report/UUID</code>).</li>
          <li style={li}>No data is sold, rented, or shared with third-party advertisers.</li>
        </ul>

        <h2 style={h2}>3. Remote Connections</h2>
        <p style={p}>
          The extension communicates exclusively with the gitscan backend at
          <code style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 4 }}>gitscan-production.up.railway.app</code>.
          This connection is required to perform repository scanning and retrieve results.
          No other remote hosts are contacted.
        </p>

        <h2 style={h2}>4. Third-Party Services</h2>
        <p style={p}>
          Scan analysis may use AI services (MiniMax, Anthropic Claude) to generate security summaries.
          Only sanitized code snippets from the scanned repository are sent — no user identity data.
          These services operate under their own privacy policies.
        </p>

        <h2 style={h2}>5. Data Retention</h2>
        <p style={p}>
          Scan results are stored for 30 days and then automatically deleted.
          Cloned repository files are deleted immediately after scanning completes.
        </p>

        <h2 style={h2}>6. Your Rights</h2>
        <p style={p}>
          Since we do not collect personal data, there is no personal profile to delete.
          You may request deletion of a specific scan report by contacting us.
        </p>

        <h2 style={h2}>7. Contact</h2>
        <p style={p}>
          Questions or requests: open an issue at{' '}
          <a href="https://github.com/gitlawbscanner/gitscan" target="_blank" rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
            github.com/gitlawbscanner/gitscan
          </a>
          {' '}or message <a href="https://x.com/gitlawbscan" target="_blank" rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
            @gitlawbscan on X
          </a>.
        </p>

        <div style={{
          marginTop: 64,
          paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          © 2026 gitscan · Open source · No tracking
        </div>
      </div>
    </div>
  );
}
