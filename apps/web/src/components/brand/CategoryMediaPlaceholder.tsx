"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import StackPlayMark from "./StackPlayMark";
import PileItLockup from "./PileItLockup";
import { categoryHeroChipBg } from "@/utils/categoryStyles";

type Variant = "card" | "portal" | "avatar" | "channel";

const sizes: Record<
  Variant,
  { mark: number; text: number; gap: number; showWordmark: boolean }
> = {
  card: { mark: 36, text: 15, gap: 1.25, showWordmark: true },
  portal: { mark: 44, text: 17, gap: 1.5, showWordmark: true },
  avatar: { mark: 32, text: 0, gap: 0, showWordmark: false },
  /** Large profile circle (e.g. channel header ~96px) */
  channel: { mark: 44, text: 0, gap: 0, showWordmark: false },
};

type Props = {
  category: string;
  /** Shown under the lockup (defaults to category name) */
  label?: string;
  variant?: Variant;
};

/**
 * Branded empty / error state: category-tinted field + PileIt mark (and wordmark on 16:9 surfaces).
 */
export default function CategoryMediaPlaceholder({
  category,
  label,
  variant = "card",
}: Props) {
  const accent = categoryHeroChipBg(category);
  const s = sizes[variant];
  const displayLabel = (label ?? category).trim() || "PileIt";

  const bg =
    variant === "avatar" || variant === "channel"
      ? `radial-gradient(circle at 30% 25%, ${alpha(accent, 0.45)} 0%, ${alpha("#1a1a1a", 1)} 52%, #0f0f0f 100%)`
      : `linear-gradient(168deg, #0c0c0c 0%, ${alpha(accent, 0.22)} 38%, #080808 58%, #111 100%)`;

  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        px: 1,
        background: bg,
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 80% 55% at 50% 120%, ${alpha(accent, 0.2)} 0%, transparent 55%)`,
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ position: "relative", zIndex: 1, opacity: 0.92 }}>
        {s.showWordmark ? (
          <PileItLockup
            markSize={s.mark}
            textSize={s.text}
            color="rgba(255,255,255,0.88)"
          />
        ) : (
          <StackPlayMark size={s.mark} />
        )}
      </Box>
      {s.showWordmark ? (
        <Typography
          variant="caption"
          sx={{
            position: "relative",
            zIndex: 1,
            color: alpha("#fff", 0.45),
            fontWeight: 700,
            letterSpacing: 0.14,
            textTransform: "uppercase",
            fontSize: 10,
          }}
        >
          {displayLabel}
        </Typography>
      ) : null}
    </Box>
  );
}
