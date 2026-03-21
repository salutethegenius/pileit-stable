import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { getSiteUrl } from "@/lib/site";

const canonical = `${getSiteUrl()}/terms`;

export const metadata: Metadata = {
  title: { absolute: "Terms of Service | PileIt" },
  description:
    "PileIt terms of service: community rules, creator rights, payments, and Kemis Group policies for Bahamas users.",
  alternates: { canonical },
  openGraph: {
    title: "Terms of Service | PileIt",
    description:
      "Terms for using PileIt — community standards, creators, and payments in The Bahamas.",
    url: canonical,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | PileIt",
    description:
      "Terms for using PileIt — community standards, creators, and payments in The Bahamas.",
  },
};

export default function TermsPage() {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 4, md: 6 } }}>
      <Typography
        component="h1"
        variant="h4"
        fontStyle="italic"
        fontWeight={800}
        gutterBottom
      >
        Terms of Service
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated {new Date().toLocaleDateString("en-BS", { year: "numeric", month: "long", day: "numeric" })}.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75, mb: 4 }}>
        By using PileIt you agree to follow community standards and respect creators&apos; rights.
        Detailed terms, payment rules, and dispute handling will be finalized before general
        availability.
      </Typography>
      <Box id="kemis" sx={{ scrollMarginTop: 96 }}>
        <Typography component="h2" variant="h6" fontWeight={800} fontStyle="italic" gutterBottom>
          The Kemis Group
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
          PileIt is part of the Kemis Group of Companies, building digital infrastructure for The
          Bahamas—from payments to creator tools.
        </Typography>
      </Box>
    </Box>
  );
}
