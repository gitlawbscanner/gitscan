import { Link, useLocation } from 'react-router-dom';

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const GitlawbIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
  </svg>
);

const GithubIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.7 8c-.12.58-.46.72-.93.45l-2.5-1.84-1.21 1.16c-.13.14-.25.25-.51.25l.18-2.56 4.65-4.2c.2-.18-.04-.28-.31-.1L7.54 14.8l-2.46-.77c-.53-.17-.54-.53.12-.78l9.62-3.71c.44-.16.83.1.82.26z"/>
  </svg>
);

export default function Footer() {
  const location = useLocation();
  const isBotPage = location.pathname === '/bot';

  const linkStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px', fontWeight: 400, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)',
    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
    transition: 'color 0.2s',
  };

  const onHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    (e.currentTarget as HTMLElement).style.color = '#fff';
  };
  const offHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
  };

  return (
    <footer style={{
      background: '#000',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: 'clamp(32px, 5vw, 48px) clamp(20px, 5vw, 40px)',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Top row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 24, marginBottom: 32,
          paddingBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {/* Brand + tagline */}
          <div>
            <img src="/logo.png" alt="gitscan" style={{ height: 32, display: 'block', marginBottom: 6 }} />
            <p style={{
              fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '6px 0 0',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Security audits for the decentralized dev era
            </p>
          </div>

          {/* Social links + CA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <a href="https://x.com/gitlawbscan" target="_blank" rel="noopener noreferrer"
                style={linkStyle} onMouseEnter={onHover} onMouseLeave={offHover}>
                <XIcon /> X
              </a>
              <a href="https://gitlawb.com/gitscan" target="_blank" rel="noopener noreferrer"
                style={linkStyle} onMouseEnter={onHover} onMouseLeave={offHover}>
                <GitlawbIcon /> Gitlawb
              </a>
              <a href="https://github.com/gitlawbscanner/gitscan" target="_blank" rel="noopener noreferrer"
                style={linkStyle} onMouseEnter={onHover} onMouseLeave={offHover}>
                <GithubIcon /> GitHub
              </a>
              <a href="https://t.me/gitlawbscanbot" target="_blank" rel="noopener noreferrer"
                style={linkStyle} onMouseEnter={onHover} onMouseLeave={offHover}>
                <TelegramIcon /> Telegram
              </a>
            </div>
            <div
              onClick={() => navigator.clipboard?.writeText('0x46BC5B1b003e9659d5638715e3302e15C372d59d')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '7px 14px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.55)',
                cursor: 'copy', userSelect: 'all',
              }}
              title="Click to copy CA"
            >
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: '0.15em' }}>CA</span>
              <span>0x46BC5B1b003e9659d5638715e3302e15C372d59d</span>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>
              © 2026 gitscan
            </span>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            <a href="https://gitlawb.com" target="_blank" rel="noopener noreferrer"
              style={{ ...linkStyle, fontSize: 10 }} onMouseEnter={onHover} onMouseLeave={offHover}>
              Built for gitlawb.com
            </a>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            {!isBotPage && (
              <Link to="/bot" style={{ ...linkStyle, fontSize: 10 }}
                onMouseEnter={onHover} onMouseLeave={offHover}>
                Telegram Bot
              </Link>
            )}
            {isBotPage && (
              <Link to="/" style={{ ...linkStyle, fontSize: 10 }}
                onMouseEnter={onHover} onMouseLeave={offHover}>
                ← Back to Scanner
              </Link>
            )}
            <a href="#scan" style={{ ...linkStyle, fontSize: 10 }}
              onMouseEnter={onHover} onMouseLeave={offHover}>
              Scan a Repo
            </a>
            <Link to="/privacy" style={{ ...linkStyle, fontSize: 10 }}
              onMouseEnter={onHover} onMouseLeave={offHover}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
