import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { featuresConfig } from '../config';

gsap.registerPlugin(ScrollTrigger);

function FeatureCard({ feature, index }: { feature: (typeof featuresConfig.items)[0]; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`feature-card ${index % 2 === 0 ? 'feature-card-left' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '40px 32px',
        transition: 'background 0.3s ease',
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        cursor: 'default',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '10px', color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {feature.code}
        </span>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '10px', color: 'rgba(255,255,255,0.2)',
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <h4 style={{
        fontFamily: "'Geist Pixel', monospace",
        fontSize: 'clamp(17px, 1.6vw, 24px)',
        fontWeight: 400, lineHeight: 1.15,
        textTransform: 'uppercase', color: '#fff',
        margin: '0 0 14px', letterSpacing: '0.02em',
      }}>
        {feature.title}
      </h4>

      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12px', lineHeight: 1.85,
        color: 'rgba(255,255,255,0.48)', margin: 0,
      }}>
        {feature.description}
      </p>
    </div>
  );
}

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !gridRef.current) return;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return;
    const cards = gridRef.current.querySelectorAll('.feature-card');
    gsap.set(cards, { opacity: 0, y: 30 });

    const ctx = gsap.context(() => {
      gsap.to(cards, {
        opacity: 1, y: 0,
        duration: 0.8, stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none none',
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="features" style={{ background: '#000', color: '#fff', position: 'relative' }}>
      <div className="feat-inner">
        <h3 style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px', fontWeight: 400,
          textTransform: 'uppercase', letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.42)', margin: '0 0 48px',
        }}>
          {featuresConfig.sectionLabel}
        </h3>

        <div ref={gridRef} className="feat-grid">
          {featuresConfig.items.map((feature, index) => (
            <FeatureCard key={feature.code} feature={feature} index={index} />
          ))}
        </div>
      </div>

      <style>{`
        .feat-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 100px 40px;
        }
        .feat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          border-top: 1px solid rgba(255,255,255,0.1);
          border-left: 1px solid rgba(255,255,255,0.1);
        }
        .feature-card {
          border-right: 1px solid rgba(255,255,255,0.1);
        }
        @media (max-width: 768px) {
          .feat-inner { padding: 72px 20px; }
          .feat-grid { grid-template-columns: 1fr; }
          .feature-card { padding: 28px 0 !important; border-right: none !important; }
        }
      `}</style>
    </section>
  );
}
