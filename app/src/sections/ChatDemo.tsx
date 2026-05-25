import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { botConfig } from '../config';

gsap.registerPlugin(ScrollTrigger);

interface ChatMessage {
  type: 'sent' | 'received' | 'report';
  text?: string;
  riskScore?: string;
  riskLevel?: string;
  secrets?: number;
  sast?: number;
  deps?: number;
  topRecommendations?: string[];
}

function TypingIndicator() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '14px 18px',
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            display: 'inline-block',
            animation: `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

function SentBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          background: '#2c2c2e',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '18px 18px 4px 18px',
          maxWidth: '85%',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    </div>
  );
}

function ReceivedBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          background: '#1c1c1e',
          color: 'rgba(255,255,255,0.85)',
          padding: '14px 18px',
          borderRadius: '18px 18px 18px 4px',
          maxWidth: '92%',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {text}
      </div>
    </div>
  );
}

function ReportBubble({
  riskScore,
  riskLevel,
  secrets,
  sast,
  deps,
  topRecommendations,
}: {
  riskScore: string;
  riskLevel: string;
  secrets: number;
  sast: number;
  deps: number;
  topRecommendations: string[];
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          background: '#111',
          color: '#fff',
          padding: '20px',
          borderRadius: '18px 18px 18px 4px',
          maxWidth: '95%',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          lineHeight: 1.7,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '14px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span
            style={{
              fontFamily: "'Geist Pixel', monospace",
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            SECURITY REPORT
          </span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {riskScore}
          </span>
        </div>

        {/* Risk Level */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#fff',
              display: 'inline-block',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Risk Level: {riskLevel}
          </span>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '18px',
          }}
        >
          {[
            { label: 'SECRETS', value: secrets },
            { label: 'SAST', value: sast },
            { label: 'DEP VULNS', value: deps },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '10px',
          }}
        >
          TOP RECOMMENDATIONS
        </div>
        {topRecommendations.map((rec, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '8px',
              fontSize: '11px',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: '10px',
                marginTop: '1px',
                minWidth: '14px',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{rec}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const allMessages = useRef<ChatMessage[]>([
    ...(botConfig.chatDemo.messages as ChatMessage[]),
    botConfig.chatDemo.finalReport as ChatMessage,
  ]);

  const addNextMessage = useCallback(
    (index: number) => {
      if (index >= allMessages.current.length) {
        setTyping(false);
        return;
      }

      setTyping(true);

      const delay =
        allMessages.current[index].type === 'report' ? 1800 : 1200;

      setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [...prev, allMessages.current[index]]);

        setTimeout(() => {
          addNextMessage(index + 1);
        }, 400);
      }, delay);
    },
    []
  );

  useEffect(() => {
    if (!sectionRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top 60%',
      onEnter: () => {
        if (!hasTriggered) {
          setHasTriggered(true);
          setTimeout(() => addNextMessage(0), 300);
        }
      },
    });

    return () => trigger.kill();
  }, [hasTriggered, addNextMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, typing]);

  return (
    <section
      ref={sectionRef}
      id="demo"
      style={{
        background: '#111',
        color: '#fff',
        padding: '120px 40px',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h3
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '13px',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.42)',
            margin: '0 0 48px 0',
            textAlign: 'center',
          }}
        >
          {botConfig.chatDemo.sectionLabel}
        </h3>

        {/* Phone / Chat Container */}
        <div
          style={{
            maxWidth: '480px',
            margin: '0 auto',
            borderRadius: '28px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: '#000',
            overflow: 'hidden',
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              background: '#1c1c1e',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#2c2c2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '13px',
                  fontWeight: 400,
                  color: '#fff',
                }}
              >
                gitscan bot
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                Security Scanner
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'inline-block',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {/* Messages */}
          <div
            ref={chatRef}
            style={{
              padding: '16px',
              height: '520px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {messages.length === 0 && !typing && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.2)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Scroll to start demo
              </div>
            )}

            {messages.map((msg, index) => {
              if (msg.type === 'sent') {
                return <SentBubble key={index} text={msg.text || ''} />;
              }
              if (msg.type === 'received') {
                return <ReceivedBubble key={index} text={msg.text || ''} />;
              }
              if (msg.type === 'report') {
                return (
                  <ReportBubble
                    key={index}
                    riskScore={msg.riskScore || ''}
                    riskLevel={msg.riskLevel || ''}
                    secrets={msg.secrets || 0}
                    sast={msg.sast || 0}
                    deps={msg.deps || 0}
                    topRecommendations={msg.topRecommendations || []}
                  />
                );
              }
              return null;
            })}

            {typing && (
              <div style={{ marginTop: '4px' }}>
                <ReceivedBubble text="" />
                <div
                  style={{
                    marginTop: '-44px',
                    marginLeft: '18px',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div
            style={{
              background: '#1c1c1e',
              padding: '10px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                flex: 1,
                background: '#2c2c2e',
                borderRadius: '18px',
                padding: '8px 14px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: 'rgba(255,255,255,0.25)',
              }}
            >
              Type a command...
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
