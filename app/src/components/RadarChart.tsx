import { useEffect, useRef } from 'react';

type RadarData = {
  secrets: number;   // 0-100
  sast: number;
  deps: number;
  malware: number;
  integrity: number;
};

type Props = {
  data: RadarData;
  color: string;
  size?: number;
};

const AXES = ['Secrets', 'SAST', 'Dependencies', 'Malware', 'Integrity'];
const AXIS_COUNT = AXES.length;

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  const a = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function buildPolygon(values: number[], maxR: number, cx: number, cy: number): string {
  return values.map((v, i) => {
    const angle = (360 / AXIS_COUNT) * i;
    const r = (v / 100) * maxR;
    const { x, y } = polarToXY(angle, r, cx, cy);
    return `${x},${y}`;
  }).join(' ');
}

export default function RadarChart({ data, color, size = 220 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const polyRef = useRef<SVGPolygonElement>(null);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const rings = [0.25, 0.5, 0.75, 1];

  const values = [
    data.secrets,
    data.sast,
    data.deps,
    data.malware,
    data.integrity,
  ];

  const polygonPoints = buildPolygon(values, maxR, cx, cy);

  // animate polygon draw on mount
  useEffect(() => {
    const poly = polyRef.current;
    if (!poly) return;
    const len = poly.getTotalLength?.() ?? 300;
    poly.style.strokeDasharray = String(len);
    poly.style.strokeDashoffset = String(len);
    poly.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        poly.style.strokeDashoffset = '0';
      });
    });
  }, [polygonPoints]);

  const axisPoints = AXES.map((_, i) => {
    const angle = (360 / AXIS_COUNT) * i;
    return polarToXY(angle, maxR, cx, cy);
  });

  const labelPoints = AXES.map((_, i) => {
    const angle = (360 / AXIS_COUNT) * i;
    return polarToXY(angle, maxR + 22, cx, cy);
  });

  const maxVal = Math.max(...values);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* ring grid */}
        {rings.map((r, ri) => {
          const ringPoints = Array.from({ length: AXIS_COUNT }, (_, i) => {
            const angle = (360 / AXIS_COUNT) * i;
            const { x, y } = polarToXY(angle, maxR * r, cx, cy);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={ri}
              points={ringPoints}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={0.8}
            />
          );
        })}

        {/* axis lines */}
        {axisPoints.map((pt, i) => (
          <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y}
            stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />
        ))}

        {/* threat polygon — filled */}
        <polygon
          points={polygonPoints}
          fill={`${color}18`}
          stroke="none"
        />

        {/* threat polygon — border (animated) */}
        <polygon
          ref={polyRef}
          points={polygonPoints}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />

        {/* axis dots */}
        {axisPoints.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill={color} opacity={0.6} />
        ))}

        {/* center dot */}
        <circle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.2)" />

        {/* labels */}
        {AXES.map((label, i) => {
          const pt = labelPoints[i];
          const val = values[i];
          const textAnchor = pt.x < cx - 4 ? 'end' : pt.x > cx + 4 ? 'start' : 'middle';
          return (
            <g key={i}>
              <text
                x={pt.x}
                y={pt.y}
                textAnchor={textAnchor}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 8.5,
                  fill: val > 60 ? color : 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: val > 60 ? 700 : 400,
                }}
              >
                {label}
              </text>
              <text
                x={pt.x}
                y={pt.y + 11}
                textAnchor={textAnchor}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 8,
                  fill: val > 0 ? `${color}cc` : 'rgba(255,255,255,0.2)',
                }}
              >
                {val}
              </text>
            </g>
          );
        })}
      </svg>

      {/* pulse ring for high-risk */}
      {maxVal >= 70 && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: maxR * 2, height: maxR * 2,
          borderRadius: '50%',
          border: `1px solid ${color}33`,
          animation: 'radar-pulse 2.5s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      <style>{`
        @keyframes radar-pulse {
          0%   { transform: translate(-50%,-50%) scale(0.9); opacity: 0.7; }
          100% { transform: translate(-50%,-50%) scale(1.35); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
