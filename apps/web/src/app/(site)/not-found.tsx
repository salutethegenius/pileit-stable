"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function NotFound() {
  return (
    <Box sx={{ p: 6, textAlign: "center" }}>
      <Typography variant="h4" fontStyle="italic" fontWeight={800} gutterBottom>
        Not found
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        That page or creator does not exist.
      </Typography>
      <Button component={Link} href="/" variant="contained" color="primary">
        Back to Browse
      </Button>
    </Box>
  );
}
