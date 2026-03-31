"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { PILEIT_THEME } from "@/theme/theme";

type Props = {
  title: string;
  /** e.g. /creators — shown as "See all →" when set */
  seeAllHref?: string;
  /** Carousel prev/next or other controls — placed after See all */
  endActions?: ReactNode;
  /** Override header styles */
  sx?: Record<string, unknown>;
};

export default function SectionHeader({ title, seeAllHref, endActions, sx }: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        borderBottom: `0.5px solid ${PILEIT_THEME.border}80`,
        pb: 1.5,
        mb: 2.25,
        ...sx,
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontFamily: 'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
          fontSize: { xs: 11, sm: 12, md: 13 },
          fontWeight: 500,
          fontStyle: "normal",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(240, 237, 232, 0.4)",
          m: 0,
        }}
      >
        {title}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        {seeAllHref ? (
          <Typography
            component={Link}
            href={seeAllHref}
            variant="body2"
            sx={{
              color: "primary.main",
              fontWeight: 600,
              fontSize: 12,
              textDecoration: "none",
              mr: endActions ? 0.5 : 0,
              "&:hover": { textDecoration: "underline" },
            }}
          >
            See all →
          </Typography>
        ) : null}
        {endActions}
      </Box>
    </Box>
  );
}
