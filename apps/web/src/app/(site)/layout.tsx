import Box from "@mui/material/Box";
import Navbar from "@/components/layout/Navbar";
import Sidebar, { SIDEBAR_WIDTH } from "@/components/layout/Sidebar";
import GlobalOverlays from "@/components/layout/GlobalOverlays";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ minHeight: "100vh", pt: "64px" }}>
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
      </Box>
      <GlobalOverlays />
    </Box>
  );
}
