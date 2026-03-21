"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function LivePage() {
  return (
    <Box sx={{ p: 4, minHeight: "60vh" }}>
      <Typography variant="h4" fontStyle="italic" fontWeight={800} gutterBottom>
        Live
      </Typography>
      <Typography color="text.secondary">
        Live streams from Bahamian creators are coming soon. Check back for scheduled harbour
        sessions and premiere events.
      </Typography>
    </Box>
  );
}
