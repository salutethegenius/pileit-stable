import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { getSiteUrl } from "@/lib/site";

const canonical = `${getSiteUrl()}/privacy`;

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | PileIt" },
  description:
    "PileIt privacy policy: how we handle your data, KemisPay partners, and your choices in The Bahamas.",
  alternates: { canonical },
  openGraph: {
    title: "Privacy Policy | PileIt",
    description:
      "How PileIt handles your data and your privacy choices — Bahamas-first streaming platform.",
    url: canonical,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | PileIt",
    description:
      "How PileIt handles your data and your privacy choices — Bahamas-first streaming platform.",
  },
};

export default function PrivacyPage() {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 4, md: 6 } }}>
      <Typography
        component="h1"
        variant="h4"
        fontStyle="italic"
        fontWeight={800}
        gutterBottom
      >
        Privacy Policy
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated {new Date().toLocaleDateString("en-BS", { year: "numeric", month: "long", day: "numeric" })}.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
        PileIt is in active development. This policy will describe what we collect, how we use
        it, and your choices—aligned with Bahamian expectations and partner requirements including
        KemisPay. A full legal version will be published before public launch.
      </Typography>
    </Box>
  );
}
