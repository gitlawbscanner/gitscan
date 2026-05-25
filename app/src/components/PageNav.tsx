import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Scan' },
  { to: '/activity', label: 'Latest' },
  { to: '/trending', label: 'Trending' },
  { to: '/intel', label: 'Intel' },
  { to: '/bot', label: 'Bot' },
];

export default function PageNav() {
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 40px', background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <img src="/logo.png" alt="gitscan" style={{ height: 24, display: 'block' }} />
      </Link>
      <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        {LINKS.map(({ to, label }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.1em',
              textTransform: 'uppercase', textDecoration: 'none',
              color: active ? '#fff' : 'rgba(255,255,255,0.4)',
              borderBottom: active ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
              paddingBottom: 2, transition: 'color 0.2s, border-color 0.2s',
            }}>{label}</Link>
          );
        })}
      </div>
    </nav>
  );
}
