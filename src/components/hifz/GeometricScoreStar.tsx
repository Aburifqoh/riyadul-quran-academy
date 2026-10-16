'use client';

import { useId } from 'react';
// ─────────────────────────────────────────────
// src/components/hifz/GeometricScoreStar.tsx
// Signature score indicator: an 8-pointed geometric star, the same
// marker (rub al-hizb) used in the margins of a printed mus-haf to mark
// juz/hizb boundaries. Fills bottom-to-top with the score instead of a
// generic circular progress ring.
// ─────────────────────────────────────────────

interface GeometricScoreStarProps {
  score: number; // 0-100
  size?: number;
  label?: string;
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
}

export function GeometricScoreStar({ score, size = 148, label }: GeometricScoreStarProps) {
  const id = useId();
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.24;

  // Fill rises from the bottom of the star's bounding box up to `clamped`%.
  const boxTop = cy - outerR;
  const boxHeight = outerR * 2;
  const fillTop = boxTop + boxHeight * (1 - clamped / 100);

  const tone =
    clamped >= 90 ? '#2F6F5E' : clamped >= 70 ? '#8A7357' : '#A63D3D';

  const clipId = `star-clip-${id}`;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Recitation accuracy ${clamped} percent`}>
        <defs>
          <clipPath id={clipId}>
            <polygon points={starPoints(cx, cy, outerR, innerR)} />
          </clipPath>
        </defs>
        {/* base outline, faint parchment tone */}
        <polygon
          points={starPoints(cx, cy, outerR, innerR)}
          fill="#F1E9D2"
          stroke="#C9B98C"
          strokeWidth={1.5}
        />
        {/* fill clipped to the star shape, rising with score */}
        <g clipPath={`url(#${clipId})`}>
          <rect
            x={boxTop - 4}
            y={fillTop}
            width={boxHeight + 8}
            height={boxHeight - (fillTop - boxTop) + 4}
            fill={tone}
            style={{ transition: 'y 700ms ease, height 700ms ease' }}
          />
        </g>
        {/* re-drawn outline on top so the fill never bleeds past the edge */}
        <polygon
          points={starPoints(cx, cy, outerR, innerR)}
          fill="none"
          stroke="#8A7357"
          strokeWidth={1}
        />
        <text
          x={cx}
          y={cy + 6}
          textAnchor="middle"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize={size * 0.19}
          fontWeight={600}
          fill={clamped >= 70 ? '#F1E9D2' : '#2A1E14'}
          style={{ mixBlendMode: clamped >= 70 ? 'normal' : 'normal' }}
        >
          {clamped}
        </text>
      </svg>
      {label && (
        <span style={{ fontFamily: 'Spectral, serif', fontSize: 13, color: '#5C5142', letterSpacing: '0.02em' }}>
          {label}
        </span>
      )}
    </div>
  );
}
