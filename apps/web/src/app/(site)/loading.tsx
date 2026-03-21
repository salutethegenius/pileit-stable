"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

export default function Loading() {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="rectangular" height="50vh" sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton height={40} width="40%" />
      <Skeleton height={200} sx={{ mt: 2 }} />
    </Box>
  );
}
