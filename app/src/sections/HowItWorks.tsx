import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { howItWorksConfig } from '../config';

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !stepsRef.current) return;

    // Only animate on desktop — mobile gets CSS visibility always-on
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return;

    const steps = stepsRef.current.querySelectorAll('.step-item');
    gsap.set(steps, { opacity: 0, y: 40 });

    const ctx = gsap.context(() => {
      gsap.to(steps, {
        opacity: 1, y: 0,
        duration: 0.9, stagger: 0.18,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="how-it-works" style={{ background: '#0a0a0a', color: '#fff', position: 'relative' }}>
      <div className="hiw-inner">
        <h3 style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px', fontWeight: 400,
          textTransform: 'uppercase', letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.3)', margin: '0 0 48px',
        }}>
          {howItWorksConfig.sectionLabel}
        </h3>

        <div ref={stepsRef} className="hiw-grid">
          {howItWorksConfig.steps.map((step) => (
            <div key={step.number} className="step-item">
              <span className="step-number">{step.number}</span>
              <h4 className="step-title">{step.title}</h4>
              <p className="step-desc">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hiw-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 100px 40px;
        }

        /* ── DESKTOP: border-top line style ── */
        .hiw-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
        }
        .step-item {
          border-top: 1px solid rgba(255,255,255,0.12);
          padding-top: 32px;
        }
        .step-number {
          font-family: 'Geist Pixel', monospace;
          font-size: 13px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.08em;
          display: block;
          margin-bottom: 20px;
        }
        .step-title {
          font-family: 'Geist Pixel', monospace;
          font-size: clamp(18px, 2.2vw, 28px);
          font-weight: 400;
          line-height: 1.1;
          text-transform: uppercase;
          color: #fff;
          margin: 0 0 16px;
          letter-spacing: 0.02em;
        }
        .step-desc {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          line-height: 1.85;
          color: rgba(255,255,255,0.45);
          margin: 0;
        }

        /* ── TABLET ── */
        @media (max-width: 900px) {
          .hiw-grid { grid-template-columns: 1fr 1fr; gap: 24px; }
        }

        /* ── MOBILE: card boxes ── */
        @media (max-width: 768px) {
          .hiw-inner { padding: 64px 20px; }

          .hiw-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          /* Override desktop line style → card box */
          .step-item {
            border-top: none !important;
            padding-top: 0 !important;
            opacity: 1 !important;
            transform: none !important;

            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 2px;
            padding: 28px 24px;
            background: rgba(255,255,255,0.02);
            display: grid;
            grid-template-columns: auto 1fr;
            grid-template-rows: auto auto;
            column-gap: 16px;
          }

          .step-number {
            grid-column: 1;
            grid-row: 1 / 3;
            margin-bottom: 0;
            font-size: 28px;
            color: rgba(255,255,255,0.12);
            align-self: start;
            padding-top: 2px;
          }

          .step-title {
            grid-column: 2;
            grid-row: 1;
            font-size: clamp(15px, 4vw, 18px);
            margin-bottom: 8px;
          }

          .step-desc {
            grid-column: 2;
            grid-row: 2;
            font-size: 12px;
          }
        }
      `}</style>
    </section>
  );
}
