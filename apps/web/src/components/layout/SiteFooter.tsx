"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import PileItLockup from "@/components/brand/PileItLockup";
import { PILEIT_THEME } from "@/theme/theme";

const linkSx = {
  display: "block",
  py: 0.35,
  fontSize: 14,
  color: PILEIT_THEME.textSecondary,
  textDecoration: "none",
  "&:hover": { color: PILEIT_THEME.textPrimary },
};

const headingSx = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.14em",
  color: PILEIT_THEME.accent,
  mb: 1.75,
};

function FootLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Typography component={Link} href={href} sx={linkSx}>
      {children}
    </Typography>
  );
}

export default function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "#0a0a0a",
        borderTop: `0.5px solid ${PILEIT_THEME.border}`,
      }}
    >
      <Box
        sx={{
          maxWidth: 1440,
          mx: "auto",
          width: "100%",
          px: { xs: 2, md: "48px" },
          py: { xs: 4, md: 6 },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 1.8fr) repeat(3, minmax(0, 1fr))",
            },
            gap: { xs: 4, md: 4 },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Link href="/browse" style={{ display: "inline-flex", alignItems: "center" }}>
              <PileItLockup markSize={36} textSize={24} />
            </Link>
            <Typography
              variant="body2"
              sx={{
                mt: 2,
                color: PILEIT_THEME.textSecondary,
                lineHeight: 1.6,
                maxWidth: 320,
              }}
            >
              The home of Bahamian creators. Watch, tip, shop, and pile on.
            </Typography>
            <Typography variant="caption" sx={{ mt: 2, display: "block", color: PILEIT_THEME.textSecondary }}>
              Powered by{" "}
              <Box component="span" sx={{ color: PILEIT_THEME.accent, fontWeight: 700 }}>
                KemisPay
              </Box>
            </Typography>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" sx={headingSx}>
              PLATFORM
            </Typography>
            <FootLink href="/browse">Browse</FootLink>
            <FootLink href="/creators">Creators</FootLink>
            <FootLink href="/live">Live</FootLink>
            <FootLink href="/browse#trending">Trending</FootLink>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" sx={headingSx}>
              CREATORS
            </Typography>
            <FootLink href="/register">Apply to Create</FootLink>
            <FootLink href="/dashboard">Creator Dashboard</FootLink>
            <FootLink href="/dashboard">Monetization</FootLink>
            <FootLink href="/creators">Creator Guidelines</FootLink>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" sx={headingSx}>
              COMPANY
            </Typography>
            <FootLink href="/">About PileIt</FootLink>
            <FootLink href="/terms#kemis">The Kemis Group</FootLink>
            <FootLink href="/privacy">Privacy Policy</FootLink>
            <FootLink href="/terms">Terms of Service</FootLink>
          </Box>
        </Box>

        <Divider sx={{ my: 4, borderColor: PILEIT_THEME.border }} />

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 1.5,
            pb: { xs: 1, md: 0 },
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: PILEIT_THEME.textDim, lineHeight: 1.6 }}
            suppressHydrationWarning
          >
            © {new Date().getFullYear()} PileIt · The Kemis Group of Companies · Bahamas
          </Typography>
          <Typography
            component={Link}
            href="https://pileit.app"
            variant="caption"
            sx={{
              color: PILEIT_THEME.textDim,
              textDecoration: "none",
              "&:hover": { color: PILEIT_THEME.accent },
            }}
          >
            pileit.app
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
