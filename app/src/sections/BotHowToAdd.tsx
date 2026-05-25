import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { botConfig } from '../config';

gsap.registerPlugin(ScrollTrigger);

export default function BotHowToAdd() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !stepsRef.current) return;

    const steps = stepsRef.current.querySelectorAll('.add-step');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        steps,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
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
      id="add"
      style={{
        background: '#1c1c1e',
        color: '#fff',
        padding: '140px 40px',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h3
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.42)',
            margin: '0 0 64px 0',
            textAlign: 'center',
          }}
        >
          {botConfig.howToAddConfig.sectionLabel}
        </h3>

        <div
          ref={stepsRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
          }}
        >
          {botConfig.howToAddConfig.steps.map((step) => (
            <div
              key={step.number}
              className="add-step"
              style={{
                background: '#111',
                borderRadius: '20px',
                padding: '36px 28px',
                border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
                position: 'relative',
                opacity: 0,
                transition: 'transform 0.3s ease, border-color 0.3s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'translateY(-4px)';
                el.style.borderColor = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'translateY(0)';
                el.style.borderColor = 'rgba(255,255,255,0.06)';
              }}
            >
              <span
                style={{
                  fontFamily: "'Geist Pixel', monospace",
                  fontSize: '36px',
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.12)',
                  display: 'block',
                  marginBottom: '20px',
                }}
              >
                {step.number}
              </span>

              <h4
                style={{
                  fontFamily: "'Geist Pixel', monospace",
                  fontSize: '18px',
                  fontWeight: 400,
                  lineHeight: 1.2,
                  textTransform: 'uppercase',
                  color: '#fff',
                  margin: '0 0 12px 0',
                  letterSpacing: '0.03em',
                }}
              >
                {step.title}
              </h4>

              <p
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px',
                  fontWeight: 400,
                  lineHeight: 1.75,
                  color: 'rgba(255,255,255,0.45)',
                  margin: 0,
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '56px',
          }}
        >
          <a
            href={botConfig.hero.ctaHref}
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
              gap: '10px',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = '0 8px 30px rgba(255,255,255,0.12)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = '0 0 0 rgba(255,255,255,0)';
            }}
          >
            Add to Telegram
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8L22 12L18 16" />
              <path d="M2 12H22" />
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #add > div > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
