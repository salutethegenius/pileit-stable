"use client";

import { useState } from "react";

const BG = "#0e0e0e";
const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fb923c";
const ORANGE_DARK = "#c2410c";
const ORANGE_DEEP = "#7c2d12";
const WHITE = "#ffffff";

// ─── REFINED STACK PLAY MARK ─────────────────────────────────────────────────
// Three stacked bars. Play arrow is cut cleanly through all three.
// Gradient runs warm-to-deep. Shine sits on top half only.
// Bar height and gap are optically balanced at all sizes.
const Mark = ({ size = 100, bg = "transparent" }) => {
  const uid = `sp_${size}`;
  const playOutlineStroke = size <= 36 ? 5.5 : size <= 56 ? 3.25 : 1.5;
  const playInnerOpacity = size <= 36 ? 0.5 : 0.35;

  // Geometry — all values in 100×100 viewBox user space
  const bars = [
    { x: 8, y: 12, w: 84, h: 19, r: 4 },
    { x: 8, y: 40, w: 84, h: 19, r: 4 },
    { x: 8, y: 68, w: 84, h: 19, r: 4 },
  ];
  // Play arrow — sits centered, wide enough to cut all 3 bars
  const play = { x1: 30, y1: 10, x2: 30, y2: 90, x3: 80, y3: 50 };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      style={{
        display: "block",
        background: bg,
        borderRadius: bg !== "transparent" ? size * 0.18 : 0,
      }}
    >
      <defs>
        {/* Main gradient — warm orange top to deep bottom */}
        <linearGradient id={`${uid}-grad`} x1="8" y1="12" x2="92" y2="87" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ORANGE_LIGHT} />
          <stop offset="45%" stopColor={ORANGE} />
          <stop offset="100%" stopColor={ORANGE_DARK} />
        </linearGradient>

        {/* Shine — white on top third only */}
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Edge glow — subtle inner light on left */}
        <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Mask — bars minus play arrow cutout */}
        <mask id={`${uid}-mask`}>
          {bars.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={b.r} fill="white" />
          ))}
          {/* Play arrow cut — slightly inset from bar edges so cut is clean */}
          <polygon
            points={`${play.x1},${play.y1} ${play.x2},${play.y2} ${play.x3},${play.y3}`}
            fill="black"
          />
        </mask>

        {/* Glow filter for app icon use */}
        <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* === BASE BARS with gradient, masked by play cutout === */}
      <g mask={`url(#${uid}-mask)`}>
        {/* Gradient fill across entire bar area */}
        <rect x="8" y="12" width="84" height="75" fill={`url(#${uid}-grad)`} />
        {/* Shine pass */}
        <rect x="8" y="12" width="84" height="75" fill={`url(#${uid}-shine)`} />
        {/* Left edge highlight */}
        <rect x="8" y="12" width="84" height="75" fill={`url(#${uid}-edge)`} />
      </g>

      {/* === PLAY ARROW — ghost outline inside the cutout === */}
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
};

// ─── APP ICON VARIANT (rounded square, like iOS/Android) ─────────────────────
const AppIcon = ({ size = 80 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.22,
      background: `linear-gradient(145deg, #1a0800, #0e0e0e)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 ${size * 0.06}px ${size * 0.2}px rgba(0,0,0,0.7), 0 0 ${size * 0.15}px ${ORANGE}33`,
    }}
  >
    <Mark size={size * 0.72} />
  </div>
);

// ─── WORDMARK ────────────────────────────────────────────────────────────────
const Wordmark = ({ size = 32, color = WHITE }) => (
  <div
    style={{
      fontFamily: "'Barlow Condensed', Impact, sans-serif",
      fontWeight: 800,
      fontStyle: "italic",
      fontSize: size,
      letterSpacing: size * 0.08,
      color,
      lineHeight: 1,
      userSelect: "none",
      textTransform: "uppercase",
    }}
  >
    PileIt
  </div>
);

// ─── LOCKUP: mark + wordmark ──────────────────────────────────────────────────
const Lockup = ({ markSize = 48, textSize = 32, gap = 14, color = WHITE }) => (
  <div style={{ display: "flex", alignItems: "center", gap }}>
    <Mark size={markSize} />
    <Wordmark size={textSize} color={color} />
  </div>
);

// ─── SECTION LABEL ───────────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      color: "#555",
      fontSize: 11,
      letterSpacing: 3,
      fontStyle: "italic",
      marginBottom: 20,
      fontFamily: "'Barlow Condensed', Impact, sans-serif",
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

const Divider = () => <div style={{ borderTop: "1px solid #222", margin: "48px 0" }} />;

