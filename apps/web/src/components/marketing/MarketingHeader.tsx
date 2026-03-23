"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import PileItLockup from "@/components/brand/PileItLockup";
import { PILEIT_THEME } from "@/theme/theme";

export default function MarketingHeader() {
  return (
    <Box
      component="header"
      sx={{
        height: 56,
        px: { xs: 2, sm: 3 },
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${PILEIT_THEME.border}`,
        bgcolor: "rgba(8, 6, 4, 0.94)",
        backdropFilter: "blur(14px)",
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", lineHeight: 0 }}>
        <PileItLockup markSize={28} textSize={20} gap={28 * 0.28} />
      </Link>
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 2 }, flexShrink: 0 }}>
        <Typography
          component={Link}
          href="/register"
          sx={{
            fontSize: 14,
            fontWeight: 600,
            color: PILEIT_THEME.accentLight,
            textDecoration: "none",
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
            "&:hover": { color: PILEIT_THEME.accent },
          }}
        >
          Sign up
        </Typography>
        <Typography
          component={Link}
          href="/login"
          sx={{
            fontSize: 14,
            fontWeight: 600,
            color: PILEIT_THEME.textSecondary,
            textDecoration: "none",
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
            "&:hover": { color: PILEIT_THEME.textPrimary },
          }}
        >
          Log in
        </Typography>
      </Box>
    </Box>
  );
}
