"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
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
        mt: "auto",
        bgcolor: "#0a0a0a",
        borderTop: `1px solid ${PILEIT_THEME.border}`,
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, py: { xs: 4, md: 5 } }}>
        <Grid container spacing={{ xs: 4, md: 3 }}>
          <Grid item xs={12} md={3}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
              <PileItLockup markSize={36} textSize={24} />
            </Link>
            <Typography
              variant="body2"
              sx={{
                mt: 2,
                color: PILEIT_THEME.textSecondary,
                lineHeight: 1.6,
                maxWidth: 280,
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
          </Grid>

          <Grid item xs={6} sm={4} md={3}>
            <Typography component="h2" sx={headingSx}>
              PLATFORM
            </Typography>
            <FootLink href="/">Browse</FootLink>
            <FootLink href="/creators">Creators</FootLink>
            <FootLink href="/live">Live</FootLink>
            <FootLink href="/#trending">Trending</FootLink>
          </Grid>

          <Grid item xs={6} sm={4} md={3}>
            <Typography component="h2" sx={headingSx}>
              CREATORS
            </Typography>
            <FootLink href="/register">Apply to Create</FootLink>
            <FootLink href="/dashboard">Creator Dashboard</FootLink>
            <FootLink href="/dashboard">Monetization</FootLink>
            <FootLink href="/creators">Creator Guidelines</FootLink>
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <Typography component="h2" sx={headingSx}>
              COMPANY
            </Typography>
            <FootLink href="/">About PileIt</FootLink>
            <FootLink href="/terms#kemis">The Kemis Group</FootLink>
            <FootLink href="/privacy">Privacy Policy</FootLink>
            <FootLink href="/terms">Terms of Service</FootLink>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: PILEIT_THEME.border }} />

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: PILEIT_THEME.textDim, lineHeight: 1.6 }}
          >
            © {new Date().getFullYear()} PileIt · The Kemis Group of Companies · Nassau,
            Bahamas
          </Typography>
          <Typography variant="caption" sx={{ color: PILEIT_THEME.textDim }}>
            A KGC Product
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
