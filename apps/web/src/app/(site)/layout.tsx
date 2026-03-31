import Box from "@mui/material/Box";
import Navbar from "@/components/layout/Navbar";
import Sidebar, { SIDEBAR_WIDTH } from "@/components/layout/Sidebar";
import SiteFooter from "@/components/layout/SiteFooter";
import GlobalOverlays from "@/components/layout/GlobalOverlays";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Sidebar />
      <Box
        component="main"
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "calc(100vh - 64px)",
          pl: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
        }}
      >
        {children}
        <Box sx={{ flex: 1 }} />
        <SiteFooter />
      </Box>
      <GlobalOverlays />
    </Box>
  );
}
