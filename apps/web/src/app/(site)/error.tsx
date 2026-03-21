"use client";

import { useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography component="h1" variant="h5" gutterBottom>
        Something went wrong
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {isDev ? error.message : "Please try again. If the problem continues, contact support."}
      </Typography>
      {isDev && error.digest ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          {error.digest}
        </Typography>
      ) : null}
      <Button variant="contained" color="primary" onClick={() => reset()}>
        Try again
      </Button>
    </Box>
  );
}
