import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { botConfig } from '../config';

export default function BotHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!heroRef.current) return;
    const els = heroRef.current.querySelectorAll('.bot-anim');
    els.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = '0';
      htmlEl.style.transform = 'translateY(24px)';
      setTimeout(() => {
        htmlEl.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        htmlEl.style.opacity = '1';
        htmlEl.style.transform = 'translateY(0)';
      }, 100 + i * 120);
    });
  }, []);

  useEffect(() => {
    const onScroll = () => { if (menuOpen) setMenuOpen(false); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen]);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      setMenuOpen(false);
      const target = document.querySelector(href) as HTMLElement | null;
      if (target) {
        setTimeout(() => {
          const y = target.getBoundingClientRect().top + window.pageYOffset - 70;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 100);
      }
    } else {
      setMenuOpen(false);
    }
  };

  return (
    <section ref={heroRef} id="hero" style={{
      position: 'relative', width: '100%', minHeight: '100vh',
      background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>

      {/* Navigation */}
      <nav className="bot-nav">
        {/* Left: logo + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/" style={{ display: 'block', opacity: 0.5, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
            <img src="/logo.png" alt="gitscan" style={{ height: '22px', display: 'block' }} />
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', fontFamily: "'IBM Plex Mono', monospace" }}>/</span>
          <span style={{
            fontSize: '13px', fontWeight: 400, color: '#fff',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            Bot
          </span>
        </div>

        {/* Desktop links */}
        <div className="bot-nav-links">
          {botConfig.navigation.links.map((item) => (
            <a key={item.label} href={item.href}
              onClick={e => handleAnchorClick(e, item.href)}
              style={{
                fontSize: '11px', fontWeight: 400, color: '#fff',
                textTransform: 'uppercase', textDecoration: 'none',
                letterSpacing: '0.08em', borderBottom: '1px solid transparent',
                transition: 'border-color 0.2s', paddingBottom: '2px',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderBottomColor = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}>
              {item.label}
            </a>
          ))}
        </div>

        {/* Hamburger */}
        <button className="bot-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          <span className={`bham-line ${menuOpen ? 'bopen-1' : ''}`} />
          <span className={`bham-line ${menuOpen ? 'bopen-2' : ''}`} />
          <span className={`bham-line ${menuOpen ? 'bopen-3' : ''}`} />
        </button>
      </nav>

      {/* Mobile dropdown */}
      <div className={`bot-mobile-menu ${menuOpen ? 'bot-menu-open' : ''}`}>
        {botConfig.navigation.links.map((item) => (
          <a key={item.label} href={item.href}
            onClick={e => handleAnchorClick(e, item.href)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px', color: '#fff', textTransform: 'uppercase',
              textDecoration: 'none', letterSpacing: '0.1em',
              padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'block',
            }}>
            {item.label}
          </a>
        ))}
      </div>

      {/* Backdrop */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 85, background: 'transparent',
        }} />
      )}

      {/* Hero Content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        textAlign: 'center', padding: 'clamp(100px,14vw,140px) clamp(20px,5vw,40px) 80px',
        position: 'relative', zIndex: 2,
      }}>
        <p className="bot-anim" style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.42)', margin: '0 0 28px',
        }}>
          {botConfig.hero.eyebrow}
        </p>

        <h1 className="bot-anim" style={{
          fontFamily: "'Geist Pixel', monospace",
          fontSize: 'clamp(42px, 9vw, 120px)',
          fontWeight: 400, lineHeight: 0.95, color: '#fff',
          textTransform: 'uppercase', margin: 0,
          letterSpacing: '0.015em',
        }}>
          {botConfig.hero.titleLines.map((line, i) => (
            <span key={i}>{line}{i < botConfig.hero.titleLines.length - 1 && <br />}</span>
          ))}
        </h1>

        <p className="bot-anim" style={{
          fontFamily: "'Geist Pixel', monospace",
          fontSize: 'clamp(13px, 1.4vw, 18px)',
          lineHeight: 1.4, color: 'rgba(255,255,255,0.6)',
          margin: '24px 0 16px', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {botConfig.hero.tagline}
        </p>

        <p className="bot-anim" style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px', lineHeight: 1.85,
          color: 'rgba(255,255,255,0.45)', margin: '0 0 48px',
          maxWidth: '48ch',
        }}>
          {botConfig.hero.description}
        </p>

        <a className="bot-anim" href={botConfig.hero.ctaHref} style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px', textTransform: 'uppercase',
          letterSpacing: '0.1em', color: '#000',
          background: '#fff', border: '1px solid #fff',
          borderRadius: '30px', padding: '14px 36px',
          textDecoration: 'none', display: 'inline-flex',
          alignItems: 'center', gap: '10px', transition: 'all 0.25s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(255,255,255,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
          {botConfig.hero.ctaText}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8L22 12L18 16" /><path d="M2 12H22" />
          </svg>
        </a>
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px',
        background: 'linear-gradient(to bottom, transparent, #111)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      <style>{`
        .bot-nav {
          position: fixed; top: 0; left: 0; width: 100%; z-index: 90;
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 40px;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
          box-sizing: border-box;
        }
        .bot-nav-links {
          display: flex; gap: 28px; align-items: center;
        }
        .bot-hamburger {
          display: none; flex-direction: column; justify-content: center;
          align-items: center; gap: 5px; width: 36px; height: 36px;
          background: transparent; border: none; cursor: pointer; padding: 0; z-index: 91;
        }
        .bham-line {
          display: block; width: 22px; height: 1.5px; background: #fff;
          transition: transform 0.25s ease, opacity 0.25s ease; transform-origin: center;
        }
        .bopen-1 { transform: translateY(6.5px) rotate(45deg); }
        .bopen-2 { opacity: 0; }
        .bopen-3 { transform: translateY(-6.5px) rotate(-45deg); }

        .bot-mobile-menu {
          display: none; position: fixed; top: 60px; left: 0; width: 100%; z-index: 89;
          background: rgba(0,0,0,0.97); backdrop-filter: blur(12px);
          padding: 0 24px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          transform: translateY(-8px); opacity: 0; pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .bot-menu-open {
          opacity: 1 !important; transform: translateY(0) !important; pointer-events: all !important;
        }

        @media (max-width: 768px) {
          .bot-nav { padding: 16px 20px; }
          .bot-nav-links { display: none; }
          .bot-hamburger { display: flex; }
          .bot-mobile-menu { display: block; }
        }
      `}</style>
    </section>
  );
}