const Swatch = ({
  bg,
  label,
  children,
}: {
  bg: string;
  label: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      background: bg,
      borderRadius: 12,
      padding: "32px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 20,
      flex: 1,
    }}
  >
    <div
      style={{
        color: bg === WHITE ? "#333" : "#555",
        fontSize: 11,
        letterSpacing: 2,
        fontFamily: "'Barlow Condensed', Impact, sans-serif",
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function PileItBrand() {
  const [tab, setTab] = useState("mark");
  const tabs = ["mark", "lockup", "scale", "app icon", "backgrounds"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;1,700;1,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0e0e0e; }
        ::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 3px; }
      `}</style>

      <div
        style={{
          background: BG,
          minHeight: "100vh",
          padding: "48px 40px",
          fontFamily: "'Barlow Condensed', Impact, sans-serif",
          color: WHITE,
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 48,
            }}
          >
            <div>
              <div
                style={{
                  color: ORANGE,
                  fontSize: 11,
                  letterSpacing: 4,
                  fontStyle: "italic",
                  marginBottom: 6,
                }}
              >
                SIGNAL K SYSTEM · CONCEPT 01 · REFINED
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, fontStyle: "italic", letterSpacing: 2 }}>
                THE STACK PLAY
              </div>
              <div
                style={{
                  color: "#666",
                  fontSize: 15,
                  fontStyle: "normal",
                  fontWeight: 400,
                  marginTop: 4,
                }}
              >
                Mark · Lockup · Scale system · App icon · Background variants
              </div>
            </div>
            <Lockup markSize={52} textSize={34} />
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #222", marginBottom: 48 }}>
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: tab === t ? `2px solid ${ORANGE}` : "2px solid transparent",
                  color: tab === t ? ORANGE : "#555",
                  padding: "10px 24px",
                  cursor: "pointer",
                  fontFamily: "'Barlow Condensed', Impact, sans-serif",
                  fontSize: 14,
                  fontStyle: "italic",
                  fontWeight: tab === t ? 800 : 600,
                  letterSpacing: 1,
                  marginBottom: -1,
                  textTransform: "uppercase",
                  transition: "all 0.2s",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── MARK TAB ── */}
          {tab === "mark" && (
            <div>
              <Label>Primary mark · Isolated</Label>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
                <Mark size={200} />
                <div
                  style={{
                    color: "#444",
                    fontSize: 13,
                    lineHeight: 1.9,
                    maxWidth: 340,
                    fontStyle: "normal",
                    fontWeight: 400,
                  }}
                >
                  Three bold horizontal bars — a visual pile — with a play arrow cleanly cut through all
                  three layers. The bars read as a content stack or playlist. The play shape is inseparable
                  from the pile: streaming and stacking are a single gesture.
                  <br />
                  <br />
                  <span style={{ color: ORANGE }}>Gradient:</span> #FB923C → #F97316 → #C2410C
                  <br />
                  <span style={{ color: ORANGE }}>Shine:</span> 28% white top, fades to 0
                  <br />
                  <span style={{ color: ORANGE }}>Cutout:</span> Play arrow with #7C2D12 ghost fill
                </div>
              </div>
            </div>
          )}

          {/* ── LOCKUP TAB ── */}
          {tab === "lockup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              <div>
                <Label>Horizontal lockup · Primary</Label>
                <div style={{ padding: "40px 48px", background: "#111", borderRadius: 12 }}>
                  <Lockup markSize={64} textSize={44} gap={18} />
                </div>
              </div>
              <div>
                <Label>Horizontal lockup · Compact</Label>
                <div style={{ padding: "28px 36px", background: "#111", borderRadius: 12 }}>
                  <Lockup markSize={40} textSize={28} gap={12} />
                </div>
              </div>
              <div>
                <Label>Horizontal lockup · Nav size</Label>
                <div style={{ padding: "16px 24px", background: "#111", borderRadius: 12 }}>
                  <Lockup markSize={28} textSize={20} gap={9} />
                </div>
              </div>
              <div>
                <Label>Mark only · No wordmark</Label>
                <div
                  style={{
                    padding: "28px 36px",
                    background: "#111",
                    borderRadius: 12,
                    display: "flex",
                    gap: 24,
                    alignItems: "flex-end",
                  }}
                >
                  <Mark size={80} />
                  <Mark size={48} />
                  <Mark size={32} />
                  <Mark size={20} />
                  <Mark size={16} />
                </div>
              </div>
            </div>
          )}

          {/* ── SCALE TAB ── */}
          {tab === "scale" && (
            <div>
              <Label>Scale system · All sizes</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {[
                  { size: 160, label: "Hero / Splash screen" },
                  { size: 120, label: "Onboarding" },
                  { size: 80, label: "Profile / Creator badge" },
                  { size: 48, label: "Nav header" },
                  { size: 32, label: "Tab bar" },
                  { size: 20, label: "Favicon / Small UI" },
                  { size: 16, label: "16px — minimum viable" },
                ].map(({ size, label }) => (
                  <div key={size} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <div style={{ width: 180, color: "#444", fontSize: 12 }}>
                      {label} · {size}px
                    </div>
                    <Mark size={size} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── APP ICON TAB ── */}
          {tab === "app icon" && (
            <div>
              <Label>App icon · iOS / Android / Web</Label>
              <div style={{ display: "flex", gap: 32, alignItems: "flex-end", marginBottom: 48 }}>
                <div style={{ textAlign: "center" }}>
                  <AppIcon size={180} />
                  <div style={{ color: "#444", fontSize: 11, marginTop: 12 }}>1024px master</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <AppIcon size={120} />
                  <div style={{ color: "#444", fontSize: 11, marginTop: 12 }}>512px</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <AppIcon size={80} />
                  <div style={{ color: "#444", fontSize: 11, marginTop: 12 }}>256px</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <AppIcon size={60} />
                  <div style={{ color: "#444", fontSize: 11, marginTop: 12 }}>120px</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <AppIcon size={40} />
                  <div style={{ color: "#444", fontSize: 11, marginTop: 12 }}>80px</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <AppIcon size={28} />
                  <div style={{ color: "#444", fontSize: 11, marginTop: 12 }}>57px</div>
                </div>
              </div>

              <Label>On simulated home screens</Label>
              <div style={{ display: "flex", gap: 16 }}>
                <div
                  style={{
                    background: "linear-gradient(135deg, #0a0a1a, #1a0a00)",
                    borderRadius: 16,
                    padding: 32,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    width: 160,
                  }}
                >
                  <AppIcon size={72} />
                  <div style={{ fontSize: 12, color: WHITE, fontStyle: "normal", fontWeight: 600 }}>
                    PileIt
                  </div>
                </div>
                <div
                  style={{
                    background: "linear-gradient(135deg, #1c1007, #0e0e0e)",
                    borderRadius: 16,
                    padding: 32,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    width: 160,
                  }}
                >
                  <AppIcon size={72} />
                  <div style={{ fontSize: 12, color: "#ddd", fontStyle: "normal", fontWeight: 600 }}>
                    PileIt
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── BACKGROUNDS TAB ── */}
          {tab === "backgrounds" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Label>Mark on all backgrounds</Label>
              <div style={{ display: "flex", gap: 16 }}>
                <Swatch bg="#0e0e0e" label="Primary dark">
                  <Lockup markSize={48} textSize={32} />
                  <Mark size={48} />
                </Swatch>
                <Swatch bg="#141414" label="Netflix dark">
                  <Lockup markSize={48} textSize={32} />
                  <Mark size={48} />
                </Swatch>
                <Swatch bg="#1a1a1a" label="Surface">
                  <Lockup markSize={48} textSize={32} />
                  <Mark size={48} />
                </Swatch>
                <Swatch bg={ORANGE} label="Accent orange">
                  <Lockup markSize={48} textSize={32} color="#fff" />
                  <Mark size={48} />
                </Swatch>
                <Swatch bg={WHITE} label="White">
                  <Lockup markSize={48} textSize={32} color="#0e0e0e" />
                  <Mark size={48} />
                </Swatch>
              </div>

              <Divider />
              <Label>Nav bar in context</Label>
              <div
                style={{
                  background: "#141414",
                  borderBottom: "1px solid #222",
                  padding: "0 32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 64,
                  borderRadius: 10,
                }}
              >
                <Lockup markSize={32} textSize={22} gap={10} />
                <div style={{ display: "flex", gap: 24, color: "#999", fontSize: 14, fontStyle: "normal" }}>
                  <span>Browse</span>
                  <span>Creators</span>
                  <span>Live</span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div
                    style={{
                      background: "#222",
                      borderRadius: 6,
                      padding: "7px 16px",
                      fontSize: 13,
                      color: "#999",
                    }}
                  >
                    Log in
                  </div>
                  <div
                    style={{
                      background: ORANGE,
                      borderRadius: 6,
                      padding: "7px 16px",
                      fontSize: 13,
                      color: WHITE,
                      fontWeight: 700,
                    }}
                  >
                    Sign up
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
