import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { techStackConfig } from '../config';

gsap.registerPlugin(ScrollTrigger);

function TechCard({ tech, index }: { tech: (typeof techStackConfig.items)[0]; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="tech-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'default' }}
    >
      <span className="tech-index">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="tech-info">
        <h4 style={{
          fontFamily: "'Geist Pixel', monospace",
          fontSize: 'clamp(15px, 1.4vw, 22px)',
          fontWeight: 400, lineHeight: 1.2,
          textTransform: 'uppercase', color: '#fff',
          margin: '0 0 6px', letterSpacing: '0.02em',
        }}>
          {tech.name}
        </h4>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '10px', color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {tech.category}
        </span>
      </div>

      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12px', lineHeight: 1.85,
        color: hovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)',
        margin: 0, transition: 'color 0.3s ease',
      }}>
        {tech.description}
      </p>

      <style>{`
        .tech-card {
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 32px 0;
          display: grid;
          grid-template-columns: 48px 1fr 2fr;
          gap: 24px;
          align-items: start;
          transition: opacity 0.3s ease;
        }
        .tech-index {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.08em;
          padding-top: 3px;
        }
        @media (max-width: 768px) {
          .tech-card {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
            padding: 24px 0 !important;
          }
          .tech-index { display: none; }
          .tech-info { order: 1; }
          .tech-card p { order: 2; }
        }
      `}</style>
    </div>
  );
}

export default function TechStack() {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !listRef.current) return;
    const cards = listRef.current.querySelectorAll('.tech-card');

    const isMobile = window.innerWidth <= 768;
    if (isMobile) return;
    gsap.set(cards, { opacity: 0, x: -24 });

    const ctx = gsap.context(() => {
      gsap.to(cards, {
        opacity: 1, x: 0,
        duration: 0.7, stagger: 0.1,
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
    <section ref={sectionRef} id="tech" style={{ background: '#111', color: '#fff', position: 'relative' }}>
      <div className="tech-inner">
        <h3 style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px', fontWeight: 400,
          textTransform: 'uppercase', letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.3)', margin: '0 0 48px',
        }}>
          {techStackConfig.sectionLabel}
        </h3>

        <div ref={listRef}>
          {techStackConfig.items.map((tech, index) => (
            <TechCard key={tech.name} tech={tech} index={index} />
          ))}
        </div>
      </div>

      <style>{`
        .tech-inner {
          max-width: 960px;
          margin: 0 auto;
          padding: 100px 40px;
        }
        @media (max-width: 768px) {
          .tech-inner { padding: 72px 20px; }
        }
      `}</style>
    </section>
  );
}
