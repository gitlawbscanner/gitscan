import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AsciiCanvas from '../components/AsciiCanvas';
import { heroConfig, navigationConfig } from '../config';

export default function Hero() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => { if (menuOpen) setMenuOpen(false); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen]);

  const linkStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 400, color: '#fff',
    textTransform: 'uppercase', textDecoration: 'none',
    letterSpacing: '0.08em', borderBottom: '1px solid transparent',
    transition: 'border-color 0.2s', paddingBottom: '2px',
    fontFamily: "'IBM Plex Mono', monospace",
  };

  const renderLink = (item: { label: string; href: string }) => {
    if (item.href.startsWith('/')) {
      return (
        <Link key={item.label} to={item.href} style={linkStyle}
          onClick={() => setMenuOpen(false)}
          onMouseEnter={e => (e.currentTarget.style.borderBottomColor = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}>
          {item.label}
        </Link>
      );
    }
    return (
      <a key={item.label} href={item.href} style={linkStyle}
        onClick={() => setMenuOpen(false)}
        onMouseEnter={e => (e.currentTarget.style.borderBottomColor = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}>
        {item.label}
      </a>
    );
  };

  return (
    <section id="hero" className="hero-section">

      {/* Navigation */}
      <nav className="hero-nav">
        <img src="/logo.png" alt={navigationConfig.brandName} style={{ height: '26px', display: 'block' }} />

        {/* Desktop links */}
        <div className="hero-nav-links">
          {navigationConfig.links.map(renderLink)}
        </div>

        {/* Hamburger button — mobile only */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span className={`ham-line ${menuOpen ? 'open-1' : ''}`} />
          <span className={`ham-line ${menuOpen ? 'open-2' : ''}`} />
          <span className={`ham-line ${menuOpen ? 'open-3' : ''}`} />
        </button>
      </nav>

      {/* Backdrop — klik di luar tutup menu */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 97, background: 'transparent',
        }} />
      )}

      {/* Mobile dropdown menu */}
      <div className={`mobile-menu ${menuOpen ? 'mobile-menu-open' : ''}`}>
        {navigationConfig.links.map((item) => {
          const mStyle: React.CSSProperties = {
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px', fontWeight: 400, color: '#fff',
            textTransform: 'uppercase', textDecoration: 'none',
            letterSpacing: '0.1em', padding: '16px 0',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'block',
          };
          if (item.href.startsWith('/')) {
            return <Link key={item.label} to={item.href} style={mStyle} onClick={() => setMenuOpen(false)}>{item.label}</Link>;
          }
          return <a key={item.label} href={item.href} style={mStyle} onClick={() => setMenuOpen(false)}>{item.label}</a>;
        })}
      </div>

      {/* Left content panel */}
      <div className="hero-left">
        <div className="hero-content">
          <p className="hero-eyebrow">{heroConfig.eyebrow}</p>
          <h1 className="hero-title">
            {heroConfig.titleLines.map((line, i) => (
              <span key={i}>{line}{i < heroConfig.titleLines.length - 1 && <br />}</span>
            ))}
          </h1>
          <p className="hero-lead">{heroConfig.leadText}</p>
          <div className="hero-notes">
            {heroConfig.supportingNotes.map((note, i) => (
              <p key={i} className="hero-note">{note}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Right ASCII canvas */}
      <div className="hero-right">
        <AsciiCanvas />
      </div>

      <style>{`
        .hero-section {
          position: relative;
          width: 100%;
          height: 100vh;
          background: #000;
          display: flex;
          flex-direction: row;
          overflow: hidden;
        }

        /* ── NAV ── */
        .hero-nav {
          position: fixed;
          top: 0; left: 0;
          width: 100%;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          box-sizing: border-box;
        }
        .hero-nav-links {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        /* ── HAMBURGER ── */
        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 36px;
          height: 36px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          z-index: 101;
        }
        .ham-line {
          display: block;
          width: 22px;
          height: 1.5px;
          background: #fff;
          transition: transform 0.25s ease, opacity 0.25s ease;
          transform-origin: center;
        }
        .open-1 { transform: translateY(6.5px) rotate(45deg); }
        .open-2 { opacity: 0; }
        .open-3 { transform: translateY(-6.5px) rotate(-45deg); }

        /* ── MOBILE DROPDOWN ── */
        .mobile-menu {
          display: none;
          position: fixed;
          top: 64px;
          left: 0;
          width: 100%;
          z-index: 99;
          background: rgba(0,0,0,0.97);
          backdrop-filter: blur(12px);
          padding: 0 24px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          transform: translateY(-8px);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .mobile-menu-open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: all;
        }

        /* ── LAYOUT ── */
        .hero-left {
          position: relative;
          width: 40%;
          min-width: 320px;
          min-height: 100vh;
          background: #000;
          flex-shrink: 0;
        }
        .hero-right {
          position: relative;
          flex: 1;
          background: #000;
          overflow: hidden;
          min-height: 100vh;
        }

        /* ── CONTENT ── */
        .hero-content {
          padding: 120px 40px 60px;
          display: flex;
          flex-direction: column;
        }
        .hero-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.42);
          margin: 0 0 22px;
        }
        .hero-title {
          font-family: 'Geist Pixel', monospace;
          font-size: clamp(38px, 5.6vw, 82px);
          font-weight: 400;
          line-height: 0.96;
          color: #fff;
          text-transform: uppercase;
          margin: 0 0 40px;
          letter-spacing: 0.015em;
        }
        .hero-lead {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          line-height: 1.9;
          color: rgba(255,255,255,0.56);
          margin: 0 0 40px;
          max-width: 42ch;
        }
        .hero-notes {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .hero-note {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          line-height: 1.85;
          color: rgba(255,255,255,0.35);
          margin: 0;
          padding-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.1);
          max-width: 38ch;
        }

        /* ── TABLET ── */
        @media (max-width: 1024px) {
          .hero-left { width: 50%; min-width: 280px; }
        }

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          .hero-section { flex-direction: column; height: auto; min-height: 100vh; }
          .hero-nav { padding: 16px 20px; }
          .hero-nav-links { display: none; }
          .hamburger { display: flex; }
          .mobile-menu { display: block; }
          .hero-left { width: 100%; min-width: unset; min-height: unset; }
          .hero-right { display: none; }
          .hero-content { padding: 88px 20px 56px; }
          .hero-title { font-size: clamp(34px, 10vw, 52px); margin-bottom: 24px; }
          .hero-lead { font-size: 12px; max-width: 100%; }
          .hero-note { font-size: 11px; }
        }

        @media (max-width: 400px) {
          .hero-content { padding: 80px 16px 48px; }
        }
      `}</style>
    </section>
  );
}
