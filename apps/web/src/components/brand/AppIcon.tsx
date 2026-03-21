"use client";

import StackPlayMark from "./StackPlayMark";

const ORANGE = "#f97316";

type AppIconProps = { size?: number };

export default function AppIcon({ size = 80 }: AppIconProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: "linear-gradient(145deg, #1a0800, #0e0e0e)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 ${size * 0.06}px ${size * 0.2}px rgba(0,0,0,0.7), 0 0 ${size * 0.15}px ${ORANGE}33`,
      }}
    >
      <StackPlayMark size={size * 0.72} />
    </div>
  );
}
