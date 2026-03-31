import Box from "@mui/material/Box";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
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
        className="pileit-main-content"
      >
        {children}
      </Box>
      <GlobalOverlays />
    </Box>
  );
}
