"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import { mockCreators } from "@/data/mock";
import CreatorCard from "@/components/home/CreatorCard";
import { getApiBase } from "@/lib/api";
import { allowMockCatalogFallback } from "@/lib/mockCatalog";
import { mapApiToCreator, type ApiCreatorRow } from "@/lib/mapApiCreator";
import type { Creator } from "@/types/content";

export default function CreatorsPageClient() {
  const [creators, setCreators] = useState<Creator[]>(() =>
    allowMockCatalogFallback() ? mockCreators : []
  );

  useEffect(() => {
    const base = getApiBase();
    fetch(`${base}/creators`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: ApiCreatorRow[]) => {
        if (!Array.isArray(rows)) return;
        const mapped = rows.map(mapApiToCreator);
        if (mapped.length > 0) setCreators(mapped);
      })
      .catch(() => {});
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100vh" }}>
      <Typography variant="h4" fontStyle="italic" fontWeight={800} sx={{ mb: 3 }}>
        Creators
      </Typography>
      <Grid container spacing={2}>
        {creators.length === 0 ? (
          <Grid item xs={12}>
            <Typography color="text.secondary">
              No creators listed yet. Check back soon.
            </Typography>
          </Grid>
        ) : (
          creators.map((c) => (
            <Grid item xs={12} sm={6} md={4} key={c.id}>
              <CreatorCard creator={c} />
            </Grid>
          ))
        )}
      </Grid>
      <Typography component={Link} href="/browse" sx={{ display: "inline-block", mt: 4 }}>
        ← Back to Browse
      </Typography>
    </Box>
  );
}
