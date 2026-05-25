import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { botConfig } from '../config';

gsap.registerPlugin(ScrollTrigger);

function CommandRow({
  command,
  description,
  index,
}: {
  command: string;
  description: string;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="cmd-row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 3fr',
        gap: '24px',
        alignItems: 'center',
        padding: '24px 0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        transition: 'background 0.2s ease',
        background: hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
        opacity: 0,
        cursor: 'default',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: 'rgba(255,255,255,0.25)',
            minWidth: '24px',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <code
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '14px',
            color: '#fff',
            background: '#2c2c2e',
            padding: '8px 14px',
            borderRadius: '10px',
            letterSpacing: '0.02em',
          }}
        >
          {command}
        </code>
      </div>

      <p
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          fontWeight: 400,
          lineHeight: 1.7,
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

export default function BotCommands() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const rows = sectionRef.current.querySelectorAll('.cmd-row');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        rows,
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          stagger: 0.08,
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
      id="commands"
      style={{
        background: '#000',
        color: '#fff',
        padding: '120px 40px',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h3
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.42)',
            margin: '0 0 48px 0',
          }}
        >
          {botConfig.commandsConfig.sectionLabel}
        </h3>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {botConfig.commandsConfig.commands.map((cmd, index) => (
            <CommandRow
              key={cmd.command}
              command={cmd.command}
              description={cmd.description}
              index={index}
            />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .cmd-row {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </section>
  );
}
