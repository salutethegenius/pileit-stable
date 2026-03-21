"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PILEIT_THEME } from "@/theme/theme";
import { useMobileNarrow } from "@/hooks/useMobileNarrow";

const INTERFACE_IMAGE_SRC = "/ss-dash.png";
const HERO_BG_SRC = "/pileit-hero-bg.png";

/** Matches provided `.app-screenshot` — perspective tilt, brand glow, bottom fade mask. */
const appScreenshotSx = {
  width: "100%",
  maxWidth: 1100,
  height: "auto",
  display: "block",
  borderRadius: "12px",
  border: "1px solid rgba(249, 115, 22, 0.15)",
  boxShadow:
    "0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.7), 0 0 120px rgba(249,115,22,0.08)",
  transform: "perspective(1200px) rotateX(4deg) rotateY(-1deg)",
  transformOrigin: "center top",
  maskImage: "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
  WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
} as const;

/** Matches `.screenshot-wrapper` — centers shot, pulls section up slightly, clips tilt overflow. */
const screenshotWrapperSx = {
  display: "flex",
  justifyContent: "center",
  px: 3,
  mt: "-20px",
  overflow: "hidden",
  width: "100%",
} as const;

function InterfacePreview() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <Box
        sx={{
          width: "100%",
          maxWidth: 1100,
          mx: "auto",
          aspectRatio: "16 / 9",
          borderRadius: "12px",
          border: `1px dashed ${PILEIT_THEME.border}`,
          bgcolor: "rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
        }}
      >
        <Typography variant="body2" sx={{ color: PILEIT_THEME.textSecondary, textAlign: "center" }}>
          Could not load screenshot — add{" "}
          <Box component="span" sx={{ color: PILEIT_THEME.accent, fontWeight: 700 }}>
            public/ss-dash.png
          </Box>
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography
        component="p"
        sx={{
          m: 0,
          mb: 2,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: PILEIT_THEME.textSecondary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <Box component="span" sx={{ color: PILEIT_THEME.accent, fontSize: 11, lineHeight: 1 }} aria-hidden>
          ▶
        </Box>
        Live on pileit.app
      </Typography>
      <Box sx={screenshotWrapperSx}>
        <Box
          component="img"
          src={INTERFACE_IMAGE_SRC}
          alt="PileIt — browse home, featured creators, and video rows"
          onError={() => setFailed(true)}
          sx={appScreenshotSx}
        />
      </Box>
    </>
  );
}

export default function LandingPageClient() {
  const mobileNarrow = useMobileNarrow();

  return (
    <Box
      component="article"
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#060503",
      }}
    >
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          minHeight: { md: "min(52vh, 520px)" },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundColor: "#060503",
            backgroundImage: `
              linear-gradient(180deg, transparent 0%, transparent 45%, rgba(6, 5, 3, 0.88) 92%, #060503 100%),
              linear-gradient(
                90deg,
                rgba(6, 5, 3, 0.94) 0%,
                rgba(6, 5, 3, 0.72) 32%,
                rgba(6, 5, 3, 0.28) 52%,
                transparent 72%
              ),
              url(${HERO_BG_SRC})
            `,
            backgroundSize: "100% 100%, 100% 100%, cover",
            backgroundPosition: "center, center, center center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            opacity: 0.28,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
            pointerEvents: "none",
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 80% 55% at 50% -15%, rgba(249, 115, 22, 0.12), transparent 50%)",
          }}
        />

        <Container
          maxWidth="lg"
          sx={{
            position: "relative",
            zIndex: 1,
            px: { xs: 2, md: 3 },
            pt: { xs: 4, md: 8 },
            pb: { xs: 5, md: 8 },
          }}
        >
        <Stack spacing={{ xs: 1.5, md: 2 }} sx={{ maxWidth: { md: "min(42rem, 92vw)" } }}>
          <Typography
            component="p"
            sx={{
              fontSize: { xs: 12, sm: 13 },
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: PILEIT_THEME.accent,
            }}
          >
            Built For Bahamian Creators
          </Typography>
          <Typography
            component="h1"
            variant="h2"
            sx={{
              fontFamily: 'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
              fontWeight: 800,
              fontStyle: "italic",
              fontSize: {
                xs: "clamp(1.88rem, 7.2vw, 2.6rem)",
                md: "clamp(3.25rem, 5.5vw, 4.75rem)",
              },
              lineHeight: { xs: 1.05, md: 1.02 },
              letterSpacing: { xs: "-0.02em", md: "-0.03em" },
              color: "#fafafa",
              textShadow: "0 4px 48px rgba(0,0,0,0.45)",
            }}
          >
            Streaming that puts Bahamian creators first.
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "0.98rem", md: "1.25rem" },
              lineHeight: 1.55,
              color: PILEIT_THEME.textSecondary,
              maxWidth: "36rem",
            }}
          >
            {mobileNarrow ? (
              <>
                <Box component="strong" sx={{ color: PILEIT_THEME.textPrimary, fontWeight: 700 }}>
                  PileIt
                </Box>{" "}
                is home for island talent — watch, tip, subscribe, and chat with channels you care about.
              </>
            ) : (
              <>
                <Box component="strong" sx={{ color: PILEIT_THEME.textPrimary, fontWeight: 700 }}>
                  PileIt
                </Box>{" "}
                is where island talent meets a real audience — watch, tip, subscribe, pile on in chat, and follow
                channels you actually care about.
              </>
            )}
          </Typography>
        </Stack>

        <Box sx={{ mt: { xs: 4, md: 5 } }}>
          <Button
            component={Link}
            href="/browse"
            variant="contained"
            color="primary"
            size="large"
            sx={{
              px: { xs: 3, sm: 4 },
              py: 1.75,
              fontSize: { xs: "1rem", sm: "1.1rem" },
              fontWeight: 800,
              fontStyle: "italic",
              fontFamily: 'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
              textTransform: "none",
              borderRadius: 1,
              boxShadow: "0 8px 32px rgba(249, 115, 22, 0.35)",
              "&:hover": {
                boxShadow: "0 12px 40px rgba(249, 115, 22, 0.45)",
              },
            }}
          >
            See for yourself!
          </Button>
          <Typography
            variant="body2"
            sx={{ mt: 2, color: PILEIT_THEME.textDim, fontSize: 13 }}
          >
            {mobileNarrow
              ? "Browse the catalog — no signup required."
              : "No signup required to browse — jump into the catalog and start exploring."}
          </Typography>
        </Box>
      </Container>
      </Box>

      <Box
        sx={{
          position: "relative",
          borderTop: `1px solid ${PILEIT_THEME.border}`,
          bgcolor: "rgba(20,20,20,0.6)",
          py: { xs: 5, md: 8 },
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Stack spacing={{ xs: 3, md: 4 }} alignItems="center">
            <InterfacePreview />
            <Button
              component={Link}
              href="/browse"
              variant="outlined"
              color="primary"
              size="large"
              sx={{
                px: 4,
                py: 1.25,
                fontWeight: 800,
                fontStyle: "italic",
                fontFamily: 'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
                textTransform: "none",
                fontSize: "1.05rem",
                borderWidth: 2,
                width: { xs: "100%", sm: "auto" },
                maxWidth: 400,
                "&:hover": { borderWidth: 2 },
              }}
            >
              See for yourself!
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
