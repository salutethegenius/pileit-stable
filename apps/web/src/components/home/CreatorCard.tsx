"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import type { Creator } from "@/types/content";
import CreatorBadges from "@/components/brand/CreatorBadges";
import { formatCreatorAudienceLine } from "@/utils/format";
import { IMG } from "@/lib/imageUrls";
import CategoryMediaPlaceholder from "@/components/brand/CategoryMediaPlaceholder";

export default function CreatorCard({ creator }: { creator: Creator }) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [creator.avatarUrl]);

  const showAvatarPlaceholder = !creator.avatarUrl || avatarFailed;

  return (
    <Paper
      component={Link}
      href={`/creator/${creator.handle}`}
      elevation={0}
      sx={{
        display: "block",
        p: 2,
        maxWidth: "100%",
        overflow: "hidden",
        bgcolor: "#2a2a2a",
        border: "1px solid #333",
        borderRadius: 2,
        textDecoration: "none",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "scale(1.04)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            position: "relative",
            width: 72,
            height: 72,
            flexShrink: 0,
            borderRadius: "50%",
            overflow: "hidden",
            border: `3px solid ${creator.accentColor}`,
            boxShadow: `0 0 12px ${creator.accentColor}55`,
            bgcolor: "#333",
          }}
        >
          {showAvatarPlaceholder ? (
            <CategoryMediaPlaceholder category={creator.category} variant="avatar" />
          ) : (
            <Box
              component="img"
              src={IMG.avatar(creator.avatarUrl)}
              alt={`${creator.displayName} profile photo`}
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              loading="lazy"
              onError={() => setAvatarFailed(true)}
            />
          )}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              fontStyle="italic"
              noWrap
              sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {creator.displayName}
            </Typography>
            <Box sx={{ flexShrink: 0 }}>
              <CreatorBadges
                verified={creator.verified}
                monetizationEligible={creator.monetizationEligible}
                size="small"
              />
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            @{creator.handle}
          </Typography>
          <Chip
            label={creator.category}
            size="small"
            sx={{ mt: 1, height: 22 }}
          />
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            {formatCreatorAudienceLine(creator)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
