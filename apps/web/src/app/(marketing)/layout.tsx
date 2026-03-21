import Box from "@mui/material/Box";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import SiteFooter from "@/components/layout/SiteFooter";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      <MarketingHeader />
      <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {children}
      </Box>
      <SiteFooter />
    </Box>
  );
}
