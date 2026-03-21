"use client";

import StackPlayMark from "./StackPlayMark";

type PileItLockupProps = {
  markSize?: number;
  textSize?: number;
  color?: string;
  gap?: number;
};

export default function PileItLockup({
  markSize = 32,
  textSize = 22,
  color = "#ffffff",
  gap,
}: PileItLockupProps) {
  const lockupGap = gap ?? markSize * 0.28;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: lockupGap,
      }}
    >
      <StackPlayMark size={markSize} />
      <span
        style={{
          fontFamily:
            'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
          fontWeight: 800,
          fontStyle: "italic",
          fontSize: textSize,
          letterSpacing: textSize * 0.08,
          color,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        PileIt
      </span>
    </div>
  );
}
