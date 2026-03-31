import Box from "@mui/material/Box";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import SiteFooter from "@/components/layout/SiteFooter";
import GlobalOverlays from "@/components/layout/GlobalOverlays";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      <Navbar />
      <Box sx={{ display: "flex", flex: 1, minWidth: 0 }}>
        <Sidebar />
        <Box
          component="main"
          sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
        >
          {children}
          <Box sx={{ height: 64, flexShrink: 0 }} aria-hidden />
          <SiteFooter />
        </Box>
      </Box>
      <GlobalOverlays />
    </Box>
  );
}
