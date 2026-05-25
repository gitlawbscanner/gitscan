import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ctaConfig } from '../config';

gsap.registerPlugin(ScrollTrigger);

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [primaryHover, setPrimaryHover] = useState(false);
  const [secondaryHover, setSecondaryHover] = useState(false);

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 50, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 65%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="cta"
      style={{
        background: '#000',
        color: '#fff',
        padding: 'clamp(80px, 12vw, 160px) clamp(20px, 5vw, 40px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }}
      />

      <div
        ref={contentRef}
        style={{
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
          maxWidth: '680px',
          opacity: 0,
        }}
      >
        <h2
          style={{
            fontFamily: "'Geist Pixel', monospace",
            fontSize: 'clamp(32px, 4.5vw, 64px)',
            fontWeight: 400,
            lineHeight: 1.05,
            textTransform: 'uppercase',
            color: '#fff',
            margin: '0 0 24px 0',
            letterSpacing: '0.015em',
            textWrap: 'balance',
          }}
        >
          {ctaConfig.headline}
        </h2>

        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: 1.85,
            color: 'rgba(255,255,255,0.5)',
            margin: '0 0 48px 0',
            maxWidth: '52ch',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {ctaConfig.subtext}
        </p>

        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <a
            href={ctaConfig.primaryHref}
            onMouseEnter={() => setPrimaryHover(true)}
            onMouseLeave={() => setPrimaryHover(false)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#000',
              background: '#fff',
              border: '1px solid #fff',
              borderRadius: '30px',
              padding: '14px 36px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.25s ease',
              transform: primaryHover ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: primaryHover
                ? '0 8px 30px rgba(255,255,255,0.12)'
                : '0 0 0 rgba(255,255,255,0)',
            }}
          >
            {ctaConfig.primaryCta}
            <span style={{ fontSize: '16px' }}>&#8594;</span>
          </a>

          <a
            href={ctaConfig.secondaryHref}
            onMouseEnter={() => setSecondaryHover(true)}
            onMouseLeave={() => setSecondaryHover(false)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#fff',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '30px',
              padding: '14px 36px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.25s ease',
              transform: secondaryHover ? 'translateY(-2px)' : 'translateY(0)',
              borderColor: secondaryHover
                ? 'rgba(255,255,255,0.7)'
                : 'rgba(255,255,255,0.3)',
            }}
          >
            {ctaConfig.secondaryCta}
          </a>
        </div>
      </div>
    </section>
  );
}
