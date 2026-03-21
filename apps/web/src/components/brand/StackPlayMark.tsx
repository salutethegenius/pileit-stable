"use client";

import { useId } from "react";

const ORANGE_LIGHT = "#fb923c";
const ORANGE = "#f97316";
const ORANGE_DARK = "#c2410c";
const ORANGE_DEEP = "#7c2d12";

type StackPlayMarkProps = {
  size?: number;
  bg?: string;
};

export default function StackPlayMark({
  size = 100,
  bg = "transparent",
}: StackPlayMarkProps) {
  const rid = useId().replace(/[^a-zA-Z0-9]/g, "") || "a";
  const uid = `sp${size}${rid}`;
  /** User-space stroke so the play rim stays visible when the SVG is ~32px (nav). */
  const playOutlineStroke = size <= 36 ? 5.5 : size <= 56 ? 3.25 : 1.5;
  const playInnerOpacity = size <= 36 ? 0.5 : 0.35;
  const bars = [
    { x: 8, y: 12, w: 84, h: 19, r: 4 },
    { x: 8, y: 40, w: 84, h: 19, r: 4 },
    { x: 8, y: 68, w: 84, h: 19, r: 4 },
  ];
  const play = { x1: 30, y1: 10, x2: 30, y2: 90, x3: 80, y3: 50 };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "block",
        background: bg,
        borderRadius: bg !== "transparent" ? size * 0.18 : 0,
      }}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`${uid}-grad`}
          x1="8"
          y1="12"
          x2="92"
          y2="87"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={ORANGE_LIGHT} />
          <stop offset="45%" stopColor={ORANGE} />
          <stop offset="100%" stopColor={ORANGE_DARK} />
        </linearGradient>
        <linearGradient
          id={`${uid}-shine`}
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <mask id={`${uid}-mask`}>
          {bars.map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={b.r}
              fill="white"
            />
          ))}
          <polygon
            points={`${play.x1},${play.y1} ${play.x2},${play.y2} ${play.x3},${play.y3}`}
            fill="black"
          />
        </mask>
      </defs>
      <g mask={`url(#${uid}-mask)`}>
        <rect x="8" y="12" width="84" height="75" fill={`url(#${uid}-grad)`} />
        <rect x="8" y="12" width="84" height="75" fill={`url(#${uid}-shine)`} />
        <rect x="8" y="12" width="84" height="75" fill={`url(#${uid}-edge)`} />
      </g>
      <polygon
        points={`${play.x1},${play.y1} ${play.x2},${play.y2} ${play.x3},${play.y3}`}
        fill={ORANGE_DEEP}
        opacity={playInnerOpacity}
      />
      <polygon
        points={`${play.x1},${play.y1} ${play.x2},${play.y2} ${play.x3},${play.y3}`}
        fill="none"
        stroke={ORANGE_LIGHT}
        strokeWidth={playOutlineStroke}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={size <= 36 ? 0.72 : 0.5}
      />
    </svg>
  );
}
