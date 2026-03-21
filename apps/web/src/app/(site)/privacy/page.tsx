import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const metadata: Metadata = {
  title: "Privacy Policy — PileIt",
  description: "How PileIt handles your data.",
};

export default function PrivacyPage() {
  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 4, md: 6 } }}>
      <Typography variant="h4" fontStyle="italic" fontWeight={800} gutterBottom>
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
